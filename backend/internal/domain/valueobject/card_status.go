package valueobject

import "fmt"

type CardStatus string

const (
	CardStatusDraft        CardStatus = "DRAFT"
	CardStatusReady        CardStatus = "READY"
	CardStatusInProduction CardStatus = "IN_PRODUCTION"
	CardStatusQCPassed     CardStatus = "QC_PASSED"
	CardStatusActive       CardStatus = "ACTIVE"
	CardStatusInactive     CardStatus = "INACTIVE"
	CardStatusRevoked      CardStatus = "REVOKED"
)

func (s CardStatus) IsValid() bool {
	switch s {
	case CardStatusDraft, CardStatusReady, CardStatusInProduction,
		CardStatusQCPassed, CardStatusActive, CardStatusInactive, CardStatusRevoked:
		return true
	default:
		return false
	}
}

func (s CardStatus) String() string {
	return string(s)
}

func ParseCardStatus(v string) (CardStatus, error) {
	status := CardStatus(v)
	if !status.IsValid() {
		return "", fmt.Errorf("invalid card status: %s", v)
	}
	return status, nil
}
