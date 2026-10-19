package entity

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID         uuid.UUID      `json:"id"`
	AdminID    *uuid.UUID     `json:"admin_id,omitempty"`
	AdminEmail string         `json:"admin_email"`
	Action     string         `json:"action"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	OldValues  map[string]any `json:"old_values,omitempty"`
	NewValues  map[string]any `json:"new_values,omitempty"`
	IPAddress  string         `json:"ip_address,omitempty"`
	UserAgent  string         `json:"user_agent,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

func NewAuditLog(
	adminID *uuid.UUID,
	adminEmail string,
	action string,
	entityType string,
	entityID string,
	oldValues map[string]any,
	newValues map[string]any,
	ipAddress string,
	userAgent string,
) *AuditLog {
	return &AuditLog{
		ID:         uuid.New(),
		AdminID:    adminID,
		AdminEmail: adminEmail,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		OldValues:  oldValues,
		NewValues:  newValues,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		CreatedAt:  time.Now(),
	}
}
