# UI/UX Overhaul — "Ember" Design

**Date:** 2026-07-09
**Scope:** Full presentation-layer re-architecture. Data queries, server actions, auth, and business logic are untouched.

## Goals

- Dark-first visual identity built around the streak-fire theme.
- Restructured pages with clearer hierarchy and a proper landing page.
- shadcn + MagicUI components everywhere; purposeful, celebratory animations.
- Light mode still supported (next-themes toggle).

## 1. Visual system — "Ember"

- **Dark default.** `next-themes` with `defaultTheme="dark"`, class strategy (already wired via `@custom-variant dark`).
- **Palette (globals.css tokens):**
  - Dark: warm charcoal background (`oklch(~0.15 0.01 50)`), slightly lighter warm cards, orange primary (`oklch(~0.7 0.19 45)`), amber accents. Borders low-contrast warm.
  - Light: warm off-white, same orange primary.
  - Streak elements (flame, streak numbers) use an orange→amber→red gradient, reserved only for streak UI.
  - Chart tokens: ember ramp (orange/amber shades).
  - Difficulty colors stay green/yellow/red, tuned for dark contrast.
- **Typography:** larger tighter page headings; `font-mono` for numeric stats, invite codes, dates.

## 2. App shell (`src/app/(app)/layout.tsx`)

- Sticky header, `bg-background/80 backdrop-blur`, bottom border.
- Left: logo (gradient "streak" + flame) + nav links Today / Groups / Stats with active-route indicator (client component using `usePathname`).
- Right: theme toggle + avatar `DropdownMenu` (username shown, sign-out item). Replaces the "Sign out · name" button.
- Content container `max-w-5xl`, shared page-header pattern: `h1` + optional action slot.

## 3. Pages

### Landing `/` (logged-out)
- Full-viewport hero on dark ember: MagicUI `flickering-grid` (or grid-beams) background, `animated-gradient-text` headline, subline, three feature bullets/cards (Streaks 🔥 / Groups 👥 / NeetCode 150 📚).
- Login card wrapped in `shine-border`. Auth error message preserved.

### Home `/dashboard`
- **Streak hero strip** (new, top): big flame + `NumberTicker` current streak (max across groups), freezes banked, today's completion %. Gradient streak number.
- **Today's problems:** one card per group (as now) — animated progress bar, problem rows with checkbox-style solved state, difficulty badge, `MarkSolvedButton`/`SyncButton` preserved. Confetti fires once when the last problem of the day flips to solved.
- **Repair backlog:** amber alert block per group (content unchanged).
- **Friend activity:** feed card with avatars (initial-based), relative times.
- Empty state (no groups): illustrated CTA card, create/join buttons.

### Stats `/stats`
- Tabs: **LeetStreak | LeetCode** (shadcn `tabs`).
- LeetStreak tab: stat tiles with `NumberTicker`, day-outcomes row, 26-week heatmap, weekly-consistency bars, per-group breakdown. Same computed data.
- LeetCode tab: existing `LeetCodeStats` component restyled.

### Groups `/groups`
- Header: title + actions ("Join with code" opens `Dialog` with `JoinForm`; "Create group" button).
- Card grid: `magic-card`-style hover, group meta, streak. Empty state card.

### Group detail `/groups/[id]`
- Header: name, playlist/mode/weight meta, invite-code copy button.
- Tabs: **Leaderboard | Settings** (Settings tab only rendered for leader). Same `Leaderboard` and `SettingsForm` internals, restyled.

### Onboarding `/onboarding`
- Centered ember card, clear field grouping (username → leetcode username → timezone), same action.

### Member page `/groups/[id]/member/[uid]`
- Restyled to match stat-tile/heatmap patterns; no structural change.

## 4. Components & dependencies

- shadcn add: `tabs`, `dropdown-menu`, `tooltip`, `skeleton`, `checkbox`.
- MagicUI copied into `src/components/magicui/`: `number-ticker`, `flickering-grid`, `shine-border`, `blur-fade`, `confetti`, `animated-gradient-text`.
- New dep: `motion` (MagicUI requirement). `canvas-confetti` for confetti.
- Note: project uses `@base-ui/react` shadcn variant (`render` prop instead of `asChild`); new shadcn components must be added via the project's `shadcn` CLI to match.

## 5. Animation rules

- Section entrances: `blur-fade` with slight stagger.
- Stat numbers: `NumberTicker` on mount.
- Streak flame: subtle CSS pulse.
- Confetti: once per completion event, client-side.
- All animation respects `prefers-reduced-motion` (MagicUI components + CSS media query guard).

## 6. Error handling

- No changes to data/error paths. Auth error on landing, empty states, and "—" fallbacks preserved verbatim in new layouts.

## 7. Verification

- `npm run build` clean; existing vitest suite passes (logic untouched).
- Drive every page in the browser in both dark and light themes; confirm confetti, tickers, tabs, dialogs, dropdown sign-out, and mobile layout (nav wraps, heatmap scrolls).
