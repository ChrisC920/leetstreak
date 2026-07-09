import { notFound, redirect } from "next/navigation";
import { DayStrip, HeatmapLegend, type DayCell } from "@/components/day-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, localDate } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";
import { serverClient } from "@/lib/supabase/server";
import { InviteCode } from "./invite-code";
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
      .select("user_id, streak_current, streak_longest, freezes, profiles(username)")
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 font-medium">🔥 Streak</th>
                  <th className="pb-2 font-medium">Best</th>
                  <th className="pb-2 font-medium">🧊</th>
                  <th className="pb-2 font-medium">Weight (7d)</th>
                  <th className="pb-2 font-medium">Last {STRIP_DAYS} days</th>
                </tr>
              </thead>
              <tbody>
                {(members ?? []).map((m) => {
                  const username = (m.profiles as unknown as { username: string })?.username;
                  const cells: DayCell[] = stripDates.map((date) => ({
                    date,
                    status: dayByUser.get(m.user_id)?.get(date),
                  }));
                  return (
                    <tr key={m.user_id} className="border-t">
                      <td className="py-2 font-medium">
                        {username}
                        {m.user_id === group.leader_id && (
                          <span className="ml-1 text-xs text-muted-foreground">(leader)</span>
                        )}
                      </td>
                      <td className="py-2">{m.streak_current}</td>
                      <td className="py-2">{m.streak_longest}</td>
                      <td className="py-2">{m.freezes}</td>
                      <td className="py-2">{weeklyWeight.get(m.user_id) ?? 0}</td>
                      <td className="py-2">
                        <DayStrip cells={cells} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
