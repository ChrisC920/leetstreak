# Today Page Cleanup, Catch-up Queue, and Group Policies — Design

Date: 2026-07-09
Status: Approved (verbal), pending spec review

## Goals

1. Remove the gradient on the Today page.
2. Uniform typography across the site (drop scattered `font-mono`).
3. Friend-activity timestamps rendered in the user's timezone.
4. New "Catch-up queue" section on Today: overdue problems ordered by grace deadline.
5. Group leader configures grace period and streak-freeze policy per group.
6. Leader can manually grant freezes to members.
7. Daily assignment weight overflow is allowed (already implemented — lock in with a test).

## Non-goals

- Per-problem or per-difficulty grace periods (single group-wide days value).
- Monthly freeze allowances.
- Changes to the landing page's visuals (gradient removal is Today page only).

## 1. Gradient removal

Delete the radial-gradient overlay `<div>` in `src/components/streak-hero.tsx` (lines 18–21). No other gradient renders on the Today page.

## 2. Uniform fonts

Site uses Inter (`--font-sans`) + Geist Mono. Sweep `font-mono` usages off UI text and numbers:

- `src/app/(app)/dashboard/page.tsx` — header date, streak/freeze counters.
- `src/components/streak-hero.tsx` — hero numbers.
- Any other app pages (`stats`, `groups/[id]`, leaderboard, member page) using `font-mono` for plain UI text/numbers.

Keep `tabular-nums` where digits should align. Keep `font-mono` ONLY for invite codes. Geist Mono stays loaded for that.

## 3. Timezone-accurate friend activity times

`src/app/(app)/dashboard/page.tsx` currently calls `new Date(a.solved_at).toLocaleTimeString([], …)` in a server component — renders in the server's timezone.

Fix: `formatInTimeZone(new Date(a.solved_at), profile.timezone, "h:mm a")` (date-fns-tz, already a dependency). When the solve's local calendar date (in `profile.timezone`) is before today, prefix with the weekday or "yesterday" (e.g. "yesterday 9:14 PM") so a 24h feed isn't ambiguous.

## 4. Catch-up queue

Replaces the per-group yellow "repair your streak" banners on Today.

**Data**: for each group membership, missed `member_days` within the grace window, expanded to their assignment's unsolved problems (same logic as the current `backlog` computation, but using the group's `grace_period_days` instead of the constant).

**Deadline** per missed day: `dayBounds(addDays(missedDate, group.grace_period_days), profile.timezone).end` — the instant repair eligibility lapses.

**Rendering**: one section (Card) on Today, above the per-group cards' position in flow (directly under the streak hero). Rows sorted by deadline ascending:

- problem title (link to LeetCode), difficulty badge with weight
- group name (when user has >1 group)
- countdown to deadline: hours when <48h ("expires in 26h"), else days ("expires in 3d")
- row highlighted red/destructive when <24h remain
- MarkSolvedButton, same as today's list

Section hidden entirely when the queue is empty. Yellow banner markup in the group cards is removed.

Countdown is computed at render time server-side; page is `force-dynamic`, acceptable staleness.

## 5. Group policy settings

### Schema (Supabase migration)

```sql
alter table groups
  add column grace_period_days int not null default 3
    check (grace_period_days between 0 and 14),
  add column freeze_earn_interval int not null default 7
    check (freeze_earn_interval between 1 and 30),
  add column max_freezes int not null default 2
    check (max_freezes between 0 and 10);
```

Defaults mirror the current hardcoded constants, so behavior is unchanged for existing groups.

### Core changes

- `src/lib/core/types.ts` — constants `REPAIR_WINDOW_DAYS`, `FREEZE_EARN_INTERVAL`, `MAX_FREEZES` removed (or kept only as default values for the migration/docs).
- `canRepair(missedDate, today, windowDays)` — third param required.
- `freezesAfterEarn(streak, freezes, earnInterval, maxFreezes)` — params required.
- `src/lib/jobs/settle.ts` — passes the group's values everywhere it used the constants (repair scan, freeze earning, repair cutoff).
- `src/app/(app)/dashboard/page.tsx` — backlog/queue filter uses the group's `grace_period_days`.

### Settings UI

`src/app/(app)/groups/[id]/settings-form.tsx` (already leader-gated) gains three numeric inputs: grace period (days), freeze earn interval (days), max freezes. `updateGroup` action validates and persists them.

## 6. Manual freeze grants

Server action `grantFreeze(groupId, userId)` in `src/app/(app)/groups/actions.ts`:

- verify caller is the group's leader (same check as `updateGroup`)
- increment target member's `freezes`, capped at the group's `max_freezes`; no-op with error message when already at cap

UI: leader sees a small "give freeze" button (snowflake icon) beside each member row on the group page. Not shown to non-leaders.

## 7. Weight overflow (no change, add test)

`generateAssignment` already loops `while (total < target)`, adding one more problem whenever the running total is below target — so a target of 8 with hard=3 yields three hards (weight 9). This matches the requested behavior in both ordered and random modes. Add a regression test to `src/lib/core/core.test.ts` asserting the 3×hard/target-8 case so the overflow contract is explicit.

## Error handling

- `grantFreeze`: non-leader callers get a rejection; at-cap grants return a friendly error, no write.
- Settings validation: integers within the check-constraint ranges; out-of-range shows the existing form error state.
- Settle job: groups rows now always carry policy columns (defaults), no null handling needed.

## Testing

- `core.test.ts`: parameterized `canRepair` and `freezesAfterEarn` cases (custom window/interval/cap), overflow regression test, existing tests updated to pass explicit params.
- Manual verification: dashboard renders queue with a seeded missed day; activity timestamps match a non-UTC profile timezone; settings form round-trips new fields; freeze grant caps correctly.

## Rollout

Single migration with defaults → deploy code. No backfill needed; existing groups keep current behavior until leaders change settings.
