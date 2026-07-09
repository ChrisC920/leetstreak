import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { REPAIR_WINDOW_DAYS } from "./types";

/** Calendar date (YYYY-MM-DD) for a UTC instant in the given IANA timezone. */
export function localDate(utcNow: Date, timezone: string): string {
  return formatInTimeZone(utcNow, timezone, "yyyy-MM-dd");
}

/** True once the user's local calendar has moved past `date`. */
export function isDayOver(date: string, utcNow: Date, timezone: string): boolean {
  return localDate(utcNow, timezone) > date;
}

/** YYYY-MM-DD plus n days. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** UTC instants bounding a local calendar day (DST-correct). */
export function dayBounds(date: string, timezone: string): { start: Date; end: Date } {
  return {
    start: fromZonedTime(`${date}T00:00:00`, timezone),
    end: fromZonedTime(`${addDays(date, 1)}T00:00:00`, timezone),
  };
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
