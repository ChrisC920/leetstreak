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
