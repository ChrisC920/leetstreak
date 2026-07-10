# Today Cleanup, Catch-up Queue, and Group Policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the Today page (no gradient, uniform fonts, timezone-correct activity times), add a deadline-ordered catch-up queue, and make grace period / freeze policy leader-configurable per group (including manual freeze grants).

**Architecture:** Three new integer policy columns on `groups` (defaults mirror today's hardcoded constants). Pure functions in `src/lib/core/` take policy values as parameters instead of importing constants; `settle.ts` and the dashboard pass per-group values. The dashboard's yellow repair banners become one "Catch-up queue" card sorted by grace deadline. Freeze grants are a leader-verified server action using the admin client.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before writing Next-specific code — this version has breaking changes), Supabase (RLS + admin client), date-fns-tz, vitest, Tailwind 4 + shadcn.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-today-queue-and-policies-design.md`
- New `groups` columns: `grace_period_days int default 3 check 0..14`, `freeze_earn_interval int default 7 check 1..30`, `max_freezes int default 2 check 0..10`
- `font-mono` stays ONLY in `join-form.tsx` and `invite-code.tsx` (invite codes). Keep `tabular-nums` everywhere it exists today.
- Tests: `npx vitest run` must pass after every task. Lint: `npm run lint`.
- Supabase migrations applied with the `mcp__supabase-pat__apply_migration` tool (no local migration files exist; that is this project's convention — see `~/.claude/projects/-Users-chris-VSCode-leetstreak/memory/leetstreak-infra.md` for the project ref).
- Commit after every task.

---

### Task 1: Group policy columns (DB migration)

**Files:**
- No repo files. Remote migration via `mcp__supabase-pat__apply_migration` (name: `group_policy_columns`).

**Interfaces:**
- Produces: `groups.grace_period_days`, `groups.freeze_earn_interval`, `groups.max_freezes` (int, non-null, defaulted) — read by Tasks 2, 4, 5, 6.

- [ ] **Step 1: Apply migration**

```sql
alter table groups
  add column grace_period_days int not null default 3
    check (grace_period_days between 0 and 14),
  add column freeze_earn_interval int not null default 7
    check (freeze_earn_interval between 1 and 30),
  add column max_freezes int not null default 2
    check (max_freezes between 0 and 10);
```

- [ ] **Step 2: Verify**

Run `mcp__supabase-pat__execute_sql`: `select grace_period_days, freeze_earn_interval, max_freezes from groups limit 3;`
Expected: rows with `3, 7, 2`.

---

### Task 2: Parameterize core policy functions + update callers

**Files:**
- Modify: `src/lib/core/types.ts` (delete the three constants)
- Modify: `src/lib/core/dates.ts:36-40` (`canRepair`)
- Modify: `src/lib/core/streak.ts:32-39` (`freezesAfterEarn`)
- Modify: `src/lib/jobs/settle.ts` (pass group values)
- Modify: `src/app/(app)/dashboard/page.tsx` (caller of `canRepair`)
- Test: `src/lib/core/core.test.ts`

**Interfaces:**
- Produces: `canRepair(missedDate: string, today: string, windowDays: number): boolean`; `freezesAfterEarn(streak: number, freezes: number, earnInterval: number, maxFreezes: number): number`. Task 7 calls the new `canRepair`.

- [ ] **Step 1: Update tests to the new signatures (failing)**

In `core.test.ts`, replace the `freezesAfterEarn` test (lines 179–184) and the `canRepair` test (lines 211–215) with:

```ts
  it("freezesAfterEarn grants on multiples of the interval, capped at max", () => {
    expect(freezesAfterEarn(7, 0, 7, 2)).toBe(1);
    expect(freezesAfterEarn(14, 2, 7, 2)).toBe(2); // capped
    expect(freezesAfterEarn(6, 0, 7, 2)).toBe(0);
    expect(freezesAfterEarn(0, 0, 7, 2)).toBe(0);
    expect(freezesAfterEarn(5, 0, 5, 3)).toBe(1); // custom interval
    expect(freezesAfterEarn(10, 3, 5, 3)).toBe(3); // custom cap
  });
```

```ts
  it("canRepair: within the group's grace window", () => {
    expect(canRepair("2026-07-09", "2026-07-10", 3)).toBe(true);
    expect(canRepair("2026-07-09", "2026-07-12", 3)).toBe(true);
    expect(canRepair("2026-07-09", "2026-07-13", 3)).toBe(false);
    expect(canRepair("2026-07-09", "2026-07-10", 1)).toBe(true); // custom window
    expect(canRepair("2026-07-09", "2026-07-11", 1)).toBe(false);
    expect(canRepair("2026-07-09", "2026-07-09", 0)).toBe(true); // 0 = same day only
  });
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npx vitest run src/lib/core/core.test.ts`
Expected: FAIL (type/arity errors on `canRepair` / `freezesAfterEarn`).

- [ ] **Step 3: Implement**

`src/lib/core/types.ts` — delete lines:

```ts
export const MAX_FREEZES = 2;
export const FREEZE_EARN_INTERVAL = 7; // earn 1 freeze per 7-day streak
export const REPAIR_WINDOW_DAYS = 3; // days after a miss to clear backlog
```

`src/lib/core/dates.ts` — drop the `REPAIR_WINDOW_DAYS` import; change `canRepair`:

```ts
/** Backlog from `missedDate` can still repair the streak on `today`. */
export function canRepair(missedDate: string, today: string, windowDays: number): boolean {
  const d = daysBetween(missedDate, today);
  return d >= 0 && d <= windowDays;
}
```

`src/lib/core/streak.ts` — change import to `import type { DayStatus } from "./types";` and:

```ts
/** Completing a day that lands the streak on a multiple of `earnInterval`
 *  earns a freeze. Event-based (not derived from history) so spent freezes
 *  stay spent. */
export function freezesAfterEarn(
  streak: number,
  freezes: number,
  earnInterval: number,
  maxFreezes: number,
): number {
  if (streak > 0 && streak % earnInterval === 0) {
    return Math.min(freezes + 1, maxFreezes);
  }
  return freezes;
}
```

`src/lib/jobs/settle.ts`:

1. Remove `REPAIR_WINDOW_DAYS` from the `@/lib/core/types` import.
2. Add to `GroupRow`:

```ts
  grace_period_days: number;
  freeze_earn_interval: number;
  max_freezes: number;
```

3. `recomputeStreak` needs the group's policy — change its signature and the freeze line:

```ts
async function recomputeStreak(
  db: Db,
  group: GroupRow,
  groupId: string,
  userId: string,
  completedToday: boolean,
) {
```

```ts
  const freezes = completedToday
    ? freezesAfterEarn(current, member?.freezes ?? 0, group.freeze_earn_interval, group.max_freezes)
    : (member?.freezes ?? 0);
```

Update both call sites (settle pass and repair pass) to `recomputeStreak(db, group, day.group_id, day.user_id, …)`.

4. Repair pass — both uses of the constant become the group value:

```ts
    if (!canRepair(day.date, localDate(now, profile.timezone), group.grace_period_days)) continue;
```

```ts
    const repairCutoff = dayBounds(addDays(day.date, group.grace_period_days), profile.timezone).end;
```

`src/app/(app)/dashboard/page.tsx`:

1. Add the three columns to the membership select (line 49):

```ts
    .select("group_id, streak_current, streak_longest, freezes, groups(id, name, daily_target_weight, weight_easy, weight_medium, weight_hard, grace_period_days, freeze_earn_interval, max_freezes)")
```

2. Add `grace_period_days: number;` (and the other two, for Task 7's use of the same cast) to the inline `group` cast type in `groupData` (line 125).
3. Backlog filter (line 155): `canRepair(d.date, today, group.grace_period_days)` — note `group` must be resolved before `backlog`; the cast on line 125 already precedes it.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: group-configurable grace period and freeze policy in core + settle"
```

---

### Task 3: Weight-overflow regression test (no code change)

**Files:**
- Test: `src/lib/core/core.test.ts`

**Interfaces:**
- Consumes: `generateAssignment` from `src/lib/core/assignment.ts` (unchanged).

- [ ] **Step 1: Add tests inside `describe("generateAssignment (ordered)")` and the random describe**

```ts
  it("overflows the target by one problem rather than stopping short", () => {
    const hards: ProblemRef[] = [
      { id: "h0", difficulty: "hard" },
      { id: "h1", difficulty: "hard" },
      { id: "h2", difficulty: "hard" },
    ];
    const { problemIds } = generateAssignment({
      playlist: hards,
      cursor: 0,
      mode: "ordered",
      weights: { easy: 1, medium: 2, hard: 3 },
      target: 8,
    });
    // 3 + 3 = 6 < 8, so a third hard is added: total 9 > 8. Overflow allowed.
    expect(problemIds).toEqual(["h0", "h1", "h2"]);
  });
```

```ts
  it("random mode also overflows the target by one problem", () => {
    const hards: ProblemRef[] = [
      { id: "h0", difficulty: "hard" },
      { id: "h1", difficulty: "hard" },
      { id: "h2", difficulty: "hard" },
      { id: "h3", difficulty: "hard" },
    ];
    const { problemIds } = generateAssignment({
      playlist: hards,
      cursor: 0,
      mode: "random",
      weights: { easy: 1, medium: 2, hard: 3 },
      target: 8,
      rng: () => 0,
    });
    expect(problemIds).toHaveLength(3); // 9 weight total
  });
```

- [ ] **Step 2: Run tests, expect immediate pass (behavior already exists)**

Run: `npx vitest run src/lib/core/core.test.ts`
Expected: PASS. (If it fails, the assignment logic regressed — stop and investigate.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/core/core.test.ts && git commit -m "test: lock in weight-overflow assignment behavior"
```

---

### Task 4: Leader settings UI for the new policies

**Files:**
- Modify: `src/app/(app)/groups/[id]/settings-form.tsx`
- Modify: `src/app/(app)/groups/actions.ts:66-87` (`updateGroup`)

**Interfaces:**
- Consumes: Task 1 columns.
- Produces: form fields `grace_period_days`, `freeze_earn_interval`, `max_freezes` persisted by `updateGroup`.

- [ ] **Step 1: Extend `GroupSettings` and the form**

Add to the interface:

```ts
  grace_period_days: number;
  freeze_earn_interval: number;
  max_freezes: number;
```

After the weights grid (line 72), add:

```tsx
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["grace_period_days", "Grace period (days)", group.grace_period_days, 0, 14],
            ["freeze_earn_interval", "Freeze every (days)", group.freeze_earn_interval, 1, 30],
            ["max_freezes", "Max freezes", group.max_freezes, 0, 10],
          ] as const
        ).map(([name, label, def, min, max]) => (
          <div key={name} className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="number" min={min} max={max} defaultValue={def} />
          </div>
        ))}
      </div>
```

- [ ] **Step 2: Persist in `updateGroup`**

Add to the `.update({...})` payload:

```ts
      grace_period_days: Number(formData.get("grace_period_days") ?? 3),
      freeze_earn_interval: Number(formData.get("freeze_earn_interval") || 7),
      max_freezes: Number(formData.get("max_freezes") ?? 2),
```

(`??` not `||` for the two fields where 0 is legal. Out-of-range values are rejected by the DB check constraints and surface via the existing `state.error` rendering.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (`groups/[id]/page.tsx` passes the whole `group` row via `select("*")`, so no change needed there.)

Manual: `npm run dev`, open a led group → Settings, change grace period to 5, save, reload — value persists. Set grace period to 99 → form shows a check-constraint error.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: leader settings for grace period and freeze policy"
```

---

### Task 5: Manual freeze grants

**Files:**
- Modify: `src/app/(app)/groups/actions.ts` (add `grantFreeze`)
- Modify: `src/app/(app)/groups/[id]/leaderboard.tsx` (leader-only button)
- Modify: `src/app/(app)/groups/[id]/page.tsx` (pass `isLeader`)

**Interfaces:**
- Consumes: Task 1's `max_freezes`.
- Produces: `grantFreeze(groupId: string, userId: string): Promise<{ error?: string }>` server action.

- [ ] **Step 1: Server action**

In `src/app/(app)/groups/actions.ts` add (import `adminClient` from `@/lib/supabase/admin`):

```ts
export async function grantFreeze(
  groupId: string,
  userId: string,
): Promise<{ error?: string }> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: group } = await supabase
    .from("groups")
    .select("leader_id, max_freezes")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.leader_id !== user.id) return { error: "Only the leader can grant freezes" };

  // group_members RLS only lets users touch their own row; leader grants go
  // through the admin client after the explicit leader check above.
  const admin = adminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("freezes")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!member) return { error: "Member not found" };
  if (member.freezes >= group.max_freezes) return { error: "Member is already at max freezes" };

  const { error } = await admin
    .from("group_members")
    .update({ freezes: member.freezes + 1 })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return {};
}
```

- [ ] **Step 2: Leaderboard button**

`src/app/(app)/groups/[id]/page.tsx` line 114–120: pass `isLeader={isLeader}` to `<Leaderboard>`.

`src/app/(app)/groups/[id]/leaderboard.tsx`:

- Add imports: `useTransition` (react), `toast` from `"sonner"`, `grantFreeze` from `"../actions"`, `Plus` from `"lucide-react"`.
- Add `isLeader?: boolean` prop.
- In the freezes cell (line 113), render count plus a leader-only grant button:

```tsx
            <TableCell className="tabular-nums">
              <span className="flex items-center gap-1">
                {m.freezes}
                {isLeader && (
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={granting}
                    title="Give a freeze"
                    onClick={() =>
                      startTransition(async () => {
                        const { error } = await grantFreeze(groupId, m.user_id);
                        if (error) toast.error(error);
                        else toast.success(`Gave ${m.username} a freeze`);
                      })
                    }
                  >
                    <Plus className="size-3" aria-hidden />
                    <Snowflake className="size-3.5 text-sky-400" aria-hidden />
                  </Button>
                )}
              </span>
            </TableCell>
```

with `const [granting, startTransition] = useTransition();` at the top of the component. (`revalidatePath` in the action refreshes the server-rendered counts.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Manual: as leader, grant a freeze → count increments, toast success; grant past cap → error toast; snowflake button absent for non-leader session.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: leader can grant streak freezes to members"
```

---

### Task 6: Today page — gradient, timezone times, catch-up queue

**Files:**
- Modify: `src/components/streak-hero.tsx` (remove gradient div)
- Modify: `src/app/(app)/dashboard/page.tsx` (activity times, queue section, banner removal)

**Interfaces:**
- Consumes: `canRepair(date, today, windowDays)` from Task 2; `grace_period_days` on the membership select (added in Task 2).

- [ ] **Step 1: Remove the gradient**

Delete from `streak-hero.tsx` (lines 18–21):

```tsx
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_20%_0%,--alpha(var(--color-primary)/10%),transparent)]"
      />
```

Also drop the now-unneeded `relative overflow-hidden` on the Card and `relative` on CardContent.

- [ ] **Step 2: Timezone-accurate activity times**

In `dashboard/page.tsx`, import `formatInTimeZone` from `"date-fns-tz"`. Replace the timestamp span (lines 327–332):

```tsx
                    <span className="ml-auto text-xs text-muted-foreground">
                      {localDate(new Date(a.solved_at), profile.timezone) !== today && "yesterday "}
                      {formatInTimeZone(new Date(a.solved_at), profile.timezone, "h:mm a")}
                    </span>
```

(Feed is capped at 24h, so any non-today solve is yesterday.)

- [ ] **Step 3: Catch-up queue**

Still in `dashboard/page.tsx`:

1. Extend each backlog entry with its repair deadline. In the `backlog` computation (lines 150–167), map to include the deadline instant:

```ts
    const backlog = (memberDays ?? [])
      .filter(
        (d) =>
          d.group_id === m.group_id &&
          d.status === "missed" &&
          canRepair(d.date, today, group.grace_period_days),
      )
      .map((d) => ({
        date: d.date as string,
        deadline: dayBounds(addDays(d.date, group.grace_period_days), profile.timezone).end,
        problems: (
          ((assignments ?? []).find(
            (a) => a.group_id === m.group_id && a.date === d.date,
          )?.problem_ids as string[]) ?? []
        )
          .map((id) => problemById.get(id))
          .filter((p): p is Problem => p !== undefined && !solvedAt.has(p.id)),
      }))
      .filter((b) => b.problems.length > 0);
```

Add `addDays` to the `@/lib/core/dates` import.

2. After `groupData` is built, flatten into a sorted queue:

```ts
  const queue = groupData
    .flatMap(({ group, weights, backlog }) =>
      backlog.flatMap((b) =>
        b.problems.map((p) => ({
          problem: p,
          weight: weights[p.difficulty],
          groupName: group.name,
          deadline: b.deadline,
        })),
      ),
    )
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  const hoursLeft = (deadline: Date) =>
    Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 3_600_000));
  const expiresIn = (deadline: Date) => {
    const h = hoursLeft(deadline);
    return h < 48 ? `expires in ${h}h` : `expires in ${Math.floor(h / 24)}d`;
  };
```

3. Render the queue card directly after the `StreakHero` BlurFade (after line 191), hidden when empty:

```tsx
      {queue.length > 0 && (
        <BlurFade delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catch-up queue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted-foreground">
                Finish these before their grace period ends to repair your streak.
              </p>
              <ul className="divide-y">
                {queue.map(({ problem: p, weight, groupName, deadline }) => (
                  <li key={`${groupName}-${p.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <a
                        href={`https://leetcode.com/problems/${p.slug}/`}
                        target="_blank"
                        className="truncate font-medium hover:underline"
                      >
                        {p.title}
                      </a>
                      <Badge variant="secondary" className={`text-xs ${DIFF_COLOR[p.difficulty]}`}>
                        {p.difficulty} · {weight}w
                      </Badge>
                      {groupData.length > 1 && (
                        <span className="text-xs text-muted-foreground">{groupName}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-xs ${
                          hoursLeft(deadline) < 24
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {expiresIn(deadline)}
                      </span>
                      <MarkSolvedButton problemId={p.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </BlurFade>
      )}
```

4. Delete the per-group yellow banner block (lines 214–236, the `backlog.map` rendering `Repair your streak…`). `backlog` stays in `groupData` (the queue consumes it); remove it from the destructuring in the group-card `.map` only.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Manual: `npm run dev` → Today shows no gradient; seed/have a missed day → queue lists its unsolved problems sorted by deadline with countdown; activity times match your profile timezone (compare against a solve's known local time).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: catch-up queue, timezone-correct activity times, remove hero gradient"
```

---

### Task 7: Uniform fonts (drop stray font-mono)

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx:182,204,249`
- Modify: `src/app/(app)/groups/page.tsx:63`
- Modify: `src/app/(app)/groups/[id]/leaderboard.tsx:87,109-112` (113 already handled in Task 5)
- Modify: `src/app/(app)/stats/page.tsx:232,268,274,278,285`
- Modify: `src/components/stats-charts.tsx:32,78,104,130`
- Modify: `src/components/streak-hero.tsx:29,39,47`

**Interfaces:** none (class-name-only sweep).

- [ ] **Step 1: Remove the `font-mono` token from every listed line**

Mechanical edit: delete the `font-mono` class (and nothing else) at each location. Keep `tabular-nums` wherever present. Do NOT touch `join-form.tsx:13` or `invite-code.tsx:11` (invite codes stay mono).

- [ ] **Step 2: Verify no strays remain**

Run: `grep -rn "font-mono" src --include="*.tsx" | grep -v -E "join-form|invite-code"`
Expected: no output.

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. Visual check in dev: numbers render in Inter with aligned digits.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "style: uniform typography — mono reserved for invite codes"
```

---

### Task 8: Final verification

**Files:** none.

- [ ] **Step 1: Full test + lint + build**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 2: End-to-end pass in dev**

`npm run dev`, then walk: Today (no gradient, queue when backlog exists, activity times in profile tz) → group Settings (three new fields round-trip) → leaderboard (leader grant button works, caps at max) → non-leader view (no button, no settings tab).

- [ ] **Step 3: Update `tasks/todo.md` review section; commit any doc changes**

```bash
git add -A && git commit -m "docs: implementation review notes"
```
