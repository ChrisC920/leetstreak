import { HBar, IntensityLegend, IntensitySquare, StatTiles } from "@/components/stats-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  leetcodeSolvedBreakdown,
  leetcodeSubmissionCalendar,
  leetcodeTagStats,
} from "@/lib/leetcode";
import { weekGrid } from "@/lib/stats";

const TOP_TAGS = 10;

/**
 * Full live-LeetCode stats section (tiles, difficulty bars, submission
 * calendar, top topics). Server component; every fetch degrades
 * independently so a LeetCode outage never breaks the page.
 */
export async function LeetCodeStats({
  username,
  missingHint,
}: {
  username: string | null;
  missingHint: string;
}) {
  if (!username) {
    return <p className="text-sm text-muted-foreground">{missingHint}</p>;
  }

  const [breakdown, calendar, tags] = await Promise.all([
    leetcodeSolvedBreakdown(username, 600).catch(() => null),
    leetcodeSubmissionCalendar(username, 3600).catch(() => null),
    leetcodeTagStats(username, 3600).catch(() => null),
  ]);

  if (!breakdown && !calendar && !tags) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach LeetCode right now — live stats will be back shortly.
      </p>
    );
  }

  // LeetCode buckets calendar days in UTC
  const utcToday = new Date().toISOString().slice(0, 10);
  const calendarWeeks = calendar ? weekGrid(utcToday, 52) : [];
  const calendarMax = calendar ? Math.max(0, ...calendar.values()) : 0;
  const topTags = (tags ?? []).slice(0, TOP_TAGS);
  const maxTag = topTags[0]?.problemsSolved ?? 0;

  return (
    <>
      {breakdown && (
        <>
          <StatTiles
            tiles={[
              ["Total solved", breakdown.all],
              ["Easy", breakdown.easy],
              ["Medium", breakdown.medium],
              ["Hard", breakdown.hard],
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solved by difficulty</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(
                [
                  ["Easy", breakdown.easy, breakdown.totals.easy, breakdown.beats.easy],
                  ["Medium", breakdown.medium, breakdown.totals.medium, breakdown.beats.medium],
                  ["Hard", breakdown.hard, breakdown.totals.hard, breakdown.beats.hard],
                ] as const
              ).map(([label, solved, total, beats]) => (
                <HBar
                  key={label}
                  label={beats != null ? `${label} · beats ${beats.toFixed(1)}%` : label}
                  value={solved}
                  max={total}
                  detail={`/ ${total}`}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {calendar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission activity (past year)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="overflow-x-auto">
              <div className="flex gap-[2px]">
                {calendarWeeks.map((col, i) => (
                  <div key={i} className="flex flex-col gap-[2px]">
                    {col.map((date) => (
                      <IntensitySquare
                        key={date}
                        date={date}
                        count={calendar.get(date) ?? 0}
                        max={calendarMax}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <IntensityLegend />
          </CardContent>
        </Card>
      )}

      {topTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top topics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {topTags.map((t) => (
              <HBar key={t.tagName} label={t.tagName} value={t.problemsSolved} max={maxTag} />
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
