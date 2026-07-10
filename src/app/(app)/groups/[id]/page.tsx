import { notFound, redirect } from "next/navigation";
import { Countdown } from "@/components/countdown";
import { HeatmapLegend, type DayCell } from "@/components/day-heatmap";
import { SectionCard } from "@/components/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, dayBounds, localDate } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";
import { serverClient } from "@/lib/supabase/server";
import { InviteCode } from "./invite-code";
import { Leaderboard, type LeaderboardRow } from "./leaderboard";
import { LeaveButton } from "./leave-button";
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

  const [{ data: members }, { data: days }, { data: profile }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("user_id, streak_current, streak_longest, freezes, profiles(username)")
        .eq("group_id", id)
        .order("streak_current", { ascending: false }),
      supabase.from("member_days").select("user_id, date, status, weight_done").eq("group_id", id),
      supabase.from("profiles").select("timezone").eq("id", user.id).single(),
      supabase.from("daily_assignments").select("problem_ids").eq("group_id", id),
    ]);

  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  const weekAgo = addDays(today, -6);
  const stripDates = Array.from({ length: STRIP_DAYS }, (_, i) =>
    addDays(today, i - (STRIP_DAYS - 1)),
  );

  const dayByUser = new Map<string, Map<string, { status: DayStatus; weight: number }>>();
  const weeklyWeight = new Map<string, number>();
  let maxDayWeight = 0;
  for (const d of days ?? []) {
    if (!dayByUser.has(d.user_id)) dayByUser.set(d.user_id, new Map());
    dayByUser.get(d.user_id)!.set(d.date, { status: d.status, weight: d.weight_done ?? 0 });
    maxDayWeight = Math.max(maxDayWeight, d.weight_done ?? 0);
    if (d.date >= weekAgo && d.date <= today) {
      weeklyWeight.set(d.user_id, (weeklyWeight.get(d.user_id) ?? 0) + (d.weight_done ?? 0));
    }
  }

  // solved = problems this group assigned that the member has solved (any time)
  const assignedIds = new Set((assignments ?? []).flatMap((a) => a.problem_ids as string[]));
  const { data: solves } = await supabase
    .from("solves")
    .select("user_id, problem_id")
    .in("user_id", (members ?? []).map((m) => m.user_id));
  const solvedByUser = new Map<string, number>();
  for (const s of solves ?? []) {
    if (!assignedIds.has(s.problem_id)) continue;
    solvedByUser.set(s.user_id, (solvedByUser.get(s.user_id) ?? 0) + 1);
  }

  const doneToday = (uid: string) => {
    const s = dayByUser.get(uid)?.get(today)?.status;
    return s === "complete" || s === "repaired";
  };

  const rows: LeaderboardRow[] = (members ?? []).map((m) => ({
    user_id: m.user_id,
    username: (m.profiles as unknown as { username: string })?.username,
    streak_current: m.streak_current,
    streak_longest: m.streak_longest,
    freezes: m.freezes,
    weight: weeklyWeight.get(m.user_id) ?? 0,
    solved: solvedByUser.get(m.user_id) ?? 0,
    doneToday: doneToday(m.user_id),
    cells: stripDates.map((date): DayCell => {
      const day = dayByUser.get(m.user_id)?.get(date);
      return { date, status: day?.status, weight: day?.weight };
    }),
  }));

  const missingToday = rows.filter((r) => !r.doneToday);
  const settlement = dayBounds(today, profile?.timezone ?? "UTC").end;
  const isLeader = group.leader_id === user.id;

  const policyPills = [
    (group.playlists as unknown as { name: string }).name,
    group.mode === "ordered" ? "playlist order" : "random daily",
    `${group.daily_target_weight} weight/day`,
    `${group.grace_period_days}d grace`,
    `freeze every ${group.freeze_earn_interval}d`,
    `max ${group.max_freezes} freezes`,
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{group.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            {policyPills.map((p) => (
              <Badge key={p} variant="secondary" className="font-normal">
                {p}
              </Badge>
            ))}
          </div>
          <Countdown target={settlement.toISOString()} />
        </div>
        <div className="flex items-center gap-2">
          <LeaveButton
            groupId={id}
            groupName={group.name}
            description={
              !isLeader
                ? undefined
                : (members ?? []).length > 1
                  ? "Leadership passes to the longest-standing member. Your streak and history in this group will be deleted. This can't be undone."
                  : "You're the only member, so the group and all its history will be deleted. This can't be undone."
            }
          />
          <InviteCode code={group.invite_code} />
        </div>
      </div>

      {missingToday.length > 0 && missingToday.length < rows.length && (
        <SectionCard
          title="Still missing today"
          action={
            <Badge variant="secondary" className="text-xs">
              {rows.length - missingToday.length}/{rows.length} done
            </Badge>
          }
        >
          <div className="flex flex-wrap gap-2">
            {missingToday.map((r) => (
              <span
                key={r.user_id}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm"
              >
                <Avatar className="size-5">
                  <AvatarFallback className="bg-muted text-[9px] font-semibold uppercase">
                    {r.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {r.username}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          {isLeader && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <Leaderboard
                  rows={rows}
                  groupId={id}
                  leaderId={group.leader_id}
                  stripDays={STRIP_DAYS}
                  maxDayWeight={maxDayWeight}
                  isLeader={isLeader}
                />
              </div>
              <div className="mt-3">
                <HeatmapLegend />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isLeader && (
          <TabsContent value="settings" className="mt-4">
            <SectionCard title="Group settings">
              <SettingsForm group={group} />
            </SectionCard>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
