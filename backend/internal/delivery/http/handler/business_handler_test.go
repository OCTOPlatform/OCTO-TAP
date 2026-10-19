package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"octo-tap-backend/internal/delivery/http/handler"
)

func TestResolveGoogleReviewLink_Validation(t *testing.T) {
	h := handler.NewBusinessHandler(nil, nil, nil)

	t.Run("missing maps_url", func(t *testing.T) {
		body := bytes.NewBufferString(`{"maps_url": ""}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/google-review-link", body)
		w := httptest.NewRecorder()

		h.ResolveGoogleReviewLink(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", w.Code)
		}
	})

	t.Run("already writereview URL", func(t *testing.T) {
		reviewURL := "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4"
		payload, _ := json.Marshal(map[string]string{"maps_url": reviewURL})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/google-review-link", bytes.NewBuffer(payload))
		w := httptest.NewRecorder()

		h.ResolveGoogleReviewLink(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", w.Code)
		}

		var res map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		if res["review_url"] != reviewURL {
			t.Errorf("expected review_url %s, got %v", reviewURL, res["review_url"])
		}
	})

	t.Run("upstream Productmate resolution", func(t *testing.T) {
		mapsURL := "https://www.google.com/maps/place/PRODUCTMATE/data=!1s0x47b18f1cae867bab:0xb6f8b3a3753ba1a2!8m2"
		payload, _ := json.Marshal(map[string]string{"maps_url": mapsURL})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/google-review-link", bytes.NewBuffer(payload))
		w := httptest.NewRecorder()

		h.ResolveGoogleReviewLink(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 OK from upstream, got %d. Body: %s", w.Code, w.Body.String())
		}

		var res map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		reviewURL, ok := res["review_url"].(string)
		if !ok || reviewURL == "" {
			t.Fatalf("expected non-empty review_url, got %v", res)
		}
		if res["place_id"] != "ChIJq3uGrhyPsUcRoqE7daOz-LY" {
			t.Errorf("expected place_id ChIJq3uGrhyPsUcRoqE7daOz-LY, got %v", res["place_id"])
		}
	})
}
