package agent

import (
	"backend/internal/docker"
	"backend/internal/protocol"
	"context"
	"sort"
	"strings"
)

type Agent struct {
	docker *docker.DockerClient
}

func NewAgent(d *docker.DockerClient) *Agent {
	return &Agent{docker: d}
}

// Jaringan bawaan Docker tidak digambar: hampir semua container ada di "bridge",
// sehingga semua kapal akan tersambung ke satu pelampung yang tidak berarti.
var hiddenNetworks = map[string]bool{"bridge": true, "host": true, "none": true}

func (a *Agent) Snapshot(ctx context.Context) (protocol.Snapshot, error) {
	rawC, err := a.docker.Containers(ctx)
	if err != nil {
		return protocol.Snapshot{}, err
	}
	rawN, err := a.docker.Networks(ctx)
	if err != nil {
		return protocol.Snapshot{}, err
	}

	snap := protocol.Snapshot{
		Type:       "snapshot",
		Containers: make([]protocol.Container, 0, len(rawC)),
		Networks:   make([]protocol.Network, 0, len(rawN)),
	}
	for i := range rawC {
		snap.Containers = append(snap.Containers, toContainer(&rawC[i]))
	}
	for _, n := range rawN {
		if hiddenNetworks[n.Name] {
			continue
		}
		snap.Networks = append(snap.Networks, protocol.Network{ID: n.ID, Name: n.Name})
	}

	// urutan tetap, supaya hub bisa membandingkan hasil dengan murah
	sort.Slice(snap.Containers, func(i, j int) bool { return snap.Containers[i].Name < snap.Containers[j].Name })
	sort.Slice(snap.Networks, func(i, j int) bool { return snap.Networks[i].Name < snap.Networks[j].Name })
	return snap, nil
}

func toContainer(r *docker.RawContainer) protocol.Container {
	id := r.ID

	name := id
	if len(r.Names) > 0 {
		name = strings.TrimPrefix(r.Names[0], "/")
	}

	nets := make([]string, 0, len(r.NetworkSettings.Networks))
	for netName, n := range r.NetworkSettings.Networks {
		if hiddenNetworks[netName] {
			continue
		}
		nets = append(nets, n.NetworkID)
	}
	sort.Strings(nets)

	return protocol.Container{
		ID:       id,
		Name:     name,
		Image:    r.Image,
		State:    normalizeState(r.State),
		Networks: nets,
		Project:  r.Labels["com.docker.compose.project"],
		Service:  r.Labels["com.docker.compose.service"],
		OneOff:   strings.EqualFold(r.Labels["com.docker.compose.oneoff"], "true"),
	}
}

// Docker punya 7 state, frontend hanya mengenal 4.
func normalizeState(s string) string {
	switch s {
	case "running", "paused", "restarting":
		return s
	default: // created, exited, dead, removing
		return "exited"
	}
}
