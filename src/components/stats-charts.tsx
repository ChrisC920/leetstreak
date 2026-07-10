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

/** Colored swatch row of settled-day outcome counts (status palette). */
export function OutcomeRow({
  counts,
}: {
  counts: { complete: number; repaired: number; frozen: number; missed: number };
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {(
        [
          ["complete", counts.complete, "#16a34a"],
          ["repaired", counts.repaired, "#16a34a"],
          ["frozen", counts.frozen, "#0284c7"],
          ["missed", counts.missed, "#ef4444"],
        ] as const
      ).map(([label, count, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px]" style={{ backgroundColor: color }} />
          {count} {label}
        </span>
      ))}
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

/** Column bars for good-days-per-week (0–7), oldest → newest. */
export function WeeklyTrendBars({ weeks }: { weeks: { label: string; good: number }[] }) {
  return (
    <div className="flex h-24 items-end gap-1">
      {weeks.map((w) => (
        <div
          key={w.label}
          title={`week of ${w.label}: ${w.good}/7 good days`}
          className="flex flex-1 flex-col justify-end self-stretch"
        >
          <div
            className="w-full rounded-t-[3px] bg-primary"
            style={{ height: `${Math.max((w.good / 7) * 100, w.good > 0 ? 4 : 2)}%` }}
          />
        </div>
      ))}
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
