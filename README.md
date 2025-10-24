# Goplow ❄️

A single-file Go executable that runs a web server for displaying analytics events in real-time. The application automatically opens your default browser on startup and serves a responsive web interface.

## Quick Start

### Building from Source

```bash
# Clone/navigate to the project
cd goplow

# Build the executable
./scripts/build.sh

# Run the application
./goplow
```

The application will:

1. Start a web server on the configured host and port
2. Automatically open your default browser
3. Display an event stream interface for viewing analytics events in real-time

## Building the Web Interface

The web interface is built using SolidJS and is located in the `web/` directory. The build process compiles the SolidJS application and places the static assets directly into the Go application for embedding.

### Prerequisites

Ensure you have Node.js and pnpm installed:

```bash
# Install pnpm if you haven't already
npm install -g pnpm
```

### Building the Web Interface

```bash
# Navigate to the web directory
cd web

# Install dependencies
pnpm install

# Build the SolidJS application
pnpm build
```

The build process will:

- Compile the SolidJS application
- Generate optimized JavaScript and CSS bundles
- Output the built files to `../internal/static/` (preserving the `static.go` file)
- Create an `assets/` directory with versioned JS/CSS files

### Development Mode

For development with hot reloading of the frontend **only**:

```bash
# In the web directory
pnpm dev
```

This will start the Vite development server on `http://localhost:4000`.

**Note**: Schema validation requires the Go server running on port 8081. If you see 404 errors for schema requests, use the Full Stack development approach below.

### Development Workflow (Full Stack) - Recommended

To work on both frontend and backend with hot reloading:

```bash
# From the project root
./scripts/dev.sh
```

This will:

- Start the Go server on `http://localhost:8081` with development mode enabled
- Start pnpm dev for frontend hot reloading on `http://localhost:4000`
- Automatically proxy `/schemas` requests from frontend to Go server
- Serve assets from `internal/static-dev` instead of embedded assets

Both processes run in parallel with automatic cleanup on Ctrl+C

#### Building for Production

After development, build the production-ready assets:

```bash
# Build frontend assets to internal/static (production folder)
cd web
pnpm build

# Build Go binary with embedded assets
make build

# Run the production binary
./goplow
```

## Configuration

Create or edit `config.toml` in the same directory as the executable:

```toml
[server]
# Server port number (default: 8081)
port = 8081

# Server host to bind to (default: localhost)
host = "localhost"

# Maximum number of events to keep in memory (default: 100)
max_messages = 100

# API endpoint for ingesting analytics events (default: com.simplybusiness/events)
# This will be registered as /com.simplybusiness/events
events_endpoint = "com.simplybusiness/events"
```

If `config.toml` doesn't exist, the application uses default values.

## API Endpoints

### POST `/com.simplybusiness/events` (configurable)

Ingest analytics events. The path is configurable via `events_endpoint` in `config.toml`.

**Request:**

- Content-Type: `application/json`
- Body: Snowplow analytics event payload

**Example Request:**

```bash
curl -X POST http://localhost:8081/com.simplybusiness/events \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
    "data": [
      {
        "e": "ue",
        "eid": "6342e43c-3f55-4040-8923-472ac1a66d76",
        "tv": "js-3.21.0",
        "tna": "sb-ava"
      }
    ]
  }'
```

**Response:**

```json
{
  "status": "success"
}
```

### GET `/com.simplybusiness/events/list` (configurable)

Retrieve all stored events as JSON.

**Response:**

```json
[
  {
    "id": 1,
    "schema": "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
    "data": [
      {
        "e": "ue",
        "eid": "6342e43c-3f55-4040-8923-472ac1a66d76"
      }
    ],
    "timestamp": "2025-10-20T12:34:56Z",
    "receivedAt": "2025-10-20T12:34:56Z"
  }
]
```

### GET `/api/events` (Server-Sent Events)

Stream new events in real-time via Server-Sent Events. This endpoint is fixed and not configurable.

### GET `/`

Returns the HTML interface.

## Usage Examples

### Sending an Event via cURL

```bash
curl -X POST http://localhost:8081/com.simplybusiness/events \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
    "data": [
      {
        "e": "ue",
        "eid": "6342e43c-3f55-4040-8923-472ac1a66d76",
        "tv": "js-3.21.0"
      }
    ]
  }'
```

### Retrieving Events

```bash
curl http://localhost:8081/com.simplybusiness/events/list
```

### Changing the Port

Edit `config.toml`:

```toml
[server]
port = 3000
host = "localhost"
```

Then run the application:

```bash
./goplow
```

## Project Structure

The project follows a clean architecture with clear separation of concerns:

```bash
goplow/
├── cmd/
│   └── server/              # Application entry point
│       └── main.go
├── internal/                # Private application code
│   ├── handlers/            # HTTP request handlers
│   │   └── handlers.go
│   ├── server/              # Core server logic and models
│   │   └── server.go
│   ├── static/              # Embedded static files (HTML, CSS, JS)
│   │   ├── index.html       # SolidJS built HTML
│   │   ├── assets/          # SolidJS built assets (JS, CSS)
│   │   └── static.go        # Static file serving
│   └── utils/               # Utility functions
│       ├── cors.go          # CORS middleware
│       └── handlers.go      # Handler utilities
├── web/                     # SolidJS web application source
│   └── src/                 # SolidJS source files
│       ├── App.tsx          # Main application component
│       ├── index.tsx        # Application entry point
│       ├── index.css        # Global styles
│       ├── types.ts         # TypeScript type definitions
│       ├── components/      # React/SolidJS components
│       └── lib/             # Utility libraries
├── pkg/
│   └── browser/             # Cross-platform browser opening
│       └── browser.go
├── data/                    # Sample data files
├── scripts/                 # Build and development scripts
│   ├── build.sh             # Production build script
│   └── dev.sh               # Development mode script
├── schema-validation/       # Schema validation utilities
```

## Architecture

- **cmd/server/main.go**: Application entry point that orchestrates all components
- **internal/server/server.go**: Core server logic, message storage, and configuration loading
- **internal/handlers/handlers.go**: HTTP route handlers for the REST API
- **internal/static/**: Embedded static files (HTML, CSS, JS) served by the application
- **internal/utils/**: Utility functions including CORS middleware and handler utilities
- **web/src/components/**: SolidJS React components for the user interface
- **web/src/lib/**: Client-side utilities including Server-Sent Events and data transformations
- **pkg/browser/browser.go**: Cross-platform browser opening utility
- **data/**: Sample analytics event data files
- **scripts/**: Build and development automation scripts
- **schema-validation/**: Schema validation utilities for analytics events

## Requirements

- Go 1.21 or later (for building from source)
- No external dependencies at runtime (all are statically compiled)

## Building for Different Platforms

### macOS (ARM64 - Apple Silicon)

```bash
go build -o goplow main.go
```

### macOS (Intel)

```bash
GOARCH=amd64 GOOS=darwin go build -o goplow cmd/server/main.go
```

### Linux

```bash
GOOS=linux GOARCH=amd64 go build -o goplow cmd/server/main.go
```

### Windows

```bash
GOOS=windows GOARCH=amd64 go build -o goplow.exe cmd/server/main.go
```

## Features Details

### Message Management

- Messages are stored in memory during the application's runtime
- Maximum number of messages is configurable via `config.toml`
- Old messages are removed when the limit is exceeded
- Messages are automatically cleared when the application restarts

### Web Interface

- Clean, modern design with gradient colors
- Real-time message updates (auto-refresh every 2 seconds)
- Send messages via text input or Enter key
- Responsive design works on desktop and mobile
- Shows timestamps for each message
- Loading indicator while sending messages
- Empty state message when no messages exist

### Browser Integration

- Automatically detects and opens the default browser:
  - macOS: Uses `open` command
  - Linux: Uses `xdg-open` command
  - Windows: Uses `rundll32` command

## Logs

When running the application, you'll see helpful log messages:

```txt
Starting server on localhost:8081
Opening browser to http://localhost:8081
```

Any errors are printed to the console for easy debugging.

## Development

### Dependencies

The application uses one external dependency:

- `github.com/BurntSushi/toml` - For TOML configuration file parsing

To update dependencies:

```bash
go get -u
go mod tidy
```

## What's next..?

- Adding a build system for SolidJS webpages
- Validate events against schema in [registry](https://github.com/simplybusiness/schema_registry/blob/master/schemas/com.simplybusiness/primary_detail_search/jsonschema/1-4-1)
