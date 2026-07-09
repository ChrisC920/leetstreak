import type { DayStatus } from "@/lib/core/types";

// status palette validated with dataviz validator (light + dark surfaces);
// cells carry title tooltips and pages render a legend — never color alone
const STATUS_COLOR: Record<string, string> = {
  complete: "#16a34a",
  repaired: "#16a34a",
  frozen: "#0284c7",
  missed: "#ef4444",
};

export interface DayCell {
  date: string;
  status?: DayStatus;
}

export function DayCellSquare({ date, status }: DayCell) {
  const color = status ? STATUS_COLOR[status] : undefined;
  return (
    <div
      title={`${date}: ${status ?? "—"}`}
      className="size-3 rounded-[2px] bg-muted"
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/** Single row of day squares, oldest → newest. */
export function DayStrip({ cells }: { cells: DayCell[] }) {
  return (
    <div className="flex gap-[2px]">
      {cells.map((c) => (
        <DayCellSquare key={c.date} {...c} />
      ))}
    </div>
  );
}

export function HeatmapLegend() {
  const items: [string, string | undefined][] = [
    ["complete", STATUS_COLOR.complete],
    ["frozen", STATUS_COLOR.frozen],
    ["missed", STATUS_COLOR.missed],
    ["no data", undefined],
  ];
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1">
          <span
            className="size-3 rounded-[2px] bg-muted"
            style={color ? { backgroundColor: color } : undefined}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
