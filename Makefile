.PHONY: build run clean help fmt lint deps dev dev-server dev-web dev-build

help:
	@echo "Goplow - Go Message Server"
	@echo ""
	@echo "Available targets:"
	@echo "  build       - Build the goplow executable"
	@echo "  run         - Build and run the application"
	@echo "  clean       - Remove the compiled executable"
	@echo "  fmt         - Format the code"
	@echo "  lint        - Run Go linter"
	@echo "  deps        - Download and verify dependencies"
	@echo ""
	@echo "Development targets:"
	@echo "  dev         - Run in development mode (Go server + pnpm dev)"
	@echo "  dev-server  - Run Go server in development mode (serves from internal/static-dev)"
	@echo "  dev-web     - Run pnpm dev in the web folder"
	@echo "  dev-build   - Build web assets for development (outputs to internal/static-dev)"
	@echo ""
	@echo "  help        - Show this help message"

build:
	go build -o goplow ./cmd/server

run: build
	./goplow

clean:
	rm -f goplow

fmt:
	go fmt ./...

lint:
	go vet ./...

deps:
	go mod tidy
	go mod verify

# Development mode targets
dev-server:
	GOPLOW_DEV_MODE=true GOPLOW_DEV_ASSETS_PATH=./internal/static-dev go run ./cmd/server/main.go

dev-web:
	cd web && DEV=true pnpm dev

dev: dev-server dev-web

dev-build:
	cd web && DEV=true pnpm build

.DEFAULT_GOAL := help
