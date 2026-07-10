import { Flame, Snowflake, Target, Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { KpiCard } from "@/components/kpi-card";
import { LeetCodeStats } from "@/components/leetcode-stats";
import { SectionCard } from "@/components/section-card";
import { StatRing } from "@/components/stat-ring";
import { OutcomeRow } from "@/components/stats-charts";
import { WeeklyTrendChart } from "@/components/trend-charts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localDate } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";
import { outcomeCounts, weekGrid, weeklyTrend } from "@/lib/stats";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKS = 26;
const TREND_WEEKS = 12;

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string; uid: string }>;
}) {
  const { id, uid } = await params;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: member }, { data: days }, { data: profile }] = await Promise.all([
    supabase
      .from("group_members")
      .select("streak_current, streak_longest, freezes, profiles(username, leetcode_username)")
      .eq("group_id", id)
      .eq("user_id", uid)
      .maybeSingle(),
    supabase
      .from("member_days")
      .select("date, status, weight_done")
      .eq("group_id", id)
      .eq("user_id", uid),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  // RLS hides rows of groups the viewer isn't in
  if (!member) notFound();

  const { username, leetcode_username } = member.profiles as unknown as {
    username: string;
    leetcode_username: string | null;
  };

  const statusByDate = new Map<string, DayStatus>((days ?? []).map((d) => [d.date, d.status]));
  const weightByDate = new Map<string, number>(
    (days ?? []).map((d) => [d.date, d.weight_done ?? 0]),
  );
  const maxDayWeight = Math.max(0, ...weightByDate.values());

  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  const weeks = weekGrid(today, WEEKS);
  const outcome = outcomeCounts(statusByDate.values());
  const goodDays = outcome.settled - outcome.missed;
  const trend = weeklyTrend(statusByDate, today, TREND_WEEKS);

  const completionPct =
    outcome.settled > 0 ? Math.round((goodDays / outcome.settled) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-primary/15 font-semibold text-primary uppercase">
            {username.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{username}</h1>
      </div>

      <Tabs defaultValue="leetstreak">
        <TabsList>
          <TabsTrigger value="leetstreak">This group</TabsTrigger>
          <TabsTrigger value="leetcode">LeetCode</TabsTrigger>
        </TabsList>

        <TabsContent value="leetstreak" className="mt-4 flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Current streak"
          value={member.streak_current}
          icon={Flame}
          accent="amber"
        />
        <KpiCard
          label="Longest streak"
          value={member.streak_longest}
          icon={Trophy}
          accent="violet"
        />
        <KpiCard
          label="Completion rate"
          value={completionPct ?? "—"}
          suffix={completionPct !== null ? "%" : undefined}
          icon={Target}
          accent="emerald"
        />
        <KpiCard label="Freezes banked" value={member.freezes} icon={Snowflake} accent="blue" />
      </div>

      <SectionCard title={`Last ${WEEKS} weeks`}>
          <div className="overflow-x-auto">
            <div className="flex gap-[2px]">
              {weeks.map((col, i) => (
                <div key={i} className="flex flex-col gap-[2px]">
                  {col.map((date) => (
                    <DayCellSquare
                      key={date}
                      date={date}
                      status={statusByDate.get(date)}
                      weight={weightByDate.get(date)}
                      maxWeight={maxDayWeight}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <HeatmapLegend />
      </SectionCard>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Weekly consistency">
            <WeeklyTrendChart weeks={trend} />
            <p className="text-xs text-muted-foreground">
              Good days per week (complete, repaired, or frozen) over the last {TREND_WEEKS} weeks,
              oldest to newest.
            </p>
        </SectionCard>

        {outcome.settled > 0 && (
          <SectionCard title="Day outcomes">
            <div className="flex items-center gap-6">
              <StatRing
                value={completionPct ?? 0}
                label="Completion"
                sublabel="good days"
                size={120}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <OutcomeRow counts={outcome} />
              </div>
            </div>
          </SectionCard>
        )}
      </div>

        </TabsContent>

        <TabsContent value="leetcode" className="mt-4">
          <LeetCodeStats
            username={leetcode_username}
            missingHint={`${username} hasn't linked a LeetCode account.`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
