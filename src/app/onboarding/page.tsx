"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding, type OnboardingState } from "./actions";

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <p className="text-2xl font-bold tracking-tight">
        leet<span className="text-primary">streak</span>
      </p>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up your profile</CardTitle>
          <CardDescription>
            Link your LeetCode account so solves are tracked automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Display name</Label>
              <Input id="username" name="username" required placeholder="chris" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="leetcode_username">LeetCode username</Label>
              <Input
                id="leetcode_username"
                name="leetcode_username"
                placeholder="your LeetCode handle (optional)"
              />
            </div>
            <input type="hidden" name="timezone" value={timezone} />
            <p className="text-xs text-muted-foreground">
              Your day ends at midnight in <span className="font-medium">{timezone}</span>.
            </p>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Start grinding"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
