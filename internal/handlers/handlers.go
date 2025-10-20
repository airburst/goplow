package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"goplow/internal/server"
	"goplow/internal/static"
	"goplow/internal/utils"
)

// RegisterRoutes registers all HTTP routes
func RegisterRoutes(mux *http.ServeMux, appServer *server.AppServer) {
	// Set the event transformer for SSE broadcast
	appServer.SetEventTransformer(transformEventForDisplay)

	mux.HandleFunc("/", HandleIndex)

	// Get the configured events endpoint
	eventsEndpoint := appServer.GetEventsEndpoint()

	// Register the events endpoint (for ingesting analytics events) with CORS
	mux.HandleFunc(eventsEndpoint, func(w http.ResponseWriter, r *http.Request) {
		// Apply CORS headers from config
		ApplyCORSHeaders(w, appServer)

		switch r.Method {
		case http.MethodPost, http.MethodOptions:
			HandlePostMessage(w, r, appServer)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Register GET endpoint for retrieving events with CORS
	mux.HandleFunc(eventsEndpoint+"/list", func(w http.ResponseWriter, r *http.Request) {
		// Apply CORS headers from config
		ApplyCORSHeaders(w, appServer)

		switch r.Method {
		case http.MethodGet:
			HandleGetMessages(w, r, appServer)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Legacy endpoint for backward compatibility
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

	// SSE endpoint remains fixed (no CORS)
	mux.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		HandleSSE(w, r, appServer)
	})
}

// ApplyCORSHeaders applies CORS headers from config to the response
func ApplyCORSHeaders(w http.ResponseWriter, appServer *server.AppServer) {
	corsOrigins := appServer.GetCORSAllowedOrigins()
	if corsOrigins != "" {
		w.Header().Set("Access-Control-Allow-Origin", corsOrigins)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	}
}

// decodeEvent decodes a base64-encoded event string using the utils.DecodeBase64 function
func decodeEvent(value interface{}) string {
	if value == nil {
		return ""
	}

	if str, ok := value.(string); ok {
		decoded, err := utils.DecodeBase64(str)
		if err != nil {
			return fmt.Sprintf("Error decoding: %v", err)
		}
		return decoded
	}

	return fmt.Sprintf("%v", value)
}

// transformEvent transforms an event based on its "e" key type
func transformEvent(eventData map[string]interface{}) map[string]interface{} {
	eventType, ok := eventData["e"].(string)
	if !ok {
		// If no "e" key, return as-is
		return eventData
	}

	switch eventType {
	case "pv":
		return transformPageView(eventData)
	case "se":
		return transformStructuredEvent(eventData)
	case "ue":
		return transformUnstructuredEvent(eventData)
	default:
		// For unknown event types, return as-is
		return eventData
	}
}

// transformPageView transforms a Page View event
func transformPageView(data map[string]interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"title": "Page View",
	}

	if v, ok := data["url"]; ok {
		result["Url"] = v
	}
	if v, ok := data["page"]; ok {
		result["Page"] = v
	}
	if v, ok := data["refr"]; ok {
		result["Referrer"] = v
	}
	if v, ok := data["tna"]; ok {
		result["Tracker"] = v
	}
	if v, ok := data["aid"]; ok {
		result["App ID"] = v
	}
	if v, ok := data["duid"]; ok {
		result["Device Id"] = v
	}
	if v, ok := data["cx"]; ok {
		result["Context"] = decodeEvent(v)
	}

	return result
}

// transformStructuredEvent transforms a Structured Event
func transformStructuredEvent(data map[string]interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"title": "Structured Event",
	}

	if v, ok := data["se_ca"]; ok {
		result["Category"] = v
	}
	if v, ok := data["se_ac"]; ok {
		result["Action"] = v
	}
	if v, ok := data["se_la"]; ok {
		result["Label"] = v
	}
	if v, ok := data["se_pr"]; ok {
		if v != nil {
			result["Property"] = v
		} else {
			result["Property"] = "N/A"
		}
	} else {
		result["Property"] = "N/A"
	}
	if v, ok := data["se_va"]; ok {
		if v != nil {
			result["Value"] = v
		} else {
			result["Value"] = "N/A"
		}
	} else {
		result["Value"] = "N/A"
	}
	if v, ok := data["url"]; ok {
		result["Url"] = v
	}
	if v, ok := data["aid"]; ok {
		result["App ID"] = v
	}
	if v, ok := data["duid"]; ok {
		result["Device Id"] = v
	}
	if v, ok := data["cx"]; ok {
		result["Context"] = decodeEvent(v)
	}

	return result
}

// transformUnstructuredEvent transforms an Unstructured (Self-Describing) Event
func transformUnstructuredEvent(data map[string]interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"title": "Self-Describing Event",
	}

	if v, ok := data["url"]; ok {
		result["Url"] = v
	}
	if v, ok := data["ue_px"]; ok {
		result["Payload"] = decodeEvent(v)
	}
	if v, ok := data["aid"]; ok {
		result["App ID"] = v
	}
	if v, ok := data["duid"]; ok {
		result["Device Id"] = v
	}
	if v, ok := data["cx"]; ok {
		result["Context"] = decodeEvent(v)
	}

	return result
}

// transformEventForDisplay transforms an entire Event for display via SSE
// This transforms each data item in the event based on the event type
func transformEventForDisplay(event server.Event) server.Event {
	transformedEvent := event
	transformedEvent.Data = make([]map[string]interface{}, len(event.Data))

	for i, dataItem := range event.Data {
		transformedEvent.Data[i] = transformEvent(dataItem)
	}

	return transformedEvent
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
	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

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

		// For legacy form data, create a simple event
		appServer.AddEvent("form/message", []map[string]interface{}{
			{
				"message": message,
			},
		})
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}
}

// HandleGetMessages returns all events as JSON
func HandleGetMessages(w http.ResponseWriter, r *http.Request, appServer *server.AppServer) {
	events := appServer.GetEvents()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// HandleSSE handles Server-Sent Events connections
func HandleSSE(w http.ResponseWriter, r *http.Request, appServer *server.AppServer) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// Note: No CORS headers on SSE endpoint

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
