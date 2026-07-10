# Live LeetCode solved total on stats page

**Date:** 2026-07-09
**Status:** Approved, ready for implementation plan

## Problem

The stats page "Problems solved" tile counts rows in the `solves` table.
`solves.problem_id` is a required FK to the `problems` catalog (150 curated
rows), so the sync job records a solve only when the solved slug is in that
catalog (`sync.ts:30`, `dashboard/actions.ts:34`). Result: the tile shows
catalog solves, not the user's real LeetCode total, and looks wrong next to
their actual LeetCode profile.

## Goal

The "Problems solved" tile reflects the user's true LeetCode accepted-problem
count, pulled live from LeetCode. Everything else on the page (streaks,
heatmap, completion rate) stays catalog-based — those describe the group
challenge, not the user's whole LeetCode history, and are correct as-is.

## Approach

Read the total live from LeetCode's public `matchedUser.submitStatsGlobal`.
No schema change, no sync change, no new table. The catalog `solves` table
and all settle/streak logic are untouched.

## Changes

### 1. `src/lib/leetcode.ts` — new function

Add `leetcodeSolvedTotal(username: string): Promise<number>` using the
existing `gql` helper.

Query:

```graphql
query userSolvedTotal($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
  }
}
```

`acSubmissionNum` is an array with entries for `All`, `Easy`, `Medium`,
`Hard`. Return the `count` of the entry whose `difficulty === "All"`.

- If `matchedUser` is `null` (unknown/private profile), throw — same
  convention as the rest of the module; the caller handles the fallback.
- Do not return the per-difficulty breakdown. YAGNI; add later if a
  breakdown UI is wanted.

### 2. `src/app/(app)/stats/page.tsx` — source the tile live

- Read `leetcode_username` in the existing profile query (add the column;
  it currently selects only `timezone`).
- Keep the `solves` count query (`solveCount`, line 30) — it stays as the
  fallback value.
- After the `Promise.all`, compute the tile value:
  - If `profile.leetcode_username` is set: `await leetcodeSolvedTotal(username)`
    inside a `try/catch`. On success, use that number.
  - On thrown error (API down, private profile), OR if `leetcode_username`
    is null: fall back to `solveCount ?? 0` (the current catalog count).
- The tile keeps its label "Problems solved".

The page is `export const dynamic = "force-dynamic"`, so the live call runs on
every load. The `try/catch` guarantees a LeetCode outage degrades to the
catalog count instead of throwing the whole page to an error boundary.

## Edge cases

| Case | Behavior |
|------|----------|
| `leetcode_username` null | Fall back to catalog `solveCount` |
| LeetCode API error / rate-limit | `try/catch` → fall back to catalog `solveCount` |
| Private / nonexistent profile | `matchedUser` null → throws → caught → fallback |
| Happy path | Live `All` count from `submitStatsGlobal` |

## Non-goals / unchanged

- Sync job (`sync.ts`, `dashboard/actions.ts`) — unchanged.
- `solves` table, `member_days`, streaks, freezes, completion rate — unchanged.
- No caching of the live count (1 LeetCode call per stats-page load; fine at
  current scale). Add a short cache if call volume ever matters.
- No per-difficulty breakdown tiles.

## Testing

`leetcodeSolvedTotal` is a live-network function. One check: call it against a
known public profile and assert the result is a number `> 0`. No mock
framework — a small vitest test hitting the live API, consistent with the
project's existing pure-function vitest setup. Mark it clearly as a
network-dependent test.
