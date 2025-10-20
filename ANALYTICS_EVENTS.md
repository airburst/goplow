# Analytics Event Schema Migration

## Overview
Successfully migrated the Goplow application from a simple text message system to support Snowplow analytics events with full JSON schema support.

## Changes Made

### 1. **Server-Side Changes** (`internal/server/server.go`)

#### New Event Structure
- Replaced `Message` struct with `Event` struct that supports:
  - `id`: Unique event identifier
  - `schema`: Iglu schema reference (e.g., "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4")
  - `data`: Array of key-value pairs representing event properties
  - `timestamp`: Event timestamp
  - `receivedAt`: Server reception timestamp

#### Key Methods
- `AddEvent(schema string, data []map[string]interface{})` - Adds new analytics events
- `GetEvents()` - Retrieves all stored events
- `AddMessage(text string)` - Backward compatible method that wraps text in event format
- `broadcastNewEvent(event Event)` - SSE broadcast for new events
- `SendEventToClient(client *SSEClient, event Event)` - Sends event to SSE client

### 2. **Handler Changes** (`internal/handlers/handlers.go`)

#### Updated `HandlePostMessage`
- Now accepts both JSON and form-data payloads
- **JSON Format**: Expects Snowplow-style payloads with `schema` and `data` fields
- **Form Data**: Falls back to legacy text message format for backward compatibility
- Properly parses and stores event schema information

#### Updated `HandleGetMessages`
- Returns events instead of simple messages
- Includes full schema and data information in responses

### 3. **Frontend Changes** (`internal/static/`)

#### HTML (`index.html`)
- Updated title to "Goplow Analytics"
- Replaced single-line text input with multi-line textarea for JSON payload entry
- Updated UI labels to reflect event-based terminology

#### JavaScript (`js/app.js`)
- Updated event handling in SSE connection
- Enhanced UI to display:
  - Event ID
  - Event schema
  - Formatted event data (pretty-printed JSON)
  - Timestamp
- `sendMessage()` now intelligently handles both:
  - Valid JSON payloads (sent as-is)
  - Plain text (wrapped in simple event format)
- Added `addEventToUI()` function for real-time event rendering

#### CSS (`css/style.css`)
- Added `.message-header` for displaying event metadata
- Added `.event-id`, `.event-schema`, `.event-time` classes for event information
- Added `.message-text pre` styling for formatted JSON display
- Updated input styling to support both text inputs and textareas

## API Usage

### Sending Analytics Events

#### Snowplow Format
```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
    "data": [
      {
        "e": "ue",
        "eid": "6342e43c-3f55-4040-8923-472ac1a66d76",
        "tv": "js-3.21.0",
        "tna": "sb-ava",
        "aid": "uk-embed_cd",
        "p": "web"
      }
    ]
  }'
```

#### Custom Analytics Events
```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "iglu:com.mycompany/custom_event/jsonschema/1-0-0",
    "data": [
      {
        "event_type": "user_action",
        "user_id": "user123",
        "action": "button_click"
      }
    ]
  }'
```

#### Legacy Text Messages (for backward compatibility)
```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "message=Hello World"
```

### Retrieving Events

```bash
curl http://localhost:8080/api/messages
```

Response includes all events with schema, data, timestamps, and event IDs.

## Event Storage

- Events are stored in memory with a configurable maximum (`max_messages` in `config.toml`)
- Older events are automatically removed when the limit is exceeded
- Each event receives a unique sequential ID

## Real-Time Updates

- All events are broadcast via SSE to connected clients in real-time
- Multiple clients can connect and receive updates simultaneously
- Automatic reconnection on connection loss (5-second retry interval)
- Deduplication prevents duplicate events in the UI

## Backward Compatibility

The system maintains backward compatibility:
- Text messages are automatically converted to events with `schema: "com.text.message"`
- Form-data submission still works alongside JSON payloads
- Legacy API consumers are not affected

## Example Event Structure

```json
{
  "id": 1,
  "schema": "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
  "data": [
    {
      "e": "ue",
      "eid": "6342e43c-3f55-4040-8923-472ac1a66d76",
      "tv": "js-3.21.0"
    }
  ],
  "timestamp": "2025-10-20T17:54:00.738888+01:00",
  "receivedAt": "2025-10-20T17:54:00.738888+01:00"
}
```
