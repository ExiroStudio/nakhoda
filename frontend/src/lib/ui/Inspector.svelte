<script lang="ts">
  import { world } from "../state/world.svelte";

  const container = $derived(
    world.selectedId ? world.state.containers.get(world.selectedId) : undefined,
  );
  const stats = $derived(container ? world.state.stats.get(container.id) : undefined);
  const networkNames = $derived(
    container ? container.networks.map((id) => world.state.networks.get(id)?.name ?? id) : [],
  );

  const close = () => (world.selectedId = null);
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && close()} />

{#if container}
  <aside class="inspector">
    <header>
      <h2>{container.name}</h2>
      <button onclick={close} aria-label="Tutup">✕</button>
    </header>

    <dl>
      <dt>Image</dt>
      <dd>{container.image}</dd>

      <dt>Status</dt>
      <dd class="state" data-state={container.state}>{container.state}</dd>

      <dt>Network</dt>
      <dd>{networkNames.join(", ") || "—"}</dd>

      {#if stats}
        <dt>CPU</dt>
        <dd>{stats.cpu.toFixed(1)}%</dd>
        <dt>Memori</dt>
        <dd>{(stats.memBytes / 1e6).toFixed(0)} MB</dd>
      {/if}
    </dl>
  </aside>
{/if}

<style>
  .inspector {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 280px;
    max-width: calc(100% - 32px);
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(11, 29, 51, 0.82);
    backdrop-filter: blur(8px);
    border: 1px solid #1c3a5e;
    color: #dbe8f7;
    font: 14px/1.4 system-ui, sans-serif;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  h2 { margin: 0; font-size: 16px; }
  button {
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    font-size: 16px;
  }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; }
  dt { color: #7f9bbd; }
  dd { margin: 0; word-break: break-all; }
  .state[data-state="running"] { color: #5fd08a; }
  .state[data-state="exited"] { color: #e0707a; }
  .state[data-state="restarting"] { color: #e0b04a; }
</style>