package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type MigrationStatus struct {
	Version   int       `json:"version"`
	Name      string    `json:"name"`
	Applied   bool      `json:"applied"`
	AppliedAt time.Time `json:"applied_at,omitempty"`
}

type Migrator struct {
	db  *sql.DB
	dir string
}

func NewMigrator(db *sql.DB, dir string) *Migrator {
	return &Migrator{db: db, dir: dir}
}

func (m *Migrator) EnsureMigrationTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version INT PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);`
	_, err := m.db.Exec(query)
	return err
}

func (m *Migrator) Up() error {
	if err := m.EnsureMigrationTable(); err != nil {
		return fmt.Errorf("failed to ensure schema_migrations table: %w", err)
	}

	files, err := os.ReadDir(m.dir)
	if err != nil {
		return fmt.Errorf("failed to read migrations dir: %w", err)
	}

	var upFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".up.sql") {
			upFiles = append(upFiles, f.Name())
		}
	}
	sort.Strings(upFiles)

	for _, fileName := range upFiles {
		version, name, err := parseMigrationFileName(fileName)
		if err != nil {
			return err
		}

		var count int
		err = m.db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = $1", version).Scan(&count)
		if err != nil {
			return fmt.Errorf("failed to check migration %s: %w", fileName, err)
		}

		if count > 0 {
			continue // already applied
		}

		content, err := os.ReadFile(filepath.Join(m.dir, fileName))
		if err != nil {
			return fmt.Errorf("failed to read file %s: %w", fileName, err)
		}

		tx, err := m.db.Begin()
		if err != nil {
			return fmt.Errorf("failed to start transaction: %w", err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed executing migration %s: %w", fileName, err)
		}

		if _, err := tx.Exec("INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW())", version, name); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", fileName, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", fileName, err)
		}

		fmt.Printf("[MIGRATE] Applied: %s\n", fileName)
	}

	return nil
}

func (m *Migrator) Down() error {
	if err := m.EnsureMigrationTable(); err != nil {
		return fmt.Errorf("failed to ensure schema_migrations table: %w", err)
	}

	var latestVersion int
	var name string
	err := m.db.QueryRow("SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1").Scan(&latestVersion, &name)
	if err == sql.ErrNoRows {
		fmt.Println("[MIGRATE] No applied migrations to rollback.")
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to find latest migration: %w", err)
	}

	downFileName := fmt.Sprintf("%06d_%s.down.sql", latestVersion, name)
	content, err := os.ReadFile(filepath.Join(m.dir, downFileName))
	if err != nil {
		return fmt.Errorf("failed to read rollback file %s: %w", downFileName, err)
	}

	tx, err := m.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}

	if _, err := tx.Exec(string(content)); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("failed executing rollback %s: %w", downFileName, err)
	}

	if _, err := tx.Exec("DELETE FROM schema_migrations WHERE version = $1", latestVersion); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("failed to delete migration record: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit rollback: %w", err)
	}

	fmt.Printf("[MIGRATE] Rolled back: %s\n", downFileName)
	return nil
}

func (m *Migrator) Status() ([]MigrationStatus, error) {
	if err := m.EnsureMigrationTable(); err != nil {
		return nil, err
	}

	files, err := os.ReadDir(m.dir)
	if err != nil {
		return nil, err
	}

	var statuses []MigrationStatus
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".up.sql") {
			v, name, err := parseMigrationFileName(f.Name())
			if err != nil {
				continue
			}

			var appliedAt time.Time
			err = m.db.QueryRow("SELECT applied_at FROM schema_migrations WHERE version = $1", v).Scan(&appliedAt)
			applied := err == nil

			statuses = append(statuses, MigrationStatus{
				Version:   v,
				Name:      name,
				Applied:   applied,
				AppliedAt: appliedAt,
			})
		}
	}

	sort.Slice(statuses, func(i, j int) bool {
		return statuses[i].Version < statuses[j].Version
	})

	return statuses, nil
}

func parseMigrationFileName(fileName string) (int, string, error) {
	parts := strings.SplitN(fileName, "_", 2)
	if len(parts) < 2 {
		return 0, "", fmt.Errorf("invalid migration filename: %s", fileName)
	}
	version, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, "", fmt.Errorf("invalid version in filename: %s", fileName)
	}
	name := strings.TrimSuffix(parts[1], ".up.sql")
	name = strings.TrimSuffix(name, ".down.sql")
	return version, name, nil
}
