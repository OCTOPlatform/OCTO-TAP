package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"octo-tap-backend/internal/delivery/http/middleware"
	"octo-tap-backend/internal/delivery/http/response"
	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/usecase"
)

type CardHandler struct {
	cardUC       *usecase.CardUseCase
	productionUC *usecase.ProductionUseCase
}

func NewCardHandler(cardUC *usecase.CardUseCase, productionUC *usecase.ProductionUseCase) *CardHandler {
	return &CardHandler{
		cardUC:       cardUC,
		productionUC: productionUC,
	}
}

func (h *CardHandler) List(w http.ResponseWriter, r *http.Request) {
	businessIDStr := r.URL.Query().Get("business_id")
	var businessID *uuid.UUID
	if businessIDStr != "" {
		if id, err := uuid.Parse(businessIDStr); err == nil {
			businessID = &id
		}
	}

	batchID := r.URL.Query().Get("batch_id")
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	unassignedOnly := r.URL.Query().Get("unassigned") == "true" || businessIDStr == "unassigned"

	filter := domainRepo.CardFilter{
		BusinessID:     businessID,
		UnassignedOnly: unassignedOnly,
		BatchID:        batchID,
		Status:         status,
		Search:         search,
		Limit:          limit,
		Offset:         offset,
	}

	cards, total, err := h.cardUC.ListCards(r.Context(), filter)
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSONWithMeta(w, http.StatusOK, cards, response.PaginationMeta{
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

func (h *CardHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	card, err := h.cardUC.GetCard(r.Context(), id)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	// Fetch production events for complete audit/production history
	events, _ := h.productionUC.GetEventsByCardID(r.Context(), id)

	response.JSON(w, http.StatusOK, map[string]any{
		"card":   card,
		"events": events,
	})
}

func (h *CardHandler) GenerateQR(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	base64QR, _, err := h.productionUC.GenerateQR(r.Context(), id)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		response.ErrorJSON(w, http.StatusInternalServerError, "QR_GEN_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"card_id":     id,
		"qr_code_url": base64QR,
	})
}

func (h *CardHandler) StreamQRPNG(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}

	_, pngBytes, err := h.productionUC.GenerateQR(r.Context(), id)
	if err != nil {
		http.Error(w, "QR generation failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-qr.png\"", idStr))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pngBytes)
}

func (h *CardHandler) RecordProductionEvent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	var input usecase.RecordProductionEventInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	if input.EventType == "" {
		response.ErrorJSON(w, http.StatusBadRequest, "MISSING_EVENT_TYPE", "'event_type' is required")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	event, err := h.productionUC.RecordEvent(r.Context(), id, input, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		if err == domErr.ErrURLMismatch {
			response.ErrorJSON(w, http.StatusConflict, "URL_MISMATCH", "Scanned NFC/QR URL does not match card redirect URL")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "EVENT_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, event)
}

func (h *CardHandler) Activate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	card, err := h.cardUC.ActivateCard(r.Context(), id, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		if err == domErr.ErrCardNotQCPassed {
			response.ErrorJSON(w, http.StatusUnprocessableEntity, "QC_NOT_PASSED", "Card must pass QC verification before activation")
			return
		}
		if err == domErr.ErrBusinessNotActive {
			response.ErrorJSON(w, http.StatusUnprocessableEntity, "BUSINESS_NOT_ACTIVE", "Associated business is not active")
			return
		}
		if err == domErr.ErrCannotReactivateRevoked {
			response.ErrorJSON(w, http.StatusGone, "CARD_REVOKED", "Revoked cards cannot be activated")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "ACTIVATION_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, card)
}

func (h *CardHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	card, err := h.cardUC.DeactivateCard(r.Context(), id, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		if err == domErr.ErrCannotReactivateRevoked {
			response.ErrorJSON(w, http.StatusGone, "CARD_REVOKED", "Revoked cards cannot be changed")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "DEACTIVATION_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, card)
}

func (h *CardHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	card, err := h.cardUC.RevokeCard(r.Context(), id, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "REVOKE_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, card)
}

func (h *CardHandler) Restore(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	card, err := h.cardUC.RestoreCard(r.Context(), id, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		if err == domErr.ErrCardNotRevoked {
			response.ErrorJSON(w, http.StatusBadRequest, "CARD_NOT_REVOKED", err.Error())
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "RESTORE_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, card)
}

func (h *CardHandler) IssueStock(w http.ResponseWriter, r *http.Request) {
	var input usecase.IssueStockCardsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	if headerKey := r.Header.Get("Idempotency-Key"); headerKey != "" {
		input.IdempotencyKey = headerKey
	}

	meta := middleware.ExtractRequestMeta(r)
	out, err := h.cardUC.BatchIssueStockCards(r.Context(), input, meta)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "BATCH_STOCK_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, out)
}

func (h *CardHandler) AssignAndActivate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid card ID format")
		return
	}

	var input usecase.AssignAndActivateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	card, err := h.cardUC.AssignAndActivateCard(r.Context(), id, input, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Card not found")
			return
		}
		if err == domErr.ErrCannotReactivateRevoked {
			response.ErrorJSON(w, http.StatusGone, "CARD_REVOKED", "Revoked cards cannot be changed")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "ASSIGN_ACTIVATE_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, card)
}

func (h *CardHandler) InspectToken(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		response.ErrorJSON(w, http.StatusBadRequest, "MISSING_TOKEN", "Parameter token wajib diisi")
		return
	}

	card, err := h.cardUC.GetCardByToken(r.Context(), token)
	if err != nil {
		response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Kartu tidak ditemukan")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"id":                card.ID,
		"card_code":         card.CardCode,
		"token":             card.Token,
		"status":            card.Status,
		"batch_id":          card.BatchID,
		"is_assigned":       card.BusinessID != nil,
		"business_id":       card.BusinessID,
		"business_name":     card.BusinessName,
		"google_review_url": card.GoogleReviewURL,
	})
}

func (h *CardHandler) ActivateByToken(w http.ResponseWriter, r *http.Request) {
	var input usecase.ActivateByTokenInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Format JSON tidak valid")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	card, err := h.cardUC.ActivateCardByToken(r.Context(), input, meta)
	if err != nil {
		if err == domErr.ErrCardNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "CARD_NOT_FOUND", "Kartu tidak ditemukan")
			return
		}
		if err == domErr.ErrCannotReactivateRevoked {
			response.ErrorJSON(w, http.StatusGone, "CARD_REVOKED", "Kartu telah dicabut dan tidak dapat diaktifkan")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "ACTIVATION_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, card)
}
