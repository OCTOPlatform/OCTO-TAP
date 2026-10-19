package entity_test

import (
	"testing"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domErr "octo-tap-backend/internal/domain/errors"
	"octo-tap-backend/internal/domain/valueobject"
)

func TestCardLifecycleRules(t *testing.T) {
	businessID := uuid.New()
	cardCode := valueobject.CardCode("OCTO-202610-B01-0001")
	token, _ := valueobject.GenerateSecureToken()

	card := entity.NewCard(businessID, cardCode, token, "BATCH-001")

	// 1. Initial status should be DRAFT
	if card.Status != valueobject.CardStatusDraft {
		t.Errorf("Expected initial status DRAFT, got %s", card.Status)
	}

	// 2. Cannot activate directly from DRAFT without QC_PASSED
	err := card.Activate(true)
	if err != domErr.ErrCardNotQCPassed {
		t.Errorf("Expected ErrCardNotQCPassed, got %v", err)
	}

	// 3. Move to READY -> IN_PRODUCTION -> QC_PASSED
	_ = card.TransitionTo(valueobject.CardStatusReady)
	_ = card.TransitionTo(valueobject.CardStatusInProduction)
	_ = card.TransitionTo(valueobject.CardStatusQCPassed)

	// 4. Cannot activate if business is NOT active
	err = card.Activate(false)
	if err != domErr.ErrBusinessNotActive {
		t.Errorf("Expected ErrBusinessNotActive, got %v", err)
	}

	// 5. Activate with active business -> succeeds
	err = card.Activate(true)
	if err != nil {
		t.Errorf("Expected activation to succeed, got %v", err)
	}
	if card.Status != valueobject.CardStatusActive {
		t.Errorf("Expected status ACTIVE, got %s", card.Status)
	}

	// 6. Deactivate -> INACTIVE
	err = card.Deactivate()
	if err != nil {
		t.Errorf("Expected deactivation to succeed, got %v", err)
	}
	if card.Status != valueobject.CardStatusInactive {
		t.Errorf("Expected status INACTIVE, got %s", card.Status)
	}

	// 7. Revoke -> REVOKED (Terminal state)
	err = card.Revoke()
	if err != nil {
		t.Errorf("Expected revocation to succeed, got %v", err)
	}
	if card.Status != valueobject.CardStatusRevoked {
		t.Errorf("Expected status REVOKED, got %s", card.Status)
	}

	// 8. Cannot reactivate revoked card
	err = card.Activate(true)
	if err != domErr.ErrCannotReactivateRevoked {
		t.Errorf("Expected ErrCannotReactivateRevoked, got %v", err)
	}

	// 9. Restore revoked card
	err = card.Restore(true)
	if err != nil {
		t.Errorf("Expected restore to succeed, got %v", err)
	}
	if card.Status != valueobject.CardStatusActive {
		t.Errorf("Expected status ACTIVE, got %s", card.Status)
	}
	if card.RevokedAt != nil {
		t.Errorf("Expected RevokedAt to be nil, got %v", card.RevokedAt)
	}
}
