"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canRepair, localDate } from "@/lib/core/dates";
import { computeStreak, type MemberDay } from "@/lib/core/streak";
import { recordSolves, syncUser } from "@/lib/jobs/sync";
import { adminClient } from "@/lib/supabase/admin";
import { serverClient } from "@/lib/supabase/server";

async function currentUserId(): Promise<string> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user.id;
}

/** Poll LeetCode for the signed-in user right now. */
export async function syncNow() {
  const userId = await currentUserId();
  const db = adminClient();

  const { data: profile } = await db
    .from("profiles")
    .select("leetcode_username")
    .eq("id", userId)
    .single();
  if (!profile?.leetcode_username) return;

  const { data: problems } = await db.from("problems").select("id, slug");
  const idBySlug = new Map((problems ?? []).map((p) => [p.slug, p.id]));
  await syncUser(db, userId, profile.leetcode_username, idBySlug);
  revalidatePath("/dashboard");
}

/** Spend a banked freeze to cover a missed day inside its grace window.
 *  Settle spends freezes automatically at midnight; this handles freezes
 *  earned or granted after the miss. */
export async function spendFreeze(groupId: string, date: string): Promise<{ error?: string }> {
  const userId = await currentUserId();
  // member_days/group_members writes need the admin client (RLS blocks them);
  // safe because every row below is scoped to the authenticated userId.
  const db = adminClient();

  const [{ data: member }, { data: group }, { data: day }, { data: profile }] = await Promise.all([
    db
      .from("group_members")
      .select("freezes, streak_longest")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("groups").select("grace_period_days").eq("id", groupId).maybeSingle(),
    db
      .from("member_days")
      .select("status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle(),
    db.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
  ]);
  if (!member || !group || !day || !profile) return { error: "Not found" };
  if (member.freezes <= 0) return { error: "No freezes banked" };
  if (day.status !== "missed") return { error: "Only missed days can be frozen" };
  if (!canRepair(date, localDate(new Date(), profile.timezone), group.grace_period_days)) {
    return { error: "Grace period has ended" };
  }

  const { error: dayError } = await db
    .from("member_days")
    .update({ status: "frozen", settled_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("date", date);
  if (dayError) return { error: dayError.message };

  const { data: history } = await db
    .from("member_days")
    .select("date, status")
    .eq("group_id", groupId)
    .eq("user_id", userId);
  const { current, longest } = computeStreak((history ?? []) as MemberDay[]);
  const { error: memberError } = await db
    .from("group_members")
    .update({
      freezes: member.freezes - 1,
      streak_current: current,
      streak_longest: Math.max(longest, member.streak_longest ?? 0),
    })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (memberError) return { error: memberError.message };

  revalidatePath("/dashboard");
  return {};
}

/** Manual check-off fallback for problems the sync can't see. */
export async function markSolved(problemId: string) {
  const userId = await currentUserId();
  const db = adminClient();
  await recordSolves(db, userId, [
    { problem_id: problemId, solved_at: new Date().toISOString(), source: "manual" },
  ]);
  revalidatePath("/dashboard");
}
