"use client";

import { RefreshCw, Snowflake } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markSolved, syncNow, spendFreeze } from "./actions";

export function SyncButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => syncNow())}>
      <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden />
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}

export function UseFreezeButton({
  groupId,
  date,
  label,
}: {
  groupId: string;
  date: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await spendFreeze(groupId, date);
        })
      }
    >
      <Snowflake className="size-3.5 text-chart-2" aria-hidden />
      {pending ? "Freezing…" : `Freeze ${label}`}
    </Button>
  );
}

export function MarkSolvedButton({ problemId }: { problemId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(() => markSolved(problemId))}
    >
      {pending ? "…" : "Mark done"}
    </Button>
  );
}
