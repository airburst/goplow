.PHONY: build run clean help fmt lint deps

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

.DEFAULT_GOAL := help
