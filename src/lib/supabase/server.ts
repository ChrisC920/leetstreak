import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Verified user id from the session JWT. Uses getClaims — with our asymmetric
 *  signing key this verifies locally instead of a round trip to the Auth server. */
export async function authedUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

/** RLS-scoped client bound to the signed-in user's session (server components,
 *  server actions, route handlers). */
export async function serverClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // called from a Server Component; middleware refreshes sessions
          }
        },
      },
    },
  );
}
