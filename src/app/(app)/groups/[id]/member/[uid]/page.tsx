import { notFound, redirect } from "next/navigation";
import { LeetCodeStats } from "@/components/leetcode-stats";
import {
  ConsistencyOutcomeCards,
  StreakHeatmapCard,
  StreakKpiRow,
} from "@/components/streak-sections";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localDate } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";
import { outcomeCounts } from "@/lib/stats";
import { authedUserId, serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string; uid: string }>;
}) {
  const { id, uid } = await params;
  const supabase = await serverClient();
  const userId = await authedUserId(supabase);
  if (!userId) redirect("/");

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
    supabase.from("profiles").select("timezone").eq("id", userId).single(),
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
  const outcome = outcomeCounts(statusByDate.values());
  const goodDays = outcome.settled - outcome.missed;

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
      <StreakKpiRow
        streakCurrent={member.streak_current}
        streakLongest={member.streak_longest}
        completionPct={completionPct}
        freezes={member.freezes}
      />

      <StreakHeatmapCard
        today={today}
        statusByDate={statusByDate}
        weightByDate={weightByDate}
        maxDayWeight={maxDayWeight}
      />

      <ConsistencyOutcomeCards
        today={today}
        statusByDate={statusByDate}
        outcome={outcome}
        completionPct={completionPct}
      />

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
