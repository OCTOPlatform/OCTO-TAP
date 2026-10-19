package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"octo-tap-backend/internal/delivery/http/response"
	"octo-tap-backend/internal/infrastructure/security"
	"octo-tap-backend/internal/usecase"
)

type contextKey string

const (
	AdminIDKey    contextKey = "admin_id"
	AdminEmailKey contextKey = "admin_email"
	ClaimsKey     contextKey = "admin_claims"
)

type AuthMiddleware struct {
	jwtProvider security.TokenProvider
}

func NewAuthMiddleware(jwtProvider security.TokenProvider) *AuthMiddleware {
	return &AuthMiddleware{jwtProvider: jwtProvider}
}

func (m *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			// Support token query parameter for file downloads (e.g. /qr.png?token=...)
			if qToken := r.URL.Query().Get("token"); qToken != "" {
				authHeader = "Bearer " + qToken
			}
		}

		if authHeader == "" {
			response.ErrorJSON(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing Authorization header")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.ErrorJSON(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid Authorization header format. Expected 'Bearer <token>'")
			return
		}

		tokenString := parts[1]
		claims, err := m.jwtProvider.Validate(tokenString)
		if err != nil {
			response.ErrorJSON(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired token: "+err.Error())
			return
		}

		ctx := context.WithValue(r.Context(), AdminIDKey, claims.AdminID)
		ctx = context.WithValue(ctx, AdminEmailKey, claims.Email)
		ctx = context.WithValue(ctx, ClaimsKey, claims)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func ExtractRequestMeta(r *http.Request) usecase.RequestMeta {
	adminID, _ := r.Context().Value(AdminIDKey).(uuid.UUID)
	adminEmail, _ := r.Context().Value(AdminEmailKey).(string)

	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}

	return usecase.RequestMeta{
		AdminID:    adminID,
		AdminEmail: adminEmail,
		IPAddress:  ip,
		UserAgent:  r.UserAgent(),
	}
}
