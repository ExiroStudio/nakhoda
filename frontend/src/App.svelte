<script lang="ts">
  import { onMount } from "svelte";
  import CanvasHost from "./lib/ui/CanvasHost.svelte";
  import { world } from "./lib/state/world.svelte";
  import Inspector from "./lib/ui/Inspector.svelte";

  onMount(() => {
    const es = new EventSource("/events");
    es.onmessage = (e) => world.apply(JSON.parse(e.data));
    return () => es.close();
  });
</script>

<div class="app">
  <CanvasHost />
  <div class="overlay">
    <Inspector />
  </div>
</div>

<style>
  .app {
    position: fixed;
    inset: 0;
  }

  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .overlay > :global(*) {
    pointer-events: auto;
  }
</style>
