"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runSettle } from "@/lib/jobs/settle";
import { serverClient } from "@/lib/supabase/server";

export interface GroupFormState {
  error?: string;
}

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Group name too short" };

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      leader_id: user.id,
      playlist_id: String(formData.get("playlist_id")),
      mode: String(formData.get("mode")) === "random" ? "random" : "ordered",
      daily_target_weight: Number(formData.get("daily_target_weight") || 3),
      weight_easy: Number(formData.get("weight_easy") || 1),
      weight_medium: Number(formData.get("weight_medium") || 2),
      weight_hard: Number(formData.get("weight_hard") || 4),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });
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
