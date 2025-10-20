package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"goplow/internal/server"
	"goplow/internal/static"
)

// RegisterRoutes registers all HTTP routes
func RegisterRoutes(mux *http.ServeMux, appServer *server.AppServer) {
	mux.HandleFunc("/", HandleIndex)
	mux.HandleFunc("/api/messages", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			HandlePostMessage(w, r, appServer)
		case http.MethodGet:
			HandleGetMessages(w, r, appServer)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		HandleSSE(w, r, appServer)
	})
}

// HandleIndex serves the main HTML page
func HandleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(static.GetHTMLContent()))
}

// HandlePostMessage handles incoming POST requests with analytics events
func HandlePostMessage(w http.ResponseWriter, r *http.Request, appServer *server.AppServer) {
	// Accept both form data (for backward compatibility) and JSON
	contentType := r.Header.Get("Content-Type")

	if contentType == "application/json" {
		// Handle JSON payload (Snowplow format)
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		// Extract schema and data from Snowplow payload
		schema, schemaOk := payload["schema"].(string)
		data, dataOk := payload["data"].([]interface{})

		if !schemaOk || !dataOk {
			http.Error(w, "Missing schema or data field", http.StatusBadRequest)
			return
		}

		// Convert data from []interface{} to []map[string]interface{}
		var eventData []map[string]interface{}
		for _, item := range data {
			if dataMap, ok := item.(map[string]interface{}); ok {
				eventData = append(eventData, dataMap)
			}
		}

		if len(eventData) == 0 {
			http.Error(w, "Invalid data format", http.StatusBadRequest)
			return
		}

		appServer.AddEvent(schema, eventData)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	} else {
		// Handle form data (legacy text message format)
		r.ParseForm()
		message := r.FormValue("message")

		if message == "" {
			http.Error(w, "Message cannot be empty", http.StatusBadRequest)
			return
		}

		appServer.AddMessage(message)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}
}

// HandleGetMessages returns all events as JSON
func HandleGetMessages(w http.ResponseWriter, r *http.Request, appServer *server.AppServer) {
	events := appServer.GetMessages()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// HandleSSE handles Server-Sent Events connections
func HandleSSE(w http.ResponseWriter, r *http.Request, appServer *server.AppServer) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Generate client ID
	clientID := fmt.Sprintf("client_%d", time.Now().UnixNano())

	// Add client to server
	client := appServer.AddSSEClient(clientID, w)
	if client == nil {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Send initial messages (but don't send them via SSE since we load them via REST API first)
	// The client will load existing messages via /api/messages and SSE will handle new ones

	// Keep connection alive until client disconnects
	select {
	case <-r.Context().Done():
		// Client disconnected
		appServer.RemoveSSEClient(clientID)
	case <-client.Done:
		// Server is closing the connection
	}
}
