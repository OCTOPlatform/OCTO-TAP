package repository

import (
	"context"

	"octo-tap-backend/internal/domain/entity"
)

type AuditLogFilter struct {
	EntityType string
	EntityID   string
	Action     string
	AdminEmail string
	Limit      int
	Offset     int
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *entity.AuditLog) error
	List(ctx context.Context, filter AuditLogFilter) ([]*entity.AuditLog, int, error)
}
