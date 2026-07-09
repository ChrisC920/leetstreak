import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { canRepair, dayBounds, localDate } from "@/lib/core/dates";
import type { Difficulty } from "@/lib/core/types";
import { runSettle } from "@/lib/jobs/settle";
import { serverClient } from "@/lib/supabase/server";
import { MarkSolvedButton, SyncButton } from "./sync-button";

export const dynamic = "force-dynamic";

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
}

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-red-600",
};

export default async function DashboardPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, leetcode_username, last_synced_at")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/onboarding");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, streak_current, streak_longest, freezes, groups(id, name, daily_target_weight, weight_easy, weight_medium, weight_hard)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h2 className="text-2xl font-semibold">No group yet</h2>
        <p className="text-muted-foreground">
          Create a group and invite friends, or join one with an invite code.
        </p>
        <div className="flex gap-2">
          <Button render={<Link href="/groups/new" />}>Create a group</Button>
          <Button variant="outline" render={<Link href="/groups" />}>
            Join a group
          </Button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const today = localDate(now, profile.timezone);

  // provision today's rows on first visit of the day instead of waiting for
  // the hourly cron. ponytail: full settle run; fine until user count grows
  const { data: todayRows } = await supabase
    .from("member_days")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("date", today);
  if ((todayRows ?? []).length < memberships.length) {
    await runSettle(now);
  }

  const groupIds = memberships.map((m) => m.group_id);
  const [{ data: memberDays }, { data: assignments }] = await Promise.all([
    supabase.from("member_days").select("*").eq("user_id", user.id).in("group_id", groupIds),
    supabase.from("daily_assignments").select("*").in("group_id", groupIds),
  ]);

  const problemIds = new Set<string>(
    (assignments ?? []).flatMap((a) => a.problem_ids as string[]),
  );
  const { data: problems } = await supabase
    .from("problems")
    .select("id, slug, title, difficulty")
    .in("id", [...problemIds]);
  const problemById = new Map((problems ?? []).map((p) => [p.id, p as Problem]));

  const { data: mySolves } = await supabase
    .from("solves")
    .select("problem_id, solved_at")
    .eq("user_id", user.id);
  const solvedAt = new Map((mySolves ?? []).map((s) => [s.problem_id, s.solved_at]));

  const { start: dayStart, end: dayEnd } = dayBounds(today, profile.timezone);
  const solvedToday = (pid: string) => {
    const at = solvedAt.get(pid);
    return at !== undefined && new Date(at) >= dayStart && new Date(at) < dayEnd;
  };

  // activity: groupmates' solves in the last 24h (RLS scopes visibility)
  const { data: activity } = await supabase
    .from("solves")
    .select("solved_at, profiles(username), problems(title, slug)")
    .gte("solved_at", new Date(now.getTime() - 86_400_000).toISOString())
    .neq("user_id", user.id)
    .order("solved_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Today · {today}</h1>
        <div className="flex items-center gap-2">
          {profile.leetcode_username && <SyncButton />}
        </div>
      </div>

      {memberships.map((m) => {
        const group = m.groups as unknown as {
          id: string;
          name: string;
          daily_target_weight: number;
          weight_easy: number;
          weight_medium: number;
          weight_hard: number;
        };
        const weights = {
          easy: group.weight_easy,
          medium: group.weight_medium,
          hard: group.weight_hard,
        };
        const assignment = (assignments ?? []).find(
          (a) => a.group_id === m.group_id && a.date === today,
        );
        const todaysProblems = ((assignment?.problem_ids as string[]) ?? [])
          .map((id) => problemById.get(id))
          .filter((p): p is Problem => p !== undefined);
        const weightDone = todaysProblems
          .filter((p) => solvedToday(p.id))
          .reduce((s, p) => s + weights[p.difficulty], 0);
        const weightTotal = todaysProblems.reduce((s, p) => s + weights[p.difficulty], 0);
        const allDone = todaysProblems.length > 0 && todaysProblems.every((p) => solvedToday(p.id));

        const backlog = (memberDays ?? [])
          .filter(
            (d) =>
              d.group_id === m.group_id &&
              d.status === "missed" &&
              canRepair(d.date, today),
          )
          .map((d) => ({
            date: d.date as string,
            problems: (
              ((assignments ?? []).find(
                (a) => a.group_id === m.group_id && a.date === d.date,
              )?.problem_ids as string[]) ?? []
            )
              .map((id) => problemById.get(id))
              .filter((p): p is Problem => p !== undefined && !solvedAt.has(p.id)),
          }))
          .filter((b) => b.problems.length > 0);

        return (
          <Card key={m.group_id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                <Link href={`/groups/${group.id}`} className="hover:underline">
                  {group.name}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span title="current streak">🔥 {m.streak_current}</span>
                <span title="streak freezes">🧊 {m.freezes}</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {backlog.map((b) => (
                <div key={b.date} className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                  <p className="font-medium">
                    Repair your streak: finish {b.date}&apos;s problems within 3 days of the miss.
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {b.problems.map((p) => (
                      <li key={p.id}>
                        <a
                          className="underline"
                          href={`https://leetcode.com/problems/${p.slug}/`}
                          target="_blank"
                        >
                          {p.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {todaysProblems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No problems assigned today — playlist may be complete. 🎉
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Progress value={(weightDone / Math.max(weightTotal, 1)) * 100} className="h-2" />
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                      {weightDone}/{weightTotal} weight
                    </span>
                  </div>
                  <ul className="divide-y">
                    {todaysProblems.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <span className={solvedToday(p.id) ? "" : "opacity-30"}>
                            {solvedToday(p.id) ? "✅" : "⬜"}
                          </span>
                          <a
                            href={`https://leetcode.com/problems/${p.slug}/`}
                            target="_blank"
                            className="font-medium hover:underline"
                          >
                            {p.title}
                          </a>
                          <span className={`text-xs ${DIFF_COLOR[p.difficulty]}`}>
                            {p.difficulty} · {weights[p.difficulty]}w
                          </span>
                        </div>
                        {!solvedToday(p.id) && <MarkSolvedButton problemId={p.id} />}
                      </li>
                    ))}
                  </ul>
                  {allDone && (
                    <p className="text-sm font-medium text-green-600">
                      Day complete — streak safe. 🔥
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Friend activity (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {!activity || activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity from your groups yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {activity.map((a, i) => {
                const who = (a.profiles as unknown as { username: string })?.username;
                const prob = a.problems as unknown as { title: string; slug: string };
                return (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="secondary">{who}</Badge>
                    <span>
                      solved{" "}
                      <a
                        href={`https://leetcode.com/problems/${prob.slug}/`}
                        target="_blank"
                        className="font-medium hover:underline"
                      >
                        {prob.title}
                      </a>
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(a.solved_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
