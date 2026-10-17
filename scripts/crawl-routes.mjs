import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const base = process.env.CRAWL_BASE || "http://localhost:3000";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/auth/login",
  "/auth/register",
  "/auth/pending",
  "/services",
  "/news",
  "/jobs",
  "/restaurants",
  "/transport",
  "/transport/buses",
  "/transport/taxis",
  "/charity",
  "/privacy",
  "/terms",
  "/verify",
  "/track",
];

const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/profile/cv",
  "/documents",
  "/appointments",
  "/admin",
  "/services/bills",
  "/services/border",
  "/services/healthcare",
  "/services/hospitals",
  "/services/health-records",
  "/services/government",
  "/services/driving-license",
  "/services/family",
  "/services/gazette",
  "/services/aid",
  "/services/aid-ration",
  "/services/cabinet-aid",
  "/services/complaints",
  "/services/hajj",
  "/services/jerusalem-fund",
  "/services/justice",
  "/services/licenses",
  "/services/reports",
  "/services/tax-clearance",
  "/services/tenders",
  "/services/violations",
];

const ALL_PATHS = Array.from(new Set([...PUBLIC_ROUTES, ...PROTECTED_ROUTES]));

function buildRouteList() {
  const routes = [];
  for (const p of ALL_PATHS) {
    routes.push(p);
    routes.push(p === "/" ? "/en" : `/en${p}`);
    routes.push(p === "/" ? "/ar" : `/ar${p}`);
  }
  return routes;
}

async function getAuthCookie() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const nationalId = process.env.CRAWL_NATIONAL_ID || "407926773";
  const password = process.env.CRAWL_PASSWORD || "PalPassAdmin#2026";
  const directEmail = "mohamed.kahlaout@outlook.com";

  if (!url || (!anonKey && !serviceKey)) {
    console.warn("[Crawler Warning] Supabase credentials missing for auth cookie.");
    return "";
  }

  const keyToUse = serviceKey || anonKey;
  let email = directEmail;

  // Lookup email by national_id if needed
  try {
    const lookup = await fetch(
      `${url}/rest/v1/profiles?national_id=eq.${encodeURIComponent(nationalId)}&select=email`,
      { headers: { apikey: keyToUse, Authorization: `Bearer ${keyToUse}` } }
    );
    const rows = await lookup.json();
    if (Array.isArray(rows) && rows[0]?.email) {
      email = rows[0].email;
    }
  } catch (err) {
    console.warn("[Crawler] Profile lookup fallback to direct email:", err.message);
  }

  try {
    const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey || keyToUse, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await tokenRes.json();
    if (body.access_token && body.refresh_token) {
      const projectRef = new URL(url).hostname.split(".")[0];
      const payload = JSON.stringify({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_at: body.expires_at,
        expires_in: body.expires_in,
        token_type: body.token_type,
        user: body.user,
      });
      return `sb-${projectRef}-auth-token=${encodeURIComponent(payload)}`;
    }
  } catch (err) {
    console.warn("[Crawler] Auth token acquisition failed:", err.message);
  }
  return "";
}

async function requestRoute(route, cookie = "") {
  const headers = {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (cookie) {
    headers.cookie = cookie;
  }

  try {
    const res = await fetch(`${base}${route}`, {
      method: "GET",
      redirect: "manual",
      headers,
    });
    let text = "";
    if (res.status === 500) {
      try {
        text = await res.text();
      } catch {}
    }
    return { status: res.status, text };
  } catch (err) {
    return { status: 599, text: err.message };
  }
}

async function main() {
  console.log("==========================================================");
  console.log("   PALPASS ROUTE DIAGNOSTIC & 500 CRAWL PROTOCOL");
  console.log("==========================================================");
  console.log(`Target: ${base}`);

  const authCookie = await getAuthCookie();
  console.log(`Auth Session Status: ${authCookie ? "ACTIVE (Cookie Ready)" : "GUEST ONLY"}`);

  const modes = authCookie ? [
    { name: "GUEST", cookie: "" },
    { name: "AUTHENTICATED", cookie: authCookie }
  ] : [
    { name: "GUEST", cookie: "" }
  ];

  const routes = buildRouteList();
  console.log(`Total Routes to verify per state: ${routes.length}`);

  const summary = {
    200: 0,
    307: 0,
    308: 0,
    404: 0,
    500: 0,
    other: 0,
  };
  const fatalErrors = [];

  for (const mode of modes) {
    console.log(`\n--- Testing state: ${mode.name} ---`);
    for (const route of routes) {
      const { status, text } = await requestRoute(route, mode.cookie);
      if (summary[status] !== undefined) {
        summary[status]++;
      } else {
        summary.other++;
      }

      const logBadge = status === 200 ? "OK" : status >= 300 && status < 400 ? "REDIRECT" : "FAIL";
      console.log(`[${mode.name}] ${status} (${logBadge}) -> ${route}`);

      if (status >= 500) {
        fatalErrors.push({
          mode: mode.name,
          route,
          status,
          stackSnippet: text.slice(0, 500),
        });
      }
    }
  }

  console.log("\n==========================================================");
  console.log("   CRAWL SUMMARY & AUDIT VERIFICATION");
  console.log("==========================================================");
  console.log("Status Code Counts:", JSON.stringify(summary, null, 2));
  console.log(`HTTP 500 Errors Detected: ${fatalErrors.length}`);

  if (fatalErrors.length > 0) {
    console.error("\n❌ CRITICAL: The following routes returned HTTP 500 or crash:");
    for (const f of fatalErrors) {
      console.error(`- [${f.mode}] ${f.route} (HTTP ${f.status})`);
      if (f.stackSnippet) {
        console.error(`  Stack/Body: ${f.stackSnippet}`);
      }
    }
    process.exit(1);
  } else {
    console.log("\n✅ SUCCESS: ZERO routes returned HTTP 500 across all modes.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Diagnostic crawler failed with exception:", err);
  process.exit(1);
});
