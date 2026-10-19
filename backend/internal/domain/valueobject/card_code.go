package valueobject

import (
	"fmt"
	"strings"
	"time"
)

type CardCode string

func GenerateCardCode(batchIndex int, seq int) CardCode {
	t := time.Now()
	// Format: OCTO-YYYYMM-B01-0001
	return CardCode(fmt.Sprintf("OCTO-%04d%02d-B%02d-%04d", t.Year(), t.Month(), batchIndex, seq))
}

func (c CardCode) String() string {
	return string(c)
}

func (c CardCode) IsValid() bool {
	str := strings.TrimSpace(string(c))
	return len(str) >= 8 && strings.HasPrefix(str, "OCTO-")
}
