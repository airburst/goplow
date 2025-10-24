# Goplow Architecture

Goplow is a real-time analytics event viewer and validator. It captures events from external systems, streams them to a web UI in real-time, and validates them against JSON schemas.

## Overview

Goplow consists of two main parts:

1. **Backend (Go)**: HTTP server that handles event ingestion, schema serving, and real-time event streaming via Server-Sent Events (SSE)
2. **Frontend (SolidJS)**: Reactive web UI that displays events in real-time, validates them against schemas, and provides visual feedback

---

## System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (SolidJS)"]
        UI["Components<br/>App, EventCard, EventCardList"]
        State["State Management<br/>useValidation Hook"]
        Validation["Validation Logic<br/>validate-schema.ts"]
    end

    subgraph Backend["Backend (Go)"]
        Main["Main Entry<br/>cmd/server/main.go"]
        Handlers["HTTP Handlers<br/>internal/handlers"]
        SSE["SSE Manager<br/>internal/sse"]
        Static["Static Routes<br/>internal/static"]
        Server["Server Config<br/>internal/server"]
    end

    subgraph External["External Systems"]
        ExtSys["Analytics Event Sources"]
    end

    subgraph Infrastructure["Infrastructure"]
        HTTP["HTTP Server<br/>Port 8081"]
        Vite["Vite Dev Server<br/>Port 4000"]
        Config["Config File<br/>goplow.toml"]
    end

    ExtSys -->|POST /events| HTTP
    HTTP -->|Handlers| Handlers
    Handlers -->|Queue Events| SSE
    SSE -->|Stream SSE| Vite
    Vite -->|Events| Frontend
    Frontend -->|Fetch Schemas| Static
    Static -->|JSON Schemas| Frontend
    Frontend -->|Validate| Validation
    Main -->|Load| Config
    Main -->|Init| Server
    Main -->|Start| HTTP
```

---

## Component Architecture

### Frontend Components

```mermaid
graph TD
    App["App.tsx<br/>(Root Component)"]
    EventCardList["EventCardList.tsx<br/>(Container)"]
    EventCard["EventCard.tsx<br/>(Card Component)"]
    CardHeader["CardHeader.tsx<br/>(Header with Title & Status)"]
    EventCardContent["EventCardContent.tsx<br/>(Content Display)"]
    Alert["Alert.tsx<br/>(Error/Warning Messages)"]
    Code["Code/Code.tsx<br/>(Syntax Highlighted JSON)"]
    StatusBadge["StatusBadge.tsx<br/>(Status Indicator)"]

    App --> EventCardList
    EventCardList -->|Maps Over Events| EventCard
    EventCard --> CardHeader
    EventCard --> EventCardContent
    CardHeader --> StatusBadge
    EventCardContent --> Alert
    EventCardContent --> Code

    style App fill:#3b82f6
    style EventCardList fill:#10b981
    style EventCard fill:#f59e0b
    style CardHeader fill:#8b5cf6
    style StatusBadge fill:#ec4899
    style Code fill:#06b6d4
```

### Backend Handlers

```mermaid
graph LR
    POST["POST /events"]
    SSE["GET /events/stream"]
    SCHEMA["GET /schemas/*"]
    LATEST["GET /api/schema-latest"]
    HOME["GET /"]

    POST -->|HandlePostEvent| Queue["Queue Event<br/>in SSE Manager"]
    SSE -->|HandleEventStream| Stream["Stream Events<br/>to Connected Clients"]
    SCHEMA -->|ServeEmbeddedSchemas| Schemas["Return JSON Schema<br/>from Embedded FS"]
    LATEST -->|HandleGetLatestSchemaVersion| Version["Return Latest Schema<br/>Version Info"]
    HOME -->|Serve Static| Index["Return index.html"]

    Queue --> EventQueue["Event Queue<br/>internal/sse"]
    Stream --> EventQueue

    style POST fill:#ef4444
    style SSE fill:#06b6d4
    style SCHEMA fill:#8b5cf6
    style LATEST fill:#10b981
    style HOME fill:#f59e0b
```

---

## Data Flow Diagrams

### Event Ingestion Flow

```mermaid
sequenceDiagram
    participant Ext as External System
    participant Go as Go Server<br/>:8081
    participant Queue as SSE Manager<br/>Queue
    participant Client as Connected Client<br/>Browser

    Ext->>Go: POST /events<br/>{event JSON}
    activate Go
    Go->>Go: HandlePostEvent()
    Go->>Queue: Enqueue Event
    deactivate Go

    activate Queue
    Queue->>Client: SSE Message
    deactivate Queue

    activate Client
    Client->>Client: Receive Event<br/>via SSE
    Client->>Client: Store in State
    Client->>Client: Trigger Re-render
    deactivate Client
```

### Event Processing & Validation Flow

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant SSE as sse.ts<br/>SSE Handler
    participant Card as EventCard.tsx
    participant Validation as useValidation<br/>Hook
    participant ValidFn as validate-schema.ts
    participant Go as Go Server<br/>Schema Endpoint
    participant AJV as AJV<br/>Validator

    Browser->>SSE: New Event (via SSE)
    SSE->>SSE: onmessage event
    SSE->>Card: Update Event Signal

    Card->>Card: Parse JSON
    Card->>Validation: Trigger Validation

    activate Validation
    Validation->>ValidFn: validateEvent()

    activate ValidFn
    ValidFn->>ValidFn: Find Event Schema

    alt Schema Not Cached
        ValidFn->>Go: GET /schemas/{schema-path}
        activate Go
        Go->>Go: ServeEmbeddedSchemas()
        Go-->>ValidFn: Return JSON Schema
        deactivate Go
        ValidFn->>ValidFn: Cache Schema
    end

    ValidFn->>ValidFn: checkForNewerVersion()
    ValidFn->>Go: GET /api/schema-latest
    activate Go
    Go-->>ValidFn: Return Latest Version
    deactivate Go

    ValidFn->>AJV: validateWithAjv()
    activate AJV
    AJV->>AJV: Validate Event<br/>Against Schema
    AJV-->>ValidFn: Validation Result
    deactivate AJV

    ValidFn-->>Validation: Return Result<br/>{isValid, error, warning}
    deactivate ValidFn

    Validation->>Validation: Update Signals
    Validation-->>Card: Result Available
    deactivate Validation

    Card->>Card: Re-render with Status
    Card->>Browser: Display Validation<br/>Result & Event
```

### Validation Result Flow

```mermaid
graph TD
    ValidResult["Validation Result<br/>{isValid, error, warning}"]

    ValidResult -->|isValid = true| Valid["Valid Badge<br/>✓ Green"]
    ValidResult -->|isValid = false| Invalid["Invalid Badge<br/>✗ Red"]
    ValidResult -->|warning exists| Warning["Warning Badge<br/>⚠ Yellow"]

    Valid --> Display1["Display Event<br/>Green Status"]
    Invalid --> Display2["Display Event +<br/>Error Alert"]
    Warning --> Display3["Display Event +<br/>Warning Alert"]

    Display1 --> Render["Render EventCard<br/>with Status Indicator"]
    Display2 --> Render
    Display3 --> Render

    style ValidResult fill:#3b82f6
    style Valid fill:#10b981
    style Invalid fill:#ef4444
    style Warning fill:#f59e0b
```

---

## Data Structures

### Event Structure

Events flow through the system with the following structure:

```typescript
interface Event {
  id: number; // Unique event ID
  schema: string; // Event schema URI
  data: Array<Record<string, unknown>>; // Event payload (usually single item)
  timestamp: string; // When event was created
  receivedAt: string; // When server received event
}
```

### Validation Result

```typescript
interface ValidationResult {
  isValid: boolean; // True if valid against schema
  error: string | null; // Error message if invalid
  warning: string | null; // Warning message (e.g., version mismatch)
}
```

### Configuration

```toml
# goplow.toml

[server]
port = 8081                          # Server port
host = "localhost"                   # Server host
max_messages = 1000                  # Max events to keep in memory
events_endpoint = "com.simplybusiness/events" # API endpoint path

[cors]
allowed_origins = "http://localhost:3000, http://localhost:4000"
```

---

## Configuration Loading

The application supports flexible configuration file loading:

```mermaid
graph TD
    App["Application Start"]
    App -->|LoadConfig goplow.toml| Check1["Check ./goplow.toml<br/>(Local - High Priority)"]

    Check1 -->|Found| Load1["Load Local Config"]
    Check1 -->|Not Found| Check2["Check ~/.config/goplow.toml<br/>(User Home - Low Priority)"]

    Check2 -->|Found| Load2["Load User Config"]
    Check2 -->|Not Found| Load3["Use Default Config"]

    Load1 --> Start["Start Server<br/>with Config"]
    Load2 --> Start
    Load3 --> Start

    Load1 -->|Log| Message1["Config loaded from ./goplow.toml"]
    Load2 -->|Log| Message2["Config loaded from ~/.config/goplow.toml"]
    Load3 -->|Log| Message3["Using default config"]

    style Check1 fill:#10b981
    style Check2 fill:#f59e0b
    style Load3 fill:#ef4444
    style Start fill:#3b82f6
```

### Configuration Precedence

1. **Local `goplow.toml`** (highest priority) - in the same directory as the binary
2. **`~/.config/goplow.toml`** (fallback) - in user's home config directory
3. **Built-in Defaults** (lowest priority) - hardcoded defaults

---

## Schema Management

### Schema Discovery

Schemas are stored in the following directory structure:

```
schemas/
├── co.simplybusiness/
│   ├── command_envelope/
│   ├── command_response_envelope/
│   └── ...
├── com.simplybusiness/
│   ├── account_address_update_attempted/
│   ├── account_created/
│   └── ...
├── uk.co.simplybusiness/
│   └── ...
└── com.google.analytics/
    └── cookies/
```

### Schema Validation Process

```mermaid
graph TD
    Event["Event Received<br/>{schema, data}"]
    Parse["Parse Schema URI<br/>e.g. com.simplybusiness/account_created"]

    Event --> Parse

    Parse --> FindSchema["Find Matching Schema<br/>in File System"]

    FindSchema -->|Located| Cache["Check Schema Cache"]
    FindSchema -->|Not Found| Error["Return Error:<br/>Schema Not Found"]

    Cache -->|Cached| UseCache["Use Cached Schema"]
    Cache -->|Not Cached| Fetch["Fetch from HTTP<br/>GET /schemas/{path}"]

    Fetch --> Update["Update Cache"]
    Update --> UseCache

    UseCache --> CheckVersion["Check Schema Version"]

    CheckVersion -->|Latest| Validate["Validate with AJV"]
    CheckVersion -->|Outdated| Warning["Log Warning:<br/>Newer Version Available"]
    Warning --> Validate

    Validate --> Result["Return<br/>Validation Result"]

    Error --> Result

    style Event fill:#3b82f6
    style Validate fill:#10b981
    style Error fill:#ef4444
    style Warning fill:#f59e0b
    style Result fill:#8b5cf6
```

---

## Technology Stack

### Frontend

- **Framework**: SolidJS (reactive, lightweight)
- **Build Tool**: Vite
- **Validation**: AJV (JSON Schema validator)
- **JSON Display**: pretty-print-json (syntax highlighting)
- **Styling**: Tailwind CSS

### Backend

- **Language**: Go 1.20+
- **HTTP Routing**: Standard library `net/http`
- **Real-time Communication**: Server-Sent Events (SSE)
- **Configuration**: TOML (BurntSushi/toml)
- **Static Files**: Go embed (production builds)

### Development

- **Package Manager**: pnpm (frontend)
- **Task Runner**: Makefile (development scripts)
- **Dev Server**: Vite (frontend dev server)

---

## Development Workflow

```mermaid
graph LR
    Make["make dev"]
    Make -->|Starts| DevServer["Vite Dev Server<br/>Port 4000"]
    Make -->|Starts| GoServer["Go Server<br/>Port 8081"]

    DevServer -->|Proxy| GoServer

    Frontend["Frontend Dev<br/>Hot Reload"]
    Browser["Browser<br/>localhost:4000"]

    DevServer --> Frontend
    Frontend --> Browser

    External["External Event Source<br/>or Test Tool"]
    External -->|POST localhost:8081/events| GoServer

    GoServer -->|SSE Stream| Browser
    Browser -->|Display| UI["UI Updates<br/>in Real-time"]

    style Make fill:#3b82f6
    style DevServer fill:#06b6d4
    style GoServer fill:#8b5cf6
    style Browser fill:#10b981
    style UI fill:#f59e0b
```

---

## Production Build

```mermaid
graph TD
    Build["Build Process"]

    Build -->|Frontend| FrontBuild["npm run build<br/>Generate dist/"]
    Build -->|Backend| GoBuild["go build<br/>Generate binary"]

    FrontBuild --> Embed["Embed dist/ files<br/>in Go binary"]
    GoBuild --> Embed

    Embed --> Binary["Single Binary:<br/>goplow"]

    Binary -->|Includes| Assets["Embedded Assets:<br/>HTML, JS, CSS"]
    Binary -->|Includes| Schemas["Embedded Schemas:<br/>JSON Schema Files"]

    Deploy["Deploy"]

    Binary --> Deploy
    Config["goplow.toml"]
    Config --> Deploy

    Deploy -->|Server Start| Runtime["Runtime"]

    Runtime -->|Load Config| HomeOrLocal["~/.config/goplow.toml<br/>or ./goplow.toml"]
    Runtime -->|Serve| WebUI["Web UI<br/>localhost:8081"]
    Runtime -->|Listen| Events["POST /events"]

    style Build fill:#3b82f6
    style Binary fill:#10b981
    style Deploy fill:#f59e0b
    style Runtime fill:#8b5cf6
```

---

## Key Features

### Real-time Event Streaming

- Events are pushed to connected clients via SSE
- No polling required
- Automatic reconnection on disconnect
- Events queued while client is disconnected

### Event Validation

- Automatic validation against JSON schemas
- Version checking for schema updates
- Error and warning detection
- Visual status indicators (valid/invalid/warning)

### Flexible Configuration

- Multiple config file locations
- Local config takes precedence over user config
- Sensible defaults for quick start
- Easy CORS configuration

### Embedded Schemas

- Production builds include all schemas
- Development mode reads schemas from disk for hot reload
- Schema caching in frontend
- Latest version checking

---

## Error Handling

```mermaid
graph TD
    Error["Error Occurs"]

    Error -->|Invalid JSON| ParseErr["Parse Error<br/>Display in Alert"]
    Error -->|Schema Not Found| SchemaErr["Schema Error<br/>Display in Alert"]
    Error -->|Validation Fails| ValidErr["Invalid Badge +<br/>Error Message"]
    Error -->|Network Issue| NetworkErr["Connection Error<br/>Retry with Backoff"]

    ParseErr --> Alert["Error Alert<br/>with Details"]
    SchemaErr --> Alert
    ValidErr --> Alert
    NetworkErr --> Retry["Automatic Reconnect<br/>with Exponential Backoff"]

    Alert --> UI["Display to User"]
    Retry --> Reconnect["Reconnect to SSE"]

    style Error fill:#ef4444
    style Alert fill:#f59e0b
    style Retry fill:#06b6d4
    style UI fill:#3b82f6
```

---

## Performance Considerations

### Frontend Optimization

- SolidJS ensures efficient reactive updates
- Schema caching prevents repeated HTTP requests
- Lazy schema loading on demand
- Pretty-print-json handles large payloads efficiently

### Backend Optimization

- SSE is efficient for one-way push communication
- Event queue with configurable max size
- Embedded schemas for fast serving
- File system caching for dev mode schemas

### Scaling

- Max message buffer prevents unbounded memory growth
- Multiple SSE clients can connect simultaneously
- Schemas served from embedded FS (O(1) lookup)
- CORS configured for production deployments

---

## Testing Strategy

The project includes test data in the `data/` directory:

- `form-question-answered.json`
- `help-opened.json`
- `state-answered.json`
- `trade-search.json`

These can be used to test the event ingestion and validation pipeline.

---

## Troubleshooting

### Common Issues

**Events not appearing:**

- Check if Go server is running (`localhost:8081`)
- Verify SSE connection in browser DevTools
- Check CORS configuration for event source

**Validation failing unexpectedly:**

- Check if schemas are loaded (`/schemas/` endpoint)
- Verify schema path in event matches file structure
- Check schema version in latest version endpoint

**Configuration not loading:**

- Verify `goplow.toml` exists in correct location
- Check file permissions
- Verify TOML syntax
