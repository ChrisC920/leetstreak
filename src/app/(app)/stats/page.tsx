import {
  CalendarDays,
  Flame,
  ListChecks,
  Snowflake,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { LeetCodeStats } from "@/components/leetcode-stats";
import { OutcomeRow, StatTiles, WeeklyTrendBars } from "@/components/stats-charts";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localDate } from "@/lib/core/dates";
import type { DayStatus, Difficulty } from "@/lib/core/types";
import { outcomeCounts, weekGrid, weeklyTrend } from "@/lib/stats";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKS = 26; // half a year; a full year overflows small screens anyway
const TREND_WEEKS = 12;
const POINTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 4 };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// when a user is in several groups, show the day's best outcome
const RANK: DayStatus[] = ["complete", "repaired", "frozen", "pending", "missed"];

export default async function StatsPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: days }, { data: memberships }, { data: solves }] =
    await Promise.all([
      supabase.from("profiles").select("timezone, leetcode_username").eq("id", user.id).single(),
      supabase.from("member_days").select("date, status, group_id, weight_done").eq("user_id", user.id),
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
  const weightByDate = new Map<string, number>();
  for (const d of days ?? []) {
    const prev = bestByDate.get(d.date);
    if (!prev || RANK.indexOf(d.status) < RANK.indexOf(prev)) {
      bestByDate.set(d.date, d.status);
    }
    weightByDate.set(d.date, (weightByDate.get(d.date) ?? 0) + (d.weight_done ?? 0));
  }
  const maxDayWeight = Math.max(0, ...weightByDate.values());

  const today = localDate(new Date(), timezone);
  const streakWeeks = weekGrid(today, WEEKS);

  const streakNow = Math.max(0, ...(memberships ?? []).map((m) => m.streak_current));
  const streakBest = Math.max(0, ...(memberships ?? []).map((m) => m.streak_longest));
  const freezesBanked = Math.max(0, ...(memberships ?? []).map((m) => m.freezes ?? 0));

  const outcome = outcomeCounts(bestByDate.values());
  const goodDays = outcome.settled - outcome.missed;
  const trend = weeklyTrend(bestByDate, today, TREND_WEEKS);

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your stats</h1>

      <Tabs defaultValue="leetstreak">
        <TabsList>
          <TabsTrigger value="leetstreak">LeetStreak</TabsTrigger>
          <TabsTrigger value="leetcode">LeetCode</TabsTrigger>
        </TabsList>

        <TabsContent value="leetstreak" className="mt-4 flex flex-col gap-6">
      <BlurFade>
      <StatTiles
        tiles={[
          {
            label: "Current streak",
            value: streakNow,
            icon: Flame,
            iconClassName: "text-orange-500",
          },
          { label: "Longest streak", value: streakBest, icon: Trophy },
          {
            label: "Completion rate",
            value: outcome.settled > 0 ? Math.round((goodDays / outcome.settled) * 100) : "—",
            suffix: outcome.settled > 0 ? "%" : undefined,
            icon: Target,
          },
          {
            label: "Freezes banked",
            value: freezesBanked,
            icon: Snowflake,
            iconClassName: "text-sky-400",
          },
        ]}
      />
      </BlurFade>

      <BlurFade delay={0.1}>
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
                    <DayCellSquare
                      key={date}
                      date={date}
                      status={bestByDate.get(date)}
                      weight={weightByDate.get(date)}
                      maxWeight={maxDayWeight}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <HeatmapLegend />
        </CardContent>
      </Card>
      </BlurFade>

      <BlurFade delay={0.15}>
      <div className="grid gap-6 md:grid-cols-2">
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

        {outcome.settled > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Day outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeRow counts={outcome} />
            </CardContent>
          </Card>
        )}
      </div>
      </BlurFade>

      {solveRows.length > 0 && (
        <BlurFade delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solve effort</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ["Tracked solves", solveRows.length, ListChecks],
                  ["Points earned", points, Zap],
                  ["Avg solves / active day", (solveRows.length / activeDays).toFixed(1), TrendingUp],
                  ["Busiest weekday", busiest, CalendarDays],
                ] as [string, string | number, LucideIcon][]
              ).map(([label, value, Icon]) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4.5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
                    <p className="truncate text-sm text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Points weight difficulty: easy 1 · medium 2 · hard 4.
            </p>
          </CardContent>
        </Card>
        </BlurFade>
      )}

      {(memberships ?? []).length > 0 && (
        <BlurFade delay={0.25}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your groups</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(memberships ?? []).map((m) => {
                const group = m.groups as unknown as { id: string; name: string };
                const g = daysByGroup.get(m.group_id);
                const r = rankInGroup.get(m.group_id);
                const pct = g && g.settled > 0 ? Math.round((g.good / g.settled) * 100) : null;
                return (
                  <div key={m.group_id} className="flex flex-col gap-2.5 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/groups/${group.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {group.name}
                      </Link>
                      {r && r.size > 1 && (
                        <Badge variant="secondary" className="shrink-0 font-mono">
                          #{r.rank}/{r.size}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Flame className="size-3.5 text-orange-500" aria-hidden />
                        {m.streak_current}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Trophy className="size-3.5" aria-hidden />
                        {m.streak_longest}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct ?? 0} className="h-1.5" />
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {pct !== null ? `${pct}%` : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </BlurFade>
      )}

        </TabsContent>

        <TabsContent value="leetcode" className="mt-4">
          <LeetCodeStats
            username={profile?.leetcode_username ?? null}
            missingHint="Set your LeetCode username in onboarding to see live profile stats."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
