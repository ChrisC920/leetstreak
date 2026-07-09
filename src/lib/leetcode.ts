// LeetCode's unofficial public GraphQL API. Reads public profile data only.
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

export interface AcSubmission {
  titleSlug: string;
  /** Unix seconds. */
  timestamp: number;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // LeetCode blocks requests without a browser-ish UA
      "User-Agent": "Mozilla/5.0 (compatible; leetstreak/1.0)",
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables }),
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
