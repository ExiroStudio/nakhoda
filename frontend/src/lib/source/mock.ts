import type { DataSource } from "./DataSource";
import type { Container, Intent, WorldEvent } from "../protocol/types";

const HOST = "mock";

export function createMockSource(): DataSource {
    const listeners = new Set<(e: WorldEvent) => void>();
    const emit = (e: WorldEvent) => listeners.forEach((l) => l(e));

    const networks = [
        { id: "n1", name: "app-net" },
        { id: "n2", name: "db-net" },
    ];
    const seed: Container[] = [
        { id: "c1", name: "web", image: "nginx:alpine", state: "running", networks: ["n1"] },
        { id: "c2", name: "api", image: "myapp/api:1.4", state: "running", networks: ["n1", "n2"] },
        { id: "c3", name: "postgres", image: "postgres:16", state: "running", networks: ["n2"] },
        { id: "c4", name: "redis", image: "redis:7", state: "running", networks: ["n1"] },
        { id: "c5", name: "worker", image: "myapp/worker:1.4", state: "running", networks: ["n1", "n2"] },
        { id: "c6", name: "grafana", image: "grafana/grafana", state: "running", networks: [] },
    ];
    const containers = new Map(seed.map((c) => [c.id, c]));

    function setRunning(c: Container, on: boolean) {
        c.state = on ? "running" : "exited";
        emit(
            on
                ? { t: "container.started", host: HOST, container: { ...c } }
                : { t: "container.died", host: HOST, id: c.id },
        );
    }

    let timer: ReturnType<typeof setInterval> | undefined;
    let tick = 0;

    function start() {
        timer = setInterval(() => {
            tick++;
            for (const c of containers.values()) {
                if (c.state !== "running") continue;
                emit({
                    t: "stats",
                    host: HOST,
                    id: c.id,
                    cpu: Math.random() * 60,
                    memBytes: (100 + Math.random() * 400) * 1e6,
                });
            }
            if (tick % 8 === 0) {
                const all = [...containers.values()];
                const c = all[Math.floor(Math.random() * all.length)];
                setRunning(c, c.state !== "running");
            }
        }, 1000);
    }

    return {
        subscribe(onEvent) {
            listeners.add(onEvent);
            onEvent({
                t: "snapshot",
                host: HOST,
                containers: [...containers.values()].map((c) => ({ ...c })),
                networks,
            });
            if (!timer) start();
            return () => {
                listeners.delete(onEvent);
                if (listeners.size === 0) {
                    clearInterval(timer);
                    timer = undefined;
                }
            };
        },

        async send(i: Intent) {
            await new Promise((r) => setTimeout(r, 150)); // latensi palsu
            if (i.t === "start" || i.t === "stop") {
                const c = containers.get(i.id);
                if (c) setRunning(c, i.t === "start");
            }
            // restart, connect, disconnect: menyusul bersama drag and drop
        },
    };
}