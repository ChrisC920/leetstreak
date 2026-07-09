import { redirect } from "next/navigation";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, localDate } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKS = 26; // half a year; a full year overflows small screens anyway

// when a user is in several groups, show the day's best outcome
const RANK: DayStatus[] = ["complete", "repaired", "frozen", "pending", "missed"];

export default async function StatsPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: days }, { data: memberships }, { count: solveCount }] =
    await Promise.all([
      supabase.from("profiles").select("timezone").eq("id", user.id).single(),
      supabase.from("member_days").select("date, status").eq("user_id", user.id),
      supabase
        .from("group_members")
        .select("streak_current, streak_longest")
        .eq("user_id", user.id),
      supabase.from("solves").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

  const bestByDate = new Map<string, DayStatus>();
  for (const d of days ?? []) {
    const prev = bestByDate.get(d.date);
    if (!prev || RANK.indexOf(d.status) < RANK.indexOf(prev)) {
      bestByDate.set(d.date, d.status);
    }
  }

  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  // grid: columns = weeks, rows = weekday, ending on today's week
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(today, -(WEEKS * 7 - 1) - todayDow);
  const weeks = Array.from({ length: WEEKS + 1 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)).filter(
      (date) => date <= today,
    ),
  ).filter((col) => col.length > 0);

  const streakNow = Math.max(0, ...(memberships ?? []).map((m) => m.streak_current));
  const streakBest = Math.max(0, ...(memberships ?? []).map((m) => m.streak_longest));
  const settled = (days ?? []).filter((d) => d.status !== "pending");
  const goodDays = settled.filter((d) => d.status !== "missed").length;

  const tiles: [string, string | number][] = [
    ["Current streak", `🔥 ${streakNow}`],
    ["Longest streak", streakBest],
    ["Problems solved", solveCount ?? 0],
    [
      "Completion rate",
      settled.length > 0 ? `${Math.round((goodDays / settled.length) * 100)}%` : "—",
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your stats</h1>

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
                    <DayCellSquare key={date} date={date} status={bestByDate.get(date)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <HeatmapLegend />
        </CardContent>
      </Card>
    </div>
  );
}
