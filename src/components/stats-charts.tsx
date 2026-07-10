// Small server-rendered chart primitives for the stats page. No chart lib;
// bars are divs, identity lives in text labels (never color alone).

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
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right tabular-nums">
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
