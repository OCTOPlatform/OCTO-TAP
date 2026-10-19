package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	JWTExpirationHour int
	RedirectBaseURL   string
	FrontendURL       string
	AutoMigrate       bool
}

func Load() *Config {
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://egichandrapratama@localhost:5432/octo_tap_db?sslmode=disable")
	jwtSecret := getEnv("JWT_SECRET", "super-secret-octo-tap-jwt-key-2026")
	jwtHours, _ := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))
	if jwtHours == 0 {
		jwtHours = 24
	}
	redirectBaseURL := getEnv("REDIRECT_BASE_URL", "http://localhost:8080")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
	autoMigrate := getEnv("AUTO_MIGRATE", "true") == "true"

	return &Config{
		Port:              port,
		DatabaseURL:       dbURL,
		JWTSecret:         jwtSecret,
		JWTExpirationHour: jwtHours,
		RedirectBaseURL:   redirectBaseURL,
		FrontendURL:       frontendURL,
		AutoMigrate:       autoMigrate,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
