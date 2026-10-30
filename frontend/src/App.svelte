<script lang="ts">
  import CanvasHost from "./lib/ui/CanvasHost.svelte";
</script>

<div class="app">
  <CanvasHost />
  <div class="overlay">
    <!-- HostSwitcher, Inspector, dst. -->
  </div>
</div>

<style>
  .app {
    position: fixed;
    inset: 0;                  /* menempel ke seluruh viewport */
  }

  .overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;      /* klik tembus ke kanvas */
  }

  .overlay > :global(*) {
    pointer-events: auto;      /* kecuali panelnya sendiri */
  }
</style>