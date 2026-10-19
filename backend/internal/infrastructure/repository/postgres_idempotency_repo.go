package repository

import (
	"context"
	"database/sql"

	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
)

type PostgresIdempotencyRepo struct {
	db *sql.DB
}

func NewPostgresIdempotencyRepo(db *sql.DB) domainRepo.IdempotencyRepository {
	return &PostgresIdempotencyRepo{db: db}
}

func (r *PostgresIdempotencyRepo) Get(ctx context.Context, key string) (string, error) {
	var body string
	err := r.db.QueryRowContext(ctx, "SELECT response_body FROM idempotency_keys WHERE key = $1", key).Scan(&body)
	if err == sql.ErrNoRows {
		return "", domErr.ErrNotFound
	}
	return body, err
}

func (r *PostgresIdempotencyRepo) Save(ctx context.Context, key string, resourceType string, responseBody string) error {
	query := `
		INSERT INTO idempotency_keys (key, resource_type, response_body, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (key) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, key, resourceType, responseBody)
	return err
}
