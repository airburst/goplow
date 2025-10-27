package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/BurntSushi/toml"
)

// Config represents the application configuration
type Config struct {
	Default      EnvironmentConfig            `toml:"default"`
	Environments map[string]EnvironmentConfig `toml:"-"`
}

// EnvironmentConfig represents environment-specific configuration
// All fields are flattened (no sub-sections)
type EnvironmentConfig struct {
	Port           int    `toml:"port"`
	Host           string `toml:"host"`
	MaxMsgs        int    `toml:"max_messages"`
	EventsEndpoint string `toml:"events_endpoint"`
	AllowedOrigins string `toml:"allowed_origins"`
}

// Event represents an analytics event with Snowplow schema structure
type Event struct {
	ID         int                      `json:"id"`
	Schema     string                   `json:"schema"`
	Data       []map[string]interface{} `json:"data"`
	Timestamp  time.Time                `json:"timestamp"`
	ReceivedAt time.Time                `json:"receivedAt"`
	// UnwrapSingleItem indicates whether to display single-item arrays as a single object
	UnwrapSingleItem bool `json:"-"`
}

// SSEClient represents an SSE connection
type SSEClient struct {
	ID      string
	Writer  http.ResponseWriter
	Flusher http.Flusher
	Done    chan bool
}

// AppServer handles the web server and analytics event management
type AppServer struct {
	config      EnvironmentConfig
	events      []Event
	mutex       sync.RWMutex
	eventID     int
	sseClients  map[string]*SSEClient
	sseMutex    sync.RWMutex
	transformer func(Event) Event
}

// LoadConfig loads the configuration from a TOML file
// It checks multiple locations in order of precedence:
// 1. Local file (same directory as binary)
// 2. $HOME/.config/goplow.toml
// 3. Uses defaults if neither exists
// If environment is specified, it merges the named environment with defaults
func LoadConfig(filepath string, environment string) (EnvironmentConfig, error) {
	// Set up default configuration
	defaultConfig := EnvironmentConfig{
		Port:           8081,
		Host:           "localhost",
		MaxMsgs:        100,
		EventsEndpoint: "com.simplybusiness/events",
		AllowedOrigins: "http://localhost:3000",
	}

	// Build list of config paths to check (in precedence order)
	configPaths := []string{filepath}

	// Add $HOME/.config/goplow.toml as fallback
	if home, err := os.UserHomeDir(); err == nil {
		configPaths = append(configPaths, fmt.Sprintf("%s/.config/goplow.toml", home))
	}

	// Try each path in order
	var loadedFrom string
	var rawConfig map[string]interface{}

	for _, path := range configPaths {
		if _, err := os.Stat(path); err == nil {
			if _, err := toml.DecodeFile(path, &rawConfig); err != nil {
				return defaultConfig, fmt.Errorf("error parsing config file at %s: %w", path, err)
			}
			loadedFrom = path
			break
		}
	}

	if loadedFrom == "" {
		log.Printf("Config file not found, using defaults\n")
		return defaultConfig, nil
	}

	log.Printf("Loaded config from %s\n", loadedFrom)

	// Parse the full config structure
	var fullConfig Config
	if _, err := toml.DecodeFile(loadedFrom, &fullConfig); err != nil {
		return defaultConfig, fmt.Errorf("error parsing config file at %s: %w", loadedFrom, err)
	}

	// Start with defaults from file, or use hardcoded defaults if not present
	finalConfig := defaultConfig
	if fullConfig.Default.Port != 0 || fullConfig.Default.Host != "" {
		finalConfig = fullConfig.Default
		// Fill in any missing defaults
		if finalConfig.Port == 0 {
			finalConfig.Port = defaultConfig.Port
		}
		if finalConfig.Host == "" {
			finalConfig.Host = defaultConfig.Host
		}
		if finalConfig.MaxMsgs == 0 {
			finalConfig.MaxMsgs = defaultConfig.MaxMsgs
		}
		if finalConfig.EventsEndpoint == "" {
			finalConfig.EventsEndpoint = defaultConfig.EventsEndpoint
		}
		if finalConfig.AllowedOrigins == "" {
			finalConfig.AllowedOrigins = defaultConfig.AllowedOrigins
		}
	}

	// If an environment is specified, parse and merge it
	if environment != "" {
		// Check if environment exists in raw config
		if _, ok := rawConfig[environment]; ok {
			// Create a structure to hold all environment configs
			allEnvs := make(map[string]EnvironmentConfig)

			// Decode the entire file into the map
			_, err := toml.DecodeFile(loadedFrom, &allEnvs)
			if err != nil {
				log.Printf("Warning: error loading environment configs: %v\n", err)
			} else if envConfig, exists := allEnvs[environment]; exists {
				// Merge environment config over defaults (only non-zero values)
				if envConfig.Port != 0 {
					finalConfig.Port = envConfig.Port
				}
				if envConfig.Host != "" {
					finalConfig.Host = envConfig.Host
				}
				if envConfig.MaxMsgs != 0 {
					finalConfig.MaxMsgs = envConfig.MaxMsgs
				}
				if envConfig.EventsEndpoint != "" {
					finalConfig.EventsEndpoint = envConfig.EventsEndpoint
				}
				if envConfig.AllowedOrigins != "" {
					finalConfig.AllowedOrigins = envConfig.AllowedOrigins
				}
				log.Printf("Applied environment configuration: %s\n", environment)
			}
		} else {
			log.Printf("Warning: environment '%s' not found in config file\n", environment)
		}
	}

	return finalConfig, nil
}

// New creates a new application server
func New(config EnvironmentConfig) *AppServer {
	return &AppServer{
		config:     config,
		events:     make([]Event, 0),
		eventID:    0,
		sseClients: make(map[string]*SSEClient),
	}
}

// AddEvent adds a new analytics event and broadcasts it to SSE clients
func (s *AppServer) AddEvent(schema string, data []map[string]interface{}) {
	s.AddEventWithTime(schema, data, time.Now())
}

// AddEventWithTime adds a new analytics event with a specific timestamp and broadcasts it to SSE clients
func (s *AppServer) AddEventWithTime(schema string, data []map[string]interface{}, timestamp time.Time) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.eventID++
	event := Event{
		ID:         s.eventID,
		Schema:     schema,
		Data:       data,
		Timestamp:  timestamp,
		ReceivedAt: time.Now(),
	}

	s.events = append(s.events, event)

	// Keep only the latest MaxMsgs events
	if len(s.events) > s.config.MaxMsgs {
		s.events = s.events[1:]
	}

	// Broadcast new event to all SSE clients
	go s.broadcastNewEvent(event)
}

// GetEvents returns all analytics events
func (s *AppServer) GetEvents() []Event {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	// Return a copy to avoid race conditions
	evts := make([]Event, len(s.events))
	copy(evts, s.events)
	return evts
}

// GetConfig returns the server configuration
func (s *AppServer) GetConfig() EnvironmentConfig {
	return s.config
}

// GetAddr returns the server address in format host:port
func (s *AppServer) GetAddr() string {
	return fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
}

// GetURL returns the full URL for the server
func (s *AppServer) GetURL() string {
	return fmt.Sprintf("http://%s:%d", s.config.Host, s.config.Port)
}

// GetEventsEndpoint returns the configured events endpoint path
func (s *AppServer) GetEventsEndpoint() string {
	endpoint := s.config.EventsEndpoint
	if endpoint == "" {
		endpoint = "com.simplybusiness/events"
	}
	// Ensure endpoint starts with /
	if len(endpoint) > 0 && endpoint[0] != '/' {
		endpoint = "/" + endpoint
	}
	return endpoint
}

// GetCORSAllowedOrigins returns the configured CORS allowed origins
func (s *AppServer) GetCORSAllowedOrigins() string {
	return s.config.AllowedOrigins
}

// SetEventTransformer sets a function to transform events for display
func (s *AppServer) SetEventTransformer(transformer func(Event) Event) {
	s.transformer = transformer
}

// AddSSEClient adds a new SSE client
func (s *AppServer) AddSSEClient(clientID string, w http.ResponseWriter) *SSEClient {
	s.sseMutex.Lock()
	defer s.sseMutex.Unlock()

	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil
	}

	client := &SSEClient{
		ID:      clientID,
		Writer:  w,
		Flusher: flusher,
		Done:    make(chan bool, 1),
	}

	s.sseClients[clientID] = client
	return client
}

// RemoveSSEClient removes an SSE client
func (s *AppServer) RemoveSSEClient(clientID string) {
	s.sseMutex.Lock()
	defer s.sseMutex.Unlock()

	if client, exists := s.sseClients[clientID]; exists {
		close(client.Done)
		delete(s.sseClients, clientID)
	}
}

// broadcastNewEvent sends a new event to all connected SSE clients
func (s *AppServer) broadcastNewEvent(event Event) {
	s.sseMutex.RLock()
	defer s.sseMutex.RUnlock()

	// Apply transformer if available
	eventToSend := event
	if s.transformer != nil {
		eventToSend = s.transformer(event)
	}

	for clientID, client := range s.sseClients {
		select {
		case <-client.Done:
			// Client is done, skip
			continue
		default:
			// Send the event to the client
			if err := s.SendEventToClient(client, eventToSend); err != nil {
				log.Printf("Error sending event to client %s: %v", clientID, err)
				// Remove client on error
				go s.RemoveSSEClient(clientID)
			}
		}
	}
}

// SendEventToClient sends a single event to an SSE client as JSON
func (s *AppServer) SendEventToClient(client *SSEClient, event Event) error {
	// If UnwrapSingleItem is true and there's only one data item, unwrap it
	var dataToSend interface{} = event.Data
	if event.UnwrapSingleItem && len(event.Data) == 1 {
		dataToSend = event.Data[0]
	}

	// Create a custom event structure for JSON marshaling
	type EventForSSE struct {
		ID         int         `json:"id"`
		Schema     string      `json:"schema"`
		Data       interface{} `json:"data"`
		Timestamp  time.Time   `json:"timestamp"`
		ReceivedAt time.Time   `json:"receivedAt"`
	}

	eventForSSE := EventForSSE{
		ID:         event.ID,
		Schema:     event.Schema,
		Data:       dataToSend,
		Timestamp:  event.Timestamp,
		ReceivedAt: event.ReceivedAt,
	}

	// Marshal event to JSON
	eventJSON, err := json.Marshal(eventForSSE)
	if err != nil {
		return err
	}

	// Write SSE format
	if _, err := fmt.Fprintf(client.Writer, "data: %s\n\n", string(eventJSON)); err != nil {
		return err
	}

	client.Flusher.Flush()
	return nil
}

// SendTransformedEventToClient sends a transformed event to an SSE client
// The transformer function is called to transform the event data
func (s *AppServer) SendTransformedEventToClient(client *SSEClient, event Event, transformer func(Event) Event) error {
	// Transform the event
	transformedEvent := transformer(event)

	// Marshal event to JSON
	eventJSON, err := json.Marshal(transformedEvent)
	if err != nil {
		return err
	}

	// Write SSE format
	if _, err := fmt.Fprintf(client.Writer, "data: %s\n\n", string(eventJSON)); err != nil {
		return err
	}

	client.Flusher.Flush()
	return nil
}
