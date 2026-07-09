# leetstreak 🔥

Duolingo-style streaks for LeetCode, with friends. Create a group, pick a
playlist (Blind 75 / NeetCode 150), and everyone gets the same daily problem
set — solve them all before your local midnight or lose your streak.

**Live:** https://leetstreak-azure.vercel.app

## How it works

- **Daily quota by weight** — problems are assigned until their weights reach
  the group's daily target (defaults: easy 1 · medium 2 · hard 4, all
  leader-configurable).
- **Automatic tracking** — link your LeetCode username; a 15-minute poller
  reads your public accepted submissions. Manual check-off exists as fallback.
- **Personal streaks, personal timezones** — your deadline is midnight where
  you live. Settlement waits for a fresh sync so a slow poll never breaks a
  streak.
- **Streak freezes** — every 7-day streak earns a freeze (hold max 2); a
  freeze auto-saves a missed day.
- **Backlog repair** — miss a day, finish those problems within 3 days, and
  the streak is retroactively restored.
- **Groups** — invite links, leaderboard, 28-day activity strips, friend
  activity feed.

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, RLS) on Vercel.
Scheduling via Supabase `pg_cron` → `pg_net` → `/api/cron/*` routes
(Vercel Hobby doesn't allow sub-daily crons).

## Development

```bash
npm install
npm run dev      # needs .env.local (see below)
npx vitest run   # core domain tests
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SECRET_KEY=...   # service role; server-side only
CRON_SECRET=...           # bearer token guarding /api/cron/*
```

Schema lives in Supabase migration history (`supabase-pat` MCP:
`list_migrations`). Core streak/assignment logic is pure functions in
`src/lib/core/` with tests.
