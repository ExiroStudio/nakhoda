import type { WorldEvent } from "../protocol/types";
import { emptyState, reduce } from "./reducer";

class World {
    state = $state.raw(emptyState());
    selectedId = $state<string | null>(null);

    apply(e: WorldEvent) {
        this.state = reduce(this.state, e);
        if (this.selectedId && !this.state.containers.has(this.selectedId)) {
            this.selectedId = null;
        }
    }
}

export const world = new World();