package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
)

type PostgresAdminRepo struct {
	db *sql.DB
}

func NewPostgresAdminRepo(db *sql.DB) domainRepo.AdminRepository {
	return &PostgresAdminRepo{db: db}
}

func (r *PostgresAdminRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.AdminUser, error) {
	query := `
		SELECT id, email, password_hash, full_name, COALESCE(role, 'ADMIN'), status, created_at, updated_at
		FROM admin_users
		WHERE id = $1
	`
	admin := &entity.AdminUser{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&admin.ID,
		&admin.Email,
		&admin.PasswordHash,
		&admin.FullName,
		&admin.Role,
		&admin.Status,
		&admin.CreatedAt,
		&admin.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domErr.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return admin, nil
}

func (r *PostgresAdminRepo) GetByEmail(ctx context.Context, email string) (*entity.AdminUser, error) {
	query := `
		SELECT id, email, password_hash, full_name, COALESCE(role, 'ADMIN'), status, created_at, updated_at
		FROM admin_users
		WHERE LOWER(email) = LOWER($1)
	`
	admin := &entity.AdminUser{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&admin.ID,
		&admin.Email,
		&admin.PasswordHash,
		&admin.FullName,
		&admin.Role,
		&admin.Status,
		&admin.CreatedAt,
		&admin.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domErr.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return admin, nil
}

func (r *PostgresAdminRepo) Create(ctx context.Context, admin *entity.AdminUser) error {
	role := admin.Role
	if role == "" {
		role = "ADMIN"
	}
	query := `
		INSERT INTO admin_users (id, email, password_hash, full_name, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		admin.ID,
		admin.Email,
		admin.PasswordHash,
		admin.FullName,
		role,
		admin.Status,
		admin.CreatedAt,
		admin.UpdatedAt,
	)
	return err
}

func (r *PostgresAdminRepo) Update(ctx context.Context, admin *entity.AdminUser) error {
	role := admin.Role
	if role == "" {
		role = "ADMIN"
	}
	query := `
		UPDATE admin_users
		SET email = $1, password_hash = $2, full_name = $3, role = $4, status = $5, updated_at = $6
		WHERE id = $7
	`
	_, err := r.db.ExecContext(ctx, query,
		admin.Email,
		admin.PasswordHash,
		admin.FullName,
		role,
		admin.Status,
		admin.UpdatedAt,
		admin.ID,
	)
	return err
}
