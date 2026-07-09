import { addDays } from "./dates";
import { FREEZE_EARN_INTERVAL, MAX_FREEZES, type DayStatus } from "./types";

export interface SettleInput {
  complete: boolean;
  freezes: number;
}

export interface SettleResult {
  status: "complete" | "frozen" | "missed";
  freezes: number;
}

/** Decide a day's fate at the user's local midnight. Freeze earning happens
 *  via computeStreak's earnedFreezes, applied by the caller. */
export function settleDay({ complete, freezes }: SettleInput): SettleResult {
  if (complete) return { status: "complete", freezes };
  if (freezes > 0) return { status: "frozen", freezes: freezes - 1 };
  return { status: "missed", freezes: 0 };
}

export interface MemberDay {
  date: string; // YYYY-MM-DD
  status: DayStatus;
}

export interface StreakResult {
  current: number;
  longest: number;
}

/** Completing a day that lands the streak on a multiple of 7 earns a freeze.
 *  Event-based (not derived from history) so spent freezes stay spent. */
export function freezesAfterEarn(streak: number, freezes: number): number {
  if (streak > 0 && streak % FREEZE_EARN_INTERVAL === 0) {
    return Math.min(freezes + 1, MAX_FREEZES);
  }
  return freezes;
}

const GOOD: ReadonlySet<DayStatus> = new Set(["complete", "frozen", "repaired"]);

const nextDate = (date: string) => addDays(date, 1);

/** Streaks derive entirely from member_days history: consecutive calendar
 *  dates with a good status. Gaps and misses break the run. */
export function computeStreak(days: MemberDay[]): StreakResult {
  const settled = days
    .filter((d) => d.status !== "pending")
    .sort((a, b) => a.date.localeCompare(b.date));

  let current = 0;
  let longest = 0;
  let prevDate: string | null = null;

  for (const day of settled) {
    if (!GOOD.has(day.status)) {
      current = 0;
    } else if (prevDate !== null && day.date === nextDate(prevDate)) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prevDate = day.date;
  }

  return { current, longest };
}
