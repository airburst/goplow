package main

import (
	"log"
	"net/http"
	"time"

	"goplow/internal/handlers"
	"goplow/internal/server"
	"goplow/internal/static"
	"goplow/pkg/browser"
)

func main() {
	// Load configuration
	config, err := server.LoadConfig("config.toml")
	if err != nil {
		log.Fatalf("Error loading config: %v\n", err)
	}

	// Create the application server
	appServer := server.New(config)

	// Create a new ServeMux for routing
	mux := http.NewServeMux()

	// Register route handlers
	handlers.RegisterRoutes(mux, appServer)

	// Register static file routes
	static.RegisterStaticRoutes(mux)

	// Get server address and URL
	addr := appServer.GetAddr()
	url := appServer.GetURL()

	log.Printf("Starting server on %s\n", addr)
	log.Printf("Opening browser to %s\n", url)

	// Open browser in a goroutine to avoid blocking
	go func() {
		time.Sleep(500 * time.Millisecond)
		if err := browser.Open(url); err != nil {
			log.Printf("Failed to open browser: %v\n", err)
		}
	}()

	// Start the server
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server error: %v\n", err)
	}
}
