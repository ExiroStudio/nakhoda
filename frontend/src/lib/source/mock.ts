import type { DataSource } from "./DataSource";
import type { Container, Intent, WorldEvent } from "../protocol/types";

const HOST = "mock";

export function createMockSource(): DataSource {
  const listeners = new Set<(e: WorldEvent) => void>();
  const emit = (e: WorldEvent) => listeners.forEach((l) => l(e));

  // edge-net dipakai lintas project (garisnya digambar), dua network lain internal satu project
  const networks = [
    { id: "n1", name: "edge-net" },
    { id: "n2", name: "shop_backend" },
    { id: "n3", name: "blog_default" },
  ];

  const seed: Container[] = [
    // project "shop": 5 container, jadi kapal kontainer
    { id: "c1", name: "shop-web-1", image: "nginx:alpine", state: "restarting", networks: ["n1", "n2"], project: "shop", service: "web" },
    { id: "c2", name: "shop-api-1", image: "myapp/api:1.4", state: "running", networks: ["n2"], project: "shop", service: "api" },
    { id: "c3", name: "shop-postgres-1", image: "postgres:16", state: "overload", networks: ["n2"], project: "shop", service: "postgres" },
    { id: "c4", name: "shop-redis-1", image: "redis:7", state: "running", networks: ["n2"], project: "shop", service: "redis" },
    { id: "c5", name: "shop-worker-1", image: "myapp/worker:1.4", state: "running", networks: ["n2"], project: "shop", service: "worker" },
    // project "blog": 2 container, jadi kapal kontainer kecil
    { id: "c6", name: "blog-wordpress-1", image: "wordpress:6", state: "running", networks: ["n1", "n3"], project: "blog", service: "wordpress" },
    { id: "c7", name: "blog-db-1", image: "mariadb:11", state: "running", networks: ["n3"], project: "blog", service: "db" },
    // project "docs": hanya 1 container, tetap perahu
    { id: "c8", name: "docs-mkdocs-1", image: "squidfunk/mkdocs-material", state: "running", networks: ["n1"], project: "docs", service: "mkdocs" },
    // docker run biasa
    { id: "c9", name: "grafana", image: "grafana/grafana", state: "restarting", networks: ["n1"] },
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
