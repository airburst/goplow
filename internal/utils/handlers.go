package utils

import (
	"fmt"
)

// EventHandler is a function type that processes event data and returns transformed output
type EventHandler func(event map[string]interface{}) interface{}

// EventHandlerRegistry holds all registered event handlers
type EventHandlerRegistry struct {
	handlers map[string]EventHandler
	default_ EventHandler
}

// NewEventHandlerRegistry creates a new event handler registry
func NewEventHandlerRegistry() *EventHandlerRegistry {
	return &EventHandlerRegistry{
		handlers: make(map[string]EventHandler),
		default_: defaultEventHandler,
	}
}

// Register registers an event handler for a specific event type
func (r *EventHandlerRegistry) Register(eventType string, handler EventHandler) {
	r.handlers[eventType] = handler
}

// Handle processes an event using the appropriate handler
func (r *EventHandlerRegistry) Handle(eventType string, event map[string]interface{}) interface{} {
	handler, exists := r.handlers[eventType]
	if !exists {
		handler = r.default_
	}
	return handler(event)
}

// defaultEventHandler is the fallback handler for unrecognized event types
func defaultEventHandler(event map[string]interface{}) interface{} {
	eventType := "unknown"
	if e, ok := event["e"].(string); ok {
		eventType = e
	}

	aid := "N/A"
	if appID, ok := event["aid"].(string); ok {
		aid = appID
	}

	url := "N/A"
	if u, ok := event["url"].(string); ok {
		url = u
	}

	return fmt.Sprintf("Unrecognised Event: %s. App ID: %s. App URL: %s.", eventType, aid, url)
}

// ExtractField safely extracts a field from the event and optionally decodes it if base64
func ExtractField(event map[string]interface{}, fieldName string, shouldDecode bool) interface{} {
	value, exists := event[fieldName]
	if !exists {
		return nil
	}

	if shouldDecode {
		decoded, err := DecodeBase64Field(value)
		if err == nil {
			return decoded
		}
	}

	return value
}

// ExtractFieldAsString safely extracts a field from the event and returns it as a string
func ExtractFieldAsString(event map[string]interface{}, fieldName string) string {
	value, exists := event[fieldName]
	if !exists {
		return ""
	}

	if str, ok := value.(string); ok {
		return str
	}

	return fmt.Sprintf("%v", value)
}

// ExtractFieldWithDefault safely extracts a field from the event and returns a default if not found
func ExtractFieldWithDefault(event map[string]interface{}, fieldName string, defaultValue interface{}) interface{} {
	value, exists := event[fieldName]
	if !exists {
		return defaultValue
	}
	return value
}
