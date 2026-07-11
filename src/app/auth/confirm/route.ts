import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authedUserId, serverClient } from "@/lib/supabase/server";

/** Lands here from the sign-in email. Two shapes, depending on template:
 *  - default template: GoTrue /verify 303s back with ?code= (PKCE)
 *  - custom template:  ?token_hash=&type= (free tier can't customize, but
 *    admin generateLink tokens use this path too)                        */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const supabase = await serverClient();
  let authError: string | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authError = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error?.message ?? null;
  } else {
    authError = "missing token";
  }

  if (authError) {
    console.error("auth confirm failed:", authError);
    return NextResponse.redirect(new URL("/?error=auth", request.url));
  }

  // profiles are world-readable under RLS, so the lookup must filter to the
  // signed-in user — an unfiltered maybeSingle() errors once the table has >1
  // row and misroutes every existing account to onboarding
  const userId = await authedUserId(supabase);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId!)
    .maybeSingle();
  return NextResponse.redirect(
    new URL(profile ? "/dashboard" : "/onboarding", request.url),
  );
}
