package valueobject

import (
	"errors"
	"net/url"
	"strings"
)

var (
	ErrInvalidURLScheme = errors.New("URL must use HTTPS protocol")
	ErrDisallowedHost   = errors.New("URL must be a valid Google Review or Google Maps link (e.g. share.google, maps.app.goo.gl, g.page, search.google.com)")
	ErrEmptyURL         = errors.New("URL cannot be empty")
)

var allowedGoogleHosts = []string{
	"share.google",
	"maps.app.goo.gl",
	"g.page",
	"goo.gl",
	"g.co",
	"search.google.com",
	"google.com",
	"www.google.com",
	"maps.google.com",
	"business.google.com",
	"google.co.id",
	"maps.google.co.id",
	"www.google.co.id",
}

type GoogleReviewURL string

func NewGoogleReviewURL(raw string) (GoogleReviewURL, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", ErrEmptyURL
	}

	// Auto-expand Place ID if provided directly (e.g. ChIJ..., placeid:..., placeid=...)
	cleanPlaceID := trimmed
	if strings.HasPrefix(cleanPlaceID, "placeid=") {
		cleanPlaceID = strings.TrimPrefix(cleanPlaceID, "placeid=")
	} else if strings.HasPrefix(cleanPlaceID, "placeid:") {
		cleanPlaceID = strings.TrimPrefix(cleanPlaceID, "placeid:")
	}

	if (strings.HasPrefix(cleanPlaceID, "ChIJ") || strings.HasPrefix(cleanPlaceID, "GhIJ")) && !strings.Contains(cleanPlaceID, "/") && !strings.Contains(cleanPlaceID, " ") {
		trimmed = "https://search.google.com/local/writereview?placeid=" + cleanPlaceID
	}

	parsed, err := url.ParseRequestURI(trimmed)
	if err != nil {
		return "", errors.New("malformed URL syntax: " + err.Error())
	}

	if strings.ToLower(parsed.Scheme) != "https" {
		return "", ErrInvalidURLScheme
	}

	host := strings.ToLower(parsed.Hostname())
	matched := false
	for _, allowed := range allowedGoogleHosts {
		if host == allowed || strings.HasSuffix(host, "."+allowed) {
			matched = true
			break
		}
	}

	if !matched {
		// Also allow regional Google domains (e.g. google.co.id, google.com.sg) or subdomains of share.google
		if strings.HasSuffix(host, ".google.com") ||
			strings.HasSuffix(host, ".google.co.id") ||
			strings.HasSuffix(host, "share.google") ||
			strings.HasSuffix(host, ".share.google") {
			matched = true
		}
	}

	if !matched {
		return "", ErrDisallowedHost
	}

	return GoogleReviewURL(trimmed), nil
}

func (u GoogleReviewURL) String() string {
	return string(u)
}
