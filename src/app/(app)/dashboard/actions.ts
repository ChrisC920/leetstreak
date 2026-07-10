"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** Manual check-off fallback for problems the sync can't see. */
export async function markSolved(problemId: string) {
  const userId = await currentUserId();
  const db = adminClient();
  await recordSolves(db, userId, [
    { problem_id: problemId, solved_at: new Date().toISOString(), source: "manual" },
  ]);
  revalidatePath("/dashboard");
}
