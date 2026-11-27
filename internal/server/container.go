package server

import (
	"backend/config"
	"backend/internal/agent"
	"backend/internal/docker"
	"backend/internal/hub"
	"context"
	"sync"

	"github.com/gofiber/fiber/v3"
)

func RegisterContainer(ctx context.Context, wg *sync.WaitGroup, app *fiber.App, cfg *config.Config) {
	dockerClient := docker.NewDockerClient(cfg)
	ag := agent.NewAgent(dockerClient)
	h := hub.New(ag)

	wg.Add(1)
	go func() {
		defer wg.Done()
		h.Run(ctx)
	}()

	NewRoutes(NewHandler(ctx, h)).RegisterRoute(app)
}
