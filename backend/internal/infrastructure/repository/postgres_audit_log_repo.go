package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"octo-tap-backend/internal/domain/entity"
	domainRepo "octo-tap-backend/internal/domain/repository"
)

type PostgresAuditLogRepo struct {
	db *sql.DB
}

func NewPostgresAuditLogRepo(db *sql.DB) domainRepo.AuditLogRepository {
	return &PostgresAuditLogRepo{db: db}
}

func (r *PostgresAuditLogRepo) Create(ctx context.Context, log *entity.AuditLog) error {
	var oldJSON, newJSON []byte
	var err error
	if log.OldValues != nil {
		oldJSON, err = json.Marshal(log.OldValues)
		if err != nil {
			return err
		}
	}
	if log.NewValues != nil {
		newJSON, err = json.Marshal(log.NewValues)
		if err != nil {
			return err
		}
	}

	query := `
		INSERT INTO audit_logs (id, admin_id, admin_email, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err = r.db.ExecContext(ctx, query,
		log.ID,
		log.AdminID,
		log.AdminEmail,
		log.Action,
		log.EntityType,
		log.EntityID,
		oldJSON,
		newJSON,
		log.IPAddress,
		log.UserAgent,
		log.CreatedAt,
	)
	return err
}

func (r *PostgresAuditLogRepo) List(ctx context.Context, filter domainRepo.AuditLogFilter) ([]*entity.AuditLog, int, error) {
	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if filter.EntityType != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("entity_type = $%d", argIdx))
		args = append(args, filter.EntityType)
		argIdx++
	}

	if filter.EntityID != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("entity_id = $%d", argIdx))
		args = append(args, filter.EntityID)
		argIdx++
	}

	if filter.Action != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("action ILIKE $%d", argIdx))
		args = append(args, "%"+filter.Action+"%")
		argIdx++
	}

	if filter.AdminEmail != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("admin_email ILIKE $%d", argIdx))
		args = append(args, "%"+filter.AdminEmail+"%")
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs WHERE %s", whereSQL)
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT id, admin_id, admin_email, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at
		FROM audit_logs
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*entity.AuditLog
	for rows.Next() {
		l := &entity.AuditLog{}
		var oldBytes, newBytes []byte
		var ipAddr, uAgent sql.NullString
		if err := rows.Scan(
			&l.ID,
			&l.AdminID,
			&l.AdminEmail,
			&l.Action,
			&l.EntityType,
			&l.EntityID,
			&oldBytes,
			&newBytes,
			&ipAddr,
			&uAgent,
			&l.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if len(oldBytes) > 0 {
			_ = json.Unmarshal(oldBytes, &l.OldValues)
		}
		if len(newBytes) > 0 {
			_ = json.Unmarshal(newBytes, &l.NewValues)
		}
		if ipAddr.Valid {
			l.IPAddress = ipAddr.String
		}
		if uAgent.Valid {
			l.UserAgent = uAgent.String
		}
		logs = append(logs, l)
	}

	return logs, total, nil
}
