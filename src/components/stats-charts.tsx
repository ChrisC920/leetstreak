// Small server-rendered chart primitives for the stats pages. No chart lib;
// bars are divs, identity lives in text labels (never color alone).

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";

export interface StatTile {
  label: string;
  value: string | number;
  /** Rendered after the value, e.g. "%" */
  suffix?: string;
  icon?: LucideIcon;
  /** Color classes for the icon, e.g. "text-orange-500" */
  iconClassName?: string;
}

/** Dashboard-style stat cards: icon chip, big animated number, muted label. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map(({ label, value, suffix, icon: Icon, iconClassName }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3">
            {Icon && (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className={`size-4.5 ${iconClassName ?? "text-primary"}`} aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {typeof value === "number" ? <NumberTicker value={value} /> : value}
                {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Proportional stacked bar of settled-day outcomes + legend with counts. */
export function OutcomeRow({
  counts,
}: {
  counts: { complete: number; repaired: number; frozen: number; missed: number };
}) {
  const segments = [
    ["complete", counts.complete, "#16a34a"],
    ["repaired", counts.repaired, "#4ade80"],
    ["frozen", counts.frozen, "#0284c7"],
    ["missed", counts.missed, "#ef4444"],
  ] as const;
  const total = segments.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          segments.map(
            ([label, count, color]) =>
              count > 0 && (
                <div
                  key={label}
                  title={`${count} ${label}`}
                  style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
                />
              ),
          )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {segments.map(([label, count, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono tabular-nums">{count}</span>
            <span className="text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bar: label left, track middle, value right. Single series. */
export function HBar({
  label,
  value,
  max,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-muted-foreground">{label}</span>
      <Progress value={pct} className="h-2 flex-1" />
      <span className="w-24 shrink-0 text-right font-mono tabular-nums">
        {value.toLocaleString()}
        {detail && <span className="text-xs text-muted-foreground"> {detail}</span>}
      </span>
    </div>
  );
}

/** Column bars for good-days-per-week (0–7) on muted tracks, oldest → newest. */
export function WeeklyTrendBars({ weeks }: { weeks: { label: string; good: number }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-24 items-end gap-1.5">
        {weeks.map((w) => (
          <div
            key={w.label}
            title={`week of ${w.label}: ${w.good}/7 good days`}
            className="relative flex-1 self-stretch overflow-hidden rounded-sm bg-muted"
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-sm bg-primary"
              style={{ height: `${Math.max((w.good / 7) * 100, w.good > 0 ? 6 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{weeks[0]?.label}</span>
        <span>{weeks[weeks.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// sequential green ramp, light→dark (lightness-monotonic); zero uses the muted
// track like the streak heatmap. Cells carry title tooltips + a legend below.
const INTENSITY = ["#bbf7d0", "#4ade80", "#16a34a", "#14532d"];

function intensityColor(count: number, max: number): string | undefined {
  if (count <= 0) return undefined;
  const t = max > 0 ? count / max : 0;
  return INTENSITY[Math.min(3, Math.floor(t * 4))];
}

export function IntensitySquare({
  date,
  count,
  max,
}: {
  date: string;
  count: number;
  max: number;
}) {
  const color = intensityColor(count, max);
  return (
    <div
      title={`${date}: ${count} submission${count === 1 ? "" : "s"}`}
      className="size-3 rounded-[2px] bg-muted"
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

export function IntensityLegend() {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      less
      <span className="size-3 rounded-[2px] bg-muted" />
      {INTENSITY.map((c) => (
        <span key={c} className="size-3 rounded-[2px]" style={{ backgroundColor: c }} />
      ))}
      more
    </div>
  );
}
