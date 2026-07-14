"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, localDate } from "@/lib/core/dates";
import { runSettle } from "@/lib/jobs/settle";
import { adminClient } from "@/lib/supabase/admin";
import { authedUserId, serverClient } from "@/lib/supabase/server";

export interface GroupFormState {
  error?: string;
}

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const supabase = await serverClient();
  const me = await authedUserId(supabase);
  if (!me) redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Group name too short" };

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      leader_id: me,
      playlist_id: String(formData.get("playlist_id")),
      mode: String(formData.get("mode")) === "random" ? "random" : "ordered",
      daily_target_weight: Number(formData.get("daily_target_weight") || 3),
      weight_easy: Number(formData.get("weight_easy") || 1),
      weight_medium: Number(formData.get("weight_medium") || 2),
      weight_hard: Number(formData.get("weight_hard") || 4),
      grace_period_days: Number(formData.get("grace_period_days") ?? 3),
      freeze_earn_interval: Number(formData.get("freeze_earn_interval") || 7),
      max_freezes: Number(formData.get("max_freezes") ?? 2),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: me });
  if (memberError) return { error: memberError.message };

  await runSettle(); // provision today's assignment immediately
  redirect(`/groups/${group.id}`);
}

export async function joinGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const supabase = await serverClient();
  const code = String(formData.get("code") ?? "").trim();
  const { data: groupId, error } = await supabase.rpc("join_group", { code });
  if (error) {
    return {
      error: /invalid invite/.test(error.message) ? "Invalid invite code" : error.message,
    };
  }
  await runSettle();
  redirect(`/groups/${groupId}`);
}

export async function updateGroup(
  groupId: string,
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const supabase = await serverClient();
  // RLS: only the leader's update passes
  const { error } = await supabase
    .from("groups")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      mode: String(formData.get("mode")) === "random" ? "random" : "ordered",
      daily_target_weight: Number(formData.get("daily_target_weight") || 3),
      weight_easy: Number(formData.get("weight_easy") || 1),
      weight_medium: Number(formData.get("weight_medium") || 2),
      weight_hard: Number(formData.get("weight_hard") || 4),
      grace_period_days: Number(formData.get("grace_period_days") ?? 3),
      freeze_earn_interval: Number(formData.get("freeze_earn_interval") || 7),
      max_freezes: Number(formData.get("max_freezes") ?? 2),
    })
    .eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function leaveGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await serverClient();
  const me = await authedUserId(supabase);
  if (!me) return { error: "Not signed in" };

  const { data: group } = await supabase
    .from("groups")
    .select("leader_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { error: "Group not found" };

  if (group.leader_id === me) {
    // leader leaves: hand the group to the longest-standing member, or delete
    // it when they're the last one. RLS blocks this path, so it runs on the
    // admin client after the explicit leader check above.
    const admin = adminClient();
    const { data: heir } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .neq("user_id", me)
      .order("joined_at")
      .limit(1)
      .maybeSingle();
    if (heir) {
      const { error } = await admin
        .from("groups")
        .update({ leader_id: heir.user_id })
        .eq("id", groupId);
      if (error) return { error: error.message };
      const { error: delError } = await admin
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", me);
      if (delError) return { error: delError.message };
    } else {
      const { error } = await admin.from("groups").delete().eq("id", groupId);
      if (error) return { error: error.message };
    }
  } else {
    // RLS: only own non-leader membership rows are deletable
    const { error, count } = await supabase
      .from("group_members")
      .delete({ count: "exact" })
      .eq("group_id", groupId)
      .eq("user_id", me);
    if (error) return { error: error.message };
    if (!count) return { error: "Couldn't leave this group" };
  }
  revalidatePath("/", "layout"); // purge cached pages still linking the left/deleted group
  redirect("/groups");
}

export async function assignCatchup(
  groupId: string,
  userId: string,
  date: string,
): Promise<{ error?: string }> {
  const supabase = await serverClient();
  const me = await authedUserId(supabase);
  if (!me) return { error: "Not signed in" };

  const { data: group } = await supabase
    .from("groups")
    .select("leader_id, grace_period_days")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.leader_id !== me) {
    return { error: "Only the leader can assign catch-up days" };
  }

  // member_days RLS is read-only for users; writes go through the admin
  // client after the explicit leader check above.
  const admin = adminClient();
  const [{ data: assignment }, { data: existing }, { data: profile }, { data: membership }] =
    await Promise.all([
      admin
        .from("daily_assignments")
        .select("date")
        .eq("group_id", groupId)
        .eq("date", date)
        .maybeSingle(),
      admin
        .from("member_days")
        .select("date")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle(),
      admin.from("profiles").select("timezone").eq("id", userId).single(),
      admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
  if (!assignment) return { error: "No group assignment exists for that day" };
  if (existing) return { error: "That day is already on this member's record" };
  if (!profile || !membership) return { error: "Member not found" };

  const deadline = addDays(localDate(new Date(), profile.timezone), group.grace_period_days);
  const { error } = await admin.from("member_days").insert({
    group_id: groupId,
    user_id: userId,
    date,
    status: "pending",
    catchup_deadline: deadline,
  });
  if (error) return { error: error.message };

  await runSettle(); // settle immediately in case the problems are already solved
  revalidatePath(`/groups/${groupId}/member/${userId}`);
  return {};
}

export async function grantFreeze(
  groupId: string,
  userId: string,
): Promise<{ error?: string }> {
  const supabase = await serverClient();
  const me = await authedUserId(supabase);
  if (!me) return { error: "Not signed in" };

  const { data: group } = await supabase
    .from("groups")
    .select("leader_id, max_freezes")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.leader_id !== me) return { error: "Only the leader can grant freezes" };

  // group_members RLS only lets users touch their own row; leader grants go
  // through the admin client after the explicit leader check above.
  const admin = adminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("freezes")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!member) return { error: "Member not found" };
  if (member.freezes >= group.max_freezes) return { error: "Member is already at max freezes" };

  const { error } = await admin
    .from("group_members")
    .update({ freezes: member.freezes + 1 })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return {};
}
