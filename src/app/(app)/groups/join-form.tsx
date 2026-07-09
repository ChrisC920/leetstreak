"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinGroup, type GroupFormState } from "./actions";

export function JoinForm() {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(joinGroup, {});
  return (
    <form action={formAction} className="flex items-start gap-2">
      <div className="flex flex-col gap-1">
        <Input name="code" required placeholder="invite code" className="font-mono" />
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Joining…" : "Join"}
      </Button>
    </form>
  );
}
