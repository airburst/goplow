package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"goplow/internal/handlers"
	"goplow/internal/server"
	"goplow/internal/static"
	"goplow/pkg/browser"
)

func main() {
	// Parse command-line flags
	environment := flag.String("env", "", "Environment configuration to use (e.g., chopin, production)")
	flag.StringVar(environment, "e", "", "Environment configuration to use (shorthand)")
	flag.Parse()

	// Load configuration
	config, err := server.LoadConfig("goplow.toml", *environment)
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

	// Only open browser if not in dev mode (in dev mode, Vite dev server will open)
	if os.Getenv("GOPLOW_DEV_MODE") != "true" {
		// Open browser in a goroutine to avoid blocking
		go func() {
			time.Sleep(500 * time.Millisecond)
			if err := browser.Open(url); err != nil {
				log.Printf("Failed to open browser: %v\n", err)
			}
		}()
	} else {
		log.Printf("Dev mode: Browser opening handled by Vite dev server\n")
	}

	// Create HTTP server
	httpServer := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	// Channel to handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v\n", err)
		}
	}()

	// Wait for shutdown signal
	<-sigChan

	log.Println("\nShutdown signal received, gracefully stopping server...")

	// Create a context with timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Gracefully shutdown the server
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v\n", err)
	}

	log.Println("Server stopped")
	os.Exit(0)
}
