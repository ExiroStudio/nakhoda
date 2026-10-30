import {
    Container as PixiContainer,
    FederatedPointerEvent,
    Graphics,
    Text,
} from "pixi.js";
import type {
    Container as DockerContainer,
    ContainerState,
    Stats,
} from "../protocol/types";

const COLORS = {
    running: 0x3fa66b,
    exited: 0x8a3b42,
    paused: 0x6b7c93,
    restarting: 0xe0b04a,
} as const;

export class Ship extends PixiContainer {
    readonly shipId: string;
    private hull = new Graphics();
    private title = new Text({
        text: "",
        style: { fill: 0xffffff, fontSize: 14, fontWeight: "600" },
    });
    private info = new Text({ text: "", style: { fill: 0xcfe3ff, fontSize: 12 } });
    private state: ContainerState = "running";
    private selected = false;

    constructor(id: string, onPress: (ship: Ship, e: FederatedPointerEvent) => void) {
        super();
        this.shipId = id;

        this.eventMode = "static";
        this.cursor = "grab";
        this.on("pointerdown", (e) => {
            e.stopPropagation();
            onPress(this, e);
        });

        this.title.position.set(12, 10);
        this.info.position.set(12, 34);
        this.addChild(this.hull, this.title, this.info);
        this.draw();
    }

    update(c: DockerContainer, s?: Stats) {
        this.title.text = c.name;
        this.info.text = s ? `cpu ${s.cpu.toFixed(0)}%` : c.state;
        if (c.state !== this.state) {
            this.state = c.state;
            this.draw();
        }
    }

    setSelected(v: boolean) {
        if (v === this.selected) return;
        this.selected = v;
        this.draw();
    }

    private draw() {
        this.hull.clear().roundRect(0, 0, 150, 60, 10).fill(COLORS[this.state]);
        if (this.selected) {
            this.hull.roundRect(-4, -4, 158, 68, 13).stroke({ width: 3, color: 0xffffff });
        }
    }
}