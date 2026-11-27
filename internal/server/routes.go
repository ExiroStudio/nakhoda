package server

import (
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

type Routes struct {
	handler *Handler
}

func NewRoutes(handler *Handler) *Routes {
	return &Routes{handler: handler}
}

func (r *Routes) RegisterRoute(app *fiber.App) {
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Get("/events", r.handler.Events)
	// app.Post("/intent", ...)
	if err := registerFrontend(app); err != nil {
		slog.Error("frontend", "error", err)
	}
}
