package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/domain/valueobject"
)

type PostgresBusinessRepo struct {
	db *sql.DB
}

func NewPostgresBusinessRepo(db *sql.DB) domainRepo.BusinessRepository {
	return &PostgresBusinessRepo{db: db}
}

func (r *PostgresBusinessRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.Business, error) {
	query := `
		SELECT 
			b.id, b.name, b.google_review_url, b.status, b.verified_at, b.verified_by, b.created_at, b.updated_at,
			COUNT(c.id) AS total_cards,
			COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END) AS active_cards
		FROM businesses b
		LEFT JOIN cards c ON c.business_id = b.id
		WHERE b.id = $1
		GROUP BY b.id
	`
	b := &entity.Business{}
	var statusStr string
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&b.ID,
		&b.Name,
		&b.GoogleReviewURL,
		&statusStr,
		&b.VerifiedAt,
		&b.VerifiedBy,
		&b.CreatedAt,
		&b.UpdatedAt,
		&b.TotalCards,
		&b.ActiveCards,
	)
	if err == sql.ErrNoRows {
		return nil, domErr.ErrBusinessNotFound
	}
	if err != nil {
		return nil, err
	}
	b.Status = valueobject.BusinessStatus(statusStr)
	return b, nil
}

func (r *PostgresBusinessRepo) List(ctx context.Context, filter domainRepo.BusinessFilter) ([]*entity.Business, int, error) {
	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if filter.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(b.name ILIKE $%d OR b.google_review_url ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	if filter.Status != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("b.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM businesses b WHERE %s", whereSQL)
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT 
			b.id, b.name, b.google_review_url, b.status, b.verified_at, b.verified_by, b.created_at, b.updated_at,
			COUNT(c.id) AS total_cards,
			COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END) AS active_cards
		FROM businesses b
		LEFT JOIN cards c ON c.business_id = b.id
		WHERE %s
		GROUP BY b.id
		ORDER BY b.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var businesses []*entity.Business
	for rows.Next() {
		b := &entity.Business{}
		var statusStr string
		if err := rows.Scan(
			&b.ID,
			&b.Name,
			&b.GoogleReviewURL,
			&statusStr,
			&b.VerifiedAt,
			&b.VerifiedBy,
			&b.CreatedAt,
			&b.UpdatedAt,
			&b.TotalCards,
			&b.ActiveCards,
		); err != nil {
			return nil, 0, err
		}
		b.Status = valueobject.BusinessStatus(statusStr)
		businesses = append(businesses, b)
	}

	return businesses, total, nil
}

func (r *PostgresBusinessRepo) Create(ctx context.Context, business *entity.Business) error {
	query := `
		INSERT INTO businesses (id, name, google_review_url, status, verified_at, verified_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		business.ID,
		business.Name,
		business.GoogleReviewURL,
		string(business.Status),
		business.VerifiedAt,
		business.VerifiedBy,
		business.CreatedAt,
		business.UpdatedAt,
	)
	return err
}

func (r *PostgresBusinessRepo) Update(ctx context.Context, business *entity.Business) error {
	query := `
		UPDATE businesses
		SET name = $1, google_review_url = $2, status = $3, verified_at = $4, verified_by = $5, updated_at = $6
		WHERE id = $7
	`
	_, err := r.db.ExecContext(ctx, query,
		business.Name,
		business.GoogleReviewURL,
		string(business.Status),
		business.VerifiedAt,
		business.VerifiedBy,
		business.UpdatedAt,
		business.ID,
	)
	return err
}

func (r *PostgresBusinessRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM businesses WHERE id = $1", id)
	return err
}
