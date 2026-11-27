# Makefile
.PHONY: build dev-api dev-web

build:
	cd frontend && bun install --frozen-lockfile && bun run build
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/nakhoda .

dev-api:
	go run .

dev-web:
	cd frontend && bun run dev