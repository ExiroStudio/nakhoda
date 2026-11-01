<script lang="ts">
  import type { Container } from "../protocol/types";
  import { world } from "../state/world.svelte";
  import { membersOf } from "../state/vessels";

  const vessel = $derived(world.vessels.find((v) => v.key === world.selectedKey));
  const members = $derived(vessel ? membersOf(vessel) : []);
  const running = $derived(members.filter((c) => c.state === "running").length);

  // perahu: langsung container-nya. Kapal kontainer: container yang dipilih dari daftar, kalau ada.
  const focused = $derived(
    vessel?.kind === "solo"
      ? vessel.container
      : members.find((c) => c.id === world.selectedContainerId),
  );

  const netNames = (c: Container) =>
    c.networks.map((id) => world.state.networks.get(id)?.name ?? id);

  const close = () => world.select(null);
  const toggle = (id: string) =>
    (world.selectedContainerId = world.selectedContainerId === id ? null : id);
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && close()} />

{#snippet detail(c: Container)}
  {@const st = world.state.stats.get(c.id)}
  <dl>
    <dt>Container</dt>
    <dd>{c.name}</dd>

    <dt>Image</dt>
    <dd>{c.image}</dd>

    <dt>Status</dt>
    <dd class="state" data-state={c.state}>{c.state}</dd>

    <dt>Network</dt>
    <dd>{netNames(c).join(", ") || "—"}</dd>

    {#if st}
      <dt>CPU</dt>
      <dd>{st.cpu.toFixed(1)}%</dd>
      <dt>Memori</dt>
      <dd>{(st.memBytes / 1e6).toFixed(0)} MB</dd>
    {/if}
  </dl>
{/snippet}

{#if vessel}
  <aside class="inspector">
    <header>
      <h2>{vessel.kind === "fleet" ? vessel.project : vessel.container.name}</h2>
      <button class="x" onclick={close} aria-label="Tutup">✕</button>
    </header>

    {#if vessel.kind === "fleet"}
      <p class="sub">compose · {running}/{members.length} running</p>
      <ul class="list">
        {#each members as c (c.id)}
          {@const st = world.state.stats.get(c.id)}
          <li>
            <button
              class="row"
              class:on={c.id === world.selectedContainerId}
              onclick={() => toggle(c.id)}
            >
              <span class="dot" data-state={c.state}></span>
              <span class="name">{c.service ?? c.name}</span>
              <span class="cpu">{st ? st.cpu.toFixed(0) + "%" : "—"}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if focused}
      {#if vessel.kind === "fleet"}<hr />{/if}
      {@render detail(focused)}
    {/if}
  </aside>
{/if}

<style>
  .inspector {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 300px;
    max-width: calc(100% - 32px);
    max-height: calc(100% - 32px);
    overflow-y: auto;
    box-sizing: border-box;
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
    margin-bottom: 6px;
  }
  h2 {
    margin: 0;
    font-size: 16px;
  }
  .sub {
    margin: 0 0 10px;
    color: #7f9bbd;
    font-size: 13px;
  }
  button {
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .x {
    font-size: 16px;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 40vh;
    overflow-y: auto;
  }
  .row {
    display: grid;
    grid-template-columns: 10px 1fr auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border-radius: 8px;
    text-align: left;
  }
  .row:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .row.on {
    background: rgba(95, 160, 255, 0.18);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cpu {
    color: #7f9bbd;
    font-variant-numeric: tabular-nums;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #6b7c93;
  }
  .dot[data-state="running"] {
    background: #3fa66b;
  }
  .dot[data-state="exited"] {
    background: transparent;
    box-shadow: inset 0 0 0 2px #8a3b42;
  }
  .dot[data-state="restarting"] {
    background: #e0b04a;
  }

  hr {
    border: 0;
    border-top: 1px solid #1c3a5e;
    margin: 10px 0;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 14px;
    margin: 0;
  }
  dt {
    color: #7f9bbd;
  }
  dd {
    margin: 0;
    word-break: break-all;
  }
  .state[data-state="running"] {
    color: #5fd08a;
  }
  .state[data-state="exited"] {
    color: #e0707a;
  }
  .state[data-state="restarting"] {
    color: #e0b04a;
  }
</style>
