import type { DayStatus } from "@/lib/core/types";

// Done days (complete/repaired) use an emerald intensity ramp keyed on solve
// weight, matching the LeetCode heatmap's ramp convention (light→dark,
// lightness-monotonic on both themes). Frozen/missed stay categorical; cells
// carry title tooltips and pages render a legend — never color alone.
const EMERALD_RAMP = ["#a7f3d0", "#34d399", "#059669", "#065f46"];

const STATUS_COLOR: Record<string, string> = {
  frozen: "#3b82f6",
  missed: "#f43f5e",
};

function doneColor(weight: number | undefined, maxWeight: number): string {
  if (weight == null || maxWeight <= 0) return EMERALD_RAMP[2];
  const t = weight / maxWeight;
  return EMERALD_RAMP[Math.min(3, Math.floor(t * 4))];
}

export interface DayCell {
  date: string;
  status?: DayStatus;
  /** Solve weight completed that day; drives orange intensity for done days. */
  weight?: number;
}

export function DayCellSquare({
  date,
  status,
  weight,
  maxWeight = 0,
}: DayCell & { maxWeight?: number }) {
  const done = status === "complete" || status === "repaired";
  const color = done ? doneColor(weight, maxWeight) : status ? STATUS_COLOR[status] : undefined;
  return (
    <div
      title={`${date}: ${status ?? "—"}${done && weight ? ` · ${weight}w` : ""}`}
      className="size-3 rounded-[2px] bg-muted"
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/** Single row of day squares, oldest → newest. */
export function DayStrip({ cells, maxWeight = 0 }: { cells: DayCell[]; maxWeight?: number }) {
  return (
    <div className="flex gap-[2px]">
      {cells.map((c) => (
        <DayCellSquare key={c.date} {...c} maxWeight={maxWeight} />
      ))}
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        done · less
        {EMERALD_RAMP.map((c) => (
          <span key={c} className="size-3 rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
        more
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-[2px]" style={{ backgroundColor: STATUS_COLOR.frozen }} />
        frozen
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-[2px]" style={{ backgroundColor: STATUS_COLOR.missed }} />
        missed
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-[2px] bg-muted" />
        no data
      </span>
    </div>
  );
}
