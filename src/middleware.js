import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE_OPTIONS, withAuthCookieOptions } from "./lib/supabase/cookie-options";

const intlMiddleware = createMiddleware(routing);

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
};

function secure(response) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

const protectedPaths = ["/dashboard", "/profile", "/admin"];
const publicAuthPrefixes = ["/auth/login", "/auth/register", "/pending"];

function stripLocale(pathname) {
  const stripped = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  return stripped || "/";
}

function requestLocale(pathname) {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (routing.locales.includes(segment)) return segment;
  return routing.defaultLocale;
}

function localizePath(pathname, locale) {
  if (locale === routing.defaultLocale) return pathname;
  return `/${locale}${pathname}`;
}

function isPublicAuthPath(pathname) {
  const stripped = stripLocale(pathname);
  return publicAuthPrefixes.some(
    (prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`)
  );
}

function isAdminPath(strippedPath) {
  return strippedPath === "/admin" || strippedPath.startsWith("/admin/");
}

export default async function middleware(request) {
  const { pathname } = request.nextUrl;
  const strippedPath = stripLocale(pathname);
  const locale = requestLocale(pathname);

  const response = intlMiddleware(request);

  if (isPublicAuthPath(pathname) || isPublicAuthPath(strippedPath)) {
    return secure(response);
  }

  const isProtected = protectedPaths.some(
    (path) => strippedPath === path || strippedPath.startsWith(`${path}/`)
  );

  if (!isProtected) {
    return secure(response);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, withAuthCookieOptions(options))
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (err) {
    console.error("[Handled Middleware Auth Exception]:", err?.message);
    user = null;
  }

  if (!user) {
    const loginPath = localizePath("/auth/login", locale);
    if (pathname.includes("/auth/login") || strippedPath.startsWith("/auth/login")) {
      return secure(response);
    }
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", pathname);
    return secure(NextResponse.redirect(loginUrl));
  }

  // Admin routes trust profiles.role only. user_metadata.role is citizen-editable.
  // An accredited admin is allowed straight through; citizens are sent to the dashboard once.
  if (isAdminPath(strippedPath)) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "admin") {
        return secure(response);
      }
    } catch (err) {
      console.error("[Handled Middleware Profile Exception]:", err?.message);
    }
    const dashboardUrl = new URL(localizePath("/dashboard", locale), request.url);
    return secure(NextResponse.redirect(dashboardUrl));
  }

  return secure(response);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next|_vercel|favicon.ico|icon(?:-\\d+)?|apple-touch-icon|manifest|images|fonts|.*\\..*).*)",
  ],
};
