# Stats page revamp — LeetStreak vs LeetCode sections

Date: 2026-07-09. Status: approved.

## Goal

Split `/stats` into two clearly labeled sections and add deeper insights to each.
Section 1 covers LeetStreak data (our DB: streaks, group days, tracked solves).
Section 2 covers live LeetCode profile data (unofficial GraphQL, cached).

## Section 1: LeetStreak

- **Tiles**: current streak (max across groups), longest streak, completion rate
  (settled non-missed / settled), freezes banked (max across groups).
- **Day outcome breakdown**: counts of complete / repaired / frozen / missed
  settled days, rendered as a colored stat row using the existing status palette.
- **26-week heatmap**: existing grid, unchanged.
- **Weekly consistency trend**: last 12 full weeks, good-days-per-week (0–7),
  CSS/flex bar columns. No chart library.
- **Solve effort**: from `solves` joined to `problems(difficulty)` — total
  tracked solves, weighted points earned (easy/med/hard = 1/2/4), average
  solves per active day, busiest weekday.
- **Per-group cards**: for each membership — group name (link), current/longest
  streak in that group, completion rate within that group's `member_days`, and
  rank among members by current streak (one `group_members` query per group).

## Section 2: LeetCode

All live via `src/lib/leetcode.ts` with `revalidate` caching; every call is
individually try/caught so a LeetCode outage degrades to a hint line, never a
page error. No `leetcode_username` → section shows a "set your LeetCode
username" hint.

- **Tiles**: total solved, easy, medium, hard (from existing
  `leetcodeSolvedBreakdown`, extended to also return beats-% per difficulty).
- **Difficulty bars**: solved vs. total problems available per difficulty
  (`allQuestionsCount` from the same query), horizontal bars with beats-%.
- **Submission calendar**: full-year daily submission counts from
  `userCalendar.submissionCalendar` (JSON of unix-day → count), rendered with
  the same square-grid layout as the streak heatmap but a green intensity scale.
- **Topic tags**: top 10 tags by `problemsSolved` from `tagProblemCounts`
  (advanced + intermediate + fundamental merged), horizontal bars.

## New code

- `src/lib/leetcode.ts`: extend `leetcodeSolvedBreakdown` (totals + beats),
  add `leetcodeSubmissionCalendar`, `leetcodeTagStats`.
- `src/components/stats-charts.tsx`: `HBar` (label/value/max horizontal bar),
  `WeeklyTrendBars`, `IntensitySquare` + intensity legend.
- Rewrite `src/app/(app)/stats/page.tsx` with the two sections; all data
  fetched server-side in parallel.

## Non-goals

Contest rating (user declined), chart libraries, client-side interactivity,
separate routes/tabs.
