import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE_OPTIONS, withAuthCookieOptions } from "@/lib/supabase/cookie-options";

export async function createClient() {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          try {
            return cookieStore ? cookieStore.getAll() : [];
          } catch {
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            if (cookieStore) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, withAuthCookieOptions(options))
              );
            }
          } catch {
            // Ignored when called from Server Components
          }
        },
      },
    }
  );
}

/**
 * Deduplicated, memoized current user query per request lifecycle.
 * Prevents fetch-storming when multiple components ask for the user in the same SSR pass.
 */
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch (err) {
    console.error("[Handled getCurrentUser Exception]:", err?.message);
    return null;
  }
});

/**
 * Deduplicated, memoized current session query per request lifecycle.
 */
export const getCurrentSession = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) return null;
    return data.session;
  } catch (err) {
    console.error("[Handled getCurrentSession Exception]:", err?.message);
    return null;
  }
});
