package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"octo-tap-backend/internal/delivery/http/handler"
	"octo-tap-backend/internal/delivery/http/middleware"
	"octo-tap-backend/internal/delivery/http/response"
	"octo-tap-backend/internal/infrastructure/security"
	"octo-tap-backend/internal/usecase"
)

type RouterParams struct {
	AuthUC       *usecase.AuthUseCase
	BusinessUC   *usecase.BusinessUseCase
	CardUC       *usecase.CardUseCase
	ProductionUC *usecase.ProductionUseCase
	RedirectUC   *usecase.RedirectUseCase
	AuditUC      *usecase.AuditUseCase
	JWTProvider  security.TokenProvider
	FrontendURL  string
}

func NewRouter(params RouterParams) http.Handler {
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// CORS configuration for frontend
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link", "Location", "Idempotency-Key"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Handlers
	authHandler := handler.NewAuthHandler(params.AuthUC)
	businessHandler := handler.NewBusinessHandler(params.BusinessUC, params.CardUC, params.ProductionUC)
	cardHandler := handler.NewCardHandler(params.CardUC, params.ProductionUC)
	prodHandler := handler.NewProductionHandler(params.ProductionUC)
	auditHandler := handler.NewAuditHandler(params.AuditUC)
	redirectHandler := handler.NewRedirectHandler(params.RedirectUC, params.FrontendURL)

	// Auth Middleware
	authMiddleware := middleware.NewAuthMiddleware(params.JWTProvider)

	// 1. Healthcheck
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{
			"status":  "healthy",
			"product": "OCTO Tap API",
		})
	})

	// 2. Public Redirect Endpoints
	r.Get("/r/{token}", redirectHandler.HandleRedirect)
	r.Head("/r/{token}", redirectHandler.HandleRedirect)

	// Public Google Review Link resolution proxy
	r.Post("/api/v1/google-review-link", businessHandler.ResolveGoogleReviewLink)

	// Public inspection endpoint for On-Tap Field Activation
	r.Get("/api/v1/cards/inspect-token", cardHandler.InspectToken)

	// 3. Admin & Sales API (v1)
	r.Route("/api/v1/admin", func(admin chi.Router) {
		// Public Auth
		admin.Post("/auth/login", authHandler.Login)
		admin.Post("/google-review-link", businessHandler.ResolveGoogleReviewLink)

		// Protected Routes
		admin.Group(func(protected chi.Router) {
			protected.Use(authMiddleware.RequireAuth)

			// Auth me
			protected.Get("/auth/me", authHandler.Me)

			// Businesses
			protected.Post("/businesses", businessHandler.Create)
			protected.Get("/businesses", businessHandler.List)
			protected.Get("/businesses/{id}", businessHandler.GetByID)
			protected.Patch("/businesses/{id}", businessHandler.Update)
			protected.Post("/businesses/{id}/verify-url", businessHandler.VerifyURL)
			protected.Post("/businesses/{id}/cards", businessHandler.IssueCards)
			protected.Get("/businesses/{id}/manifest", businessHandler.Manifest)

			// Cards
			protected.Get("/cards", cardHandler.List)
			protected.Post("/cards/issue-stock", cardHandler.IssueStock)
			protected.Get("/cards/{id}", cardHandler.GetByID)
			protected.Post("/cards/{id}/generate-qr", cardHandler.GenerateQR)
			protected.Get("/cards/{id}/qr.png", cardHandler.StreamQRPNG)
			protected.Post("/cards/{id}/production-events", cardHandler.RecordProductionEvent)
			protected.Post("/cards/{id}/activate", cardHandler.Activate)
			protected.Post("/cards/{id}/assign-activate", cardHandler.AssignAndActivate)
			protected.Post("/cards/activate-by-token", cardHandler.ActivateByToken)
			protected.Post("/cards/{id}/deactivate", cardHandler.Deactivate)
			protected.Post("/cards/{id}/revoke", cardHandler.Revoke)
			protected.Post("/cards/{id}/restore", cardHandler.Restore)

			// Manifest
			protected.Get("/manifest", prodHandler.GetManifest)

			// Audit logs
			protected.Get("/audit-logs", auditHandler.List)
		})
	})

	return r
}
