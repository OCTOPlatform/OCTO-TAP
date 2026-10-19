package usecase

import (
	"context"

	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/domain/valueobject"
)

type RedirectUseCase struct {
	cardRepo     domainRepo.CardRepository
	businessRepo domainRepo.BusinessRepository
}

func NewRedirectUseCase(
	cardRepo domainRepo.CardRepository,
	businessRepo domainRepo.BusinessRepository,
) *RedirectUseCase {
	return &RedirectUseCase{
		cardRepo:     cardRepo,
		businessRepo: businessRepo,
	}
}

type RedirectResult struct {
	TargetURL    string
	CardID       string
	BusinessName string
}

func (uc *RedirectUseCase) ResolveToken(ctx context.Context, token string) (*RedirectResult, error) {
	card, err := uc.cardRepo.GetByToken(ctx, token)
	if err != nil {
		return nil, domErr.ErrCardNotFound // 404
	}

	if card.Status == valueobject.CardStatusRevoked {
		return nil, domErr.ErrCardRevoked // 410
	}

	if card.Status != valueobject.CardStatusActive {
		return nil, domErr.ErrCardNotActive // Non-active card
	}

	if card.BusinessID == nil {
		return nil, domErr.ErrBusinessNotFound
	}

	business, err := uc.businessRepo.GetByID(ctx, *card.BusinessID)
	if err != nil {
		return nil, domErr.ErrBusinessNotFound
	}

	if !business.IsActive() {
		return nil, domErr.ErrBusinessNotActive
	}

	// Increment tap count in background
	go func() {
		_ = uc.cardRepo.IncrementTap(context.Background(), card.ID)
	}()

	return &RedirectResult{
		TargetURL:    business.GoogleReviewURL,
		CardID:       card.ID.String(),
		BusinessName: business.Name,
	}, nil
}
