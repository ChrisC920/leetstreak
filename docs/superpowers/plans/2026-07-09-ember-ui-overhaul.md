# Ember UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin and restructure the whole LeetStreak UI per `docs/superpowers/specs/2026-07-09-ui-overhaul-design.md` — dark-first "Ember" theme, hero landing, tabbed stats/group pages, MagicUI animations — without touching data queries, server actions, or business logic.

**Architecture:** Presentation-layer only. New theme tokens in `globals.css`, `next-themes` provider in root layout (dark default), a client nav component in the app shell, MagicUI components vendored via the shadcn CLI into `src/components/magicui/`, and per-page JSX rewrites that keep every existing query/action line intact.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, shadcn base-nova style (`@base-ui/react` primitives — components use `render={...}` NOT `asChild`), MagicUI (`motion` dep), next-themes, canvas-confetti.

## Global Constraints

- **Do not modify** any Supabase query, server action, `lib/` file, or route handler. JSX/classNames/component-structure changes only. (Exception: root layout metadata title.)
- This repo's Next.js has breaking changes vs training data — consult `node_modules/next/dist/docs/` if any API looks off.
- shadcn components must be added with the project CLI (`npx shadcn add <name>`) so they come out in base-nova/base-ui form; never hand-write a Radix-style component.
- All motion respects `prefers-reduced-motion` (MagicUI components already do via `motion`; CSS animations must be wrapped in `@media (prefers-reduced-motion: no-preference)`).
- Difficulty colors stay green/yellow/red. Streak gradient (`from-orange-500 via-amber-500 to-red-500` family) reserved for streak UI only.
- Existing copy (error messages, empty states, hints) preserved verbatim unless the spec says otherwise.
- Verify each task with `npm run build` (fast fail) before committing.

---

### Task 1: Install components + deps

**Files:**
- Create: `src/components/ui/{tabs,dropdown-menu,tooltip,skeleton}.tsx` (CLI-generated)
- Create: `src/components/magicui/{number-ticker,flickering-grid,shine-border,blur-fade,animated-gradient-text,confetti}.tsx` (CLI-generated)
- Modify: `package.json` (CLI adds `motion`, `canvas-confetti`)

**Interfaces:**
- Produces: `<Tabs>/<TabsList>/<TabsTrigger>/<TabsContent>`, `<DropdownMenu*>`, `<Skeleton>`, `<NumberTicker value={n}>`, `<FlickeringGrid>`, `<ShineBorder>`, `<BlurFade delay={n}>`, `<AnimatedGradientText>`, `confetti()` from `@/components/magicui/confetti`.

- [ ] **Step 1:** `npx shadcn add tabs dropdown-menu tooltip skeleton`
- [ ] **Step 2:** `npx shadcn add "https://magicui.design/r/number-ticker" "https://magicui.design/r/flickering-grid" "https://magicui.design/r/shine-border" "https://magicui.design/r/blur-fade" "https://magicui.design/r/animated-gradient-text" "https://magicui.design/r/confetti"`
- [ ] **Step 3:** Inspect generated magicui files; if any import path or React API mismatches this Next/React version, fix minimally. Confirm base-ui style for shadcn files (no `@radix-ui` imports).
- [ ] **Step 4:** `npm run build` → passes.
- [ ] **Step 5:** Commit `feat: add shadcn + magicui components for ember overhaul`.

### Task 2: Ember theme tokens + dark default

**Files:**
- Modify: `src/app/globals.css` (`:root` and `.dark` token blocks only)
- Modify: `src/app/layout.tsx` (ThemeProvider, metadata)
- Create: `src/components/theme-provider.tsx`

**Interfaces:**
- Produces: dark-by-default theming via `next-themes` class strategy; `--primary` = ember orange in both modes.

- [ ] **Step 1:** Create `src/components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider(props: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
```

- [ ] **Step 2:** In `src/app/layout.tsx`: set `metadata` to `{ title: "LeetStreak", description: "Daily LeetCode with your friends — miss a day, lose your streak." }`; add `suppressHydrationWarning` to `<html>`; wrap `{children}` in `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>`.
- [ ] **Step 3:** Replace token values in `globals.css`. Light (`:root`) — warm off-white; Dark (`.dark`) — warm charcoal. Both use ember primary:

```css
:root {
  --background: oklch(0.985 0.004 80);
  --foreground: oklch(0.17 0.01 50);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.17 0.01 50);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.17 0.01 50);
  --primary: oklch(0.68 0.19 42);
  --primary-foreground: oklch(0.985 0.01 80);
  --secondary: oklch(0.955 0.008 70);
  --secondary-foreground: oklch(0.25 0.02 50);
  --muted: oklch(0.955 0.008 70);
  --muted-foreground: oklch(0.5 0.02 55);
  --accent: oklch(0.94 0.03 60);
  --accent-foreground: oklch(0.3 0.06 45);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.91 0.01 70);
  --input: oklch(0.91 0.01 70);
  --ring: oklch(0.68 0.19 42);
  --chart-1: oklch(0.68 0.19 42);
  --chart-2: oklch(0.78 0.16 70);
  --chart-3: oklch(0.6 0.2 30);
  --chart-4: oklch(0.85 0.1 85);
  --chart-5: oklch(0.45 0.12 35);
  --radius: 0.625rem;
  /* sidebar tokens: mirror background/foreground/primary values */
}

.dark {
  --background: oklch(0.155 0.008 50);
  --foreground: oklch(0.96 0.005 80);
  --card: oklch(0.205 0.01 55);
  --card-foreground: oklch(0.96 0.005 80);
  --popover: oklch(0.205 0.01 55);
  --popover-foreground: oklch(0.96 0.005 80);
  --primary: oklch(0.72 0.18 45);
  --primary-foreground: oklch(0.16 0.02 45);
  --secondary: oklch(0.26 0.012 55);
  --secondary-foreground: oklch(0.96 0.005 80);
  --muted: oklch(0.26 0.012 55);
  --muted-foreground: oklch(0.72 0.015 65);
  --accent: oklch(0.3 0.03 50);
  --accent-foreground: oklch(0.96 0.01 70);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0.01 60 / 10%);
  --input: oklch(1 0.01 60 / 15%);
  --ring: oklch(0.72 0.18 45);
  --chart-1: oklch(0.72 0.18 45);
  --chart-2: oklch(0.8 0.15 70);
  --chart-3: oklch(0.62 0.2 30);
  --chart-4: oklch(0.87 0.09 85);
  --chart-5: oklch(0.5 0.13 35);
  /* sidebar tokens: mirror card/foreground/primary values */
}
```

Also add at end of `globals.css`:

```css
@media (prefers-reduced-motion: no-preference) {
  .flame-pulse {
    animation: flame-pulse 2.4s ease-in-out infinite;
  }
  @keyframes flame-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.08); opacity: 0.85; }
  }
}
.streak-gradient {
  @apply bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 bg-clip-text text-transparent;
}
```

- [ ] **Step 4:** `npm run build`; `npm run dev` + eyeball dashboard renders dark.
- [ ] **Step 5:** Commit `feat: ember theme tokens, dark-first default`.

### Task 3: App shell — nav, theme toggle, avatar menu

**Files:**
- Create: `src/components/app-nav.tsx` (client: active links)
- Create: `src/components/theme-toggle.tsx` (client)
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `DropdownMenu*` from Task 1.
- Produces: `<AppNav />` (no props), `<ThemeToggle />` (no props). Layout keeps `signOut` server action, passes it to a form inside the dropdown via `<form action={signOut}>`.

- [ ] **Step 1:** `src/components/app-nav.tsx` — `"use client"`; `usePathname()`; links `[{href:"/dashboard",label:"Today"},{href:"/groups",label:"Groups"},{href:"/stats",label:"Stats"}]`; active = `pathname.startsWith(href)`; active style: `text-foreground` + absolute bottom `-mb-px h-0.5 bg-primary` underline bar; inactive: `text-muted-foreground hover:text-foreground transition-colors`.
- [ ] **Step 2:** `src/components/theme-toggle.tsx` — `"use client"`; `useTheme()`; ghost icon Button toggling dark/light with `Sun`/`Moon` lucide icons; mounted-guard to avoid hydration mismatch.
- [ ] **Step 3:** Rewrite `(app)/layout.tsx` render: `<header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">`; inside `max-w-5xl` row: logo (`leet` + `<span className="streak-gradient">streak</span>` + `Flame` icon `text-orange-500 flame-pulse`), `<AppNav />`; right side `<ThemeToggle />` + `DropdownMenu` (trigger: `Avatar` with username initial) containing username label + sign-out form item. Main: `mx-auto w-full max-w-5xl p-4 sm:p-6`.
- [ ] **Step 4:** Build + browser check: active link indicator, toggle works, sign-out works.
- [ ] **Step 5:** Commit `feat: sticky blurred app shell with active nav + avatar menu`.

### Task 4: Landing hero

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/login-form.tsx` (styling only if needed)

**Interfaces:**
- Consumes: `FlickeringGrid`, `AnimatedGradientText`, `ShineBorder`, `BlurFade` (Task 1).

- [ ] **Step 1:** Rewrite `page.tsx` render (keep redirect + searchParams logic lines 1–15 verbatim): full-height `main` with absolute `<FlickeringGrid className="absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" color="rgb(249 115 22)" maxOpacity={0.25} />`; centered column: `AnimatedGradientText` pill ("🔥 Grind together"), `h1` `text-5xl sm:text-6xl font-bold tracking-tight` with `streak-gradient` on "streak"; subline; 3 feature mini-cards (`BlurFade` staggered `delay={0.1*i}`): Streaks 🔥 "Miss a day, lose your streak", Groups 👥 "Compete with friends on a shared leaderboard", NeetCode 150 📚 "Curated daily problems"; then login card: `relative overflow-hidden rounded-xl border bg-card p-6` wrapped with `<ShineBorder shineColor={["#f97316","#f59e0b"]} />` inside, containing existing `{error && ...}` message and `<LoginForm />`.
- [ ] **Step 2:** Build + browser: logged-out view in both themes, error param renders.
- [ ] **Step 3:** Commit `feat: ember hero landing page`.

### Task 5: Dashboard — streak hero, restyled cards, confetti

**Files:**
- Create: `src/components/streak-hero.tsx` (server-safe wrapper w/ NumberTicker client parts)
- Create: `src/components/day-complete-confetti.tsx` (client)
- Modify: `src/app/(app)/dashboard/page.tsx` (JSX only; all data code lines untouched)

**Interfaces:**
- Produces: `<StreakHero streak={number} freezes={number} completionPct={number} />`; `<DayCompleteConfetti fired={boolean} dayKey={string} />` — fires canvas-confetti once per `dayKey` when `fired` true (localStorage guard `confetti-<dayKey>`).
- Consumes dashboard's already-computed values: `memberships`, per-group `weightDone/weightTotal/allDone`.

- [ ] **Step 1:** `streak-hero.tsx` — client component; grid of 3 blocks: big flame `Flame className="size-10 text-orange-500 flame-pulse"` + `<NumberTicker value={streak} className="text-5xl font-bold font-mono streak-gradient" />` labeled "day streak"; `🧊 <NumberTicker value={freezes} />` "freezes banked"; `<NumberTicker value={completionPct} />%` "today". Wrap in `rounded-xl border bg-card p-6` with faint ember radial glow (`bg-[radial-gradient(...)]` behind streak number).
- [ ] **Step 2:** `day-complete-confetti.tsx` — `"use client"`; `useEffect`: if `fired && !localStorage.getItem key` → `confetti({...ember colors})`, set key. Render null.
- [ ] **Step 3:** Dashboard page: compute (pure derivation, allowed) top-level `streakNow = Math.max(0, ...memberships.map(m=>m.streak_current))`, `freezes` likewise, overall completion % from summed weights; render `<StreakHero/>` above group cards; add `<DayCompleteConfetti fired={allDone} dayKey={`${m.group_id}-${today}`} />` inside each group card; restyle problem rows: solved rows get `CheckCircle2` icon `text-primary` + line-through muted title, unsolved `Circle` icon; difficulty as small `Badge variant="secondary"` colored text; wrap sections in `BlurFade`. Keep backlog amber alert, activity feed → add `Avatar` initials per row.
- [ ] **Step 4:** Build + browser: tick a problem (or simulate), confetti fires once; empty-group state still renders.
- [ ] **Step 5:** Commit `feat: dashboard streak hero, animated progress, completion confetti`.

### Task 6: Stats tabs

**Files:**
- Modify: `src/app/(app)/stats/page.tsx` (JSX only)
- Modify: `src/components/stats-charts.tsx` (StatTiles → NumberTicker where value numeric)

**Interfaces:**
- Consumes: `Tabs*` (Task 1), `NumberTicker`.

- [ ] **Step 1:** Wrap the two `h2` sections into `<Tabs defaultValue="leetstreak">` with `TabsList` (`LeetStreak`, `LeetCode`) under the `h1`; move existing LeetStreak cards into `<TabsContent value="leetstreak" className="flex flex-col gap-6">`, `LeetCodeStats` into `value="leetcode"`. Delete the `h2`s.
- [ ] **Step 2:** `StatTiles`: if tile value is `number`, render `<NumberTicker value={v} className="font-mono" />`; strings (e.g. `"🔥 12"`) — split known emoji-prefix format or leave as-is (keep simple: numeric-only tickers). Stagger tiles with `BlurFade`.
- [ ] **Step 3:** Build + browser: both tabs, heatmap scroll, LeetCode fetch states.
- [ ] **Step 4:** Commit `feat: tabbed stats page with animated tiles`.

### Task 7: Groups list + join dialog

**Files:**
- Modify: `src/app/(app)/groups/page.tsx` (JSX only)

**Interfaces:**
- Consumes: existing `Dialog*` component, `JoinForm` unchanged.

- [ ] **Step 1:** Header actions: keep "Create a group" primary; add outline Button "Join with code" opening `Dialog` containing `<JoinForm />` (dialog needs a small client wrapper — create inline `join-dialog.tsx` in the groups folder marked `"use client"`, importing JoinForm). Remove bottom join Card.
- [ ] **Step 2:** Group cards: `group relative overflow-hidden` card, hover lift `transition hover:-translate-y-0.5 hover:border-primary/40`, streak shown big right (`font-mono`), meta line as muted badges. Empty state: centered card with 👥, copy unchanged, CTA buttons.
- [ ] **Step 3:** Build + browser: join dialog submits, cards navigate.
- [ ] **Step 4:** Commit `feat: groups grid + join-code dialog`.

### Task 8: Group detail tabs + member page + onboarding polish

**Files:**
- Modify: `src/app/(app)/groups/[id]/page.tsx` (JSX only)
- Modify: `src/app/onboarding/page.tsx` (JSX only)
- Modify: `src/app/(app)/groups/[id]/member/[uid]/page.tsx` (classNames only)

**Interfaces:**
- Consumes: `Tabs*`; `InviteCode`, `Leaderboard`, `SettingsForm` unchanged.

- [ ] **Step 1:** Group page: header keeps name/meta/InviteCode; below, `<Tabs defaultValue="leaderboard">` — `Leaderboard` tab holds leaderboard card content; `Settings` trigger+content only when `isLeader`. When not leader, still use Tabs with single trigger (harmless) or plain card — pick Tabs-always for consistency.
- [ ] **Step 2:** Onboarding: center card `max-w-md mx-auto`, ember heading, grouped labeled fields, primary submit; copy unchanged.
- [ ] **Step 3:** Member page: apply stat-tile / card patterns to match (classNames only).
- [ ] **Step 4:** Build + browser: leader vs non-leader tabs, onboarding flow, member page.
- [ ] **Step 5:** Commit `feat: tabbed group detail, polished onboarding + member pages`.

### Task 9: Final verification sweep

- [ ] **Step 1:** `npm run build` clean; `npx vitest run` passes.
- [ ] **Step 2:** Browser drive (dark + light): landing (logged out), login error param, onboarding, dashboard (groups + empty), groups list + join dialog, create group, group detail tabs, member page, stats tabs, sign out. Mobile width (375px): nav, heatmap scroll, hero.
- [ ] **Step 3:** Check `prefers-reduced-motion` (emulate in devtools) — no tickers/pulse/confetti.
- [ ] **Step 4:** Fix anything found; commit `chore: overhaul verification fixes`.
