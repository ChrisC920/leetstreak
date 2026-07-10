// NETWORK TEST: hits LeetCode's live public GraphQL API.
// Skipped nowhere by default — expect failures offline or if LeetCode is down.
import { describe, expect, it } from "vitest";
import { leetcodeSolvedBreakdown } from "./leetcode";

describe("leetcodeSolvedBreakdown (network)", () => {
  it("returns positive totals for a known public profile", async () => {
    const b = await leetcodeSolvedBreakdown("lee215"); // prolific public user
    expect(b.all).toBeGreaterThan(0);
    expect(b.easy + b.medium + b.hard).toBe(b.all);
  });

  it("throws for a nonexistent user", async () => {
    await expect(
      leetcodeSolvedBreakdown("this-user-should-not-exist-xyz-123456"),
    ).rejects.toThrow();
  });
});
