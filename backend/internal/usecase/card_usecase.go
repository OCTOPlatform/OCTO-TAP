package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/domain/valueobject"
)

type CardUseCase struct {
	cardRepo        domainRepo.CardRepository
	businessRepo    domainRepo.BusinessRepository
	auditRepo       domainRepo.AuditLogRepository
	idempotencyRepo domainRepo.IdempotencyRepository
}

func NewCardUseCase(
	cardRepo domainRepo.CardRepository,
	businessRepo domainRepo.BusinessRepository,
	auditRepo domainRepo.AuditLogRepository,
	idempotencyRepo domainRepo.IdempotencyRepository,
) *CardUseCase {
	return &CardUseCase{
		cardRepo:        cardRepo,
		businessRepo:    businessRepo,
		auditRepo:       auditRepo,
		idempotencyRepo: idempotencyRepo,
	}
}

type BatchIssueCardsInput struct {
	Quantity       int    `json:"quantity"`
	IdempotencyKey string `json:"idempotency_key"`
}

type BatchIssueCardsOutput struct {
	BatchID      string         `json:"batch_id"`
	BusinessID   string         `json:"business_id"`
	BusinessName string         `json:"business_name"`
	Count        int            `json:"count"`
	Cards        []*entity.Card `json:"cards"`
}

func (uc *CardUseCase) BatchIssueCards(
	ctx context.Context,
	businessID uuid.UUID,
	input BatchIssueCardsInput,
	meta RequestMeta,
) (*BatchIssueCardsOutput, error) {
	if input.Quantity <= 0 {
		input.Quantity = 1
	}
	if input.Quantity > 200 {
		return nil, fmt.Errorf("maximum 200 cards per batch issuance")
	}

	// 1. Check idempotency key if provided
	if input.IdempotencyKey != "" {
		cached, err := uc.idempotencyRepo.Get(ctx, input.IdempotencyKey)
		if err == nil && cached != "" {
			var out BatchIssueCardsOutput
			if err := json.Unmarshal([]byte(cached), &out); err == nil {
				return &out, nil
			}
		}
	}

	// 2. Verify business exists
	business, err := uc.businessRepo.GetByID(ctx, businessID)
	if err != nil {
		return nil, err
	}

	// 3. Determine batch index and create batch ID
	batchIndex, _ := uc.cardRepo.GetLastBatchIndex(ctx)
	batchIndex++
	batchID := fmt.Sprintf("BATCH-%04d%02d-%03d", time.Now().Year(), time.Now().Month(), batchIndex)

	cards := make([]*entity.Card, 0, input.Quantity)
	for i := 1; i <= input.Quantity; i++ {
		// Generate CSPRNG token with retry loop on collision
		var token valueobject.Token
		var tokErr error
		for attempt := 0; attempt < 5; attempt++ {
			token, tokErr = valueobject.GenerateSecureToken()
			if tokErr != nil {
				return nil, tokErr
			}
			// Check if token exists
			_, err := uc.cardRepo.GetByToken(ctx, token.String())
			if err == domErr.ErrCardNotFound {
				break
			}
			if attempt == 4 {
				return nil, domErr.ErrDuplicateToken
			}
		}

		cardCode := valueobject.GenerateCardCode(batchIndex, i)
		card := entity.NewCard(businessID, cardCode, token, batchID)
		card.BusinessName = business.Name
		card.GoogleReviewURL = business.GoogleReviewURL
		cards = append(cards, card)
	}

	// 4. Batch insert into database
	if err := uc.cardRepo.CreateBatch(ctx, cards); err != nil {
		return nil, fmt.Errorf("failed to batch create cards: %w", err)
	}

	out := &BatchIssueCardsOutput{
		BatchID:      batchID,
		BusinessID:   businessID.String(),
		BusinessName: business.Name,
		Count:        len(cards),
		Cards:        cards,
	}

	// 5. Save idempotency key if provided
	if input.IdempotencyKey != "" {
		bodyBytes, _ := json.Marshal(out)
		_ = uc.idempotencyRepo.Save(ctx, input.IdempotencyKey, "cards_batch", string(bodyBytes))
	}

	// 6. Record audit log
	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARDS_BATCH_ISSUED",
		"batch",
		batchID,
		nil,
		map[string]any{
			"business_id":   businessID.String(),
			"business_name": business.Name,
			"batch_id":      batchID,
			"quantity":      input.Quantity,
		},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return out, nil
}

func (uc *CardUseCase) ListCards(ctx context.Context, filter domainRepo.CardFilter) ([]*entity.Card, int, error) {
	return uc.cardRepo.List(ctx, filter)
}

func (uc *CardUseCase) GetCard(ctx context.Context, id uuid.UUID) (*entity.Card, error) {
	return uc.cardRepo.GetByID(ctx, id)
}

func (uc *CardUseCase) ActivateCard(ctx context.Context, id uuid.UUID, meta RequestMeta) (*entity.Card, error) {
	card, err := uc.cardRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if card.BusinessID == nil {
		return nil, fmt.Errorf("kartu stok belum dihubungkan ke bisnis. Gunakan menu Hubungkan & Aktifkan")
	}

	business, err := uc.businessRepo.GetByID(ctx, *card.BusinessID)
	if err != nil {
		return nil, err
	}

	oldStatus := string(card.Status)
	if err := card.Activate(business.IsActive()); err != nil {
		return nil, err
	}

	if err := uc.cardRepo.Update(ctx, card); err != nil {
		return nil, err
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARD_ACTIVATED",
		"card",
		card.ID.String(),
		map[string]any{"status": oldStatus},
		map[string]any{"status": string(card.Status), "activated_at": card.ActivatedAt},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return card, nil
}

func (uc *CardUseCase) DeactivateCard(ctx context.Context, id uuid.UUID, meta RequestMeta) (*entity.Card, error) {
	card, err := uc.cardRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	oldStatus := string(card.Status)
	if err := card.Deactivate(); err != nil {
		return nil, err
	}

	if err := uc.cardRepo.Update(ctx, card); err != nil {
		return nil, err
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARD_DEACTIVATED",
		"card",
		card.ID.String(),
		map[string]any{"status": oldStatus},
		map[string]any{"status": string(card.Status)},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return card, nil
}

func (uc *CardUseCase) RevokeCard(ctx context.Context, id uuid.UUID, meta RequestMeta) (*entity.Card, error) {
	card, err := uc.cardRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	oldStatus := string(card.Status)
	if err := card.Revoke(); err != nil {
		return nil, err
	}

	if err := uc.cardRepo.Update(ctx, card); err != nil {
		return nil, err
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARD_REVOKED",
		"card",
		card.ID.String(),
		map[string]any{"status": oldStatus},
		map[string]any{"status": string(card.Status), "revoked_at": card.RevokedAt},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return card, nil
}

func (uc *CardUseCase) RestoreCard(ctx context.Context, id uuid.UUID, meta RequestMeta) (*entity.Card, error) {
	card, err := uc.cardRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	businessIsActive := false
	if card.BusinessID != nil {
		business, err := uc.businessRepo.GetByID(ctx, *card.BusinessID)
		if err == nil && business.IsActive() {
			businessIsActive = true
		}
	}

	oldStatus := string(card.Status)
	if err := card.Restore(businessIsActive); err != nil {
		return nil, err
	}

	if err := uc.cardRepo.Update(ctx, card); err != nil {
		return nil, err
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARD_RESTORED",
		"card",
		card.ID.String(),
		map[string]any{"status": oldStatus},
		map[string]any{"status": string(card.Status), "restored_at": time.Now()},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return card, nil
}

type IssueStockCardsInput struct {
	Quantity       int    `json:"quantity"`
	IdempotencyKey string `json:"idempotency_key"`
}

func (uc *CardUseCase) BatchIssueStockCards(
	ctx context.Context,
	input IssueStockCardsInput,
	meta RequestMeta,
) (*BatchIssueCardsOutput, error) {
	if input.Quantity <= 0 {
		input.Quantity = 1
	}
	if input.Quantity > 500 {
		return nil, fmt.Errorf("maximum 500 cards per stock batch")
	}

	if input.IdempotencyKey != "" {
		cached, err := uc.idempotencyRepo.Get(ctx, input.IdempotencyKey)
		if err == nil && cached != "" {
			var out BatchIssueCardsOutput
			if err := json.Unmarshal([]byte(cached), &out); err == nil {
				return &out, nil
			}
		}
	}

	batchIndex, _ := uc.cardRepo.GetLastBatchIndex(ctx)
	batchIndex++
	batchID := fmt.Sprintf("STOCK-%04d%02d-%03d", time.Now().Year(), time.Now().Month(), batchIndex)

	cards := make([]*entity.Card, 0, input.Quantity)
	for i := 1; i <= input.Quantity; i++ {
		var token valueobject.Token
		var tokErr error
		for attempt := 0; attempt < 5; attempt++ {
			token, tokErr = valueobject.GenerateSecureToken()
			if tokErr != nil {
				return nil, tokErr
			}
			_, err := uc.cardRepo.GetByToken(ctx, token.String())
			if err == domErr.ErrCardNotFound {
				break
			}
			if attempt == 4 {
				return nil, domErr.ErrDuplicateToken
			}
		}

		cardCode := valueobject.GenerateCardCode(batchIndex, i)
		card := entity.NewStockCard(cardCode, token, batchID)
		cards = append(cards, card)
	}

	if err := uc.cardRepo.CreateBatch(ctx, cards); err != nil {
		return nil, fmt.Errorf("failed to batch create stock cards: %w", err)
	}

	out := &BatchIssueCardsOutput{
		BatchID:      batchID,
		BusinessID:   "",
		BusinessName: "Stok Gudang (Belum Terhubung)",
		Count:        len(cards),
		Cards:        cards,
	}

	if input.IdempotencyKey != "" {
		bodyBytes, _ := json.Marshal(out)
		_ = uc.idempotencyRepo.Save(ctx, input.IdempotencyKey, "cards_stock_batch", string(bodyBytes))
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARDS_STOCK_BATCH_ISSUED",
		"batch",
		batchID,
		nil,
		map[string]any{
			"batch_id": batchID,
			"quantity": input.Quantity,
			"model":    "MODEL_B_PRE_PRINTED",
		},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return out, nil
}

type AssignAndActivateInput struct {
	BusinessID      *uuid.UUID `json:"business_id,omitempty"`
	BusinessName    string     `json:"business_name,omitempty"`
	GoogleReviewURL string     `json:"google_review_url,omitempty"`
}

func (uc *CardUseCase) AssignAndActivateCard(
	ctx context.Context,
	cardID uuid.UUID,
	input AssignAndActivateInput,
	meta RequestMeta,
) (*entity.Card, error) {
	card, err := uc.cardRepo.GetByID(ctx, cardID)
	if err != nil {
		return nil, err
	}

	if card.Status == valueobject.CardStatusRevoked {
		return nil, domErr.ErrCannotReactivateRevoked
	}

	var targetBiz *entity.Business

	if input.BusinessID != nil {
		biz, err := uc.businessRepo.GetByID(ctx, *input.BusinessID)
		if err != nil {
			return nil, err
		}
		if !biz.IsActive() {
			biz.Verify(meta.AdminID)
			_ = uc.businessRepo.Update(ctx, biz)
		}
		targetBiz = biz
	} else if input.BusinessName != "" && input.GoogleReviewURL != "" {
		reviewURL, err := valueobject.NewGoogleReviewURL(input.GoogleReviewURL)
		if err != nil {
			return nil, err
		}
		newBiz := entity.NewBusiness(input.BusinessName, reviewURL)
		newBiz.Verify(meta.AdminID) // Auto-verify on assignment
		if err := uc.businessRepo.Create(ctx, newBiz); err != nil {
			return nil, err
		}
		targetBiz = newBiz
	} else {
		return nil, fmt.Errorf("pilih bisnis tujuan atau masukkan nama bisnis dan URL Google Review")
	}

	// Assign to card and activate
	card.AssignBusiness(targetBiz.ID)
	card.BusinessName = targetBiz.Name
	card.GoogleReviewURL = targetBiz.GoogleReviewURL

	now := time.Now()
	card.Status = valueobject.CardStatusActive
	card.ActivatedAt = &now
	card.UpdatedAt = now

	if err := uc.cardRepo.Update(ctx, card); err != nil {
		return nil, err
	}

	audit := entity.NewAuditLog(
		&meta.AdminID,
		meta.AdminEmail,
		"CARD_ASSIGNED_AND_ACTIVATED",
		"card",
		card.ID.String(),
		map[string]any{"previous_status": string(card.Status)},
		map[string]any{
			"business_id":       targetBiz.ID.String(),
			"business_name":     targetBiz.Name,
			"google_review_url": targetBiz.GoogleReviewURL,
			"status":            string(card.Status),
			"activated_at":      card.ActivatedAt,
		},
		meta.IPAddress,
		meta.UserAgent,
	)
	_ = uc.auditRepo.Create(ctx, audit)

	return card, nil
}

func (uc *CardUseCase) GetCardByToken(ctx context.Context, token string) (*entity.Card, error) {
	if token == "" {
		return nil, domErr.ErrNotFound
	}
	return uc.cardRepo.GetByToken(ctx, token)
}

type ActivateByTokenInput struct {
	Token           string `json:"token"`
	BusinessName    string `json:"business_name"`
	GoogleReviewURL string `json:"google_review_url"`
}

func (uc *CardUseCase) ActivateCardByToken(
	ctx context.Context,
	input ActivateByTokenInput,
	meta RequestMeta,
) (*entity.Card, error) {
	if input.Token == "" {
		return nil, fmt.Errorf("token wajib diisi")
	}
	card, err := uc.cardRepo.GetByToken(ctx, input.Token)
	if err != nil {
		return nil, err
	}
	return uc.AssignAndActivateCard(ctx, card.ID, AssignAndActivateInput{
		BusinessName:    input.BusinessName,
		GoogleReviewURL: input.GoogleReviewURL,
	}, meta)
}
