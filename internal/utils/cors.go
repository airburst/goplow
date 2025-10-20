package utils

import (
	"net/http"
	"strings"
)

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigin    string
	AllowedMethods   []string
	AllowCredentials bool
}

// NewCORSConfig creates a new CORS configuration with defaults
func NewCORSConfig(origin string) *CORSConfig {
	if origin == "" {
		origin = "http://localhost:3000"
	}
	return &CORSConfig{
		AllowedOrigin:    origin,
		AllowedMethods:   []string{"POST", "GET", "OPTIONS"},
		AllowCredentials: true,
	}
}

// CORSMiddleware returns a middleware function that handles CORS headers
func CORSMiddleware(corsConfig *CORSConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Set CORS headers
			w.Header().Set("Access-Control-Allow-Origin", corsConfig.AllowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", strings.Join(corsConfig.AllowedMethods, ", "))
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if corsConfig.AllowCredentials {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			// Handle preflight requests
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ApplyCORS applies CORS headers directly to a response writer
func ApplyCORS(w http.ResponseWriter, corsConfig *CORSConfig) {
	w.Header().Set("Access-Control-Allow-Origin", corsConfig.AllowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", strings.Join(corsConfig.AllowedMethods, ", "))
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if corsConfig.AllowCredentials {
		w.Header().Set("Access-Control-Allow-Credentials", "true")
	}
}
