package entity

import (
	"time"

	"github.com/google/uuid"
)

type AdminUser struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Role         string    `json:"role"` // ADMIN, SALES
	Status       string    `json:"status"` // ACTIVE, INACTIVE
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (a *AdminUser) IsActive() bool {
	return a.Status == "ACTIVE"
}

func (a *AdminUser) IsAdmin() bool {
	return a.Role == "" || a.Role == "ADMIN"
}

func (a *AdminUser) IsSales() bool {
	return a.Role == "SALES"
}
