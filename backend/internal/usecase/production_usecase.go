package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/domain/valueobject"
	"octo-tap-backend/internal/infrastructure/qrcode"
)

type ProductionUseCase struct {
	cardRepo        domainRepo.CardRepository
	prodRepo        domainRepo.ProductionEventRepository
	businessRepo    domainRepo.BusinessRepository
	qrGen           qrcode.QRCodeGenerator
	redirectBaseURL string
}

func NewProductionUseCase(
	cardRepo domainRepo.CardRepository,
	prodRepo domainRepo.ProductionEventRepository,
	businessRepo domainRepo.BusinessRepository,
	qrGen qrcode.QRCodeGenerator,
	redirectBaseURL string,
) *ProductionUseCase {
	return &ProductionUseCase{
		cardRepo:        cardRepo,
		prodRepo:        prodRepo,
		businessRepo:    businessRepo,
		qrGen:           qrGen,
		redirectBaseURL: redirectBaseURL,
	}
}

type RecordProductionEventInput struct {
	EventType string         `json:"event_type"`
	Payload   map[string]any `json:"payload"`
	Notes     string         `json:"notes"`
}

type ProductionManifestItem struct {
	CardID       string `json:"card_id"`
	CardCode     string `json:"card_code"`
	BusinessID   string `json:"business_id"`
	BusinessName string `json:"business_name"`
	Token        string `json:"token"`
	RedirectURL  string `json:"redirect_url"`
	NFCURL       string `json:"nfc_url"`
	Status       string `json:"status"`
	QRCodeURL    string `json:"qr_code_url,omitempty"`
}

func (uc *ProductionUseCase) GenerateQR(ctx context.Context, cardID uuid.UUID) (string, []byte, error) {
	card, err := uc.cardRepo.GetByID(ctx, cardID)
	if err != nil {
		return "", nil, err
	}

	redirectURL := fmt.Sprintf("%s/r/%s", strings.TrimRight(uc.redirectBaseURL, "/"), card.Token)

	pngBytes, err := uc.qrGen.GeneratePNG(redirectURL, 512)
	if err != nil {
		return "", nil, err
	}

	base64QR, err := uc.qrGen.GenerateBase64PNG(redirectURL, 512)
	if err != nil {
		return "", nil, err
	}

	card.QRCodeURL = base64QR
	if card.Status == valueobject.CardStatusDraft {
		_ = card.TransitionTo(valueobject.CardStatusReady)
	}
	_ = uc.cardRepo.Update(ctx, card)

	// Record production event
	event := entity.NewProductionEvent(
		card.ID,
		entity.ProdEventQRGenerated,
		nil,
		map[string]any{
			"redirect_url": redirectURL,
		},
		"QR Code generated successfully",
	)
	_ = uc.prodRepo.Create(ctx, event)

	return base64QR, pngBytes, nil
}

func (uc *ProductionUseCase) RecordEvent(
	ctx context.Context,
	cardID uuid.UUID,
	input RecordProductionEventInput,
	meta RequestMeta,
) (*entity.ProductionEvent, error) {
	card, err := uc.cardRepo.GetByID(ctx, cardID)
	if err != nil {
		return nil, err
	}

	expectedRedirectURL := fmt.Sprintf("%s/r/%s", strings.TrimRight(uc.redirectBaseURL, "/"), card.Token)

	eventType := entity.ProductionEventType(input.EventType)
	payload := input.Payload
	if payload == nil {
		payload = make(map[string]any)
	}

	// Logic for specific event types
	switch eventType {
	case entity.ProdEventNFCWritten:
		payload["expected_url"] = expectedRedirectURL
		if card.Status == valueobject.CardStatusReady || card.Status == valueobject.CardStatusDraft {
			_ = card.TransitionTo(valueobject.CardStatusInProduction)
			_ = uc.cardRepo.Update(ctx, card)
		}

	case entity.ProdEventNFCVerified:
		readURL, _ := payload["read_url"].(string)
		if readURL == "" {
			readURL, _ = payload["url"].(string)
		}
		if readURL != expectedRedirectURL {
			// Record QC failure
			failEvent := entity.NewProductionEvent(
				card.ID,
				entity.ProdEventQCFailed,
				&meta.AdminID,
				map[string]any{
					"reason":       "URL mismatch",
					"read_url":     readURL,
					"expected_url": expectedRedirectURL,
				},
				"NFC verification URL mismatch",
			)
			_ = uc.prodRepo.Create(ctx, failEvent)
			return nil, domErr.ErrURLMismatch
		}
		payload["verified"] = true
		payload["expected_url"] = expectedRedirectURL

	case entity.ProdEventQCPassed:
		if err := card.TransitionTo(valueobject.CardStatusQCPassed); err != nil {
			return nil, err
		}
		_ = uc.cardRepo.Update(ctx, card)

	case entity.ProdEventQCFailed:
		_ = card.TransitionTo(valueobject.CardStatusInProduction)
		_ = uc.cardRepo.Update(ctx, card)
	}

	event := entity.NewProductionEvent(
		card.ID,
		eventType,
		&meta.AdminID,
		payload,
		input.Notes,
	)
	if err := uc.prodRepo.Create(ctx, event); err != nil {
		return nil, err
	}

	return event, nil
}

func (uc *ProductionUseCase) GetEventsByCardID(ctx context.Context, cardID uuid.UUID) ([]*entity.ProductionEvent, error) {
	return uc.prodRepo.ListByCardID(ctx, cardID)
}

func (uc *ProductionUseCase) GetProductionManifest(
	ctx context.Context,
	businessID *uuid.UUID,
	batchID string,
) ([]ProductionManifestItem, error) {
	filter := domainRepo.CardFilter{
		BusinessID: businessID,
		BatchID:    batchID,
		Limit:      500,
	}

	cards, _, err := uc.cardRepo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	items := make([]ProductionManifestItem, 0, len(cards))
	for _, c := range cards {
		redirectURL := fmt.Sprintf("%s/r/%s", strings.TrimRight(uc.redirectBaseURL, "/"), c.Token)
		bizIDStr := ""
		if c.BusinessID != nil {
			bizIDStr = c.BusinessID.String()
		}
		bizName := c.BusinessName
		if bizName == "" {
			bizName = "Stok Gudang (Belum Terhubung)"
		}

		items = append(items, ProductionManifestItem{
			CardID:       c.ID.String(),
			CardCode:     c.CardCode,
			BusinessID:   bizIDStr,
			BusinessName: bizName,
			Token:        c.Token,
			RedirectURL:  redirectURL,
			NFCURL:       redirectURL,
			Status:       string(c.Status),
			QRCodeURL:    c.QRCodeURL,
		})
	}

	return items, nil
}
