import { CheckCircle2, Circle, Flame, Snowflake, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { DayCompleteConfetti } from "@/components/day-complete-confetti";
import { StreakHero } from "@/components/streak-hero";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addDays, canRepair, dayBounds, localDate } from "@/lib/core/dates";
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
    .select("group_id, streak_current, streak_longest, freezes, groups(id, name, daily_target_weight, weight_easy, weight_medium, weight_hard, grace_period_days, freeze_earn_interval, max_freezes)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return (
      <BlurFade>
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <Users className="size-10 text-primary" aria-hidden />
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
          </CardContent>
        </Card>
      </BlurFade>
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

  const groupData = memberships.map((m) => {
    const group = m.groups as unknown as {
      id: string;
      name: string;
      daily_target_weight: number;
      weight_easy: number;
      weight_medium: number;
      weight_hard: number;
      grace_period_days: number;
      freeze_earn_interval: number;
      max_freezes: number;
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
          canRepair(d.date, today, group.grace_period_days),
      )
      .map((d) => ({
        date: d.date as string,
        deadline: dayBounds(addDays(d.date, group.grace_period_days), profile.timezone).end,
        problems: (
          ((assignments ?? []).find(
            (a) => a.group_id === m.group_id && a.date === d.date,
          )?.problem_ids as string[]) ?? []
        )
          .map((id) => problemById.get(id))
          .filter((p): p is Problem => p !== undefined && !solvedAt.has(p.id)),
      }))
      .filter((b) => b.problems.length > 0);

    return { m, group, weights, todaysProblems, weightDone, weightTotal, allDone, backlog };
  });

  const queue = groupData
    .flatMap(({ group, weights, backlog }) =>
      backlog.flatMap((b) =>
        b.problems.map((p) => ({
          problem: p,
          weight: weights[p.difficulty],
          groupName: group.name,
          deadline: b.deadline,
        })),
      ),
    )
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  const hoursLeft = (deadline: Date) =>
    Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 3_600_000));
  const expiresIn = (deadline: Date) => {
    const h = hoursLeft(deadline);
    return h < 48 ? `expires in ${h}h` : `expires in ${Math.floor(h / 24)}d`;
  };

  const streakNow = Math.max(0, ...memberships.map((m) => m.streak_current));
  const freezesBanked = Math.max(0, ...memberships.map((m) => m.freezes ?? 0));
  const doneSum = groupData.reduce((s, g) => s + g.weightDone, 0);
  const totalSum = groupData.reduce((s, g) => s + g.weightTotal, 0);
  const completionPct = totalSum > 0 ? Math.round((doneSum / totalSum) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Today <span className="text-lg text-muted-foreground">· {today}</span>
        </h1>
        <div className="flex items-center gap-2">
          {profile.leetcode_username && <SyncButton />}
        </div>
      </div>

      <BlurFade>
        <StreakHero streak={streakNow} freezes={freezesBanked} completionPct={completionPct} />
      </BlurFade>

      {queue.length > 0 && (
        <BlurFade delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catch-up queue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted-foreground">
                Finish these before their grace period ends to repair your streak.
              </p>
              <ul className="divide-y">
                {queue.map(({ problem: p, weight, groupName, deadline }) => (
                  <li key={`${groupName}-${p.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <a
                        href={`https://leetcode.com/problems/${p.slug}/`}
                        target="_blank"
                        className="truncate font-medium hover:underline"
                      >
                        {p.title}
                      </a>
                      <Badge variant="secondary" className={`text-xs ${DIFF_COLOR[p.difficulty]}`}>
                        {p.difficulty} · {weight}w
                      </Badge>
                      {groupData.length > 1 && (
                        <span className="text-xs text-muted-foreground">{groupName}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-xs ${
                          hoursLeft(deadline) < 24
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {expiresIn(deadline)}
                      </span>
                      <MarkSolvedButton problemId={p.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {groupData.map(
        ({ m, group, weights, todaysProblems, weightDone, weightTotal, allDone }, gi) => (
          <BlurFade key={m.group_id} delay={0.1 + gi * 0.05}>
            <DayCompleteConfetti fired={allDone} dayKey={`${m.group_id}-${today}`} />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  <Link href={`/groups/${group.id}`} className="hover:underline">
                    {group.name}
                  </Link>
                </CardTitle>
                <div className="flex items-center gap-3 text-sm">
                  <span title="current streak" className="flex items-center gap-1">
                    <Flame className="size-4 text-orange-500" aria-hidden /> {m.streak_current}
                  </span>
                  <span title="streak freezes" className="flex items-center gap-1">
                    <Snowflake className="size-4 text-sky-400" aria-hidden /> {m.freezes}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {todaysProblems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No problems assigned today — playlist may be complete.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={(weightDone / Math.max(weightTotal, 1)) * 100}
                        className="h-2"
                      />
                      <span className="whitespace-nowrap text-sm text-muted-foreground">
                        {weightDone}/{weightTotal} weight
                      </span>
                    </div>
                    <ul className="divide-y">
                      {todaysProblems.map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-3">
                            {solvedToday(p.id) ? (
                              <CheckCircle2 className="size-5 text-primary" aria-hidden />
                            ) : (
                              <Circle className="size-5 text-muted-foreground/40" aria-hidden />
                            )}
                            <a
                              href={`https://leetcode.com/problems/${p.slug}/`}
                              target="_blank"
                              className={`font-medium hover:underline ${
                                solvedToday(p.id) ? "text-muted-foreground line-through" : ""
                              }`}
                            >
                              {p.title}
                            </a>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${DIFF_COLOR[p.difficulty]}`}
                            >
                              {p.difficulty} · {weights[p.difficulty]}w
                            </Badge>
                          </div>
                          {!solvedToday(p.id) && <MarkSolvedButton problemId={p.id} />}
                        </li>
                      ))}
                    </ul>
                    {allDone && (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-500">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Day complete — streak safe.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </BlurFade>
        ),
      )}

      <BlurFade delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Friend activity (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {!activity || activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity from your groups yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm">
              {activity.map((a, i) => {
                const who = (a.profiles as unknown as { username: string })?.username;
                const prob = a.problems as unknown as { title: string; slug: string };
                return (
                  <li key={i} className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary uppercase">
                        {(who ?? "?").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{who}</span>
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
                      {localDate(new Date(a.solved_at), profile.timezone) !== today && "yesterday "}
                      {formatInTimeZone(new Date(a.solved_at), profile.timezone, "h:mm a")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      </BlurFade>
    </div>
  );
}
