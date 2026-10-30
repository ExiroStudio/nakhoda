<script lang="ts">
  import { onMount } from "svelte";
  import { Application } from "pixi.js";
  import { Camera } from "../scene/Camera";
  import { Background } from "../scene/Background";
  import { ShipLayer } from "../scene/ShipLayer";
  import { world } from "../state/world.svelte";

  let host: HTMLDivElement;
  let ships: ShipLayer | null = null;

  $effect(() => {
    const s = world.state;
    ships?.sync(s);
  });

  $effect(() => {
    const sel = world.selectedId;
    ships?.setSelected(sel);
  });

  onMount(() => {
    const app = new Application();
    let camera: Camera | null = null;
    let destroyed = false;

    (async () => {
      await app.init({
        background: "#0b1d33",
        resizeTo: host,
        antialias: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);
      host.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
        },
        { passive: false },
      );
      camera = new Camera(app);
      const bg = new Background(camera);
      camera.onChange = () => bg.redraw();
      app.renderer.on("resize", () => bg.redraw());
      bg.redraw();
      camera.onTap = () => {
        world.selectedId = null;
      };
      ships = new ShipLayer(camera.world, app.stage, (id) => {
        world.selectedId = id;
      });
      ships.sync(world.state);
      ships.setSelected(world.selectedId);
    })();

    return () => {
      destroyed = true;
      ships?.destroy();
      ships = null;
      camera?.destroy();
      if (app.renderer) app.destroy(true, { children: true });
    };
  });
</script>

<div bind:this={host} class="host"></div>

<style>
  .host {
    width: 100%;
    height: 100%;
  }
</style>
