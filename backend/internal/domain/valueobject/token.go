package valueobject

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
)

type Token string

func GenerateSecureToken() (Token, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", errors.New("failed to generate secure random bytes: " + err.Error())
	}
	// RawURLEncoding produces URL-safe base64 without padding (around 43 characters)
	encoded := base64.RawURLEncoding.EncodeToString(bytes)
	return Token(encoded), nil
}

func (t Token) String() string {
	return string(t)
}

func (t Token) IsValid() bool {
	return len(t) >= 32
}
