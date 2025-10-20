# Utility Functions for Goplow

This document describes the utility functions created to support event handling, CORS, and base64 decoding in Goplow.

## Base64 Decoding (`internal/utils/decode.go`)

### `DecodeBase64(base64Value string) (string, error)`
Decodes a base64-encoded string and returns the decoded value.

**Example:**
```go
decoded, err := utils.DecodeBase64("SGVsbG8gV29ybGQ=")
if err != nil {
    log.Fatalf("Decode error: %v", err)
}
// decoded = "Hello World"
```

### `DecodeBase64Field(value interface{}) (interface{}, error)`
Attempts to decode a value if it's a base64-encoded string. Returns the original value if it's not a string.

**Example:**
```go
event := map[string]interface{}{"cx": "eyJkYXRhIjogIndvcmxkIn0="}
decoded, err := utils.DecodeBase64Field(event["cx"])
// decoded contains the decoded JSON string
```

## CORS Support (`internal/utils/cors.go`)

### `CORSConfig` struct
Configuration for CORS settings.

```go
type CORSConfig struct {
    AllowedOrigin    string
    AllowedMethods   []string
    AllowCredentials bool
}
```

### `NewCORSConfig(origin string) *CORSConfig`
Creates a new CORS configuration with defaults. If no origin is provided, defaults to `http://localhost:3000`.

**Example:**
```go
corsConfig := utils.NewCORSConfig("http://example.com:3000")
```

### `CORSMiddleware(corsConfig *CORSConfig) func(http.Handler) http.Handler`
Returns middleware that can be wrapped around HTTP handlers to apply CORS headers.

**Example:**
```go
corsConfig := utils.NewCORSConfig("http://localhost:3000")
middleware := utils.CORSMiddleware(corsConfig)
// Wrap your handler with it
wrappedHandler := middleware(yourHandler)
```

### `ApplyCORS(w http.ResponseWriter, corsConfig *CORSConfig)`
Directly applies CORS headers to a response writer (useful for handler functions).

**Example:**
```go
func MyHandler(w http.ResponseWriter, r *http.Request) {
    corsConfig := utils.NewCORSConfig("http://localhost:3000")
    utils.ApplyCORS(w, corsConfig)

    w.Header().Set("Content-Type", "application/json")
    // ... handler logic
}
```

## Event Handlers (`internal/utils/handlers.go`)

### `EventHandler` type
Function type for processing events.

```go
type EventHandler func(event map[string]interface{}) interface{}
```

### `EventHandlerRegistry` struct
Registry for managing multiple event handlers by event type.

```go
type EventHandlerRegistry struct {
    handlers map[string]EventHandler
    default_ EventHandler
}
```

### `NewEventHandlerRegistry() *EventHandlerRegistry`
Creates a new event handler registry with a default handler.

**Example:**
```go
registry := utils.NewEventHandlerRegistry()
```

### `Register(eventType string, handler EventHandler)`
Registers a handler for a specific event type.

**Example:**
```go
registry := utils.NewEventHandlerRegistry()

// Register Page View handler
registry.Register("pv", func(event map[string]interface{}) interface{} {
    return map[string]interface{}{
        "title": "Page View",
        "url": utils.ExtractFieldAsString(event, "url"),
        "page": utils.ExtractFieldAsString(event, "page"),
        "referrer": utils.ExtractFieldAsString(event, "refr"),
        "tracker": utils.ExtractFieldAsString(event, "tna"),
        "appId": utils.ExtractFieldAsString(event, "aid"),
        "deviceId": utils.ExtractFieldAsString(event, "duid"),
        "context": utils.ExtractField(event, "cx", true), // true = decode base64
    }
})

// Register Structured Event handler
registry.Register("se", func(event map[string]interface{}) interface{} {
    return map[string]interface{}{
        "title": "Structured Event",
        "category": utils.ExtractFieldAsString(event, "se_ca"),
        "action": utils.ExtractFieldAsString(event, "se_ac"),
        "label": utils.ExtractFieldAsString(event, "se_la"),
        "property": utils.ExtractFieldWithDefault(event, "se_pr", "N/A"),
        "value": utils.ExtractFieldWithDefault(event, "se_va", "N/A"),
        "url": utils.ExtractFieldAsString(event, "url"),
        "appId": utils.ExtractFieldAsString(event, "aid"),
        "deviceId": utils.ExtractFieldAsString(event, "duid"),
        "context": utils.ExtractField(event, "cx", true),
    }
})
```

### `Handle(eventType string, event map[string]interface{}) interface{}`
Processes an event using the registered handler for its type. Falls back to default handler if not registered.

**Example:**
```go
result := registry.Handle("pv", eventData)
// result contains the transformed event data
```

## Field Extraction Helper Functions

### `ExtractField(event map[string]interface{}, fieldName string, shouldDecode bool) interface{}`
Safely extracts a field, optionally decoding it from base64.

### `ExtractFieldAsString(event map[string]interface{}, fieldName string) string`
Extracts a field and converts it to a string, returns empty string if not found.

### `ExtractFieldWithDefault(event map[string]interface{}, fieldName string, defaultValue interface{}) interface{}`
Extracts a field, returning a default value if not found.

## Usage in Handlers

Update your handlers to use these utilities:

```go
import "goplow/internal/utils"

func HandlePostMessage(w http.ResponseWriter, r *http.Request, appServer *server.AppServer) {
    // Apply CORS
    corsConfig := utils.NewCORSConfig("http://localhost:3000")
    utils.ApplyCORS(w, corsConfig)

    // ... parse request ...

    // Set up event handlers
    registry := utils.NewEventHandlerRegistry()
    registry.Register("pv", pageViewHandler)
    registry.Register("se", structuredEventHandler)

    // Process events
    for _, event := range eventData {
        eventName := event["e"].(string)
        transformed := registry.Handle(eventName, event)
        // Use transformed data...
    }
}
```
