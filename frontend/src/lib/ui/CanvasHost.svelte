<script lang="ts">
  import { onMount } from "svelte";
  import { Application, type Ticker } from "pixi.js";
  import { Camera } from "../scene/Camera";
  import { Background } from "../scene/Background";
  import { ShipLayer } from "../scene/ShipLayer";
  import { world } from "../state/world.svelte";
  import { NetworkLayer } from "../scene/NetworkLayer";

  let host: HTMLDivElement;
  let ships: ShipLayer | null = null;
  let network: NetworkLayer | null = null;
  let frame: ((t: Ticker) => void) | null = null;

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
      network = new NetworkLayer();
      camera.world.addChildAt(network.view, 1);

      ships = new ShipLayer(camera.world, app.stage, (id) => {
        world.selectedId = id;
      });
      ships.sync(world.state);
      ships.setSelected(world.selectedId);

      const cam = camera;
      const layer = ships;
      const nets = network;
      frame = (t) => {
        layer.tick(t.deltaMS);
        nets.redraw(world.state, layer.anchorOf, cam.world.scale.x);
      };
      app.ticker.add(frame);
    })();

    return () => {
      destroyed = true;
      if (frame) app.ticker.remove(frame);
      frame = null;
      ships?.destroy();
      ships = null;
      network = null;
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
