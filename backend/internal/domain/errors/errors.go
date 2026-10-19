package errors

import "errors"

var (
	ErrNotFound               = errors.New("resource not found")
	ErrUnauthorized           = errors.New("unauthorized access")
	ErrInvalidCredentials     = errors.New("invalid email or password")
	ErrAdminInactive          = errors.New("admin account is inactive")
	ErrBusinessNotFound       = errors.New("business not found")
	ErrBusinessNotActive      = errors.New("business is not active")
	ErrCardNotFound           = errors.New("card not found")
	ErrCardNotActive          = errors.New("card is not active")
	ErrCardRevoked            = errors.New("card is revoked")
	ErrCardNotQCPassed        = errors.New("card must pass QC before activation")
	ErrCannotReactivateRevoked = errors.New("revoked cards cannot be reactivated")
	ErrInvalidStatusTransition= errors.New("invalid status transition")
	ErrDuplicateCardCode      = errors.New("card code already exists")
	ErrDuplicateToken         = errors.New("card token collision detected")
	ErrDuplicateEmail         = errors.New("admin email already exists")
	ErrIdempotencyConflict    = errors.New("request already processed with different payload")
	ErrURLMismatch            = errors.New("scanned NFC/QR URL does not match card redirect URL")
	ErrCardNotRevoked         = errors.New("only revoked cards can be restored")
)
