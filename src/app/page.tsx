import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Flame,
  RefreshCw,
  Shield,
  Snowflake,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { KpiCard } from "@/components/kpi-card";
import { DayStrip, type DayCell } from "@/components/day-heatmap";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent } from "@/components/ui/card";
import { GridPattern } from "@/components/ui/grid-pattern";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { authedUserId, serverClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

const FEATURES = [
  {
    icon: Flame,
    title: "Streaks that bite",
    text: "Miss a day, lose your streak. Real stakes keep the habit alive.",
  },
  {
    icon: Users,
    title: "Groups",
    text: "A shared leaderboard with friends — everyone sees who showed up today.",
  },
  {
    icon: BookOpen,
    title: "NeetCode 150",
    text: "Curated problems assigned automatically every morning.",
  },
  {
    icon: Snowflake,
    title: "Streak freezes",
    text: "Earn freezes for consistency and spend them on the days life happens.",
  },
  {
    icon: Shield,
    title: "Grace periods",
    text: "Missed yesterday? Repair it before the grace window closes.",
  },
  {
    icon: RefreshCw,
    title: "Automatic sync",
    text: "Link your LeetCode handle — solves are tracked without lifting a finger.",
  },
];

const STEPS = [
  {
    icon: Users,
    title: "Create a group",
    text: "Pick a playlist, set the daily target, and share one invite link.",
  },
  {
    icon: CalendarCheck,
    title: "Solve daily",
    text: "Everyone gets the same problems each morning. Solve them on LeetCode.",
  },
  {
    icon: Trophy,
    title: "Keep the streak",
    text: "Nightly settlement scores the day. The leaderboard remembers.",
  },
];

const QUOTES = [
  {
    name: "Priya",
    role: "SWE intern",
    quote: "The group leaderboard is the only reason I've done a problem every day this month.",
  },
  {
    name: "Marcus",
    role: "New grad",
    quote: "Freezes make it forgiving enough to stick with. Lost my streak once — never again.",
  },
  {
    name: "Dana",
    role: "Bootcamp grad",
    quote: "We roast whoever shows up on the missing list. It works.",
  },
];

const FAQS = [
  {
    q: "Do I need a LeetCode account?",
    a: "Yes — problems link straight to LeetCode. Linking your handle enables automatic solve tracking; without it you can mark problems done manually.",
  },
  {
    q: "What happens if I miss a day?",
    a: "A banked streak freeze is spent automatically if you have one. Otherwise the day is missed — you can still repair it during the group's grace period by solving the assigned problems.",
  },
  {
    q: "When does a day end?",
    a: "At midnight in your own timezone. Settlement runs nightly and scores everyone fairly wherever they live.",
  },
  {
    q: "Is it free?",
    a: "Yes. Bring friends.",
  },
];

// mock 28-day strip for the product preview
const PREVIEW_CELLS: DayCell[] = Array.from({ length: 28 }, (_, i) => {
  const date = `preview-${i}`;
  if (i === 9) return { date, status: "frozen" };
  if (i === 17) return { date, status: "missed" };
  return { date, status: "complete", weight: (i % 4) + 1 };
});

const PREVIEW_ROWS = [
  { name: "priya", streak: 41, done: true },
  { name: "chris", streak: 38, done: true },
  { name: "marcus", streak: 29, done: false },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await serverClient();
  if (await authedUserId(supabase)) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden">
      <GridPattern
        width={48}
        height={48}
        className="absolute inset-x-0 top-0 -z-10 h-[80vh] stroke-border/60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
      />

      {/* Hero */}
      <section className="flex w-full max-w-5xl flex-col items-center gap-8 px-6 pt-24 pb-16 text-center sm:px-8">
        <BlurFade>
          <div className="flex flex-col items-center gap-5">
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full px-3 py-1 text-sm font-normal text-muted-foreground"
            >
              <Flame className="flame-pulse size-3.5 text-primary" aria-hidden />
              Grind together
            </Badge>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
              Daily LeetCode with{" "}
              <AnimatedGradientText colorFrom="#34d399" colorTo="#3b82f6">
                your friends
              </AnimatedGradientText>
            </h1>
            <p className="max-w-md text-lg text-balance text-muted-foreground">
              Grind the NeetCode 150 together — miss a day, lose your streak.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.1}>
          <div className="flex flex-col items-center gap-3">
            {error === "auth" && (
              <p className="max-w-sm text-center text-sm text-destructive">
                That sign-in link didn&apos;t work — it may have expired or been opened in a
                different browser than the one you requested it from. Request a fresh one below.
              </p>
            )}
            <LoginForm />
            <p className="text-xs text-muted-foreground">Free. No credit card. Just grind.</p>
          </div>
        </BlurFade>

        {/* Product preview composed from the real dashboard components */}
        <BlurFade delay={0.2} className="w-full">
          <div className="rounded-2xl border bg-card/60 p-4 text-left shadow-2xl backdrop-blur sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Current streak" value={38} icon={Flame} accent="amber" />
              <KpiCard label="Freezes banked" value={2} icon={Snowflake} accent="blue" />
              <KpiCard label="Today complete" value={100} suffix="%" icon={Target} accent="emerald" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Last 28 days</p>
                  <DayStrip cells={PREVIEW_CELLS} maxWeight={4} />
                  <p className="text-xs text-muted-foreground">
                    One frozen day, one repaired — streak intact.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-2.5">
                  <p className="text-sm font-medium">grind squad</p>
                  {PREVIEW_ROWS.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-2 text-sm">
                      <span
                        className={`w-4 font-mono font-semibold ${
                          ["text-chart-1", "text-chart-2", "text-chart-3"][i]
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary uppercase">
                          {r.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-auto flex items-center gap-1 font-mono tabular-nums">
                        <Flame className="size-3.5 text-amber-500" aria-hidden />
                        {r.streak}
                      </span>
                      <span
                        className={`size-2 rounded-full ${
                          r.done ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                        title={r.done ? "done today" : "not done"}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* Stats band */}
      <section className="w-full border-y bg-card/40">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-6 py-10 text-center">
          {(
            [
              [150, "curated problems"],
              [365, "days a year to grind"],
              [1, "streak you can't afford to lose"],
            ] as const
          ).map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-mono text-3xl font-semibold tabular-nums text-primary sm:text-4xl">
                <NumberTicker value={n} />
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl px-6 py-16 sm:px-8">
        <BlurFade>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Built to keep you showing up
          </h2>
        </BlurFade>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <BlurFade key={f.title} delay={0.05 * i} className="h-full">
              <MagicCard className="h-full rounded-xl border">
                <div className="flex h-full flex-col gap-2.5 p-5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="size-4.5 text-primary" aria-hidden />
                  </div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full border-y bg-card/40">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <BlurFade key={s.title} delay={0.05 * i}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
                    <s.icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <p className="font-medium">
                    <span className="mr-1.5 font-mono text-sm text-muted-foreground">
                      {i + 1}.
                    </span>
                    {s.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full max-w-5xl px-6 py-16 sm:px-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Peer pressure, weaponized
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {QUOTES.map((t) => (
            <Card key={t.name}>
              <CardContent className="flex h-full flex-col gap-4">
                <p className="text-sm">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-auto flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary uppercase">
                      {t.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full max-w-2xl px-6 pb-16 sm:px-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-8 flex flex-col gap-2">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border bg-card px-4 py-3 open:pb-4"
            >
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full border-t bg-card/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Your streak starts <span className="text-primary">today</span>.
          </h2>
          <LoginForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="flex w-full items-center justify-between border-t px-6 py-6 text-xs text-muted-foreground sm:px-10">
        <span className="flex items-center gap-1.5">
          <Flame className="size-3.5 text-primary" aria-hidden />
          leetstreak
        </span>
        <span className="flex items-center gap-1.5">
          <BarChart3 className="size-3.5" aria-hidden />
          Not affiliated with LeetCode.
        </span>
      </footer>
    </main>
  );
}
