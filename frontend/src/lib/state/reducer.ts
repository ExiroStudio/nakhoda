import type { Container, Network, Stats, WorldEvent } from "../protocol/types";

export interface WorldState {
    containers: Map<string, Container>;
    networks: Map<string, Network>;
    stats: Map<string, Stats>;
}

export const emptyState = (): WorldState => ({
    containers: new Map(),
    networks: new Map(),
    stats: new Map(),
});

export function reduce(s: WorldState, e: WorldEvent): WorldState {
    switch (e.t) {
        case "snapshot":
            return {
                containers: new Map(e.containers.map((c) => [c.id, c])),
                networks: new Map(e.networks.map((n) => [n.id, n])),
                stats: new Map(),
            };

        case "container.started": {
            const containers = new Map(s.containers);
            containers.set(e.container.id, e.container);
            return { ...s, containers };
        }

        case "container.died": {
            const c = s.containers.get(e.id);
            if (!c) return s;
            const containers = new Map(s.containers).set(e.id, { ...c, state: "exited" });
            const stats = new Map(s.stats);
            stats.delete(e.id);
            return { ...s, containers, stats };
        }

        case "container.removed": {
            const containers = new Map(s.containers);
            const stats = new Map(s.stats);
            containers.delete(e.id);
            stats.delete(e.id);
            return { ...s, containers, stats };
        }

        case "network.connected": {
            const c = s.containers.get(e.containerId);
            if (!c || c.networks.includes(e.networkId)) return s;
            const containers = new Map(s.containers).set(c.id, {
                ...c,
                networks: [...c.networks, e.networkId],
            });
            return { ...s, containers };
        }

        case "network.disconnected": {
            const c = s.containers.get(e.containerId);
            if (!c) return s;
            const containers = new Map(s.containers).set(c.id, {
                ...c,
                networks: c.networks.filter((n) => n !== e.networkId),
            });
            return { ...s, containers };
        }

        case "stats": {
            const stats = new Map(s.stats).set(e.id, { cpu: e.cpu, memBytes: e.memBytes });
            return { ...s, stats };
        }
    }
}