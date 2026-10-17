import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";

/**
 * Auth callback after email verification (OTP confirmation).
 * Supabase redirects here after the user clicks the confirm link.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/en/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(sanitizeRedirect(next, "/en/dashboard"), request.url));
    }
  }

  // Redirect to error page on failure
  return NextResponse.redirect(`${origin}/en/auth/login?error=invalid_token`);
}
