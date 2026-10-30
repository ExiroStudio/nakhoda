export type HostId = string;

export type ContainerState = "running" | "exited" | "paused" | "restarting";

export interface Container {
  id: string;
  name: string;
  image: string;
  state: ContainerState;
  networks: string[]; // id network yang diikuti
}

export interface Network {
  id: string;
  name: string;
}

export interface Stats {
  cpu: number;      // persen
  memBytes: number;
}

export type WorldEvent =
  | { t: "snapshot"; host: HostId; containers: Container[]; networks: Network[] }
  | { t: "container.started"; host: HostId; container: Container }
  | { t: "container.died"; host: HostId; id: string }
  | { t: "container.removed"; host: HostId; id: string }
  | { t: "network.connected"; host: HostId; networkId: string; containerId: string }
  | { t: "network.disconnected"; host: HostId; networkId: string; containerId: string }
  | { t: "stats"; host: HostId; id: string; cpu: number; memBytes: number };

export type Intent =
  | { t: "start" | "stop" | "restart"; host: HostId; id: string }
  | { t: "connect" | "disconnect"; host: HostId; id: string; networkId: string };