package docker

import (
	"backend/config"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
)

type DockerClient struct {
	http *http.Client
}

func NewDockerClient(cfg *config.Config) *DockerClient {
	socket := cfg.DockerSock
	if socket == "" {
		socket = "/var/run/docker.sock"
	}
	return &DockerClient{
		http: &http.Client{
			// tanpa Timeout global: batas waktu diatur lewat ctx oleh pemanggil
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
					return (&net.Dialer{}).DialContext(ctx, "unix", socket)
				},
			},
		},
	}
}

// Get: host "docker" hanya formalitas, yang dipakai tetap unix socket.
func (c *DockerClient) Get(ctx context.Context, path string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://localhost"+path, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("docker %s: %s: %s", path, resp.Status, msg)
	}
	return resp, nil
}

func (c *DockerClient) getJSON(ctx context.Context, path string, out any) error {
	resp, err := c.Get(ctx, path)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(out)
}
