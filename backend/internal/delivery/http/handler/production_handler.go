package handler

import (
	"net/http"

	"github.com/google/uuid"
	"octo-tap-backend/internal/delivery/http/response"
	"octo-tap-backend/internal/usecase"
)

type ProductionHandler struct {
	productionUC *usecase.ProductionUseCase
}

func NewProductionHandler(productionUC *usecase.ProductionUseCase) *ProductionHandler {
	return &ProductionHandler{productionUC: productionUC}
}

func (h *ProductionHandler) GetManifest(w http.ResponseWriter, r *http.Request) {
	businessIDStr := r.URL.Query().Get("business_id")
	var businessID *uuid.UUID
	if businessIDStr != "" {
		if id, err := uuid.Parse(businessIDStr); err == nil {
			businessID = &id
		}
	}

	batchID := r.URL.Query().Get("batch_id")

	manifest, err := h.productionUC.GetProductionManifest(r.Context(), businessID, batchID)
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, manifest)
}
