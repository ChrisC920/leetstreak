import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await serverClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .maybeSingle();
      return NextResponse.redirect(
        new URL(profile ? "/dashboard" : "/onboarding", request.url),
      );
    }
  }
  return NextResponse.redirect(new URL("/?error=auth", request.url));
}
