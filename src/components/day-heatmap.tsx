"use client";

import type { DayStatus } from "@/lib/core/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Done days (complete/repaired) use an emerald intensity ramp keyed on solve
// weight, matching the LeetCode heatmap's ramp convention (light→dark,
// lightness-monotonic on both themes). Frozen/missed stay categorical; cells
// carry rich tooltips and pages render a legend — never color alone.
const EMERALD_RAMP = ["#a7f3d0", "#34d399", "#059669", "#065f46"];

const STATUS_COLOR: Record<string, string> = {
  frozen: "#3b82f6",
  missed: "#f43f5e",
};

const STATUS_LABEL: Record<string, string> = {
  complete: "Completed",
  repaired: "Repaired",
  frozen: "Frozen",
  missed: "Missed",
  pending: "Pending",
};

function doneColor(weight: number | undefined, maxWeight: number): string {
  if (weight == null || maxWeight <= 0) return EMERALD_RAMP[2];
  const t = weight / maxWeight;
  return EMERALD_RAMP[Math.min(3, Math.floor(t * 4))];
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Shared heatmap cell: colored square with a hover ring and a styled tooltip
 * (headline + muted date) instead of the browser's native title popup.
 */
export function HeatCell({
  date,
  color,
  headline,
}: {
  date: string;
  color?: string;
  headline: string;
}) {
  return (
    // ponytail: provider-per-cell (delay lives on Provider in Base UI); hoist
    // one provider per grid if hover-move grouping ever matters
    <TooltipProvider delay={100} closeDelay={0}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className="block size-3 rounded-[2px] bg-muted outline-none transition-shadow hover:ring-1 hover:ring-foreground/50 hover:ring-offset-1 hover:ring-offset-background"
              style={color ? { backgroundColor: color } : undefined}
            />
          }
        />
        <TooltipContent className="flex-col items-start gap-0 px-2.5 py-1.5">
          <span className="font-medium">{headline}</span>
          <span className="text-background/70">{formatDay(date)}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface DayCell {
  date: string;
  status?: DayStatus;
  /** Solve weight completed that day; drives emerald intensity for done days. */
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
  const headline = status
    ? `${STATUS_LABEL[status] ?? status}${done && weight ? ` · ${weight} pt${weight === 1 ? "" : "s"}` : ""}`
    : "No activity";
  return <HeatCell date={date} color={color} headline={headline} />;
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
