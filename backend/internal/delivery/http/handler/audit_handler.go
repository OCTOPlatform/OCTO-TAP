package handler

import (
	"net/http"
	"strconv"

	"octo-tap-backend/internal/delivery/http/response"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/usecase"
)

type AuditHandler struct {
	auditUC *usecase.AuditUseCase
}

func NewAuditHandler(auditUC *usecase.AuditUseCase) *AuditHandler {
	return &AuditHandler{auditUC: auditUC}
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	entityType := r.URL.Query().Get("entity_type")
	entityID := r.URL.Query().Get("entity_id")
	action := r.URL.Query().Get("action")
	adminEmail := r.URL.Query().Get("admin_email")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	filter := domainRepo.AuditLogFilter{
		EntityType: entityType,
		EntityID:   entityID,
		Action:     action,
		AdminEmail: adminEmail,
		Limit:      limit,
		Offset:     offset,
	}

	logs, total, err := h.auditUC.ListAuditLogs(r.Context(), filter)
	if err != nil {
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSONWithMeta(w, http.StatusOK, logs, response.PaginationMeta{
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}
