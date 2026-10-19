package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"octo-tap-backend/internal/delivery/http/middleware"
	"octo-tap-backend/internal/delivery/http/response"
	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/usecase"
)

type BusinessHandler struct {
	businessUC   *usecase.BusinessUseCase
	cardUC       *usecase.CardUseCase
	productionUC *usecase.ProductionUseCase
}

func NewBusinessHandler(
	businessUC *usecase.BusinessUseCase,
	cardUC *usecase.CardUseCase,
	productionUC *usecase.ProductionUseCase,
) *BusinessHandler {
	return &BusinessHandler{
		businessUC:   businessUC,
		cardUC:       cardUC,
		productionUC: productionUC,
	}
}

func (h *BusinessHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input usecase.CreateBusinessInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	if input.Name == "" || input.GoogleReviewURL == "" {
		response.ErrorJSON(w, http.StatusBadRequest, "MISSING_FIELDS", "Both 'name' and 'google_review_url' are required")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	b, err := h.businessUC.CreateBusiness(r.Context(), input, meta)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, b)
}

func (h *BusinessHandler) List(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	status := r.URL.Query().Get("status")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 20
	}

	filter := domainRepo.BusinessFilter{
		Search: search,
		Status: status,
		Limit:  limit,
		Offset: offset,
	}

	businesses, total, err := h.businessUC.ListBusinesses(r.Context(), filter)
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSONWithMeta(w, http.StatusOK, businesses, response.PaginationMeta{
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

func (h *BusinessHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid business ID format")
		return
	}

	b, err := h.businessUC.GetBusiness(r.Context(), id)
	if err != nil {
		if err == domErr.ErrBusinessNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "BUSINESS_NOT_FOUND", "Business not found")
			return
		}
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, b)
}

func (h *BusinessHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid business ID format")
		return
	}

	var input usecase.UpdateBusinessInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	b, err := h.businessUC.UpdateBusiness(r.Context(), id, input, meta)
	if err != nil {
		if err == domErr.ErrBusinessNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "BUSINESS_NOT_FOUND", "Business not found")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "UPDATE_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, b)
}

func (h *BusinessHandler) VerifyURL(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid business ID format")
		return
	}

	meta := middleware.ExtractRequestMeta(r)
	b, err := h.businessUC.VerifyURL(r.Context(), id, meta)
	if err != nil {
		if err == domErr.ErrBusinessNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "BUSINESS_NOT_FOUND", "Business not found")
			return
		}
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, b)
}

func (h *BusinessHandler) IssueCards(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	businessID, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid business ID format")
		return
	}

	var input usecase.BatchIssueCardsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	// Idempotency Key can be passed either in header "Idempotency-Key" or in JSON body
	if headerKey := r.Header.Get("Idempotency-Key"); headerKey != "" {
		input.IdempotencyKey = headerKey
	}

	meta := middleware.ExtractRequestMeta(r)
	out, err := h.cardUC.BatchIssueCards(r.Context(), businessID, input, meta)
	if err != nil {
		if err == domErr.ErrBusinessNotFound {
			response.ErrorJSON(w, http.StatusNotFound, "BUSINESS_NOT_FOUND", "Business not found")
			return
		}
		response.ErrorJSON(w, http.StatusBadRequest, "BATCH_ISSUE_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, out)
}

func (h *BusinessHandler) Manifest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	businessID, err := uuid.Parse(idStr)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_UUID", "Invalid business ID format")
		return
	}

	manifest, err := h.productionUC.GetProductionManifest(r.Context(), &businessID, "")
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, manifest)
}

func (h *BusinessHandler) ResolveGoogleReviewLink(w http.ResponseWriter, r *http.Request) {
	var input struct {
		MapsURL string `json:"maps_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	trimmed := strings.TrimSpace(input.MapsURL)
	if trimmed == "" {
		response.ErrorJSON(w, http.StatusBadRequest, "MISSING_MAPS_URL", "'maps_url' is required")
		return
	}

	// If already a writereview URL, return immediately matching Productmate response schema
	if strings.Contains(trimmed, "search.google.com/local/writereview") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"review_url":   trimmed,
			"verification": "not_verified",
		})
		return
	}

	reqBody, err := json.Marshal(map[string]string{"maps_url": trimmed})
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://productmate.com/api/v1/google-review-link", bytes.NewBuffer(reqBody))
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		response.ErrorJSON(w, http.StatusBadGateway, "UPSTREAM_ERROR", "Failed to contact Productmate API: "+err.Error())
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
