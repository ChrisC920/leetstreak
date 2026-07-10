"use client";

import { Flame } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GridPattern } from "@/components/ui/grid-pattern";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-8">
      <GridPattern
        width={48}
        height={48}
        className="absolute inset-0 -z-10 stroke-border/60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
      />

      <BlurFade>
        <p className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <Flame className="flame-pulse size-4.5 text-primary" aria-hidden />
          </span>
          leet<span className="-ml-1 text-primary">streak</span>
        </p>
      </BlurFade>

      <BlurFade delay={0.1} className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">Set up your profile</CardTitle>
            <CardDescription>
              Link your LeetCode account so solves are tracked automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Display name</Label>
                <Input id="username" name="username" required placeholder="chris" />
                <p className="text-xs text-muted-foreground">
                  What your groups see on the leaderboard.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="leetcode_username">LeetCode username</Label>
                <Input
                  id="leetcode_username"
                  name="leetcode_username"
                  placeholder="your LeetCode handle (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Optional — without it you&apos;ll mark solves manually.
                </p>
              </div>
              <input type="hidden" name="timezone" value={timezone} />
              <p className="text-xs text-muted-foreground">
                Your day ends at midnight in <span className="font-medium">{timezone}</span>.
              </p>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Saving…" : "Start grinding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </BlurFade>
    </main>
  );
}
