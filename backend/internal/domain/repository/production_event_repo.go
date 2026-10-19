package repository

import (
	"context"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
)

type ProductionEventRepository interface {
	Create(ctx context.Context, event *entity.ProductionEvent) error
	ListByCardID(ctx context.Context, cardID uuid.UUID) ([]*entity.ProductionEvent, error)
}
