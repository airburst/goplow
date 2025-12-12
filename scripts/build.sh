#!/bin/bash

# Clean install and build
rm -rf internal/static/assets

# Build the frontend application
cd web && pnpm install && pnpm run build

# Wait for the frontend build to complete
cd ..

# Build the Go application
go clean -cache && go build -o goplow ./cmd/server/main.go

# Copy the built binary to ~/bin
cp goplow ~/bin/goplow

echo "Build complete. The goplow binary has been copied to ~/bin/goplow"