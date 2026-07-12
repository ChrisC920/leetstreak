import { CheckCircle2, Circle, Flame, RefreshCw, Snowflake, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Countdown } from "@/components/countdown";
import { DayCompleteConfetti } from "@/components/day-complete-confetti";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StreakHero } from "@/components/streak-hero";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShineBorder } from "@/components/ui/shine-border";
import { addDays, canRepair, dayBounds, localDate } from "@/lib/core/dates";
import type { Difficulty } from "@/lib/core/types";
import { runSettle } from "@/lib/jobs/settle";
import { authedUserId, serverClient } from "@/lib/supabase/server";
import { MarkSolvedButton, SyncButton, UseFreezeButton } from "./sync-button";

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
  const userId = await authedUserId(supabase);
  if (!userId) redirect("/");

  const now = new Date();
  const [{ data: profile }, { data: memberships }, { data: mySolves }, { data: activity }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, timezone, leetcode_username, last_synced_at")
        .eq("id", userId)
        .single(),
      supabase
        .from("group_members")
        .select("group_id, streak_current, streak_longest, freezes, groups(id, name, daily_target_weight, weight_easy, weight_medium, weight_hard, grace_period_days, freeze_earn_interval, max_freezes)")
        .eq("user_id", userId),
      supabase.from("solves").select("problem_id, solved_at").eq("user_id", userId),
      // activity: own + groupmates' solves in the last 24h (RLS scopes visibility)
      supabase
        .from("solves")
        .select("user_id, solved_at, profiles(username), problems(title, slug)")
        .gte("solved_at", new Date(now.getTime() - 86_400_000).toISOString())
        .order("solved_at", { ascending: false })
        .limit(20),
    ]);
  if (!profile) redirect("/onboarding");

  if (!memberships || memberships.length === 0) {
    return (
      <BlurFade>
        <EmptyState
          icon={Users}
          title="No group yet"
          description="Create a group and invite friends, or join one with an invite code."
          className="mx-auto max-w-md"
        >
          <Button render={<Link href="/groups/new" />}>Create a group</Button>
          <Button variant="outline" render={<Link href="/groups" />}>
            Join a group
          </Button>
        </EmptyState>
      </BlurFade>
    );
  }

  const today = localDate(now, profile.timezone);
  const groupIds = memberships.map((m) => m.group_id);

  const fetchDays = () =>
    Promise.all([
      supabase.from("member_days").select("*").eq("user_id", userId).in("group_id", groupIds),
      supabase.from("daily_assignments").select("*").in("group_id", groupIds),
    ]);
  let [{ data: memberDays }, { data: assignments }] = await fetchDays();

  // provision today's rows on first visit of the day instead of waiting for
  // the hourly cron. ponytail: full settle run; fine until user count grows
  const todayRows = (memberDays ?? []).filter((d) => d.date === today);
  if (todayRows.length < memberships.length) {
    await runSettle(now);
    [{ data: memberDays }, { data: assignments }] = await fetchDays();
  }

  const problemIds = new Set<string>(
    (assignments ?? []).flatMap((a) => a.problem_ids as string[]),
  );
  const { data: problems } = await supabase
    .from("problems")
    .select("id, slug, title, difficulty")
    .in("id", [...problemIds]);
  const problemById = new Map((problems ?? []).map((p) => [p.id, p as Problem]));

  const solvedAt = new Map((mySolves ?? []).map((s) => [s.problem_id, s.solved_at]));

  const { start: dayStart, end: dayEnd } = dayBounds(today, profile.timezone);
  const solvedToday = (pid: string) => {
    const at = solvedAt.get(pid);
    return at !== undefined && new Date(at) >= dayStart && new Date(at) < dayEnd;
  };

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

  // missed days a banked freeze could still cover
  const freezeDays = groupData
    .filter(({ m }) => (m.freezes ?? 0) > 0)
    .flatMap(({ m, group }) =>
      (memberDays ?? [])
        .filter(
          (d) =>
            d.group_id === m.group_id &&
            d.status === "missed" &&
            canRepair(d.date, today, group.grace_period_days),
        )
        .map((d) => ({ groupId: group.id, groupName: group.name, date: d.date as string })),
    );

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
  const remainingCount = groupData.reduce(
    (s, g) => s + g.todaysProblems.filter((p) => !solvedToday(p.id)).length,
    0,
  );
  const hour = Number(formatInTimeZone(now, profile.timezone, "H"));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const objective =
    remainingCount === 0
      ? totalSum > 0
        ? "All problems done — streak safe."
        : "Nothing assigned today."
      : `${remainingCount} problem${remainingCount === 1 ? "" : "s"} left to keep your streak alive.`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting}, ${profile.username}`}
        description={
          <>
            {objective} <Countdown target={dayEnd.toISOString()} />
          </>
        }
        actions={profile.leetcode_username && <SyncButton />}
      />

      <BlurFade>
        <div className="relative rounded-xl">
          {completionPct === 100 && (
            <ShineBorder borderWidth={2} duration={10} shineColor={["#34d399", "#3b82f6"]} />
          )}
          <StreakHero streak={streakNow} freezes={freezesBanked} completionPct={completionPct} />
        </div>
      </BlurFade>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">

      {(queue.length > 0 || freezeDays.length > 0) && (
        <BlurFade delay={0.05}>
          <SectionCard
            title="Catch-up queue"
            action={
              <Badge variant="secondary" className="text-xs">
                {queue.length} pending
              </Badge>
            }
          >
              <p className="text-sm text-muted-foreground">
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
              {freezeDays.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <span className="text-sm text-muted-foreground">
                    Or spend a banked freeze to save the day:
                  </span>
                  {freezeDays.map((f) => (
                    <UseFreezeButton
                      key={`${f.groupId}-${f.date}`}
                      groupId={f.groupId}
                      date={f.date}
                      label={
                        formatInTimeZone(new Date(`${f.date}T12:00:00Z`), "UTC", "MMM d") +
                        (groupData.length > 1 ? ` · ${f.groupName}` : "")
                      }
                    />
                  ))}
                </div>
              )}
          </SectionCard>
        </BlurFade>
      )}

      {groupData.map(
        ({ m, group, weights, todaysProblems, weightDone, weightTotal, allDone }, gi) => (
          <BlurFade key={m.group_id} delay={0.1 + gi * 0.05}>
            <DayCompleteConfetti fired={allDone} dayKey={`${m.group_id}-${today}`} />
            <SectionCard
              title={
                <Link href={`/groups/${group.id}`} className="text-lg hover:underline">
                  {group.name}
                </Link>
              }
              action={
                <div className="flex items-center gap-3 font-mono text-sm tabular-nums">
                  <span title="current streak" className="flex items-center gap-1">
                    <Flame className="size-4 text-amber-500" aria-hidden /> {m.streak_current}
                  </span>
                  <span title="streak freezes" className="flex items-center gap-1">
                    <Snowflake className="size-4 text-chart-2" aria-hidden /> {m.freezes}
                  </span>
                </div>
              }
            >
              <>
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
                      <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Day complete — streak safe.
                      </p>
                    )}
                  </>
                )}
              </>
            </SectionCard>
          </BlurFade>
        ),
      )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
      <BlurFade delay={0.2}>
      <SectionCard title="Recent activity" action={<span className="text-xs text-muted-foreground">24h</span>}>
          {!activity || activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity from your groups yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm">
              {activity.map((a, i) => {
                const username = (a.profiles as unknown as { username: string })?.username;
                const who = a.user_id === userId ? "You" : username;
                const prob = a.problems as unknown as { title: string; slug: string };
                return (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary uppercase">
                          {(username ?? "?").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{who}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {localDate(new Date(a.solved_at), profile.timezone) !== today && "yesterday "}
                        {formatInTimeZone(new Date(a.solved_at), profile.timezone, "h:mm a")}
                      </span>
                    </span>
                    <a
                      href={`https://leetcode.com/problems/${prob.slug}/`}
                      target="_blank"
                      className="truncate pl-8 text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {prob.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
      </SectionCard>
      </BlurFade>

      <BlurFade delay={0.25}>
        <SectionCard title="Sync">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="size-3.5" aria-hidden />
              {profile.last_synced_at
                ? `Last synced ${formatInTimeZone(
                    new Date(profile.last_synced_at),
                    profile.timezone,
                    "MMM d, h:mm a",
                  )}`
                : "Never synced"}
            </span>
            {profile.leetcode_username && <SyncButton />}
          </div>
          <p className="text-xs text-muted-foreground">
            Solves sync automatically every night
            {profile.leetcode_username ? ` for @${profile.leetcode_username}` : ""}.
          </p>
        </SectionCard>
      </BlurFade>

      <BlurFade delay={0.3}>
        <SectionCard title="Your groups">
          <ul className="flex flex-col gap-2 text-sm">
            {groupData.map(({ group, m }) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
                >
                  <span className="truncate font-medium">{group.name}</span>
                  <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums">
                    <Flame className="size-3.5 text-amber-500" aria-hidden />
                    {m.streak_current}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </BlurFade>
        </div>
      </div>
    </div>
  );
}
