package main

import (
	"fmt"
	"log"
	"os"

	"octo-tap-backend/internal/infrastructure/config"
	"octo-tap-backend/internal/infrastructure/database"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run cmd/migrate/main.go <up|down|status>")
		os.Exit(1)
	}

	command := os.Args[1]
	cfg := config.Load()

	db, err := database.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}
	defer db.Close()

	migrationsDir := "migrations"
	migrator := database.NewMigrator(db, migrationsDir)

	switch command {
	case "up":
		fmt.Println("Running migrations UP...")
		if err := migrator.Up(); err != nil {
			log.Fatalf("Migration UP failed: %v", err)
		}
		fmt.Println("Migrations applied successfully!")

	case "down":
		fmt.Println("Rolling back last migration (DOWN)...")
		if err := migrator.Down(); err != nil {
			log.Fatalf("Migration DOWN failed: %v", err)
		}
		fmt.Println("Migration rolled back successfully!")

	case "status":
		statuses, err := migrator.Status()
		if err != nil {
			log.Fatalf("Failed to retrieve migration status: %v", err)
		}
		fmt.Println("\n=== Schema Migrations Status ===")
		fmt.Printf("%-8s %-35s %-10s %s\n", "VERSION", "NAME", "STATUS", "APPLIED AT")
		fmt.Println("--------------------------------------------------------------------------------")
		for _, s := range statuses {
			statusStr := "Pending"
			appliedTime := "-"
			if s.Applied {
				statusStr = "Applied"
				appliedTime = s.AppliedAt.Format("2006-01-02 15:04:05 MST")
			}
			fmt.Printf("%-8d %-35s %-10s %s\n", s.Version, s.Name, statusStr, appliedTime)
		}
		fmt.Println("")

	default:
		fmt.Printf("Unknown command: %s. Use up, down, or status.\n", command)
		os.Exit(1)
	}
}
