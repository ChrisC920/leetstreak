"use client";

import { Flame, Snowflake, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";

export function StreakHero({
  streak,
  freezes,
  completionPct,
}: {
  streak: number;
  freezes: number;
  completionPct: number;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_20%_0%,--alpha(var(--color-primary)/10%),transparent)]"
      />
      <CardContent className="relative grid grid-cols-3 gap-4">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <Flame className="flame-pulse size-8 text-orange-500 sm:size-10" aria-hidden />
            {/* NumberTicker renders 0 for value 0, fine */}
            <NumberTicker
              value={streak}
              className="text-primary font-mono text-4xl font-bold tabular-nums sm:text-5xl"
            />
          </div>
          <p className="text-sm text-muted-foreground">day streak</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-center">
          <div className="flex h-10 items-center gap-2 sm:h-12">
            <Snowflake className="size-5 text-sky-400" aria-hidden />
            <NumberTicker
              value={freezes}
              className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl"
            />
          </div>
          <p className="text-sm text-muted-foreground sm:text-center">freezes banked</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex h-10 items-center gap-1 sm:h-12">
            <Target className="size-5 text-primary" aria-hidden />
            <span className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
              <NumberTicker value={completionPct} />%
            </span>
          </div>
          <p className="text-sm text-muted-foreground sm:text-right">of today done</p>
        </div>
      </CardContent>
    </Card>
  );
}
