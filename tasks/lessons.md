# Lessons

## 2026-07-09 — magic-link sign-in shipped broken
- **Mistake**: `/auth/confirm` implemented for the custom-template pattern
  (`?token_hash=`) while the project uses Supabase's *default* email template,
  which routes through GoTrue `/verify` and redirects back with `?code=`
  (PKCE). Route smoke tests passed because they never exercised the real
  email link shape.
- **Rule**: when integrating a third-party auth flow, verify the *actual
  callback request shape* end-to-end (what params really arrive), not just
  that the handler works for the shape the docs example uses. Supabase
  specifics: default template → `?code=` + `exchangeCodeForSession`; custom
  template (needs paid tier or custom SMTP) → `?token_hash=` + `verifyOtp`.
  Handle both in one route.
- **Also**: never fail auth silently — bounce with a visible `?error=` message
  so the user (and debugger) sees what happened.

## 2026-07-09 — "new row violates RLS" on group create had TWO root causes
- **Symptom**: creating a group → `new row violates row-level security policy
  for table "groups"`. Policy `leader_id = auth.uid()` was correct, so the
  message was misleading twice over.
- **Root cause 1 (infra)**: the project's active ES256 signing key
  (`42e054dc`) had a **mismatched public/private pair** — GoTrue signed tokens
  the data API couldn't verify against JWKS. Every authenticated PostgREST
  request silently fell back to `anon` → `auth.uid()` NULL → all RLS WITH CHECK
  failed. Signature `PGRST301 "No suitable key"` on a REST call with a real
  user token is the tell. Fixed by creating a fresh ES256 signing key and
  PATCHing it to `in_use` (mgmt API `/config/auth/signing-keys/{id}`), which
  auto-demotes the broken one. **Verify a signing key by locally checking a
  freshly-minted token's signature against the published JWK** (node
  `crypto.verify` with `dsaEncoding:"ieee-p1363"`), don't trust that `in_use`
  means "works".
- **Root cause 2 (code)**: `createGroup` does `.insert(...).select("id")`. The
  `.select()` makes PostgREST **read the row back under the SELECT policy**
  (`is_group_member(id)`), but the leader isn't a member until the *next*
  statement → read-back denied → same misleading "violates RLS" error. Fixed
  by adding a `leader reads group` SELECT policy (`leader_id = auth.uid()`).
- **Rule**: an insert with a chained `.select()`/`return=representation` is
  ALSO gated by the SELECT policy on the new row. Test inserts with
  `Prefer: return=minimal` to isolate WITH CHECK from read-back.
- **Rule**: `mcp supabase execute_sql` does NOT faithfully reproduce RLS —
  transaction-local `set role` / `set_config('request.jwt.claims',...,true)`
  don't reliably carry across the statements in one batch. Reproduce RLS via
  the **live REST API with a real user token**, not SQL simulation.
