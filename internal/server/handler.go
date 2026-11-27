package server

import (
	"backend/internal/hub"
	"bufio"
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	ctx context.Context
	hub *hub.Hub
}

func NewHandler(ctx context.Context, h *hub.Hub) *Handler {
	return &Handler{ctx: ctx, hub: h}
}

func (h *Handler) Events(c fiber.Ctx) error {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("X-Accel-Buffering", "no")

	c.SendStreamWriter(func(w *bufio.Writer) {
		first, updates, cancel := h.hub.Subscribe()
		defer cancel()

		send := func(b []byte) bool {
			if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
				return false
			}
			return w.Flush() == nil
		}

		if first != nil && !send(first) {
			return
		}

		ping := time.NewTicker(20 * time.Second)
		defer ping.Stop()
		for {
			select {
			case b := <-updates:
				if !send(b) {
					return
				}
			case <-ping.C:
				if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil || w.Flush() != nil {
					return
				}
			case <-h.ctx.Done():
				return
			}
		}
	})
	return nil
}
