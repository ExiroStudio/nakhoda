import type { Intent, WorldEvent } from "../protocol/types";

export interface DataSource {
  subscribe(onEvent: (e: WorldEvent) => void): () => void;
  send(intent: Intent): Promise<void>;
}