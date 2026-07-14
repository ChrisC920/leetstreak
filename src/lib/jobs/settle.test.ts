import { describe, expect, it } from "vitest";
import { dayBounds } from "@/lib/core/dates";
import type { Difficulty, Weights } from "@/lib/core/types";
import { completion, settleWindow } from "./settle";

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

describe("settleWindow", () => {
  const tz = "America/New_York";

  it("normal day counts solves inside that local day only", () => {
    const { start, cutoff } = settleWindow("2026-07-10", tz, null);
    expect(start).toEqual(dayBounds("2026-07-10", tz).start);
    expect(cutoff).toEqual(dayBounds("2026-07-10", tz).end);
  });

  it("catch-up day accepts solves from any time before the deadline", () => {
    const { start, cutoff } = settleWindow("2026-07-10", tz, "2026-07-13");
    // a solve from a year before the backfilled date must still count
    expect(start.getTime()).toBe(0);
    expect(cutoff).toEqual(dayBounds("2026-07-13", tz).end);

    const solves = new Map([["p1", "2025-07-09T21:23:38Z"]]);
    const weights: Weights = { easy: 1, medium: 2, hard: 4 };
    const difficulty = new Map<string, Difficulty>([["p1", "easy"]]);
    const { complete } = completion(["p1"], solves, start, cutoff, difficulty, weights);
    expect(complete).toBe(true);
  });
});
