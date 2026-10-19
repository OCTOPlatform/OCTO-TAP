package repository

import (
	"context"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
)

type AdminRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*entity.AdminUser, error)
	GetByEmail(ctx context.Context, email string) (*entity.AdminUser, error)
	Create(ctx context.Context, admin *entity.AdminUser) error
	Update(ctx context.Context, admin *entity.AdminUser) error
}
