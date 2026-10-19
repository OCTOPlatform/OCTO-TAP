package repository

import (
	"context"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
)

type CardFilter struct {
	BusinessID     *uuid.UUID
	UnassignedOnly bool
	BatchID        string
	Status         string
	Search         string
	Limit          int
	Offset         int
}

type CardRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Card, error)
	GetByToken(ctx context.Context, token string) (*entity.Card, error)
	GetByCardCode(ctx context.Context, cardCode string) (*entity.Card, error)
	List(ctx context.Context, filter CardFilter) ([]*entity.Card, int, error)
	CreateBatch(ctx context.Context, cards []*entity.Card) error
	Update(ctx context.Context, card *entity.Card) error
	IncrementTap(ctx context.Context, id uuid.UUID) error
	GetLastBatchIndex(ctx context.Context) (int, error)
}
