import { BookOpen, Flame, Users } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { GridPattern } from "@/components/ui/grid-pattern";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-12 overflow-hidden px-6 py-16 sm:px-8">
      <GridPattern
        width={48}
        height={48}
        className="absolute inset-0 -z-10 stroke-border/60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
      />

      <BlurFade delay={0}>
        <div className="flex flex-col items-center gap-5 text-center">
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-sm font-normal text-muted-foreground">
            <Flame className="size-3.5 text-primary" aria-hidden />
            Grind together
          </Badge>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            leet<span className="text-primary">streak</span>
          </h1>
          <p className="max-w-md text-balance text-lg text-muted-foreground">
            Daily LeetCode with your friends. Grind the NeetCode 150 together —
            miss a day, lose your streak.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.15} className="w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border shadow-2xl">
          <Image
            src="/hero.webp"
            alt="LeetStreak dashboard illustration: glowing streak flame over a contribution heatmap"
            width={1344}
            height={752}
            priority
            className="w-full"
          />
        </div>
      </BlurFade>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <BlurFade key={f.title} delay={0.25 + i * 0.08}>
            <div className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center">
              <f.icon className="size-5 text-primary" aria-hidden />
              <p className="font-medium">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          </BlurFade>
        ))}
      </div>

      <BlurFade delay={0.5} className="w-full max-w-sm">
        <div className="flex w-full flex-col items-center gap-4 rounded-xl border bg-card p-6">
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
