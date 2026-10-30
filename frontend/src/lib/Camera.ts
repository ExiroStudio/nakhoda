import { Application, Container, FederatedPointerEvent, Point, Rectangle } from "pixi.js";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export class Camera {
  readonly world = new Container();
  onChange: (() => void) | null = null;

  private dragging = false;
  private last = new Point();

  constructor(private app: Application) {
    app.stage.addChild(this.world);

    // stage menangkap pointer di seluruh layar, jadi latar kosong bisa di-drag
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointerdown", this.onDown);
    app.stage.on("pointermove", this.onMove);
    app.stage.on("pointerup", this.onUp);
    app.stage.on("pointerupoutside", this.onUp);

    app.canvas.style.cursor = "grab";
    app.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private onDown = (e: FederatedPointerEvent) => {
    this.dragging = true;
    this.last.copyFrom(e.global);
    this.app.canvas.style.cursor = "grabbing";
  };

  private onMove = (e: FederatedPointerEvent) => {
    if (!this.dragging) return;
    this.world.x += e.global.x - this.last.x;
    this.world.y += e.global.y - this.last.y;
    this.last.copyFrom(e.global);
    this.onChange?.();
  };

  private onUp = () => {
    this.dragging = false;
    this.app.canvas.style.cursor = "grab";
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    // Firefox bisa mengirim deltaMode "baris" untuk mouse biasa
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    this.zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-dy * 0.0015));
  };

  /** Zoom dengan titik (sx, sy) di layar sebagai pusat, jadi titik itu tidak bergeser. */
  zoomAt(sx: number, sy: number, factor: number) {
    const old = this.world.scale.x;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old * factor));
    const k = next / old;
    this.world.position.set(
      sx - (sx - this.world.x) * k,
      sy - (sy - this.world.y) * k,
    );
    this.world.scale.set(next);
    this.onChange?.();
  }

  /** Area dunia yang sedang terlihat di layar (koordinat dunia). */
  visibleWorldRect(): Rectangle {
    const s = this.world.scale.x;
    return new Rectangle(
      -this.world.x / s,
      -this.world.y / s,
      this.app.screen.width / s,
      this.app.screen.height / s,
    );
  }

  destroy() {
    this.app.stage.off("pointerdown", this.onDown);
    this.app.stage.off("pointermove", this.onMove);
    this.app.stage.off("pointerup", this.onUp);
    this.app.stage.off("pointerupoutside", this.onUp);
    this.app.canvas.removeEventListener("wheel", this.onWheel);
  }
}