package docker

import "context"

type RawContainer struct {
	ID              string            `json:"Id"`
	Names           []string          `json:"Names"`
	Image           string            `json:"Image"`
	State           string            `json:"State"`
	Labels          map[string]string `json:"Labels"`
	NetworkSettings struct {
		Networks map[string]struct {
			NetworkID string `json:"NetworkID"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

type RawNetwork struct {
	ID   string `json:"Id"`
	Name string `json:"Name"`
}

func (c *DockerClient) Containers(ctx context.Context) ([]RawContainer, error) {
	var out []RawContainer
	if err := c.getJSON(ctx, "/containers/json?all=1", &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *DockerClient) Networks(ctx context.Context) ([]RawNetwork, error) {
	var out []RawNetwork
	if err := c.getJSON(ctx, "/networks", &out); err != nil {
		return nil, err
	}
	return out, nil
}
