"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/** Radial progress ring. `value` is 0–100. */
export function StatRing({
  value,
  label,
  sublabel,
  size = 140,
  className,
}: {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <ChartContainer
        config={{ value: { label, color: "var(--chart-1)" } }}
        className="absolute inset-0 aspect-square"
      >
        <RadialBarChart
          data={[{ name: label, value: pct, fill: "var(--chart-1)" }]}
          innerRadius="78%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={size} />
        </RadialBarChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-semibold tabular-nums">{pct}%</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
