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
	Server ServerConfig `toml:"server"`
	CORS   CORSConfig   `toml:"cors"`
}

// ServerConfig represents server-related configuration
type ServerConfig struct {
	Port           int    `toml:"port"`
	Host           string `toml:"host"`
	MaxMsgs        int    `toml:"max_messages"`
	EventsEndpoint string `toml:"events_endpoint"`
}

// CORSConfig represents CORS-related configuration
type CORSConfig struct {
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
	config      Config
	events      []Event
	mutex       sync.RWMutex
	eventID     int
	sseClients  map[string]*SSEClient
	sseMutex    sync.RWMutex
	transformer func(Event) Event
}

// LoadConfig loads the configuration from a TOML file
func LoadConfig(filepath string) (Config, error) {
	config := Config{
		Server: ServerConfig{
			Port:           8080,
			Host:           "localhost",
			MaxMsgs:        100,
			EventsEndpoint: "com.simplybusiness/events",
		},
		CORS: CORSConfig{
			AllowedOrigins: "http://localhost:3000",
		},
	}

	// Try to read the config file if it exists
	if _, err := os.Stat(filepath); err == nil {
		if _, err := toml.DecodeFile(filepath, &config); err != nil {
			return config, fmt.Errorf("error parsing config file: %w", err)
		}
	} else {
		log.Printf("Config file not found at %s, using defaults\n", filepath)
	}

	return config, nil
}

// New creates a new application server
func New(config Config) *AppServer {
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
	if len(s.events) > s.config.Server.MaxMsgs {
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
func (s *AppServer) GetConfig() Config {
	return s.config
}

// GetAddr returns the server address in format host:port
func (s *AppServer) GetAddr() string {
	return fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port)
}

// GetURL returns the full URL for the server
func (s *AppServer) GetURL() string {
	return fmt.Sprintf("http://%s:%d", s.config.Server.Host, s.config.Server.Port)
}

// GetEventsEndpoint returns the configured events endpoint path
func (s *AppServer) GetEventsEndpoint() string {
	endpoint := s.config.Server.EventsEndpoint
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
	return s.config.CORS.AllowedOrigins
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
