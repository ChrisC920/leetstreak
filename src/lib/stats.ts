import { addDays } from "@/lib/core/dates";
import type { DayStatus } from "@/lib/core/types";

export const GOOD_STATUSES: DayStatus[] = ["complete", "repaired", "frozen"];

/** Columns of dates (weeks × weekdays) ending on `today`. */
export function weekGrid(today: string, weeks: number): string[][] {
  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(today, -(weeks * 7 - 1) - todayDow);
  return Array.from({ length: weeks + 1 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)).filter(
      (date) => date <= today,
    ),
  ).filter((col) => col.length > 0);
}

export interface OutcomeCounts {
  complete: number;
  repaired: number;
  frozen: number;
  missed: number;
  settled: number;
}

/** Settled-day counts by status (pending excluded). */
export function outcomeCounts(statuses: Iterable<DayStatus>): OutcomeCounts {
  const c: OutcomeCounts = { complete: 0, repaired: 0, frozen: 0, missed: 0, settled: 0 };
  for (const s of statuses) {
    if (s === "pending") continue;
    c[s]++;
    c.settled++;
  }
  return c;
}

/** Good-days-per-week, oldest → newest, over `weeks` weeks ending today. */
export function weeklyTrend(
  byDate: Map<string, DayStatus>,
  today: string,
  weeks: number,
): { label: string; good: number }[] {
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(today, -((weeks - 1 - i) * 7 + 6));
    let good = 0;
    for (let d = 0; d < 7; d++) {
      const status = byDate.get(addDays(start, d));
      if (status && GOOD_STATUSES.includes(status)) good++;
    }
    return { label: start, good };
  });
}
