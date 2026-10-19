package qrcode

import (
	"encoding/base64"
	"fmt"

	skip2qr "github.com/skip2/go-qrcode"
)

type QRCodeGenerator interface {
	GeneratePNG(content string, size int) ([]byte, error)
	GenerateBase64PNG(content string, size int) (string, error)
}

type Generator struct{}

func NewGenerator() *Generator {
	return &Generator{}
}

func (g *Generator) GeneratePNG(content string, size int) ([]byte, error) {
	if size <= 0 {
		size = 512
	}
	pngData, err := skip2qr.Encode(content, skip2qr.Medium, size)
	if err != nil {
		return nil, fmt.Errorf("failed to encode qr code: %w", err)
	}
	return pngData, nil
}

func (g *Generator) GenerateBase64PNG(content string, size int) (string, error) {
	pngData, err := g.GeneratePNG(content, size)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("data:image/png;base64,%s", base64.StdEncoding.EncodeToString(pngData)), nil
}
