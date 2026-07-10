"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function remaining(target: number): string {
  const ms = Math.max(0, target - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Live countdown to a timestamp (e.g. tonight's settlement), minute precision. */
export function Countdown({
  target,
  label = "until settlement",
  className,
}: {
  /** ISO timestamp */
  target: string;
  label?: string;
  className?: string;
}) {
  const ts = new Date(target).getTime();
  // null until mounted to avoid SSR/client clock mismatch
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setText(remaining(ts));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [ts]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums",
        className,
      )}
    >
      <Clock className="size-3.5" aria-hidden />
      {text ?? "—"} {label}
    </span>
  );
}
