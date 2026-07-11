// Shared streak-stats sections rendered by BOTH the own-stats page
// (src/app/(app)/stats) and the group-member page
// (src/app/(app)/groups/[id]/member/[uid]). Any change to these sections must
// live here so the two pages never drift apart — don't inline copies in pages.

import { Flame, Snowflake, Target, Trophy } from "lucide-react";
import { DayCellSquare, HeatmapLegend } from "@/components/day-heatmap";
import { KpiCard } from "@/components/kpi-card";
import { SectionCard } from "@/components/section-card";
import { StatRing } from "@/components/stat-ring";
import { OutcomeRow } from "@/components/stats-charts";
import { WeeklyTrendChart } from "@/components/trend-charts";
import type { DayStatus } from "@/lib/core/types";
import { type OutcomeCounts, weekGrid, weeklyTrend } from "@/lib/stats";

const WEEKS = 52; // past year, matches the LeetCode calendar; grid scrolls on small screens
const TREND_WEEKS = 12;

/** Current/longest streak, completion rate, freezes. */
export function StreakKpiRow({
  streakCurrent,
  streakLongest,
  completionPct,
  freezes,
}: {
  streakCurrent: number;
  streakLongest: number;
  completionPct: number | null;
  freezes: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Current streak" value={streakCurrent} icon={Flame} accent="amber" />
      <KpiCard label="Longest streak" value={streakLongest} icon={Trophy} accent="violet" />
      <KpiCard
        label="Completion rate"
        value={completionPct ?? "—"}
        suffix={completionPct !== null ? "%" : undefined}
        icon={Target}
        accent="emerald"
      />
      <KpiCard label="Freezes banked" value={freezes} icon={Snowflake} accent="blue" />
    </div>
  );
}

/** Past-year day heatmap with legend. */
export function StreakHeatmapCard({
  today,
  statusByDate,
  weightByDate,
  maxDayWeight,
}: {
  today: string;
  statusByDate: Map<string, DayStatus>;
  weightByDate: Map<string, number>;
  maxDayWeight: number;
}) {
  return (
    <SectionCard title="Past year">
      <div className="overflow-x-auto">
        <div className="flex gap-[2px]">
          {weekGrid(today, WEEKS).map((col, i) => (
            <div key={i} className="flex flex-col gap-[2px]">
              {col.map((date) => (
                <DayCellSquare
                  key={date}
                  date={date}
                  status={statusByDate.get(date)}
                  weight={weightByDate.get(date)}
                  maxWeight={maxDayWeight}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <HeatmapLegend />
    </SectionCard>
  );
}

/** Side-by-side weekly-consistency chart and day-outcome breakdown. */
export function ConsistencyOutcomeCards({
  today,
  statusByDate,
  outcome,
  completionPct,
}: {
  today: string;
  statusByDate: Map<string, DayStatus>;
  outcome: OutcomeCounts;
  completionPct: number | null;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <SectionCard title="Weekly consistency">
        <WeeklyTrendChart weeks={weeklyTrend(statusByDate, today, TREND_WEEKS)} />
        <p className="text-xs text-muted-foreground">
          Good days per week (complete, repaired, or frozen) over the last {TREND_WEEKS} weeks,
          oldest to newest.
        </p>
      </SectionCard>

      {outcome.settled > 0 && (
        <SectionCard title="Day outcomes">
          <div className="flex items-center gap-6">
            <StatRing
              value={completionPct ?? 0}
              label="Completion"
              sublabel="good days"
              size={120}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <OutcomeRow counts={outcome} />
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
