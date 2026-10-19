package handler

import (
	"encoding/json"
	"net/http"

	"octo-tap-backend/internal/delivery/http/middleware"
	"octo-tap-backend/internal/delivery/http/response"
	domErr "octo-tap-backend/internal/domain/errors"
	"octo-tap-backend/internal/infrastructure/security"
	"octo-tap-backend/internal/usecase"
)

type AuthHandler struct {
	authUC *usecase.AuthUseCase
}

func NewAuthHandler(authUC *usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{authUC: authUC}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input usecase.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.ErrorJSON(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Failed to parse JSON body")
		return
	}

	if input.Email == "" || input.Password == "" {
		response.ErrorJSON(w, http.StatusBadRequest, "MISSING_FIELDS", "Email and password are required")
		return
	}

	out, err := h.authUC.Login(r.Context(), input)
	if err != nil {
		if err == domErr.ErrInvalidCredentials {
			response.ErrorJSON(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password")
			return
		}
		if err == domErr.ErrAdminInactive {
			response.ErrorJSON(w, http.StatusForbidden, "ADMIN_INACTIVE", "Admin account is deactivated")
			return
		}
		response.ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	response.JSON(w, http.StatusOK, out)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsKey).(*security.Claims)
	if !ok || claims == nil {
		response.ErrorJSON(w, http.StatusUnauthorized, "UNAUTHORIZED", "User context not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"id":        claims.AdminID,
		"email":     claims.Email,
		"full_name": claims.FullName,
		"role":      claims.Role,
	})
}
