"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markSolved, syncNow } from "./actions";

export function SyncButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => syncNow())}>
      {pending ? "Syncing…" : "Sync now"}
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
