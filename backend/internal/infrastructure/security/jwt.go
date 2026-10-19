package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"octo-tap-backend/internal/domain/entity"
)

type Claims struct {
	AdminID  uuid.UUID `json:"admin_id"`
	Email    string    `json:"email"`
	FullName string    `json:"full_name"`
	Role     string    `json:"role"`
	jwt.RegisteredClaims
}

type TokenProvider interface {
	Generate(admin *entity.AdminUser) (string, error)
	Validate(tokenString string) (*Claims, error)
}

type JWTProvider struct {
	secret         []byte
	expirationHour int
}

func NewJWTProvider(secret string, expirationHour int) *JWTProvider {
	return &JWTProvider{
		secret:         []byte(secret),
		expirationHour: expirationHour,
	}
}

func (j *JWTProvider) Generate(admin *entity.AdminUser) (string, error) {
	expirationTime := time.Now().Add(time.Duration(j.expirationHour) * time.Hour)
	role := admin.Role
	if role == "" {
		role = "ADMIN"
	}
	claims := &Claims{
		AdminID:  admin.ID,
		Email:    admin.Email,
		FullName: admin.FullName,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "octo-tap-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

func (j *JWTProvider) Validate(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return j.secret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
