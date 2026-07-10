import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

/** Accent chips keyed to the chart palette so KPI colors match the charts. */
const ACCENTS = {
  emerald: "bg-chart-1/15 text-chart-1",
  blue: "bg-chart-2/15 text-chart-2",
  violet: "bg-chart-3/15 text-chart-3",
  amber: "bg-chart-4/15 text-chart-4",
} as const;

export type KpiAccent = keyof typeof ACCENTS;

export function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  accent = "emerald",
  delta,
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: LucideIcon;
  accent?: KpiAccent;
  /** Optional small badge, e.g. "+3 this week" */
  delta?: string;
  className?: string;
}) {
  return (
    <Card className={cn("transition-transform duration-200 hover:-translate-y-0.5", className)}>
      <CardContent className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              ACCENTS[accent],
            )}
          >
            <Icon className="size-4.5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
            {typeof value === "number" ? <NumberTicker value={value} /> : value}
            {suffix && (
              <span className="text-base font-normal text-muted-foreground">{suffix}</span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        </div>
        {delta && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {delta}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
