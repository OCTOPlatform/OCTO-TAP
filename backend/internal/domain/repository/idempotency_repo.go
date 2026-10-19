package repository

import (
	"context"
)

type IdempotencyRepository interface {
	Get(ctx context.Context, key string) (string, error)
	Save(ctx context.Context, key string, resourceType string, responseBody string) error
}
