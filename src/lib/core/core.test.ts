import { describe, expect, it } from "vitest";
import { generateAssignment, problemWeight } from "./assignment";
import { computeStreak, freezesAfterEarn, settleDay } from "./streak";
import { canRepair, isDayOver, localDate } from "./dates";
import type { ProblemRef, Weights } from "./types";

const weights: Weights = { easy: 1, medium: 2, hard: 4 };

const playlist: ProblemRef[] = [
  { id: "p0", difficulty: "easy" },
  { id: "p1", difficulty: "easy" },
  { id: "p2", difficulty: "medium" },
  { id: "p3", difficulty: "hard" },
  { id: "p4", difficulty: "medium" },
  { id: "p5", difficulty: "easy" },
];

describe("problemWeight", () => {
  it("maps difficulty to configured weight", () => {
    expect(problemWeight("easy", weights)).toBe(1);
    expect(problemWeight("medium", weights)).toBe(2);
    expect(problemWeight("hard", weights)).toBe(4);
  });
});

describe("generateAssignment (ordered)", () => {
  it("takes problems from cursor until cumulative weight >= target", () => {
    const { problemIds, newCursor } = generateAssignment({
      playlist,
      cursor: 0,
      mode: "ordered",
      weights,
      target: 3,
    });
    // easy(1) + easy(1) < 3, + medium(2) = 4 >= 3
    expect(problemIds).toEqual(["p0", "p1", "p2"]);
    expect(newCursor).toBe(3);
  });

  it("a single heavy problem can satisfy the target", () => {
    const { problemIds, newCursor } = generateAssignment({
      playlist,
      cursor: 3,
      mode: "ordered",
      weights,
      target: 3,
    });
    expect(problemIds).toEqual(["p3"]); // hard = 4 >= 3
    expect(newCursor).toBe(4);
  });

  it("stops at end of playlist (may return fewer than target)", () => {
    const { problemIds, newCursor } = generateAssignment({
      playlist,
      cursor: 5,
      mode: "ordered",
      weights,
      target: 5,
    });
    expect(problemIds).toEqual(["p5"]);
    expect(newCursor).toBe(6);
  });

  it("returns empty when playlist is exhausted", () => {
    const { problemIds, newCursor } = generateAssignment({
      playlist,
      cursor: 6,
      mode: "ordered",
      weights,
      target: 3,
    });
    expect(problemIds).toEqual([]);
    expect(newCursor).toBe(6);
  });
});

describe("generateAssignment (random)", () => {
  it("picks only unused problems and meets target", () => {
    const used = new Set(["p0", "p2", "p3"]);
    const { problemIds } = generateAssignment({
      playlist,
      cursor: 0,
      mode: "random",
      weights,
      target: 2,
      usedIds: used,
      rng: () => 0, // deterministic: always pick first remaining
    });
    for (const id of problemIds) expect(used.has(id)).toBe(false);
    const total = problemIds
      .map((id) => playlist.find((p) => p.id === id)!)
      .reduce((s, p) => s + problemWeight(p.difficulty, weights), 0);
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it("returns whatever remains when pool can't reach target", () => {
    const used = new Set(["p0", "p1", "p2", "p3", "p4"]);
    const { problemIds } = generateAssignment({
      playlist,
      cursor: 0,
      mode: "random",
      weights,
      target: 10,
      usedIds: used,
      rng: () => 0,
    });
    expect(problemIds).toEqual(["p5"]);
  });
});

describe("settleDay", () => {
  it("complete day keeps freezes", () => {
    expect(settleDay({ complete: true, freezes: 1 })).toEqual({
      status: "complete",
      freezes: 1,
    });
  });

  it("incomplete day consumes a freeze", () => {
    expect(settleDay({ complete: false, freezes: 2 })).toEqual({
      status: "frozen",
      freezes: 1,
    });
  });

  it("incomplete day without freezes is missed", () => {
    expect(settleDay({ complete: false, freezes: 0 })).toEqual({
      status: "missed",
      freezes: 0,
    });
  });
});

describe("computeStreak", () => {
  it("counts consecutive good days ending at the last settled day", () => {
    const days = [
      { date: "2026-07-01", status: "complete" },
      { date: "2026-07-02", status: "frozen" },
      { date: "2026-07-03", status: "complete" },
    ] as const;
    expect(computeStreak([...days])).toEqual({ current: 3, longest: 3 });
  });

  it("miss resets current but longest survives", () => {
    const days = [
      { date: "2026-07-01", status: "complete" },
      { date: "2026-07-02", status: "complete" },
      { date: "2026-07-03", status: "missed" },
      { date: "2026-07-04", status: "complete" },
    ] as const;
    expect(computeStreak([...days])).toEqual({ current: 1, longest: 2 });
  });

  it("repaired days count like completes", () => {
    const days = [
      { date: "2026-07-01", status: "complete" },
      { date: "2026-07-02", status: "repaired" },
      { date: "2026-07-03", status: "complete" },
    ] as const;
    expect(computeStreak([...days]).current).toBe(3);
  });

  it("a gap in dates breaks the streak (no member_day row = not participating)", () => {
    const days = [
      { date: "2026-07-01", status: "complete" },
      { date: "2026-07-05", status: "complete" },
    ] as const;
    expect(computeStreak([...days]).current).toBe(1);
  });

  it("counts a long unbroken run", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      status: "complete" as const,
    }));
    expect(computeStreak(days)).toEqual({ current: 14, longest: 14 });
  });

  it("freezesAfterEarn grants on multiples of the interval, capped at max", () => {
    expect(freezesAfterEarn(7, 0, 7, 2)).toBe(1);
    expect(freezesAfterEarn(14, 2, 7, 2)).toBe(2); // capped
    expect(freezesAfterEarn(6, 0, 7, 2)).toBe(0);
    expect(freezesAfterEarn(0, 0, 7, 2)).toBe(0);
    expect(freezesAfterEarn(5, 0, 5, 3)).toBe(1); // custom interval
    expect(freezesAfterEarn(10, 3, 5, 3)).toBe(3); // custom cap
  });

  it("pending days are ignored (not yet settled)", () => {
    const days = [
      { date: "2026-07-01", status: "complete" },
      { date: "2026-07-02", status: "pending" },
    ] as const;
    expect(computeStreak([...days]).current).toBe(1);
  });
});

describe("dates", () => {
  it("localDate converts a UTC instant to the user's calendar date", () => {
    const utc = new Date("2026-07-10T03:00:00Z");
    expect(localDate(utc, "America/New_York")).toBe("2026-07-09"); // 11pm EDT
    expect(localDate(utc, "Asia/Tokyo")).toBe("2026-07-10"); // noon JST
  });

  it("isDayOver: true once local midnight has passed", () => {
    // 2026-07-10T04:30Z = 00:30 EDT on Jul 10 -> Jul 9 is over in NY
    const utc = new Date("2026-07-10T04:30:00Z");
    expect(isDayOver("2026-07-09", utc, "America/New_York")).toBe(true);
    expect(isDayOver("2026-07-10", utc, "America/New_York")).toBe(false);
    // but in LA it is still 21:30 on Jul 9
    expect(isDayOver("2026-07-09", utc, "America/Los_Angeles")).toBe(false);
  });

  it("canRepair: within the group's grace window", () => {
    expect(canRepair("2026-07-09", "2026-07-10", 3)).toBe(true);
    expect(canRepair("2026-07-09", "2026-07-12", 3)).toBe(true);
    expect(canRepair("2026-07-09", "2026-07-13", 3)).toBe(false);
    expect(canRepair("2026-07-09", "2026-07-10", 1)).toBe(true); // custom window
    expect(canRepair("2026-07-09", "2026-07-11", 1)).toBe(false);
    expect(canRepair("2026-07-09", "2026-07-09", 0)).toBe(true); // 0 = same day only
  });
});
