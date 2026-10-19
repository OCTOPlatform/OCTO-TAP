package entity

import (
	"time"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/errors"
	"octo-tap-backend/internal/domain/valueobject"
)

type Card struct {
	ID              uuid.UUID              `json:"id"`
	BusinessID      *uuid.UUID             `json:"business_id,omitempty"`
	BusinessName    string                 `json:"business_name,omitempty"`
	GoogleReviewURL string                 `json:"google_review_url,omitempty"`
	CardCode        string                 `json:"card_code"`
	Token           string                 `json:"token"`
	BatchID         string                 `json:"batch_id"`
	Status          valueobject.CardStatus `json:"status"`
	QRCodeURL       string                 `json:"qr_code_url,omitempty"`
	TapCount        int                    `json:"tap_count"`
	LastTappedAt    *time.Time             `json:"last_tapped_at,omitempty"`
	ActivatedAt     *time.Time             `json:"activated_at,omitempty"`
	RevokedAt       *time.Time             `json:"revoked_at,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

func NewCard(businessID uuid.UUID, cardCode valueobject.CardCode, token valueobject.Token, batchID string) *Card {
	now := time.Now()
	return &Card{
		ID:         uuid.New(),
		BusinessID: &businessID,
		CardCode:   cardCode.String(),
		Token:      token.String(),
		BatchID:    batchID,
		Status:     valueobject.CardStatusDraft,
		TapCount:   0,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

func NewStockCard(cardCode valueobject.CardCode, token valueobject.Token, batchID string) *Card {
	now := time.Now()
	return &Card{
		ID:         uuid.New(),
		BusinessID: nil,
		CardCode:   cardCode.String(),
		Token:      token.String(),
		BatchID:    batchID,
		Status:     valueobject.CardStatusDraft,
		TapCount:   0,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

func (c *Card) AssignBusiness(businessID uuid.UUID) {
	c.BusinessID = &businessID
	c.UpdatedAt = time.Now()
}

func (c *Card) Activate(businessIsActive bool) error {
	if c.Status == valueobject.CardStatusRevoked {
		return errors.ErrCannotReactivateRevoked
	}
	if c.BusinessID == nil {
		return errors.ErrBusinessNotFound
	}
	if !businessIsActive {
		return errors.ErrBusinessNotActive
	}
	if c.Status != valueobject.CardStatusQCPassed && c.Status != valueobject.CardStatusInactive {
		return errors.ErrCardNotQCPassed
	}

	now := time.Now()
	c.Status = valueobject.CardStatusActive
	c.ActivatedAt = &now
	c.UpdatedAt = now
	return nil
}

func (c *Card) Deactivate() error {
	if c.Status == valueobject.CardStatusRevoked {
		return errors.ErrCannotReactivateRevoked
	}
	c.Status = valueobject.CardStatusInactive
	c.UpdatedAt = time.Now()
	return nil
}

func (c *Card) Revoke() error {
	now := time.Now()
	c.Status = valueobject.CardStatusRevoked
	c.RevokedAt = &now
	c.UpdatedAt = now
	return nil
}

func (c *Card) Restore(businessIsActive bool) error {
	if c.Status != valueobject.CardStatusRevoked {
		return errors.ErrCardNotRevoked
	}
	now := time.Now()
	c.RevokedAt = nil
	c.UpdatedAt = now
	if c.BusinessID != nil && businessIsActive {
		c.Status = valueobject.CardStatusActive
		if c.ActivatedAt == nil {
			c.ActivatedAt = &now
		}
	} else if c.BusinessID != nil {
		c.Status = valueobject.CardStatusInactive
	} else {
		c.Status = valueobject.CardStatusQCPassed
	}
	return nil
}

func (c *Card) RecordTap() {
	now := time.Now()
	c.TapCount++
	c.LastTappedAt = &now
}

func (c *Card) TransitionTo(newStatus valueobject.CardStatus) error {
	if c.Status == valueobject.CardStatusRevoked {
		return errors.ErrCannotReactivateRevoked
	}
	c.Status = newStatus
	c.UpdatedAt = time.Now()
	return nil
}
