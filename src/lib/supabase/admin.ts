import { createClient } from "@supabase/supabase-js";

/** Service-role client. Bypasses RLS — server-side only (cron, settlement). */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
