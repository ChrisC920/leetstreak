# Page responsiveness pass (2026-07-11)

Root causes found:
- Every page + layout + middleware calls `supabase.auth.getUser()` → network round trip to Supabase Auth per request. Project uses asymmetric ES256 key → `getClaims()` verifies locally (~0ms).
- Dashboard page: ~7 sequential Supabase round trips (waterfall).
- `groups/[id]` and `groups/[id]/member/[uid]` have no `loading.tsx` → dynamic route not prefetched, nav blocks on server with zero feedback.
- Next 16 renamed middleware → proxy (deprecation notice).

## Todo
- [x] Add `authedUserId()` helper (getClaims) in `src/lib/supabase/server.ts`
- [x] Swap getUser→getClaims: (app)/layout, dashboard, groups, groups/[id], member/[uid], stats, root page, actions (dashboard/groups/onboarding)
- [x] Parallelize dashboard queries (8 round trips → ~4 stages)
- [x] Add loading.tsx for groups/[id] and member/[uid]
- [x] Rename src/middleware.ts → src/proxy.ts, use getClaims
- [x] Verify: lint clean, build green, prod-server smoke test (/ 200, protected routes 307 → /)

## Review
Not deployed — push/deploy when ready. Group page solves query still unbounded (grows with history); index or date-bound it if the leaderboard slows later.
