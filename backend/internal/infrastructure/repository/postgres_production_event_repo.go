package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domainRepo "octo-tap-backend/internal/domain/repository"
)

type PostgresProductionEventRepo struct {
	db *sql.DB
}

func NewPostgresProductionEventRepo(db *sql.DB) domainRepo.ProductionEventRepository {
	return &PostgresProductionEventRepo{db: db}
}

func (r *PostgresProductionEventRepo) Create(ctx context.Context, event *entity.ProductionEvent) error {
	payloadJSON, err := json.Marshal(event.Payload)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO production_events (id, card_id, event_type, performed_by, payload, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err = r.db.ExecContext(ctx, query,
		event.ID,
		event.CardID,
		string(event.EventType),
		event.PerformedBy,
		payloadJSON,
		event.Notes,
		event.CreatedAt,
	)
	return err
}

func (r *PostgresProductionEventRepo) ListByCardID(ctx context.Context, cardID uuid.UUID) ([]*entity.ProductionEvent, error) {
	query := `
		SELECT id, card_id, event_type, performed_by, payload, notes, created_at
		FROM production_events
		WHERE card_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entity.ProductionEvent
	for rows.Next() {
		e := &entity.ProductionEvent{}
		var eventTypeStr string
		var payloadBytes []byte
		var notes sql.NullString
		if err := rows.Scan(
			&e.ID,
			&e.CardID,
			&eventTypeStr,
			&e.PerformedBy,
			&payloadBytes,
			&notes,
			&e.CreatedAt,
		); err != nil {
			return nil, err
		}
		e.EventType = entity.ProductionEventType(eventTypeStr)
		if len(payloadBytes) > 0 {
			_ = json.Unmarshal(payloadBytes, &e.Payload)
		}
		if notes.Valid {
			e.Notes = notes.String
		}
		events = append(events, e)
	}

	return events, nil
}
