import { describe, expect, it } from "vitest";
import { dayBounds } from "@/lib/core/dates";
import type { Difficulty, Weights } from "@/lib/core/types";
import { completion } from "./settle";

const weights: Weights = { easy: 1, medium: 2, hard: 4 };
const difficulty = new Map<string, Difficulty>([
  ["p1", "easy"],
  ["p2", "medium"],
]);

describe("completion with a catch-up cutoff", () => {
  const tz = "America/New_York";
  const { start } = dayBounds("2026-07-01", tz); // day being backfilled
  const deadlineEnd = dayBounds("2026-07-14", tz).end; // catch-up deadline

  it("solves days after the assignment date still complete a catch-up day", () => {
    const solves = new Map([
      ["p1", "2026-07-12T15:00:00Z"],
      ["p2", "2026-07-13T15:00:00Z"],
    ]);
    const { complete, weightDone } = completion(
      ["p1", "p2"], solves, start, deadlineEnd, difficulty, weights,
    );
    expect(complete).toBe(true);
    expect(weightDone).toBe(3);
  });

  it("solves after the deadline don't count", () => {
    const solves = new Map([
      ["p1", "2026-07-12T15:00:00Z"],
      ["p2", "2026-07-15T15:00:00Z"], // past deadline
    ]);
    const { complete, weightDone } = completion(
      ["p1", "p2"], solves, start, deadlineEnd, difficulty, weights,
    );
    expect(complete).toBe(false);
    expect(weightDone).toBe(1);
  });

  it("same-day cutoff (a normal day) rejects later solves", () => {
    const { end } = dayBounds("2026-07-01", tz);
    const solves = new Map([["p1", "2026-07-02T15:00:00Z"]]);
    const { complete } = completion(["p1"], solves, start, end, difficulty, weights);
    expect(complete).toBe(false);
  });
});
