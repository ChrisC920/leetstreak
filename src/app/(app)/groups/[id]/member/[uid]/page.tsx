import { notFound, redirect } from "next/navigation";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { LeetCodeStats } from "@/components/leetcode-stats";
import { OutcomeRow, StatTiles, WeeklyTrendBars } from "@/components/stats-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      .select("date, status")
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

  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  const weeks = weekGrid(today, WEEKS);
  const outcome = outcomeCounts(statusByDate.values());
  const goodDays = outcome.settled - outcome.missed;
  const trend = weeklyTrend(statusByDate, today, TREND_WEEKS);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{username}</h1>

      <Tabs defaultValue="leetstreak">
        <TabsList>
          <TabsTrigger value="leetstreak">This group</TabsTrigger>
          <TabsTrigger value="leetcode">LeetCode</TabsTrigger>
        </TabsList>

        <TabsContent value="leetstreak" className="mt-4 flex flex-col gap-6">
      <StatTiles
        tiles={[
          ["Current streak", `🔥 ${member.streak_current}`],
          ["Longest streak", member.streak_longest],
          [
            "Completion rate",
            outcome.settled > 0 ? `${Math.round((goodDays / outcome.settled) * 100)}%` : "—",
          ],
          ["Freezes banked", `🧊 ${member.freezes}`],
        ]}
      />

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last {WEEKS} weeks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <div className="flex gap-[2px]">
              {weeks.map((col, i) => (
                <div key={i} className="flex flex-col gap-[2px]">
                  {col.map((date) => (
                    <DayCellSquare key={date} date={date} status={statusByDate.get(date)} />
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
