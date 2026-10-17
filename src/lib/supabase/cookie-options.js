/**
 * Universal auth-cookie attributes for @supabase/ssr.
 * `secure` MUST be false on http://localhost — Firefox/Safari drop Secure cookies on HTTP.
 */
export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Merge Supabase-provided cookie options with hardened defaults.
 * Caller options win on unknown keys; hardened attrs override SameSite/Secure/path/maxAge.
 */
export function withAuthCookieOptions(options = {}) {
  return {
    ...options,
    ...AUTH_COOKIE_OPTIONS,
  };
}
