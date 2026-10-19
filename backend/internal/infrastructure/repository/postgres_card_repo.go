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

type PostgresCardRepo struct {
	db *sql.DB
}

func NewPostgresCardRepo(db *sql.DB) domainRepo.CardRepository {
	return &PostgresCardRepo{db: db}
}

func (r *PostgresCardRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.Card, error) {
	query := `
		SELECT 
			c.id, c.business_id, c.card_code, c.token, c.batch_id, c.status, 
			c.qr_code_url, c.tap_count, c.last_tapped_at, c.activated_at, c.revoked_at, 
			c.created_at, c.updated_at,
			b.name AS business_name, b.google_review_url
		FROM cards c
		LEFT JOIN businesses b ON b.id = c.business_id
		WHERE c.id = $1
	`
	c := &entity.Card{}
	var statusStr string
	var qrURL, bizIDStr, bizName, bizReviewURL sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID,
		&bizIDStr,
		&c.CardCode,
		&c.Token,
		&c.BatchID,
		&statusStr,
		&qrURL,
		&c.TapCount,
		&c.LastTappedAt,
		&c.ActivatedAt,
		&c.RevokedAt,
		&c.CreatedAt,
		&c.UpdatedAt,
		&bizName,
		&bizReviewURL,
	)
	if err == sql.ErrNoRows {
		return nil, domErr.ErrCardNotFound
	}
	if err != nil {
		return nil, err
	}
	c.Status = valueobject.CardStatus(statusStr)
	if qrURL.Valid {
		c.QRCodeURL = qrURL.String
	}
	if bizIDStr.Valid {
		if parsed, err := uuid.Parse(bizIDStr.String); err == nil {
			c.BusinessID = &parsed
		}
	}
	if bizName.Valid {
		c.BusinessName = bizName.String
	}
	if bizReviewURL.Valid {
		c.GoogleReviewURL = bizReviewURL.String
	}
	return c, nil
}

func (r *PostgresCardRepo) GetByToken(ctx context.Context, token string) (*entity.Card, error) {
	query := `
		SELECT 
			c.id, c.business_id, c.card_code, c.token, c.batch_id, c.status, 
			c.qr_code_url, c.tap_count, c.last_tapped_at, c.activated_at, c.revoked_at, 
			c.created_at, c.updated_at,
			b.name AS business_name, b.google_review_url
		FROM cards c
		LEFT JOIN businesses b ON b.id = c.business_id
		WHERE c.token = $1
	`
	c := &entity.Card{}
	var statusStr string
	var qrURL, bizIDStr, bizName, bizReviewURL sql.NullString
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&c.ID,
		&bizIDStr,
		&c.CardCode,
		&c.Token,
		&c.BatchID,
		&statusStr,
		&qrURL,
		&c.TapCount,
		&c.LastTappedAt,
		&c.ActivatedAt,
		&c.RevokedAt,
		&c.CreatedAt,
		&c.UpdatedAt,
		&bizName,
		&bizReviewURL,
	)
	if err == sql.ErrNoRows {
		return nil, domErr.ErrCardNotFound
	}
	if err != nil {
		return nil, err
	}
	c.Status = valueobject.CardStatus(statusStr)
	if qrURL.Valid {
		c.QRCodeURL = qrURL.String
	}
	if bizIDStr.Valid {
		if parsed, err := uuid.Parse(bizIDStr.String); err == nil {
			c.BusinessID = &parsed
		}
	}
	if bizName.Valid {
		c.BusinessName = bizName.String
	}
	if bizReviewURL.Valid {
		c.GoogleReviewURL = bizReviewURL.String
	}
	return c, nil
}

func (r *PostgresCardRepo) GetByCardCode(ctx context.Context, cardCode string) (*entity.Card, error) {
	query := `
		SELECT 
			c.id, c.business_id, c.card_code, c.token, c.batch_id, c.status, 
			c.qr_code_url, c.tap_count, c.last_tapped_at, c.activated_at, c.revoked_at, 
			c.created_at, c.updated_at,
			b.name AS business_name, b.google_review_url
		FROM cards c
		LEFT JOIN businesses b ON b.id = c.business_id
		WHERE c.card_code = $1
	`
	c := &entity.Card{}
	var statusStr string
	var qrURL, bizIDStr, bizName, bizReviewURL sql.NullString
	err := r.db.QueryRowContext(ctx, query, cardCode).Scan(
		&c.ID,
		&bizIDStr,
		&c.CardCode,
		&c.Token,
		&c.BatchID,
		&statusStr,
		&qrURL,
		&c.TapCount,
		&c.LastTappedAt,
		&c.ActivatedAt,
		&c.RevokedAt,
		&c.CreatedAt,
		&c.UpdatedAt,
		&bizName,
		&bizReviewURL,
	)
	if err == sql.ErrNoRows {
		return nil, domErr.ErrCardNotFound
	}
	if err != nil {
		return nil, err
	}
	c.Status = valueobject.CardStatus(statusStr)
	if qrURL.Valid {
		c.QRCodeURL = qrURL.String
	}
	if bizIDStr.Valid {
		if parsed, err := uuid.Parse(bizIDStr.String); err == nil {
			c.BusinessID = &parsed
		}
	}
	if bizName.Valid {
		c.BusinessName = bizName.String
	}
	if bizReviewURL.Valid {
		c.GoogleReviewURL = bizReviewURL.String
	}
	return c, nil
}

func (r *PostgresCardRepo) List(ctx context.Context, filter domainRepo.CardFilter) ([]*entity.Card, int, error) {
	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if filter.UnassignedOnly {
		whereClauses = append(whereClauses, "c.business_id IS NULL")
	} else if filter.BusinessID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.business_id = $%d", argIdx))
		args = append(args, *filter.BusinessID)
		argIdx++
	}

	if filter.BatchID != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("c.batch_id = $%d", argIdx))
		args = append(args, filter.BatchID)
		argIdx++
	}

	if filter.Status != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("c.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(c.card_code ILIKE $%d OR COALESCE(b.name, '') ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM cards c 
		LEFT JOIN businesses b ON b.id = c.business_id 
		WHERE %s
	`, whereSQL)
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
		SELECT 
			c.id, c.business_id, c.card_code, c.token, c.batch_id, c.status, 
			c.qr_code_url, c.tap_count, c.last_tapped_at, c.activated_at, c.revoked_at, 
			c.created_at, c.updated_at,
			b.name AS business_name, b.google_review_url
		FROM cards c
		LEFT JOIN businesses b ON b.id = c.business_id
		WHERE %s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var cards []*entity.Card
	for rows.Next() {
		c := &entity.Card{}
		var statusStr string
		var qrURL, bizIDStr, bizName, bizReviewURL sql.NullString
		if err := rows.Scan(
			&c.ID,
			&bizIDStr,
			&c.CardCode,
			&c.Token,
			&c.BatchID,
			&statusStr,
			&qrURL,
			&c.TapCount,
			&c.LastTappedAt,
			&c.ActivatedAt,
			&c.RevokedAt,
			&c.CreatedAt,
			&c.UpdatedAt,
			&bizName,
			&bizReviewURL,
		); err != nil {
			return nil, 0, err
		}
		c.Status = valueobject.CardStatus(statusStr)
		if qrURL.Valid {
			c.QRCodeURL = qrURL.String
		}
		if bizIDStr.Valid {
			if parsed, err := uuid.Parse(bizIDStr.String); err == nil {
				c.BusinessID = &parsed
			}
		}
		if bizName.Valid {
			c.BusinessName = bizName.String
		}
		if bizReviewURL.Valid {
			c.GoogleReviewURL = bizReviewURL.String
		}
		cards = append(cards, c)
	}

	return cards, total, nil
}

func (r *PostgresCardRepo) CreateBatch(ctx context.Context, cards []*entity.Card) error {
	if len(cards) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO cards (id, business_id, card_code, token, batch_id, status, qr_code_url, tap_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, c := range cards {
		var bizArg any = nil
		if c.BusinessID != nil {
			bizArg = *c.BusinessID
		}
		_, err := stmt.ExecContext(ctx,
			c.ID,
			bizArg,
			c.CardCode,
			c.Token,
			c.BatchID,
			string(c.Status),
			c.QRCodeURL,
			c.TapCount,
			c.CreatedAt,
			c.UpdatedAt,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *PostgresCardRepo) Update(ctx context.Context, card *entity.Card) error {
	var bizArg any = nil
	if card.BusinessID != nil {
		bizArg = *card.BusinessID
	}

	query := `
		UPDATE cards
		SET business_id = $1, status = $2, qr_code_url = $3, tap_count = $4, last_tapped_at = $5, 
		    activated_at = $6, revoked_at = $7, updated_at = $8
		WHERE id = $9
	`
	_, err := r.db.ExecContext(ctx, query,
		bizArg,
		string(card.Status),
		card.QRCodeURL,
		card.TapCount,
		card.LastTappedAt,
		card.ActivatedAt,
		card.RevokedAt,
		card.UpdatedAt,
		card.ID,
	)
	return err
}

func (r *PostgresCardRepo) IncrementTap(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE cards
		SET tap_count = tap_count + 1, last_tapped_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PostgresCardRepo) GetLastBatchIndex(ctx context.Context) (int, error) {
	query := `SELECT COUNT(DISTINCT batch_id) FROM cards`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}
