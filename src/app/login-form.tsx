"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = browserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-muted-foreground">
        Check your email — we sent you a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={sendLink} className="flex w-full max-w-sm gap-2">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Sign in"}
      </Button>
      {state === "error" && (
        <p className="text-sm text-destructive">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
