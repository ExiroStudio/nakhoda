<script lang="ts">
  import { onMount } from "svelte";
  import { Application, type Ticker } from "pixi.js";
  import { Camera } from "../scene/Camera";
  import { Background } from "../scene/Background";
  import { NetworkLayer } from "../scene/NetworkLayer";
  import { ShipLayer } from "../scene/ShipLayer";
  import { world } from "../state/world.svelte";

  let host: HTMLDivElement;
  let ships: ShipLayer | null = null;
  let frame: ((t: Ticker) => void) | null = null;

  // state dan daftar kapal dibaca di luar kondisi, supaya efek selalu melacak keduanya
  $effect(() => {
    const state = world.state;
    const vessels = world.vessels;
    ships?.sync(state, vessels);
  });

  // dibaca dulu sebelum `ships?.`: kalau ships masih null, optional chaining melewati argumennya,
  // efek tidak punya dependensi, dan tidak pernah jalan lagi
  $effect(() => {
    const key = world.selectedKey;
    ships?.setSelected(key);
  });

  onMount(() => {
    const app = new Application();
    let camera: Camera | null = null;
    let destroyed = false;

    (async () => {
      await app.init({ background: "#0b1d33", resizeTo: host, antialias: true });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);

      camera = new Camera(app);
      const bg = new Background(camera);
      camera.onChange = () => bg.redraw();
      app.renderer.on("resize", () => bg.redraw());
      camera.centerOnOrigin(); // memanggil bg.redraw() lewat onChange
      camera.onTap = () => world.select(null);

      // urutan lapisan: latar (0), garis network (1), lalu kapal
      const network = new NetworkLayer();
      camera.world.addChildAt(network.view, 1);

      const layer = new ShipLayer(camera.world, app.stage, (key) => world.select(key));
      ships = layer;
      layer.sync(world.state, world.vessels); // snapshot mungkin sudah tiba sebelum Pixi siap
      layer.setSelected(world.selectedKey);

      const cam = camera;
      frame = (t) => {
        layer.tick(t.deltaMS);
        network.redraw(world.state, layer.anchorOf, cam.world.scale.x);
      };
      app.ticker.add(frame);
    })();

    return () => {
      destroyed = true;
      if (frame) app.ticker.remove(frame);
      frame = null;
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
