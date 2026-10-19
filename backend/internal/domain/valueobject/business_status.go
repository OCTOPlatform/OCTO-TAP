package valueobject

import "fmt"

type BusinessStatus string

const (
	BusinessStatusPending  BusinessStatus = "PENDING"
	BusinessStatusActive   BusinessStatus = "ACTIVE"
	BusinessStatusInactive BusinessStatus = "INACTIVE"
)

func (s BusinessStatus) IsValid() bool {
	switch s {
	case BusinessStatusPending, BusinessStatusActive, BusinessStatusInactive:
		return true
	default:
		return false
	}
}

func (s BusinessStatus) String() string {
	return string(s)
}

func ParseBusinessStatus(v string) (BusinessStatus, error) {
	status := BusinessStatus(v)
	if !status.IsValid() {
		return "", fmt.Errorf("invalid business status: %s", v)
	}
	return status, nil
}
