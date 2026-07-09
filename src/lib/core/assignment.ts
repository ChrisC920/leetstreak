import type { Difficulty, ProblemRef, Weights } from "./types";

export function problemWeight(difficulty: Difficulty, weights: Weights): number {
  return weights[difficulty];
}

export interface GenerateAssignmentInput {
  /** Full playlist in canonical order. */
  playlist: ProblemRef[];
  /** Ordered mode: index of the next unassigned problem. */
  cursor: number;
  mode: "ordered" | "random";
  weights: Weights;
  /** Cumulative weight the day's set must reach. */
  target: number;
  /** Random mode: problem ids already assigned to this group. */
  usedIds?: Set<string>;
  /** Injectable RNG for tests; returns [0, 1). */
  rng?: () => number;
}

export function generateAssignment({
  playlist,
  cursor,
  mode,
  weights,
  target,
  usedIds = new Set(),
  rng = Math.random,
}: GenerateAssignmentInput): { problemIds: string[]; newCursor: number } {
  const problemIds: string[] = [];
  let total = 0;

  if (mode === "ordered") {
    let i = cursor;
    while (total < target && i < playlist.length) {
      problemIds.push(playlist[i].id);
      total += problemWeight(playlist[i].difficulty, weights);
      i++;
    }
    return { problemIds, newCursor: i };
  }

  const pool = playlist.filter((p) => !usedIds.has(p.id));
  while (total < target && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    const [pick] = pool.splice(idx, 1);
    problemIds.push(pick.id);
    total += problemWeight(pick.difficulty, weights);
  }
  return { problemIds, newCursor: cursor };
}
