import { notFound, redirect } from "next/navigation";
import { HeatmapLegend, type DayCell } from "@/components/day-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, localDate } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";
import { leetcodeSolvedBreakdown } from "@/lib/leetcode";
import { serverClient } from "@/lib/supabase/server";
import { InviteCode } from "./invite-code";
import { Leaderboard, type LeaderboardRow } from "./leaderboard";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

const STRIP_DAYS = 28;

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: group } = await supabase
    .from("groups")
    .select("*, playlists(name)")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound(); // not a member -> RLS hides the row

  const [{ data: members }, { data: days }, { data: profile }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, streak_current, streak_longest, freezes, profiles(username, leetcode_username)")
      .eq("group_id", id)
      .order("streak_current", { ascending: false }),
    supabase.from("member_days").select("user_id, date, status, weight_done").eq("group_id", id),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);

  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  const weekAgo = addDays(today, -6);
  const stripDates = Array.from({ length: STRIP_DAYS }, (_, i) =>
    addDays(today, i - (STRIP_DAYS - 1)),
  );

  const dayByUser = new Map<string, Map<string, DayStatus>>();
  const weeklyWeight = new Map<string, number>();
  for (const d of days ?? []) {
    if (!dayByUser.has(d.user_id)) dayByUser.set(d.user_id, new Map());
    dayByUser.get(d.user_id)!.set(d.date, d.status);
    if (d.date >= weekAgo && d.date <= today) {
      weeklyWeight.set(d.user_id, (weeklyWeight.get(d.user_id) ?? 0) + (d.weight_done ?? 0));
    }
  }

  const solvedByUser = new Map<string, number | null>(
    await Promise.all(
      (members ?? []).map(async (m): Promise<[string, number | null]> => {
        const lc = (m.profiles as unknown as { leetcode_username: string | null })
          ?.leetcode_username;
        if (!lc) return [m.user_id, null];
        try {
          return [m.user_id, (await leetcodeSolvedBreakdown(lc, 600)).all];
        } catch {
          return [m.user_id, null]; // private/renamed profile or API down — show "—"
        }
      }),
    ),
  );

  const rows: LeaderboardRow[] = (members ?? []).map((m) => ({
    user_id: m.user_id,
    username: (m.profiles as unknown as { username: string })?.username,
    streak_current: m.streak_current,
    streak_longest: m.streak_longest,
    freezes: m.freezes,
    weight: weeklyWeight.get(m.user_id) ?? 0,
    solved: solvedByUser.get(m.user_id) ?? null,
    cells: stripDates.map(
      (date): DayCell => ({ date, status: dayByUser.get(m.user_id)?.get(date) }),
    ),
  }));

  const isLeader = group.leader_id === user.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {(group.playlists as unknown as { name: string }).name} · {group.mode} ·{" "}
            {group.daily_target_weight} weight/day
          </p>
        </div>
        <InviteCode code={group.invite_code} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Leaderboard
              rows={rows}
              groupId={id}
              leaderId={group.leader_id}
              stripDays={STRIP_DAYS}
            />
          </div>
          <div className="mt-3">
            <HeatmapLegend />
          </div>
        </CardContent>
      </Card>

      {isLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group settings</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm group={group} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
