<script lang="ts">
  import { onMount } from "svelte";
  import { Application, Graphics } from "pixi.js";
  import { Camera } from "../Camera";
  import { Background } from "../scene/Background";

  let host: HTMLDivElement;

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
          // di sini nanti: zoom kanvas
        },
        { passive: false },
      );
      camera = new Camera(app);
      const bg = new Background(camera);
      camera.onChange = () => bg.redraw();
      app.renderer.on("resize", () => bg.redraw());
      bg.redraw();

      const box = new Graphics().rect(-40, -40, 80, 80).fill(0xe0b04a);
      camera.world.addChild(box);
    })();

    return () => {
      destroyed = true;
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
