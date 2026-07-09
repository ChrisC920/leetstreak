import { recentAcceptedSubmissions } from "@/lib/leetcode";
import { adminClient } from "@/lib/supabase/admin";

export interface SyncReport {
  users: number;
  newSolves: number;
  errors: string[];
}

/** Poll every linked user's public LeetCode profile and record new accepted
 *  submissions that match catalog problems. */
export async function runSync(): Promise<SyncReport> {
  const db = adminClient();
  const report: SyncReport = { users: 0, newSolves: 0, errors: [] };

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, leetcode_username")
    .not("leetcode_username", "is", null);
  if (error) throw error;

  const { data: problems } = await db.from("problems").select("id, slug");
  const idBySlug = new Map((problems ?? []).map((p) => [p.slug, p.id]));

  // ponytail: sequential polling; batch/queue if user count outgrows a cron slot
  for (const profile of profiles ?? []) {
    try {
      const subs = await recentAcceptedSubmissions(profile.leetcode_username!);
      const rows = subs
        .filter((s) => idBySlug.has(s.titleSlug))
        .map((s) => ({
          user_id: profile.id,
          problem_id: idBySlug.get(s.titleSlug)!,
          solved_at: new Date(s.timestamp * 1000).toISOString(),
          source: "sync",
        }));
      if (rows.length > 0) {
        const { count, error: upsertError } = await db
          .from("solves")
          .upsert(rows, {
            onConflict: "user_id,problem_id",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (upsertError) throw upsertError;
        report.newSolves += count ?? 0;
      }
      await db
        .from("profiles")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", profile.id);
      report.users++;
    } catch (e) {
      report.errors.push(`${profile.leetcode_username}: ${(e as Error).message}`);
    }
  }
  return report;
}
