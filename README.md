# Goplow 📨

A single-file Go executable that runs a web server for displaying messages in real-time. The application automatically opens your default browser on startup and serves a beautiful, responsive web interface.

## Features

- ✅ **Single-file executable** - Just one binary to run
- ✅ **Auto-opens browser** - Launches your default browser automatically
- ✅ **Web-based UI** - Beautiful, responsive interface
- ✅ **Real-time updates** - Messages refresh automatically every 2 seconds
- ✅ **Configurable** - Use `config.toml` to customize settings
- ✅ **Cross-platform** - Works on macOS, Linux, and Windows
- ✅ **Message storage** - Keeps messages in memory with configurable limit

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
3. Display a message interface where you can send and view messages

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

# Maximum number of messages to keep in memory (default: 100)
max_messages = 100
```

If `config.toml` doesn't exist, the application uses default values.

## API Endpoints

### GET `/api/messages`
Returns all stored messages as JSON.

**Response:**
```json
[
  {
    "id": 1,
    "text": "Hello world",
    "timestamp": "2025-10-20T12:34:56Z"
  },
  {
    "id": 2,
    "text": "Another message",
    "timestamp": "2025-10-20T12:35:10Z"
  }
]
```

### POST `/api/messages`
Add a new message.

**Request:**
- Content-Type: `application/x-www-form-urlencoded`
- Body: `message=Your message text`

**Response:**
```json
{
  "status": "success"
}
```

### GET `/`
Returns the HTML interface.

## Usage Examples

### Sending a Message via cURL

```bash
curl -X POST http://localhost:8080/api/messages \
  -d "message=Hello from the API"
```

### Getting Messages

```bash
curl http://localhost:8080/api/messages
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
│       ├── index.html
│       ├── css/
│       │   └── style.css
│       ├── js/
│       │   └── app.js
│       └── static.go        # Static file serving
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
GOARCH=amd64 GOOS=darwin go build -o goplow main.go
```

### Linux
```bash
GOOS=linux GOARCH=amd64 go build -o goplow main.go
```

### Windows
```bash
GOOS=windows GOARCH=amd64 go build -o goplow.exe main.go
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

## License

Created with Go 🔧
