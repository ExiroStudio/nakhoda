package server

import (
	"backend/config"
	"context"
	"log/slog"
	"os"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
)

func NewServer(ctx context.Context, cfg *config.Config) (*fiber.App, *sync.WaitGroup) {
	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-Id"},
		AllowMethods: []string{"GET", "POST"},
	}))

	var wg sync.WaitGroup
	RegisterContainer(ctx, &wg, app, cfg)
	return app, &wg
}

func GracefulShutdown(app *fiber.App, wg *sync.WaitGroup) {
	slog.Info("Waiting for background processes to finish...")
	wg.Wait()
	slog.Info("All background processes finished.")

	if err := app.ShutdownWithTimeout(5 * time.Second); err != nil {
		slog.Error("Server shutdown failed", "error", err)
		os.Exit(1)
	}
	slog.Info("Server stopped.")
}
