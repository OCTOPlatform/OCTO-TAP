package entity

import (
	"time"

	"github.com/google/uuid"
)

type ProductionEventType string

const (
	ProdEventQRGenerated ProductionEventType = "QR_GENERATED"
	ProdEventQRPrinted   ProductionEventType = "QR_PRINTED"
	ProdEventNFCWritten  ProductionEventType = "NFC_WRITTEN"
	ProdEventNFCVerified ProductionEventType = "NFC_VERIFIED"
	ProdEventQCPassed    ProductionEventType = "QC_PASSED"
	ProdEventQCFailed    ProductionEventType = "QC_FAILED"
)

type ProductionEvent struct {
	ID          uuid.UUID           `json:"id"`
	CardID      uuid.UUID           `json:"card_id"`
	EventType   ProductionEventType `json:"event_type"`
	PerformedBy *uuid.UUID          `json:"performed_by,omitempty"`
	Payload     map[string]any      `json:"payload"`
	Notes       string              `json:"notes,omitempty"`
	CreatedAt   time.Time           `json:"created_at"`
}

func NewProductionEvent(cardID uuid.UUID, eventType ProductionEventType, performedBy *uuid.UUID, payload map[string]any, notes string) *ProductionEvent {
	if payload == nil {
		payload = make(map[string]any)
	}
	return &ProductionEvent{
		ID:          uuid.New(),
		CardID:      cardID,
		EventType:   eventType,
		PerformedBy: performedBy,
		Payload:     payload,
		Notes:       notes,
		CreatedAt:   time.Now(),
	}
}
