"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recentAcceptedSubmissions } from "@/lib/leetcode";
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

  const subs = await recentAcceptedSubmissions(profile.leetcode_username);
  const { data: problems } = await db.from("problems").select("id, slug");
  const idBySlug = new Map((problems ?? []).map((p) => [p.slug, p.id]));
  const rows = subs
    .filter((s) => idBySlug.has(s.titleSlug))
    .map((s) => ({
      user_id: userId,
      problem_id: idBySlug.get(s.titleSlug)!,
      solved_at: new Date(s.timestamp * 1000).toISOString(),
      source: "sync",
    }));
  if (rows.length > 0) {
    await db.from("solves").upsert(rows, {
      onConflict: "user_id,problem_id",
      ignoreDuplicates: true,
    });
  }
  await db
    .from("profiles")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath("/dashboard");
}

/** Manual check-off fallback for problems the sync can't see. */
export async function markSolved(problemId: string) {
  const userId = await currentUserId();
  const db = adminClient();
  await db.from("solves").upsert(
    {
      user_id: userId,
      problem_id: problemId,
      solved_at: new Date().toISOString(),
      source: "manual",
    },
    { onConflict: "user_id,problem_id", ignoreDuplicates: true },
  );
  revalidatePath("/dashboard");
}
