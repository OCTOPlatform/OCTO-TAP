package usecase

import (
	"context"

	"octo-tap-backend/internal/domain/entity"
	domainRepo "octo-tap-backend/internal/domain/repository"
)

type AuditUseCase struct {
	auditRepo domainRepo.AuditLogRepository
}

func NewAuditUseCase(auditRepo domainRepo.AuditLogRepository) *AuditUseCase {
	return &AuditUseCase{auditRepo: auditRepo}
}

func (uc *AuditUseCase) ListAuditLogs(ctx context.Context, filter domainRepo.AuditLogFilter) ([]*entity.AuditLog, int, error) {
	return uc.auditRepo.List(ctx, filter)
}
