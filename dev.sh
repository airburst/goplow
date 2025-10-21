#!/bin/bash

# Development mode launcher for Goplow
# Starts both the Go server and pnpm dev in development mode with hot reloading

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Goplow in Development Mode${NC}"
echo -e "${YELLOW}This will start:${NC}"
echo -e "  1. Go server on http://localhost:8000 (with dev assets from internal/static-dev)"
echo -e "  2. Pnpm dev on http://localhost:3000 (frontend with hot reloading, proxies API to Go)"
echo ""

# Trap to cleanup both processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down development servers...${NC}"
    kill $GO_PID $WEB_PID 2>/dev/null || true
    exit 0
}

trap cleanup EXIT INT TERM

# Start Go server in dev mode
echo -e "${GREEN}Starting Go server in dev mode...${NC}"
GOPLOW_DEV_MODE=true GOPLOW_DEV_ASSETS_PATH=./internal/static-dev go run ./cmd/server/main.go &
GO_PID=$!

sleep 2

# Start pnpm dev
echo -e "${GREEN}Starting pnpm dev...${NC}"
cd web
DEV=true pnpm dev &
WEB_PID=$!

sleep 2

# Open browser to localhost:3000
echo -e "${GREEN}Opening browser...${NC}"
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
    start http://localhost:3000
else
    echo -e "${YELLOW}Could not open browser automatically${NC}"
fi

echo -e "${GREEN}✓ Both servers are running!${NC}"
echo ""
echo -e "${YELLOW}Access the application at:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "  Go API: ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "${YELLOW}The frontend proxies API requests to the Go server automatically.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for both processes
wait $GO_PID $WEB_PID
