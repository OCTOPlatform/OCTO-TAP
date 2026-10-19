package repository

import (
	"context"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
)

type BusinessFilter struct {
	Search string
	Status string
	Limit  int
	Offset int
}

type BusinessRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Business, error)
	List(ctx context.Context, filter BusinessFilter) ([]*entity.Business, int, error)
	Create(ctx context.Context, business *entity.Business) error
	Update(ctx context.Context, business *entity.Business) error
	Delete(ctx context.Context, id uuid.UUID) error
}
