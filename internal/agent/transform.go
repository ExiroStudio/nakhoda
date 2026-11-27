package agent

import (
	"backend/internal/docker"
	"backend/internal/protocol"
)

func ContainerRawToProtocol(c *docker.RawContainer) protocol.Container {
	return protocol.Container{
		ID:    c.ID,
		Name:  c.Names[0],
		State: c.State,
	}
}
