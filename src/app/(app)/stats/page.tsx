import { redirect } from "next/navigation";
import Link from "next/link";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { HBar, IntensityLegend, IntensitySquare, WeeklyTrendBars } from "@/components/stats-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, localDate } from "@/lib/core/dates";
import type { DayStatus, Difficulty } from "@/lib/core/types";
import {
  leetcodeSolvedBreakdown,
  leetcodeSubmissionCalendar,
  leetcodeTagStats,
  type SolvedBreakdown,
  type TagCount,
} from "@/lib/leetcode";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKS = 26; // half a year; a full year overflows small screens anyway
const TREND_WEEKS = 12;
const TOP_TAGS = 10;
const POINTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 4 };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// when a user is in several groups, show the day's best outcome
const RANK: DayStatus[] = ["complete", "repaired", "frozen", "pending", "missed"];
const GOOD: DayStatus[] = ["complete", "repaired", "frozen"];

/** Columns of dates (weeks × weekdays) ending on `today`. */
function weekGrid(today: string, weeks: number): string[][] {
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(today, -(weeks * 7 - 1) - todayDow);
  return Array.from({ length: weeks + 1 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)).filter(
      (date) => date <= today,
    ),
  ).filter((col) => col.length > 0);
}

function StatTiles({ tiles }: { tiles: [string, string | number][] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map(([label, value]) => (
        <Card key={label}>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function StatsPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: days }, { data: memberships }, { data: solves }] =
    await Promise.all([
      supabase.from("profiles").select("timezone, leetcode_username").eq("id", user.id).single(),
      supabase.from("member_days").select("date, status, group_id").eq("user_id", user.id),
      supabase
        .from("group_members")
        .select("streak_current, streak_longest, freezes, group_id, groups(id, name)")
        .eq("user_id", user.id),
      supabase.from("solves").select("solved_at, problems(difficulty)").eq("user_id", user.id),
    ]);

  const timezone = profile?.timezone ?? "UTC";
  const groupIds = (memberships ?? []).map((m) => m.group_id);

  // all members of my groups, for rank-by-current-streak
  const { data: peers } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, user_id, streak_current")
        .in("group_id", groupIds)
    : { data: [] };

  // ---- LeetStreak: derived stats -------------------------------------------

  const bestByDate = new Map<string, DayStatus>();
  for (const d of days ?? []) {
    const prev = bestByDate.get(d.date);
    if (!prev || RANK.indexOf(d.status) < RANK.indexOf(prev)) {
      bestByDate.set(d.date, d.status);
    }
  }

  const today = localDate(new Date(), timezone);
  const streakWeeks = weekGrid(today, WEEKS);

  const streakNow = Math.max(0, ...(memberships ?? []).map((m) => m.streak_current));
  const streakBest = Math.max(0, ...(memberships ?? []).map((m) => m.streak_longest));
  const freezesBanked = Math.max(0, ...(memberships ?? []).map((m) => m.freezes ?? 0));

  const settled = [...bestByDate.values()].filter((s) => s !== "pending");
  const outcome = { complete: 0, repaired: 0, frozen: 0, missed: 0 };
  for (const s of settled) outcome[s as keyof typeof outcome]++;
  const goodDays = settled.length - outcome.missed;

  // good-days-per-week, oldest → newest, aligned to weeks ending today
  const trend = Array.from({ length: TREND_WEEKS }, (_, i) => {
    const start = addDays(today, -((TREND_WEEKS - 1 - i) * 7 + 6));
    let good = 0;
    for (let d = 0; d < 7; d++) {
      const status = bestByDate.get(addDays(start, d));
      if (status && GOOD.includes(status)) good++;
    }
    return { label: start, good };
  });

  // solve effort from tracked solves
  const solveRows = (solves ?? []).map((s) => ({
    date: localDate(new Date(s.solved_at), timezone),
    difficulty: (s.problems as unknown as { difficulty: Difficulty } | null)?.difficulty,
  }));
  const points = solveRows.reduce((sum, s) => sum + (s.difficulty ? POINTS[s.difficulty] : 0), 0);
  const activeDays = new Set(solveRows.map((s) => s.date)).size;
  const byWeekday = new Array(7).fill(0);
  for (const s of solveRows) byWeekday[new Date(`${s.date}T00:00:00Z`).getUTCDay()]++;
  const busiest = solveRows.length ? WEEKDAYS[byWeekday.indexOf(Math.max(...byWeekday))] : "—";

  // per-group: completion within that group + rank among its members
  const daysByGroup = new Map<string, { settled: number; good: number }>();
  for (const d of days ?? []) {
    if (d.status === "pending") continue;
    const g = daysByGroup.get(d.group_id) ?? { settled: 0, good: 0 };
    g.settled++;
    if (d.status !== "missed") g.good++;
    daysByGroup.set(d.group_id, g);
  }
  const rankInGroup = new Map<string, { rank: number; size: number }>();
  for (const gid of groupIds) {
    const rows = (peers ?? []).filter((p) => p.group_id === gid);
    const sorted = [...rows].sort((a, b) => b.streak_current - a.streak_current);
    const idx = sorted.findIndex((p) => p.user_id === user.id);
    rankInGroup.set(gid, { rank: idx + 1, size: rows.length });
  }

  // ---- LeetCode: live profile data (each call degrades independently) ------

  let breakdown: SolvedBreakdown | null = null;
  let calendar: Map<string, number> | null = null;
  let tags: TagCount[] | null = null;
  if (profile?.leetcode_username) {
    const u = profile.leetcode_username;
    [breakdown, calendar, tags] = await Promise.all([
      leetcodeSolvedBreakdown(u, 600).catch(() => null),
      leetcodeSubmissionCalendar(u, 3600).catch(() => null),
      leetcodeTagStats(u, 3600).catch(() => null),
    ]);
  }

  // LeetCode buckets calendar days in UTC
  const utcToday = new Date().toISOString().slice(0, 10);
  const calendarWeeks = calendar ? weekGrid(utcToday, 52) : [];
  const calendarMax = calendar ? Math.max(0, ...calendar.values()) : 0;
  const topTags = (tags ?? []).slice(0, TOP_TAGS);
  const maxTag = topTags[0]?.problemsSolved ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your stats</h1>

      {/* ---------------- LeetStreak ---------------- */}
      <h2 className="text-lg font-semibold">LeetStreak</h2>

      <StatTiles
        tiles={[
          ["Current streak", `🔥 ${streakNow}`],
          ["Longest streak", streakBest],
          [
            "Completion rate",
            settled.length > 0 ? `${Math.round((goodDays / settled.length) * 100)}%` : "—",
          ],
          ["Freezes banked", `🧊 ${freezesBanked}`],
        ]}
      />

      {settled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Day outcomes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(
              [
                ["complete", outcome.complete, "#16a34a"],
                ["repaired", outcome.repaired, "#16a34a"],
                ["frozen", outcome.frozen, "#0284c7"],
                ["missed", outcome.missed, "#ef4444"],
              ] as const
            ).map(([label, count, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="size-3 rounded-[2px]" style={{ backgroundColor: color }} />
                {count} {label}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last {WEEKS} weeks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <div className="flex gap-[2px]">
              {streakWeeks.map((col, i) => (
                <div key={i} className="flex flex-col gap-[2px]">
                  {col.map((date) => (
                    <DayCellSquare key={date} date={date} status={bestByDate.get(date)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <HeatmapLegend />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly consistency</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <WeeklyTrendBars weeks={trend} />
          <p className="text-xs text-muted-foreground">
            Good days per week (complete, repaired, or frozen) over the last {TREND_WEEKS} weeks,
            oldest to newest.
          </p>
        </CardContent>
      </Card>

      {solveRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solve effort</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {(
                [
                  ["Tracked solves", solveRows.length],
                  ["Points earned", `${points} pts`],
                  ["Avg solves / active day", (solveRows.length / activeDays).toFixed(1)],
                  ["Busiest weekday", busiest],
                ] as [string, string | number][]
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-lg font-semibold">{value}</p>
                  <p className="text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Points weight difficulty: easy 1 · medium 2 · hard 4.
            </p>
          </CardContent>
        </Card>
      )}

      {(memberships ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your groups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(memberships ?? []).map((m) => {
              const group = m.groups as unknown as { id: string; name: string };
              const g = daysByGroup.get(m.group_id);
              const r = rankInGroup.get(m.group_id);
              return (
                <div key={m.group_id} className="flex flex-col gap-0.5 text-sm">
                  <div className="flex items-center justify-between">
                    <Link href={`/groups/${group.id}`} className="font-medium hover:underline">
                      {group.name}
                    </Link>
                    <span className="text-muted-foreground">🔥 {m.streak_current}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    longest {m.streak_longest} · completion{" "}
                    {g && g.settled > 0 ? `${Math.round((g.good / g.settled) * 100)}%` : "—"}
                    {r && r.size > 1 && ` · rank ${r.rank}/${r.size} by streak`}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ---------------- LeetCode ---------------- */}
      <h2 className="text-lg font-semibold">LeetCode</h2>

      {!profile?.leetcode_username ? (
        <p className="text-sm text-muted-foreground">
          Set your LeetCode username in onboarding to see live profile stats.
        </p>
      ) : !breakdown && !calendar && !tags ? (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t reach LeetCode right now — live stats will be back shortly.
        </p>
      ) : (
        <>
          {breakdown && (
            <>
              <StatTiles
                tiles={[
                  ["Total solved", breakdown.all],
                  ["Easy", breakdown.easy],
                  ["Medium", breakdown.medium],
                  ["Hard", breakdown.hard],
                ]}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Solved by difficulty</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {(
                    [
                      ["Easy", breakdown.easy, breakdown.totals.easy, breakdown.beats.easy],
                      ["Medium", breakdown.medium, breakdown.totals.medium, breakdown.beats.medium],
                      ["Hard", breakdown.hard, breakdown.totals.hard, breakdown.beats.hard],
                    ] as const
                  ).map(([label, solved, total, beats]) => (
                    <HBar
                      key={label}
                      label={
                        beats != null ? `${label} · beats ${beats.toFixed(1)}%` : label
                      }
                      value={solved}
                      max={total}
                      detail={`/ ${total}`}
                    />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {calendar && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submission activity (past year)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="overflow-x-auto">
                  <div className="flex gap-[2px]">
                    {calendarWeeks.map((col, i) => (
                      <div key={i} className="flex flex-col gap-[2px]">
                        {col.map((date) => (
                          <IntensitySquare
                            key={date}
                            date={date}
                            count={calendar.get(date) ?? 0}
                            max={calendarMax}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <IntensityLegend />
              </CardContent>
            </Card>
          )}

          {topTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top topics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {topTags.map((t) => (
                  <HBar
                    key={t.tagName}
                    label={t.tagName}
                    value={t.problemsSolved}
                    max={maxTag}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
