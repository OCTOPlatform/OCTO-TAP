package handler

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	domErr "octo-tap-backend/internal/domain/errors"
	"octo-tap-backend/internal/usecase"
)

type RedirectHandler struct {
	redirectUC  *usecase.RedirectUseCase
	frontendURL string
}

func NewRedirectHandler(redirectUC *usecase.RedirectUseCase, frontendURL string) *RedirectHandler {
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	return &RedirectHandler{
		redirectUC:  redirectUC,
		frontendURL: frontendURL,
	}
}

func (h *RedirectHandler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		http.NotFound(w, r)
		return
	}

	result, err := h.redirectUC.ResolveToken(r.Context(), token)
	if err != nil {
		if err == domErr.ErrCardRevoked {
			// Section 11.2: Kartu dicabut -> 410 Gone
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusGone)
			if r.Method != http.MethodHead {
				_, _ = w.Write([]byte(`
					<!DOCTYPE html>
					<html>
					<head><title>OCTO Tap — Kartu Dicabut</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
					<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc;">
						<h1 style="color: #ef4444;">410 — Kartu Dinonaktifkan Permanen</h1>
						<p style="color: #94a3b8;">Kartu ini telah dicabut (Revoked) dan tidak lagi terhubung ke Google Review bisnis.</p>
					</body>
					</html>
				`))
			}
			return
		}

		if err == domErr.ErrCardNotActive || err == domErr.ErrBusinessNotActive || err == domErr.ErrBusinessNotFound {
			// On-Tap Field Activation: otomatis alihkan ke portal aktivasi sales di frontend
			activateURL := fmt.Sprintf("%s/activate?token=%s", strings.TrimRight(h.frontendURL, "/"), token)
			http.Redirect(w, r, activateURL, http.StatusFound)
			return
		}

		// Unknown token -> 404
		http.NotFound(w, r)
		return
	}

	// 302 Found redirect to verified Google Review URL
	w.Header().Set("Location", result.TargetURL)
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.WriteHeader(http.StatusFound)

	if r.Method != http.MethodHead {
		_, _ = fmt.Fprintf(w, `Redirecting to <a href="%s">%s</a>...`, result.TargetURL, result.TargetURL)
	}
}
