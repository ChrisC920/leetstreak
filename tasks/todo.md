# Stats + group-members improvements

Implements approved spec `docs/superpowers/specs/2026-07-09-live-leetcode-total-design.md`
plus scoped extras the user selected.

## Scope (user-confirmed)

**Stats page:** live total (spec) · difficulty breakdown · group-memberships list
**Group members:** live LeetCode-total column · click member → detail view · sort/rank controls

## Design decisions

- **Caching:** `gql` in `src/lib/leetcode.ts` uses `fetch`. Add optional
  `revalidate` (seconds) passed to `fetch(..., { next: { revalidate } })`.
  Live-total reads pass `revalidate: 600` (10 min) so N members = N cached
  reads, refreshed at most every 10 min. Sync stays uncached (`revalidate: 0`).
  Native fetch cache — no `unstable_cache` wrapper. (Legacy cache model; no
  `cacheComponents` in next.config.)
- **One breakdown function** replaces the spec's total-only function, since
  the stats page now wants the Easy/Med/Hard split too. Total is `all`.
- **N live calls per group load** run in one `Promise.all`, each `try/catch`
  → `null` on failure so one bad/private profile never breaks the board.
- **Member detail** = new route `groups/[id]/member/[uid]/page.tsx`. Data
  (`member_days`, `group_members`) already RLS-readable for co-members via
  `group_id` filter — confirmed on existing group page. No new policy.
- **Sort** = client component wrapping the leaderboard table; server passes
  rows (incl. live totals) as props, client re-sorts. `force-dynamic` page,
  so no server round-trip needed for sort.

## Tasks

### 1. `src/lib/leetcode.ts`
- [x] Add optional `revalidate?: number` param to `gql`, forwarded as
      `next: { revalidate }` on the `fetch` call (omit when undefined).
- [x] Add `interface SolvedBreakdown { all; easy; medium; hard }`.
- [x] Add `leetcodeSolvedBreakdown(username, revalidate?): Promise<SolvedBreakdown>`
      querying `matchedUser.submitStatsGlobal.acSubmissionNum { difficulty count }`.
      Map difficulties → fields. `matchedUser` null → throw (module convention).

### 2. Stats page `src/app/(app)/stats/page.tsx`
- [x] Profile query: add `leetcode_username` to the existing `.select`.
- [x] Add a groups query to the `Promise.all`:
      `group_members … profiles?` → group id, name, streak_current. Reuse
      existing `memberships` query by widening its select to include
      `group_id, groups(id, name)`.
- [x] After `Promise.all`: if `leetcode_username` set, `try` breakdown
      (`revalidate: 600`); on throw or null username, fall back to
      `solveCount ?? 0` for the "Problems solved" tile and skip the split.
- [x] Keep "Problems solved" tile = `all` (or fallback count). Add a small
      Easy/Medium/Hard line under the tiles when breakdown available.
- [x] Add "Your groups" card: list each group name (linked to
      `/groups/[id]`) + its current streak. Skip if user in no groups.

### 3. leetcode-total column + member detail + sort — group page
`src/app/(app)/groups/[id]/page.tsx`
- [x] Widen members query to also select `profiles(username, leetcode_username)`.
- [x] After fetching members: `Promise.all` live totals —
      `leetcodeSolvedBreakdown(username, 600)` per member with
      `leetcode_username`, each in `try/catch` → `null`. Build
      `Map<user_id, number|null>`.
- [x] Extract the leaderboard `<table>` into a new client component
      `groups/[id]/leaderboard.tsx` taking rows (member fields + `solved`
      total + precomputed `cells`) + `leaderId`. Client holds sort state
      (streak | best | weight | solved), header cells become sort buttons.
- [x] Add "Solved" column rendering the live total (`—` when null).
- [x] Wrap each member name in a `Link` to
      `/groups/[id]/member/[user_id]`.
- [x] New route `groups/[id]/member/[uid]/page.tsx`: per-member heatmap
      (reuse stats-page 26-week grid logic + `DayCellSquare`) + streak/best
      tiles + that member's live breakdown. Guard: viewer must be a member of
      the group (group row visible via RLS ⇒ ok; `notFound()` if member row
      absent).

### 4. Verify
- [x] `npm run build` (or `tsc`/lint) green.
- [x] `npm run test` — existing vitest still green.
- [x] Add network-marked vitest for `leetcodeSolvedBreakdown` per spec
      (assert `all > 0` for a known public profile).
- [x] Drive it: load `/stats` and a group page in the browser, confirm live
      totals render and sort works, member link opens detail. (verify skill)

## Non-goals (unchanged)
Sync job, `solves`/`member_days`/streak logic, settle cron, schema. No new deps.

## Review

Implemented 2026-07-09 on branch `feat/live-totals-stats-groups`.

- `leetcode.ts`: `gql` gained optional `revalidate` (Next data cache);
  `leetcodeSolvedBreakdown` returns `{all, easy, medium, hard}`, throws on
  unknown/private profile.
- Stats page: live "Problems solved" tile with catalog fallback, E/M/H line,
  "Your groups" card.
- Group page: leaderboard extracted to client component with sort buttons
  (streak/best/weight/solved), live Solved column (`—` on failure), member
  names link to new `/groups/[id]/member/[uid]` detail page (26-week heatmap,
  tiles, live breakdown; 404 for non-member uid; RLS guards viewer).

Verified: tsc, vitest (22 pass incl. 2 live-network tests), `next build`
green. Drove live via dev server + magic-link session: /stats shows live 12
(E6/M6/H0), group page shows Solved 209/95/12 with member links, member
pages render per-member data (JStizzy 95 = 28+59+8), bogus uid → 404,
unauthenticated → redirect to /. Sort click not driven (Chrome extension
unavailable); logic is a one-line client sort, hydrated buttons confirmed
in HTML.

Pre-existing, untouched: eslint error in `onboarding/page.tsx`
(`react-hooks/set-state-in-effect`) — exists on main.

## Review — 2026-07-10: Today cleanup, catch-up queue, group policies

Branch feature/today-queue-policies (6 commits, d5ee35a..c8b14ec). All 8 plan tasks done; per-task reviews + final whole-branch review clean (READY TO MERGE). Tests 24/24, tsc clean, prod build green, lint has only the 3 pre-existing MagicUI errors.

Shipped: hero gradient removed; font-mono only for invite codes; activity times in user tz (+"yesterday" prefix); catch-up queue sorted by grace deadline (red <24h) replacing repair banners; groups.grace_period_days/freeze_earn_interval/max_freezes columns (defaults 3/7/2) wired through core+settle+UI; leader manual freeze grants (RLS-checked, admin write); overflow regression tests.

Known-minor (ship-as-is, upgrade paths noted in final review): freeze-cap TOCTOU on double-click; grantFreeze .single() vs .maybeSingle(); queue key latent collision; queue hides post-deadline solves that settle won't credit (cosmetic).
