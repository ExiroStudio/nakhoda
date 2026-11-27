package cmd

import (
	"backend/config"
	"backend/internal/server"
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
)

func StartServer() {
	config, err := config.LoadConfig()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	app, wg := server.NewServer(ctx, &config)
	go func() {
		slog.Info("Server is starting", "port", 3000)
		if err := app.Listen("0.0.0.0:3000"); err != nil {
			slog.Error("Server failed to start", "error", err)
		}
	}()
	<-ctx.Done()
	server.GracefulShutdown(app, wg)
}
