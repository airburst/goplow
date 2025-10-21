#!/bin/bash

# Build the frontend application
cd web && pnpm install && pnpm run build

# Wait for the frontend build to complete
cd ..

# Build the Go application
go clean -cache && go build -o goplow ./cmd/server/main.go
