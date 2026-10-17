const BASE = (process.env.NEXT_PUBLIC_APP_URL || "https://palpass.pna.ps").replace(/\/$/, "");

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/services/",
        "/verify",
        "/track",
        "/about",
        "/news",
        "/transport/",
        "/charity",
      ],
      disallow: [
        "/admin/",
        "/auth/callback",
        "/api/",
        "/*/dashboard",
        "/*/profile",
        "/*/documents",
        "/*/appointments",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}