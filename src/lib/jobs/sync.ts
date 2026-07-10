import { recentAcceptedSubmissions } from "@/lib/leetcode";
import { adminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof adminClient>;

export interface SyncReport {
  users: number;
  newSolves: number;
  errors: string[];
}

interface SolveRow {
  problem_id: string;
  solved_at: string;
  source: string;
}

/**
 * Record solves, moving solved_at FORWARD on re-solves but never backward.
 * LeetCode's recent-submission list replays old submissions on every sync, so
 * a plain overwrite would clobber a newer solve (or manual mark) with a stale
 * timestamp, and ignore-duplicates would pin solved_at to the first-ever solve
 * so an assigned problem the user solved long ago could never count for today.
 */
export async function recordSolves(db: Db, userId: string, rows: SolveRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data: existing, error: readError } = await db
    .from("solves")
    .select("problem_id, solved_at")
    .eq("user_id", userId)
    .in("problem_id", rows.map((r) => r.problem_id));
  if (readError) throw readError;
  const currentAt = new Map((existing ?? []).map((e) => [e.problem_id, e.solved_at]));
  const fresh = rows.filter((r) => {
    const cur = currentAt.get(r.problem_id);
    return cur === undefined || new Date(r.solved_at) > new Date(cur);
  });
  if (fresh.length > 0) {
    const { error } = await db.from("solves").upsert(
      fresh.map((r) => ({ user_id: userId, ...r })),
      { onConflict: "user_id,problem_id" },
    );
    if (error) throw error;
  }
  return fresh.length;
}

/** Poll one user's public LeetCode profile and record matching solves. */
export async function syncUser(
  db: Db,
  userId: string,
  leetcodeUsername: string,
  idBySlug: Map<string, string>,
): Promise<number> {
  const subs = await recentAcceptedSubmissions(leetcodeUsername);
  const rows = subs
    .filter((s) => idBySlug.has(s.titleSlug))
    .map((s) => ({
      problem_id: idBySlug.get(s.titleSlug)!,
      solved_at: new Date(s.timestamp * 1000).toISOString(),
      source: "sync",
    }));
  const count = await recordSolves(db, userId, rows);
  await db
    .from("profiles")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", userId);
  return count;
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
      report.newSolves += await syncUser(db, profile.id, profile.leetcode_username!, idBySlug);
      report.users++;
    } catch (e) {
      report.errors.push(`${profile.leetcode_username}: ${(e as Error).message}`);
    }
  }
  return report;
}
