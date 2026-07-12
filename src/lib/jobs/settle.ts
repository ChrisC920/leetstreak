import { generateAssignment } from "@/lib/core/assignment";
import { addDays, canRepair, dayBounds, isDayOver, localDate } from "@/lib/core/dates";
import { computeStreak, freezesAfterEarn, settleDay, type MemberDay } from "@/lib/core/streak";
import type { Difficulty, Weights } from "@/lib/core/types";
import { adminClient } from "@/lib/supabase/admin";

export interface SettleReport {
  settled: number;
  repaired: number;
  provisioned: number;
  deferred: number;
}

interface ProfileRow {
  id: string;
  timezone: string;
  last_synced_at: string | null;
  leetcode_username: string | null;
}

interface GroupRow {
  id: string;
  playlist_id: string;
  mode: "ordered" | "random";
  daily_target_weight: number;
  weight_easy: number;
  weight_medium: number;
  weight_hard: number;
  cursor_position: number;
  grace_period_days: number;
  freeze_earn_interval: number;
  max_freezes: number;
}

type Db = ReturnType<typeof adminClient>;

const groupWeights = (g: GroupRow): Weights => ({
  easy: g.weight_easy,
  medium: g.weight_medium,
  hard: g.weight_hard,
});

/** Every assigned problem solved inside [start, cutoff)? Also returns the
 *  weight actually completed for display. Exported for tests. */
export function completion(
  assignment: string[],
  solves: Map<string, string>,
  start: Date,
  cutoff: Date,
  difficulty: Map<string, Difficulty>,
  weights: Weights,
): { complete: boolean; weightDone: number } {
  let complete = assignment.length > 0;
  let weightDone = 0;
  for (const pid of assignment) {
    const at = solves.get(pid);
    const solvedInWindow = at !== undefined && new Date(at) >= start && new Date(at) < cutoff;
    if (solvedInWindow) {
      weightDone += weights[difficulty.get(pid) ?? "easy"];
    } else {
      complete = false;
    }
  }
  return { complete, weightDone };
}

async function recomputeStreak(
  db: Db,
  group: GroupRow,
  groupId: string,
  userId: string,
  completedToday: boolean,
) {
  const { data: history } = await db
    .from("member_days")
    .select("date, status")
    .eq("group_id", groupId)
    .eq("user_id", userId);
  const { current, longest } = computeStreak((history ?? []) as MemberDay[]);

  const { data: member } = await db
    .from("group_members")
    .select("freezes, streak_longest")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  const freezes = completedToday
    ? freezesAfterEarn(current, member?.freezes ?? 0, group.freeze_earn_interval, group.max_freezes)
    : (member?.freezes ?? 0);

  await db
    .from("group_members")
    .update({
      streak_current: current,
      streak_longest: Math.max(longest, member?.streak_longest ?? 0),
      freezes,
    })
    .eq("group_id", groupId)
    .eq("user_id", userId);
}

export async function runSettle(now = new Date()): Promise<SettleReport> {
  const db = adminClient();
  const report: SettleReport = { settled: 0, repaired: 0, provisioned: 0, deferred: 0 };

  // ponytail: loads whole (small) tables; scope queries per-group when data grows
  const [{ data: groups }, { data: members }, { data: profiles }, { data: problems }] =
    await Promise.all([
      db.from("groups").select("*"),
      db.from("group_members").select("group_id, user_id, freezes"),
      db.from("profiles").select("id, timezone, last_synced_at, leetcode_username"),
      db.from("problems").select("id, difficulty"),
    ]);
  const groupById = new Map((groups ?? []).map((g) => [g.id, g as GroupRow]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));
  const difficulty = new Map(
    (problems ?? []).map((p) => [p.id as string, p.difficulty as Difficulty]),
  );

  const { data: assignments } = await db.from("daily_assignments").select("*");
  const assignmentByKey = new Map(
    (assignments ?? []).map((a) => [`${a.group_id}|${a.date}`, a.problem_ids as string[]]),
  );

  const solvesByUser = new Map<string, Map<string, string>>();
  const { data: solves } = await db.from("solves").select("user_id, problem_id, solved_at");
  for (const s of solves ?? []) {
    if (!solvesByUser.has(s.user_id)) solvesByUser.set(s.user_id, new Map());
    solvesByUser.get(s.user_id)!.set(s.problem_id, s.solved_at);
  }

  // -- 1. settle pending days: finished days settle immediately so streaks
  //       and stats update the moment the last problem lands; unfinished days
  //       wait for their local midnight ------------------------------------
  const { data: pendingDays } = await db
    .from("member_days")
    .select("group_id, user_id, date, catchup_deadline")
    .eq("status", "pending");

  for (const day of pendingDays ?? []) {
    const profile = profileById.get(day.user_id);
    const group = groupById.get(day.group_id);
    if (!profile || !group) continue;

    const { start, end } = dayBounds(day.date, profile.timezone);
    // leader-assigned catch-up days (backfilled pre-join dates) accept solves
    // any time until their deadline's local midnight
    const cutoff = day.catchup_deadline
      ? dayBounds(day.catchup_deadline, profile.timezone).end
      : end;
    const assignment = assignmentByKey.get(`${day.group_id}|${day.date}`) ?? [];
    const userSolves = solvesByUser.get(day.user_id) ?? new Map();
    const { complete, weightDone } = completion(
      assignment, userSolves, start, cutoff, difficulty, groupWeights(group),
    );

    if (day.catchup_deadline) {
      if (complete) {
        await db
          .from("member_days")
          .update({ status: "complete", weight_done: weightDone, settled_at: now.toISOString() })
          .eq("group_id", day.group_id)
          .eq("user_id", day.user_id)
          .eq("date", day.date);
        await recomputeStreak(db, group, day.group_id, day.user_id, true);
        report.settled++;
      } else if (isDayOver(day.catchup_deadline, now, profile.timezone)) {
        // deadline passed. Catch-up is opt-in, so a miss never burns a freeze.
        const synced =
          !profile.leetcode_username ||
          (profile.last_synced_at !== null && new Date(profile.last_synced_at) >= cutoff);
        if (!synced) {
          report.deferred++;
          continue;
        }
        await db
          .from("member_days")
          .update({ status: "missed", weight_done: weightDone, settled_at: now.toISOString() })
          .eq("group_id", day.group_id)
          .eq("user_id", day.user_id)
          .eq("date", day.date);
        await recomputeStreak(db, group, day.group_id, day.user_id, false);
        report.settled++;
      }
      continue;
    }

    if (!isDayOver(day.date, now, profile.timezone)) {
      if (!complete) continue; // still in progress; midnight decides
      // early settle: solves only move forward, so a finished day can't
      // un-finish — safe to lock in "complete" before midnight
      await db
        .from("member_days")
        .update({ status: "complete", weight_done: weightDone, settled_at: now.toISOString() })
        .eq("group_id", day.group_id)
        .eq("user_id", day.user_id)
        .eq("date", day.date);
      await recomputeStreak(db, group, day.group_id, day.user_id, true);
      report.settled++;
      continue;
    }

    // never break a streak on stale data: wait for a post-midnight sync
    const synced =
      !profile.leetcode_username ||
      (profile.last_synced_at !== null && new Date(profile.last_synced_at) >= end);
    if (!synced) {
      report.deferred++;
      continue;
    }

    const { data: member } = await db
      .from("group_members")
      .select("freezes")
      .eq("group_id", day.group_id)
      .eq("user_id", day.user_id)
      .single();
    const result = settleDay({ complete, freezes: member?.freezes ?? 0 });

    await db
      .from("member_days")
      .update({
        status: result.status,
        weight_done: weightDone,
        settled_at: now.toISOString(),
      })
      .eq("group_id", day.group_id)
      .eq("user_id", day.user_id)
      .eq("date", day.date);
    await db
      .from("group_members")
      .update({ freezes: result.freezes })
      .eq("group_id", day.group_id)
      .eq("user_id", day.user_id);
    await recomputeStreak(db, group, day.group_id, day.user_id, result.status === "complete");
    report.settled++;
  }

  // -- 2. repair missed days whose backlog got cleared in the window --------
  const { data: missedDays } = await db
    .from("member_days")
    .select("group_id, user_id, date")
    .eq("status", "missed");

  for (const day of missedDays ?? []) {
    const profile = profileById.get(day.user_id);
    const group = groupById.get(day.group_id);
    if (!profile || !group) continue;
    if (!canRepair(day.date, localDate(now, profile.timezone), group.grace_period_days)) continue;

    const { start } = dayBounds(day.date, profile.timezone);
    const repairCutoff = dayBounds(addDays(day.date, group.grace_period_days), profile.timezone).end;
    const assignment = assignmentByKey.get(`${day.group_id}|${day.date}`) ?? [];
    const userSolves = solvesByUser.get(day.user_id) ?? new Map();
    const { complete, weightDone } = completion(
      assignment, userSolves, start, repairCutoff, difficulty, groupWeights(group),
    );
    if (!complete) continue;

    await db
      .from("member_days")
      .update({ status: "repaired", weight_done: weightDone, settled_at: now.toISOString() })
      .eq("group_id", day.group_id)
      .eq("user_id", day.user_id)
      .eq("date", day.date);
    await recomputeStreak(db, group, day.group_id, day.user_id, false);
    report.repaired++;
  }

  // -- 3. provision today's assignment + member_day rows --------------------
  const { data: allDays } = await db.from("member_days").select("group_id, user_id, date");
  const dayExists = new Set((allDays ?? []).map((d) => `${d.group_id}|${d.user_id}|${d.date}`));

  for (const member of members ?? []) {
    const profile = profileById.get(member.user_id);
    const group = groupById.get(member.group_id);
    if (!profile || !group) continue;
    const today = localDate(now, profile.timezone);
    if (dayExists.has(`${member.group_id}|${member.user_id}|${today}`)) continue;

    let assignment = assignmentByKey.get(`${member.group_id}|${today}`);
    if (!assignment) {
      const { data: items } = await db
        .from("playlist_items")
        .select("problem_id, position")
        .eq("playlist_id", group.playlist_id)
        .order("position");
      const playlist = (items ?? []).map((i) => ({
        id: i.problem_id as string,
        difficulty: difficulty.get(i.problem_id) ?? ("easy" as Difficulty),
      }));
      const used = new Set<string>(
        (assignments ?? [])
          .filter((a) => a.group_id === member.group_id)
          .flatMap((a) => a.problem_ids as string[]),
      );
      const { problemIds, newCursor } = generateAssignment({
        playlist,
        cursor: group.cursor_position,
        mode: group.mode,
        weights: groupWeights(group),
        target: group.daily_target_weight,
        usedIds: used,
      });
      if (problemIds.length === 0) continue; // playlist exhausted
      const { error: aErr } = await db
        .from("daily_assignments")
        .insert({ group_id: member.group_id, date: today, problem_ids: problemIds });
      if (aErr && !aErr.message.includes("duplicate")) throw aErr;
      await db
        .from("groups")
        .update({ cursor_position: newCursor })
        .eq("id", member.group_id);
      group.cursor_position = newCursor;
      assignment = problemIds;
      assignmentByKey.set(`${member.group_id}|${today}`, problemIds);
    }

    await db.from("member_days").insert({
      group_id: member.group_id,
      user_id: member.user_id,
      date: today,
      status: "pending",
    });
    report.provisioned++;
  }

  return report;
}
