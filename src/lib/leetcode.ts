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
  /** Total problems that exist on LeetCode per difficulty. */
  totals: { all: number; easy: number; medium: number; hard: number };
  /** "Beats X%" per difficulty; absent when LeetCode has no data yet. */
  beats: { easy?: number; medium?: number; hard?: number };
}

/**
 * Lifetime accepted-problem counts for a public profile, plus site-wide
 * problem totals and beats-percentages.
 * Throws when the profile is unknown/private (module convention).
 * `revalidate` (seconds) caches the underlying fetch via Next's data cache.
 */
export async function leetcodeSolvedBreakdown(
  username: string,
  revalidate?: number,
): Promise<SolvedBreakdown> {
  const data = await gql<{
    allQuestionsCount: { difficulty: string; count: number }[];
    matchedUser: {
      submitStatsGlobal: { acSubmissionNum: { difficulty: string; count: number }[] };
      problemsSolvedBeatsStats: { difficulty: string; percentage: number | null }[];
    } | null;
  }>(
    `query userSolvedBreakdown($username: String!) {
      allQuestionsCount { difficulty count }
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
        problemsSolvedBeatsStats { difficulty percentage }
      }
    }`,
    { username },
    revalidate,
  );
  if (!data.matchedUser) throw new Error(`LeetCode user not found: ${username}`);
  const counts = new Map(
    data.matchedUser.submitStatsGlobal.acSubmissionNum.map((e) => [e.difficulty, e.count]),
  );
  const totals = new Map(data.allQuestionsCount.map((e) => [e.difficulty, e.count]));
  const beats = new Map(
    data.matchedUser.problemsSolvedBeatsStats
      .filter((e) => e.percentage != null)
      .map((e) => [e.difficulty, e.percentage as number]),
  );
  return {
    all: counts.get("All") ?? 0,
    easy: counts.get("Easy") ?? 0,
    medium: counts.get("Medium") ?? 0,
    hard: counts.get("Hard") ?? 0,
    totals: {
      all: totals.get("All") ?? 0,
      easy: totals.get("Easy") ?? 0,
      medium: totals.get("Medium") ?? 0,
      hard: totals.get("Hard") ?? 0,
    },
    beats: {
      easy: beats.get("Easy"),
      medium: beats.get("Medium"),
      hard: beats.get("Hard"),
    },
  };
}

/**
 * Daily accepted-submission counts for the trailing year, keyed by
 * YYYY-MM-DD (UTC — LeetCode buckets calendar days in UTC).
 */
export async function leetcodeSubmissionCalendar(
  username: string,
  revalidate?: number,
): Promise<Map<string, number>> {
  const data = await gql<{
    matchedUser: { userCalendar: { submissionCalendar: string } | null } | null;
  }>(
    `query userCalendar($username: String!) {
      matchedUser(username: $username) {
        userCalendar { submissionCalendar }
      }
    }`,
    { username },
    revalidate,
  );
  const raw = data.matchedUser?.userCalendar?.submissionCalendar;
  if (!raw) throw new Error(`LeetCode calendar unavailable for ${username}`);
  const parsed = JSON.parse(raw) as Record<string, number>;
  const byDate = new Map<string, number>();
  for (const [unixSeconds, count] of Object.entries(parsed)) {
    const date = new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + count);
  }
  return byDate;
}

export interface TagCount {
  tagName: string;
  problemsSolved: number;
}

/** Solved-problem counts per topic tag, all skill levels merged, descending. */
export async function leetcodeTagStats(
  username: string,
  revalidate?: number,
): Promise<TagCount[]> {
  const data = await gql<{
    matchedUser: {
      tagProblemCounts: {
        advanced: TagCount[];
        intermediate: TagCount[];
        fundamental: TagCount[];
      };
    } | null;
  }>(
    `query skillStats($username: String!) {
      matchedUser(username: $username) {
        tagProblemCounts {
          advanced { tagName problemsSolved }
          intermediate { tagName problemsSolved }
          fundamental { tagName problemsSolved }
        }
      }
    }`,
    { username },
    revalidate,
  );
  if (!data.matchedUser) throw new Error(`LeetCode user not found: ${username}`);
  const { advanced, intermediate, fundamental } = data.matchedUser.tagProblemCounts;
  return [...advanced, ...intermediate, ...fundamental]
    .filter((t) => t.problemsSolved > 0)
    .sort((a, b) => b.problemsSolved - a.problemsSolved);
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
