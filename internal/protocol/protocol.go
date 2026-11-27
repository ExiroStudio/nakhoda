package protocol

// Cermin dari src/lib/protocol/types.ts di frontend.

type Container struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Image    string   `json:"image"`
	State    string   `json:"state"` // running | exited | paused | restarting
	Networks []string `json:"networks"`
	Project  string   `json:"project,omitempty"`
	Service  string   `json:"service,omitempty"`
	OneOff   bool     `json:"oneoff,omitempty"`
}

type Network struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Snapshot struct {
	Type       string      `json:"type"` // selalu "snapshot"
	Containers []Container `json:"containers"`
	Networks   []Network   `json:"networks"`
}
