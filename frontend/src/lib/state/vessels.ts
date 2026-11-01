import type { Container, ContainerState } from "../protocol/types";

/**
 * Project compose dengan container sebanyak ini atau lebih tampil sebagai kapal kontainer.
 * Di bawahnya (satu container) tampil sebagai perahu biasa.
 */
export const FLEET_MIN = 2;

export type Vessel =
  | { kind: "solo"; key: string; container: Container }
  | { kind: "fleet"; key: string; project: string; containers: Container[] };

/**
 * Mengelompokkan container menjadi kapal.
 *
 * - Yang dihitung adalah semua container milik project, termasuk yang sedang berhenti,
 *   supaya bentuk kapal tidak berganti-ganti saat satu service mati.
 * - Container hasil `compose run` (oneoff) dianggap sementara dan selalu menjadi perahu sendiri.
 * - Kunci kapal bergantung pada project, bukan pada ID container: ID berganti tiap
 *   `compose up --force-recreate`, sedangkan kunci tetap. Container compose selalu memakai
 *   kunci project walaupun sedang jadi perahu, jadi saat di-scale dari 1 ke 2 kapalnya
 *   hanya berganti bentuk dan posisinya tidak hilang.
 */
export function groupVessels(containers: Iterable<Container>): Vessel[] {
  const vessels: Vessel[] = [];
  const byProject = new Map<string, Container[]>();

  for (const c of containers) {
    if (c.project && !c.oneoff) {
      let list = byProject.get(c.project);
      if (!list) byProject.set(c.project, (list = []));
      list.push(c);
    } else {
      vessels.push({ kind: "solo", key: `container:${c.name}`, container: c });
    }
  }

  for (const [project, list] of byProject) {
    // urutan tetap supaya kotak di kapal tidak bertukar tempat
    list.sort((a, b) => (a.service ?? a.name).localeCompare(b.service ?? b.name));
    const key = `project:${project}`;
    vessels.push(
      list.length >= FLEET_MIN
        ? { kind: "fleet", key, project, containers: list }
        : { kind: "solo", key, container: list[0] },
    );
  }

  return vessels;
}

/** Semua container di dalam satu kapal. */
export function membersOf(v: Vessel): Container[] {
  return v.kind === "fleet" ? v.containers : [v.container];
}

/**
 * State gabungan untuk gerak kapal. Kapal kontainer baru tenggelam kalau semua isinya mati.
 * Kalau hanya sebagian yang mati, kapal tetap mengapung dan slot kosongnya terlihat di dek.
 */
export function fleetState(states: ContainerState[]): ContainerState {
  if (states.every((s) => s === "exited")) return "exited";
  if (states.some((s) => s === "restarting")) return "restarting";
  if (states.some((s) => s === "paused") && states.every((s) => s === "paused" || s === "exited")) {
    return "paused";
  }
  return "running";
}
