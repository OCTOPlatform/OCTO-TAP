package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	deliveryHttp "octo-tap-backend/internal/delivery/http"
	"octo-tap-backend/internal/infrastructure/config"
	"octo-tap-backend/internal/infrastructure/database"
	"octo-tap-backend/internal/infrastructure/qrcode"
	"octo-tap-backend/internal/infrastructure/repository"
	"octo-tap-backend/internal/infrastructure/security"
	"octo-tap-backend/internal/usecase"
)

func main() {
	// 1. Load configuration
	cfg := config.Load()
	log.Printf("[OCTO TAP] Starting server with config: Port=%s, RedirectBaseURL=%s", cfg.Port, cfg.RedirectBaseURL)

	// 2. Connect to PostgreSQL
	db, err := database.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Fatal: Database connection failed: %v", err)
	}
	defer db.Close()
	log.Println("[OCTO TAP] PostgreSQL connection established successfully.")

	// 3. Auto-migration check
	if cfg.AutoMigrate {
		log.Println("[OCTO TAP] Running auto-migrations...")
		migrator := database.NewMigrator(db, "migrations")
		if err := migrator.Up(); err != nil {
			log.Fatalf("Fatal: Auto-migration failed: %v", err)
		}
		log.Println("[OCTO TAP] Auto-migrations applied successfully.")
	}

	// 4. Infrastructure components
	hasher := security.NewBcryptHasher(0)
	jwtProvider := security.NewJWTProvider(cfg.JWTSecret, cfg.JWTExpirationHour)
	qrGen := qrcode.NewGenerator()

	// 5. Repositories
	adminRepo := repository.NewPostgresAdminRepo(db)
	businessRepo := repository.NewPostgresBusinessRepo(db)
	cardRepo := repository.NewPostgresCardRepo(db)
	prodRepo := repository.NewPostgresProductionEventRepo(db)
	auditRepo := repository.NewPostgresAuditLogRepo(db)
	idempotencyRepo := repository.NewPostgresIdempotencyRepo(db)

	// 6. Use Cases
	authUC := usecase.NewAuthUseCase(adminRepo, hasher, jwtProvider)
	businessUC := usecase.NewBusinessUseCase(businessRepo, auditRepo)
	cardUC := usecase.NewCardUseCase(cardRepo, businessRepo, auditRepo, idempotencyRepo)
	prodUC := usecase.NewProductionUseCase(cardRepo, prodRepo, businessRepo, qrGen, cfg.RedirectBaseURL)
	redirectUC := usecase.NewRedirectUseCase(cardRepo, businessRepo)
	auditUC := usecase.NewAuditUseCase(auditRepo)

	// 7. HTTP Router
	router := deliveryHttp.NewRouter(deliveryHttp.RouterParams{
		AuthUC:       authUC,
		BusinessUC:   businessUC,
		CardUC:       cardUC,
		ProductionUC: prodUC,
		RedirectUC:   redirectUC,
		AuditUC:      auditUC,
		JWTProvider:  jwtProvider,
		FrontendURL:  cfg.FrontendURL,
	})

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 8. Graceful shutdown handler
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[OCTO TAP] Server listening on http://0.0.0.0:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server ListenAndServe error: %v", err)
		}
	}()

	<-stopChan
	log.Println("[OCTO TAP] Shutting down server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("[OCTO TAP] Server exited cleanly.")
}
