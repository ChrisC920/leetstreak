import { notFound, redirect } from "next/navigation";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, localDate } from "@/lib/core/dates";
import { leetcodeSolvedBreakdown, type SolvedBreakdown } from "@/lib/leetcode";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKS = 26;

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

  let breakdown: SolvedBreakdown | null = null;
  if (leetcode_username) {
    try {
      breakdown = await leetcodeSolvedBreakdown(leetcode_username, 600);
    } catch {
      // private/renamed profile or API down — omit the live tiles
    }
  }

  const statusByDate = new Map((days ?? []).map((d) => [d.date, d.status]));

  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(today, -(WEEKS * 7 - 1) - todayDow);
  const weeks = Array.from({ length: WEEKS + 1 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)).filter(
      (date) => date <= today,
    ),
  ).filter((col) => col.length > 0);

  const tiles: [string, string | number][] = [
    ["Current streak", `🔥 ${member.streak_current}`],
    ["Longest streak", member.streak_longest],
    ["Freezes", member.freezes],
    ["Problems solved", breakdown?.all ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{username}</h1>

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

      {breakdown && (
        <p className="text-sm text-muted-foreground">
          Easy {breakdown.easy} · Medium {breakdown.medium} · Hard {breakdown.hard}
        </p>
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
    </div>
  );
}
