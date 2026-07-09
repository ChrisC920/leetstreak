import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
