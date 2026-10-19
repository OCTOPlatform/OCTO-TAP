package entity

import (
	"time"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/valueobject"
)

type Business struct {
	ID              uuid.UUID                  `json:"id"`
	Name            string                     `json:"name"`
	GoogleReviewURL string                     `json:"google_review_url"`
	Status          valueobject.BusinessStatus `json:"status"`
	VerifiedAt      *time.Time                 `json:"verified_at,omitempty"`
	VerifiedBy      *uuid.UUID                 `json:"verified_by,omitempty"`
	TotalCards      int                        `json:"total_cards,omitempty"`
	ActiveCards     int                        `json:"active_cards,omitempty"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

func NewBusiness(name string, reviewURL valueobject.GoogleReviewURL) *Business {
	now := time.Now()
	return &Business{
		ID:              uuid.New(),
		Name:            name,
		GoogleReviewURL: reviewURL.String(),
		Status:          valueobject.BusinessStatusPending,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

func (b *Business) Verify(adminID uuid.UUID) {
	now := time.Now()
	b.Status = valueobject.BusinessStatusActive
	b.VerifiedAt = &now
	b.VerifiedBy = &adminID
	b.UpdatedAt = now
}

func (b *Business) UpdateReviewURL(newURL valueobject.GoogleReviewURL) {
	b.GoogleReviewURL = newURL.String()
	b.UpdatedAt = time.Now()
}

func (b *Business) IsActive() bool {
	return b.Status == valueobject.BusinessStatusActive
}
