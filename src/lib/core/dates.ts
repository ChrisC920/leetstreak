import { formatInTimeZone } from "date-fns-tz";
import { REPAIR_WINDOW_DAYS } from "./types";

/** Calendar date (YYYY-MM-DD) for a UTC instant in the given IANA timezone. */
export function localDate(utcNow: Date, timezone: string): string {
  return formatInTimeZone(utcNow, timezone, "yyyy-MM-dd");
}

/** True once the user's local calendar has moved past `date`. */
export function isDayOver(date: string, utcNow: Date, timezone: string): boolean {
  return localDate(utcNow, timezone) > date;
}

/** Whole days between two YYYY-MM-DD dates. */
function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
  );
}

/** Backlog from `missedDate` can still repair the streak on `today`. */
export function canRepair(missedDate: string, today: string): boolean {
  const d = daysBetween(missedDate, today);
  return d >= 0 && d <= REPAIR_WINDOW_DAYS;
}
