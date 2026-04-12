/**
 * Greedy column assignment for interval-packed week cells (Phase 1 — no drag/drop).
 */

export type IntervalEv = { id: string; startMs: number; endMs: number };

export type IntervalPlacement = { col: number; maxCols: number };

/** Assign columns for overlapping timed blocks in one day column. */
export function layoutOverlappingIntervals(evs: IntervalEv[]): Map<string, IntervalPlacement> {
  const sorted = [...evs].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const out = new Map<string, IntervalPlacement>();
  const columnLastEndMs: number[] = [];

  for (const e of sorted) {
    let c = 0;
    while (c < columnLastEndMs.length && columnLastEndMs[c]! > e.startMs) {
      c += 1;
    }
    if (c >= columnLastEndMs.length) {
      columnLastEndMs.push(e.endMs);
    } else {
      columnLastEndMs[c] = e.endMs;
    }
    out.set(e.id, { col: c, maxCols: 0 });
  }

  const maxCols = Math.max(1, columnLastEndMs.length);
  Array.from(out.values()).forEach((v) => {
    v.maxCols = maxCols;
  });
  return out;
}
