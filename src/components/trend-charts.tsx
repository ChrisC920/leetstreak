"use client";

// Interactive recharts pieces, fed serialized props from page RSCs.

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/** Good-days-per-week (0–7) columns, oldest → newest. */
export function WeeklyTrendChart({ weeks }: { weeks: { label: string; good: number }[] }) {
  return (
    <ChartContainer
      config={{ good: { label: "Good days", color: "var(--chart-1)" } }}
      className="h-40 w-full"
    >
      <BarChart data={weeks} margin={{ left: 0, right: 0, top: 4 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          interval="preserveStartEnd"
          fontSize={10}
        />
        <YAxis domain={[0, 7]} hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="good" fill="var(--color-good)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}

/** Area trend with gradient fill, e.g. solves per day/week. */
export function AreaTrendChart({
  data,
  dataKey = "value",
  label,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  label: string;
}) {
  return (
    <ChartContainer
      config={{ [dataKey]: { label, color: "var(--chart-1)" } }}
      className="h-56 w-full"
    >
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 4 }}>
        <defs>
          <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.35} />
            <stop offset="95%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          interval="preserveStartEnd"
          fontSize={10}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          fill={`url(#fill-${dataKey})`}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/** Per-difficulty (or any categorical) horizontal-ish bar chart. */
export function CategoryBarChart({
  data,
}: {
  data: { label: string; value: number; fill: string }[];
}) {
  return (
    <ChartContainer
      config={{ value: { label: "Solved" } }}
      className="h-40 w-full"
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={70}
          fontSize={12}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" radius={6} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  );
}
