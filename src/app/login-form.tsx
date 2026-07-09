"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true);
    const supabase = browserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) setPending(false);
  }

  return (
    <Button onClick={signInWithGoogle} disabled={pending} size="lg">
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
