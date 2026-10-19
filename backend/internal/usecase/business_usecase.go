package usecase

import (
	"context"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/domain/valueobject"
)

type BusinessUseCase struct {
	businessRepo domainRepo.BusinessRepository
	auditRepo    domainRepo.AuditLogRepository
}

func NewBusinessUseCase(
	businessRepo domainRepo.BusinessRepository,
	auditRepo domainRepo.AuditLogRepository,
) *BusinessUseCase {
	return &BusinessUseCase{
		businessRepo: businessRepo,
		auditRepo:    auditRepo,
	}
}

type CreateBusinessInput struct {
	Name            string `json:"name"`
	GoogleReviewURL string `json:"google_review_url"`
}

type UpdateBusinessInput struct {
	Name            string `json:"name"`
	GoogleReviewURL string `json:"google_review_url"`
	Status          string `json:"status"`
}

type RequestMeta struct {
	AdminID    uuid.UUID
	AdminEmail string
	IPAddress  string
	UserAgent  string
}

func (uc *BusinessUseCase) CreateBusiness(ctx context.Context, input CreateBusinessInput, meta RequestMeta) (*entity.Business, error) {
	reviewURL, err := valueobject.NewGoogleReviewURL(input.GoogleReviewURL)
	if err != nil {
		return nil, err
	}

	business := entity.NewBusiness(input.Name, reviewURL)
	if err := uc.businessRepo.Create(ctx, business); err != nil {
		return nil, err
	}

	// Record audit log
	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"BUSINESS_CREATED",
		"business",
		business.ID.String(),
		nil,
		map[string]any{
			"name":              business.Name,
			"google_review_url": business.GoogleReviewURL,
			"status":            string(business.Status),
		},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return business, nil
}

func (uc *BusinessUseCase) GetBusiness(ctx context.Context, id uuid.UUID) (*entity.Business, error) {
	return uc.businessRepo.GetByID(ctx, id)
}

func (uc *BusinessUseCase) ListBusinesses(ctx context.Context, filter domainRepo.BusinessFilter) ([]*entity.Business, int, error) {
	return uc.businessRepo.List(ctx, filter)
}

func (uc *BusinessUseCase) UpdateBusiness(ctx context.Context, id uuid.UUID, input UpdateBusinessInput, meta RequestMeta) (*entity.Business, error) {
	existing, err := uc.businessRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	oldValues := map[string]any{
		"name":              existing.Name,
		"google_review_url": existing.GoogleReviewURL,
		"status":            string(existing.Status),
	}

	if input.Name != "" {
		existing.Name = input.Name
	}

	if input.GoogleReviewURL != "" {
		reviewURL, err := valueobject.NewGoogleReviewURL(input.GoogleReviewURL)
		if err != nil {
			return nil, err
		}
		existing.UpdateReviewURL(reviewURL)
	}

	if input.Status != "" {
		newStatus, err := valueobject.ParseBusinessStatus(input.Status)
		if err != nil {
			return nil, err
		}
		existing.Status = newStatus
	}

	if err := uc.businessRepo.Update(ctx, existing); err != nil {
		return nil, err
	}

	newValues := map[string]any{
		"name":              existing.Name,
		"google_review_url": existing.GoogleReviewURL,
		"status":            string(existing.Status),
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"BUSINESS_UPDATED",
		"business",
		existing.ID.String(),
		oldValues,
		newValues,
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return existing, nil
}

func (uc *BusinessUseCase) VerifyURL(ctx context.Context, id uuid.UUID, meta RequestMeta) (*entity.Business, error) {
	business, err := uc.businessRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	oldStatus := string(business.Status)
	business.Verify(meta.AdminID)

	if err := uc.businessRepo.Update(ctx, business); err != nil {
		return nil, err
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"BUSINESS_URL_VERIFIED",
		"business",
		business.ID.String(),
		map[string]any{"status": oldStatus},
		map[string]any{"status": string(business.Status), "verified_at": business.VerifiedAt},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return business, nil
}
