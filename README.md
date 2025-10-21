# Goplow �

A single-file Go executable that runs a web server for displaying analytics events in real-time. The application automatically opens your default browser on startup and serves a beautiful, responsive web interface.

## Features

- ✅ **Single-file executable** - Just one binary to run
- ✅ **Auto-opens browser** - Launches your default browser automatically
- ✅ **Web-based UI** - Beautiful, responsive interface
- ✅ **Real-time events** - Analytics events stream in real-time via SSE
- ✅ **Snowplow-compatible** - Supports Snowplow analytics event format
- ✅ **Configurable endpoints** - Customize the analytics event endpoint
- ✅ **Configurable** - Use `config.toml` to customize settings
- ✅ **Cross-platform** - Works on macOS, Linux, and Windows
- ✅ **Event storage** - Keeps events in memory with configurable limit

## Quick Start

### Building from Source

```bash
# Clone/navigate to the project
cd goplow

# Build the executable
make build
# or
go build -o goplow ./cmd/server

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

For development with hot reloading:
```bash
# In the web directory
pnpm dev
```

This will start the Vite development server on `http://localhost:3000`.

### Development Workflow (Full Stack)

To work on both frontend and backend with hot reloading, use development mode:

#### Option 1: Using the dev script (Recommended)
```bash
# From the project root
./dev.sh
```

This will:
- Start the Go server with development mode enabled
- Start pnpm dev for frontend hot reloading
- Serve assets from `internal/static-dev` instead of embedded assets
- Both processes run in parallel with automatic cleanup on Ctrl+C

#### Option 2: Using Make targets

In separate terminals:
```bash
# Terminal 1: Start Go server in dev mode
make dev-server
```

```bash
# Terminal 2: Start frontend dev server
make dev-web
```

#### Option 3: Manual commands

In separate terminals:
```bash
# Terminal 1: Go server
GOPLOW_DEV_MODE=true GOPLOW_DEV_ASSETS_PATH=./internal/static-dev go run ./cmd/server/main.go
```

```bash
# Terminal 2: Frontend
cd web
DEV=true pnpm dev
```

#### How It Works

In development mode:
1. **Go Server** runs with `GOPLOW_DEV_MODE=true` which:
   - Serves HTML and assets from `internal/static-dev` instead of embedded files
   - Allows real-time updates without rebuilding the Go binary
   - Allows hot reloading of the frontend

2. **Pnpm Dev** runs with `DEV=true` which:
   - Outputs built assets to `internal/static-dev/` (the dev folder)
   - Runs the Vite dev server on port 3000
   - Provides hot module reloading for frontend changes

3. **Access** the application at:
   - Frontend with hot reloading: `http://localhost:3000`
   - Full app with Go backend: `http://localhost:8000`

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

### Build Configuration

The build is configured in `web/vite.config.ts`:
- **Output Directory (Dev)**: `../internal/static-dev` - When DEV=true
- **Output Directory (Prod)**: `../internal/static` - Default (embedded in binary)
- **Empty Directory**: `false` - Preserves the `static.go` file during builds
- **Target**: `esnext` - Modern JavaScript for optimal performance

### Running the Executable

```bash
./goplow
```

## Configuration

Create or edit `config.toml` in the same directory as the executable:

```toml
[server]
# Server port number (default: 8080)
port = 8080

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
curl -X POST http://localhost:8080/com.simplybusiness/events \
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
curl -X POST http://localhost:8080/com.simplybusiness/events \
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
curl http://localhost:8080/com.simplybusiness/events/list
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

```
goplow/
├── cmd/
│   └── server/              # Application entry point
│       └── main.go
├── internal/                # Private application code
│   ├── handlers/            # HTTP request handlers
│   │   └── handlers.go
│   ├── server/              # Core server logic and models
│   │   └── server.go
│   └── static/              # Embedded static files (HTML, CSS, JS)
│       ├── index.html       # SolidJS built HTML
│       ├── assets/          # SolidJS built assets (JS, CSS)
│       ├── css/             # Legacy CSS files
│       ├── js/              # Legacy JS files
│       └── static.go        # Static file serving
├── web/                     # SolidJS web application source
│   ├── src/                 # SolidJS source files
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json         # Node.js dependencies
│   ├── pnpm-lock.yaml       # pnpm lockfile
│   ├── vite.config.ts       # Vite build configuration
│   └── tsconfig.json        # TypeScript configuration
├── pkg/
│   └── browser/             # Cross-platform browser opening
│       └── browser.go
├── config.toml              # Configuration file (optional)
├── go.mod                   # Go module definition
├── go.sum                   # Dependency checksums
├── goplow                   # Compiled executable
├── Makefile                 # Build automation
└── README.md                # This file
```

## Architecture

- **cmd/server/main.go**: Application entry point that orchestrates all components
- **internal/server/server.go**: Core server logic, message storage, and configuration loading
- **internal/handlers/handlers.go**: HTTP route handlers for the REST API
- **internal/static/**: Embedded static files (HTML, CSS, JS) served by the application
- **pkg/browser/browser.go**: Cross-platform browser opening utility

## Old Project Structure

```
goplow/
├── main.go           # Main application code (single file)
├── config.toml       # Configuration file (optional)
├── go.mod            # Go module definition
├── go.sum            # Dependency checksums
├── goplow            # Compiled executable
└── README.md         # This file
```

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

```
Starting server on localhost:8080
Opening browser to http://localhost:8080
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