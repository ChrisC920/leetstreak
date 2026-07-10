// LeetCode's unofficial public GraphQL API. Reads public profile data only.
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

export interface AcSubmission {
  titleSlug: string;
  /** Unix seconds. */
  timestamp: number;
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  revalidate?: number,
): Promise<T> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // LeetCode blocks requests without a browser-ish UA
      "User-Agent": "Mozilla/5.0 (compatible; leetstreak/1.0)",
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables }),
    ...(revalidate !== undefined && { next: { revalidate } }),
  });
  if (!res.ok) throw new Error(`LeetCode API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

/** Most recent accepted submissions for a public profile (max ~20). */
export async function recentAcceptedSubmissions(
  username: string,
  limit = 20,
): Promise<AcSubmission[]> {
  const data = await gql<{
    recentAcSubmissionList: { titleSlug: string; timestamp: string }[] | null;
  }>(
    `query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        titleSlug
        timestamp
      }
    }`,
    { username, limit },
  );
  return (data.recentAcSubmissionList ?? []).map((s) => ({
    titleSlug: s.titleSlug,
    timestamp: Number(s.timestamp),
  }));
}

export interface SolvedBreakdown {
  all: number;
  easy: number;
  medium: number;
  hard: number;
}

/**
 * Lifetime accepted-problem counts for a public profile.
 * Throws when the profile is unknown/private (module convention).
 * `revalidate` (seconds) caches the underlying fetch via Next's data cache.
 */
export async function leetcodeSolvedBreakdown(
  username: string,
  revalidate?: number,
): Promise<SolvedBreakdown> {
  const data = await gql<{
    matchedUser: {
      submitStatsGlobal: { acSubmissionNum: { difficulty: string; count: number }[] };
    } | null;
  }>(
    `query userSolvedBreakdown($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
    }`,
    { username },
    revalidate,
  );
  if (!data.matchedUser) throw new Error(`LeetCode user not found: ${username}`);
  const counts = new Map(
    data.matchedUser.submitStatsGlobal.acSubmissionNum.map((e) => [e.difficulty, e.count]),
  );
  return {
    all: counts.get("All") ?? 0,
    easy: counts.get("Easy") ?? 0,
    medium: counts.get("Medium") ?? 0,
    hard: counts.get("Hard") ?? 0,
  };
}

/** Does this LeetCode username exist (public profile reachable)? */
export async function leetcodeUserExists(username: string): Promise<boolean> {
  try {
    const data = await gql<{ matchedUser: { username: string } | null }>(
      `query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
          username
        }
      }`,
      { username },
    );
    return data.matchedUser !== null;
  } catch (e) {
    // API reports unknown users as a GraphQL error, not a null match
    if (e instanceof Error && /does not exist/i.test(e.message)) return false;
    throw e;
  }
}
