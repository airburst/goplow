package utils

import (
	"encoding/base64"
	"fmt"
)

// DecodeBase64 decodes a base64-encoded string and returns the decoded value as a string.
// If decoding fails, it returns an error.
func DecodeBase64(base64Value string) (string, error) {
	bytes, err := base64.StdEncoding.DecodeString(base64Value)
	if err != nil {
		return "", fmt.Errorf("unable to decode base64: %w", err)
	}
	return string(bytes), nil
}

// DecodeBase64Field attempts to decode a field value if it's a string.
// If the field is not a string or decoding fails, it returns the original value and an error.
func DecodeBase64Field(value interface{}) (interface{}, error) {
	if str, ok := value.(string); ok {
		decoded, err := DecodeBase64(str)
		if err != nil {
			return value, err
		}
		return decoded, nil
	}
	return value, nil
}
