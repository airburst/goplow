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
}

// ServerConfig represents server-related configuration
type ServerConfig struct {
	Port    int    `toml:"port"`
	Host    string `toml:"host"`
	MaxMsgs int    `toml:"max_messages"`
}

// Event represents an analytics event with Snowplow schema structure
type Event struct {
	ID         int                      `json:"id"`
	Schema     string                   `json:"schema"`
	Data       []map[string]interface{} `json:"data"`
	Timestamp  time.Time                `json:"timestamp"`
	ReceivedAt time.Time                `json:"receivedAt"`
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
	config     Config
	events     []Event
	mutex      sync.RWMutex
	eventID    int
	sseClients map[string]*SSEClient
	sseMutex   sync.RWMutex
}

// LoadConfig loads the configuration from a TOML file
func LoadConfig(filepath string) (Config, error) {
	config := Config{
		Server: ServerConfig{
			Port:    8080,
			Host:    "localhost",
			MaxMsgs: 100,
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
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.eventID++
	event := Event{
		ID:         s.eventID,
		Schema:     schema,
		Data:       data,
		Timestamp:  time.Now(),
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

// AddMessage adds a new message (deprecated - use AddEvent instead)
func (s *AppServer) AddMessage(text string) {
	s.AddEvent("com.text.message", []map[string]interface{}{
		{
			"text": text,
		},
	})
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

// GetMessages returns all events (deprecated - use GetEvents instead)
func (s *AppServer) GetMessages() []Event {
	return s.GetEvents()
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

	for clientID, client := range s.sseClients {
		select {
		case <-client.Done:
			// Client is done, skip
			continue
		default:
			// Send the event to the client
			if err := s.SendEventToClient(client, event); err != nil {
				log.Printf("Error sending event to client %s: %v", clientID, err)
				// Remove client on error
				go s.RemoveSSEClient(clientID)
			}
		}
	}
}

// SendEventToClient sends a single event to an SSE client as JSON
func (s *AppServer) SendEventToClient(client *SSEClient, event Event) error {
	// Marshal event to JSON
	eventJSON, err := json.Marshal(event)
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

// SendMessageToClient sends a single message to an SSE client (deprecated)
func (s *AppServer) SendMessageToClient(client *SSEClient, msg Event) error {
	return s.SendEventToClient(client, msg)
}
