import { BookOpen, Flame, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { ShineBorder } from "@/components/ui/shine-border";
import { serverClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

const FEATURES = [
  {
    icon: Flame,
    title: "Streaks",
    text: "Miss a day, lose your streak.",
  },
  {
    icon: Users,
    title: "Groups",
    text: "Compete with friends on a shared leaderboard.",
  },
  {
    icon: BookOpen,
    title: "NeetCode 150",
    text: "Curated daily problems, assigned automatically.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 overflow-hidden p-6 sm:p-8">
      <FlickeringGrid
        className="absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_50%_35%,black,transparent)]"
        color="rgb(249, 115, 22)"
        maxOpacity={0.22}
        squareSize={4}
        gridGap={6}
      />

      <BlurFade delay={0}>
        <div className="flex flex-col items-center gap-4 text-center">
          <AnimatedGradientText
            colorFrom="#f97316"
            colorTo="#ef4444"
            className="rounded-full border px-4 py-1 text-sm font-medium"
          >
            🔥 Grind together
          </AnimatedGradientText>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            leet<span className="streak-gradient">streak</span>
          </h1>
          <p className="max-w-md text-balance text-muted-foreground">
            Daily LeetCode with your friends. Grind the NeetCode 150 together —
            miss a day, lose your streak.
          </p>
        </div>
      </BlurFade>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <BlurFade key={f.title} delay={0.15 + i * 0.1}>
            <div className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card/60 p-5 text-center backdrop-blur-sm">
              <f.icon className="size-6 text-primary" aria-hidden />
              <p className="font-semibold">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          </BlurFade>
        ))}
      </div>

      <BlurFade delay={0.45} className="w-full max-w-sm">
        <div className="relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-xl border bg-card p-6">
          <ShineBorder shineColor={["#f97316", "#f59e0b"]} />
          {error === "auth" && (
            <p className="text-center text-sm text-destructive">
              That sign-in link didn&apos;t work — it may have expired or been opened in a
              different browser than the one you requested it from. Request a fresh one below.
            </p>
          )}
          <LoginForm />
        </div>
      </BlurFade>
    </main>
  );
}
