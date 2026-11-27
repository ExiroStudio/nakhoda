package hub

import (
	"backend/internal/protocol"
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"
)

const interval = 2 * time.Second

type Source interface {
	Snapshot(ctx context.Context) (protocol.Snapshot, error)
}

type Hub struct {
	source Source

	mu    sync.RWMutex
	frame []byte
	subs  map[chan []byte]struct{}
}

func New(source Source) *Hub {
	return &Hub{
		source: source,
		subs:   make(map[chan []byte]struct{}),
	}
}

func (h *Hub) Run(ctx context.Context) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		h.refresh(ctx)
		select {
		case <-t.C:
		case <-ctx.Done():
			return
		}
	}
}

func (h *Hub) refresh(ctx context.Context) {
	rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	snap, err := h.source.Snapshot(rctx)
	if err != nil {
		slog.Warn("snapshot gagal", "error", err)
		return
	}
	b, err := json.Marshal(snap)
	if err != nil {
		slog.Error("marshal snapshot", "error", err)
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	if bytes.Equal(b, h.frame) {
		return
	}
	h.frame = b
	for ch := range h.subs {
		select {
		case <-ch:
		default:
		}
		ch <- b
	}
}

func (h *Hub) Subscribe() (first []byte, updates <-chan []byte, cancel func()) {
	ch := make(chan []byte, 1)

	h.mu.Lock()
	h.subs[ch] = struct{}{}
	first = h.frame
	h.mu.Unlock()

	return first, ch, func() {
		h.mu.Lock()
		delete(h.subs, ch)
		h.mu.Unlock()
	}
}
