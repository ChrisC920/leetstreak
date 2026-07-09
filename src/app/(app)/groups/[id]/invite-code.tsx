"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-sm">{code}</code>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied!" : "Copy invite link"}
      </Button>
    </div>
  );
}
