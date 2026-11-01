import type { WorldEvent } from "../protocol/types";
import { emptyState, reduce } from "./reducer";
import { groupVessels } from "./vessels";

class World {
  state = $state.raw(emptyState());

  /** Daftar kapal turunan dari state: perahu dan kapal kontainer. */
  vessels = $derived(groupVessels(this.state.containers.values()));

  /** Kapal yang dipilih (kunci kapal, bukan ID container). */
  selectedKey = $state<string | null>(null);
  /** Container yang dipilih di dalam kapal kontainer, opsional. */
  selectedContainerId = $state<string | null>(null);

  select(key: string | null) {
    this.selectedKey = key;
    this.selectedContainerId = null;
  }

  apply(e: WorldEvent) {
    this.state = reduce(this.state, e);

    // lepas pilihan yang sudah tidak ada lagi
    if (this.selectedKey) {
      const v = this.vessels.find((x) => x.key === this.selectedKey);
      if (!v) {
        this.select(null);
      } else if (
        this.selectedContainerId &&
        v.kind === "fleet" &&
        !v.containers.some((c) => c.id === this.selectedContainerId)
      ) {
        this.selectedContainerId = null;
      }
    }
  }
}

export const world = new World();
