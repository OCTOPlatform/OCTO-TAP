package valueobject_test

import (
	"testing"

	"octo-tap-backend/internal/domain/valueobject"
)

func TestGoogleReviewURLValidation(t *testing.T) {
	validURLs := []string{
		"https://g.page/r/CbKenanganReviewSample/review",
		"https://maps.app.goo.gl/abcdef12345",
		"https://goo.gl/maps/xyz987",
		"https://share.google/xREn4TLLI7NlUYvfA",
		"https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
		"https://www.google.com/maps/place/SomeBusiness",
	}

	for _, u := range validURLs {
		parsed, err := valueobject.NewGoogleReviewURL(u)
		if err != nil {
			t.Errorf("Expected valid URL for %s, got error: %v", u, err)
		}
		if parsed.String() != u {
			t.Errorf("Expected %s, got %s", u, parsed.String())
		}
	}

	// Test raw Place ID expansion
	placeIDTests := []struct {
		input    string
		expected string
	}{
		{
			input:    "ChIJN1t_tDeuEmsRUsoyG83frY4",
			expected: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
		},
		{
			input:    "placeid:ChIJvS-KBgDraS4RKenltnVEAl0",
			expected: "https://search.google.com/local/writereview?placeid=ChIJvS-KBgDraS4RKenltnVEAl0",
		},
		{
			input:    "placeid=ChIJvS-KBgDraS4RKenltnVEAl0",
			expected: "https://search.google.com/local/writereview?placeid=ChIJvS-KBgDraS4RKenltnVEAl0",
		},
	}
	for _, tc := range placeIDTests {
		res, err := valueobject.NewGoogleReviewURL(tc.input)
		if err != nil {
			t.Errorf("Expected Place ID %s to be valid, got %v", tc.input, err)
		}
		if res.String() != tc.expected {
			t.Errorf("Expected %s, got %s", tc.expected, res.String())
		}
	}

	invalidURLs := []string{
		"http://g.page/r/insecure",                                 // HTTP not HTTPS
		"https://attacker.com/fake-review",                         // Disallowed domain (open redirect prevention)
		"https://google.com.attacker.com/review",                   // Phishing subdomain
		"ftp://g.page/something",                                   // Disallowed scheme
		"",                                                         // Empty
		"not-a-url",                                                // Invalid syntax
	}

	for _, u := range invalidURLs {
		_, err := valueobject.NewGoogleReviewURL(u)
		if err == nil {
			t.Errorf("Expected error for invalid URL %s, but got nil", u)
		}
	}
}

func TestSecureTokenGeneration(t *testing.T) {
	token1, err := valueobject.GenerateSecureToken()
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	token2, err := valueobject.GenerateSecureToken()
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token1 == token2 {
		t.Errorf("Tokens must be cryptographically unique, got identical tokens")
	}

	if !token1.IsValid() {
		t.Errorf("Generated token is invalid: %s", token1)
	}

	// 32 bytes in Base64 URL-safe is ~43 chars
	if len(token1.String()) < 40 {
		t.Errorf("Token length too short: %d", len(token1.String()))
	}
}
