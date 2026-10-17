import fs from "node:fs";
import path from "node:path";

const base = process.env.CRAWL_BASE || "http://localhost:3000";
const paths = [
  "/",
  "/about",
  "/admin",
  "/appointments",
  "/auth/callback",
  "/auth/login",
  "/auth/pending",
  "/auth/register",
  "/charity",
  "/dashboard",
  "/documents",
  "/jobs",
  "/news",
  "/pending",
  "/privacy",
  "/profile",
  "/profile/cv",
  "/restaurants",
  "/services",
  "/services/aid",
  "/services/aid-ration",
  "/services/bills",
  "/services/border",
  "/services/cabinet-aid",
  "/services/complaints",
  "/services/driving-license",
  "/services/education",
  "/services/family",
  "/services/gazette",
  "/services/government",
  "/services/hajj",
  "/services/health-records",
  "/services/healthcare",
  "/services/hospitals",
  "/services/jerusalem-fund",
  "/services/justice",
  "/services/licenses",
  "/services/reports",
  "/services/tax-clearance",
  "/services/tenders",
  "/services/violations",
  "/terms",
  "/transport",
  "/transport/buses",
  "/transport/taxis",
  "/verify",
  "/track",
  "/api/verify",
];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

function routes() {
  const list = [];
  for (const route of paths) {
    list.push(route);
    if (route === "/api/verify") continue;
    list.push(route === "/" ? "/en" : `/en${route}`);
    list.push(route === "/" ? "/ar" : `/ar${route}`);
  }
  return list;
}

async function statusOf(route, cookie) {
  const headers = { accept: "text/html" };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${base}${route}`, { redirect: "manual", headers });
  return response.status;
}

async function sessionCookie() {
  const nationalId = process.env.CRAWL_NATIONAL_ID;
  const password = process.env.CRAWL_PASSWORD;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!nationalId || !password || !url || !key) return "";

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let lookup = await fetch(
    `${url}/rest/v1/profiles?national_id=eq.${encodeURIComponent(nationalId)}&select=email`,
    { headers }
  );
  let rows = await lookup.json();
  let email = Array.isArray(rows) ? rows[0]?.email : null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email && serviceKey) {
    lookup = await fetch(
      `${url}/rest/v1/profiles?national_id=eq.${encodeURIComponent(nationalId)}&select=email`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    rows = await lookup.json();
    email = Array.isArray(rows) ? rows[0]?.email : null;
  }
  if (!email) return "";

  const signed = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await signed.json();
  if (!body.access_token || !body.refresh_token) return "";
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

loadEnv(path.resolve(".env.local"));
loadEnv(path.resolve(".env"));

const cookie = await sessionCookie();
const modes = cookie ? ["guest", "auth"] : ["guest"];
const failures = [];
const counts = {};

for (const mode of modes) {
  for (const route of routes()) {
    const status = await statusOf(route, mode === "auth" ? cookie : "");
    counts[status] = (counts[status] || 0) + 1;
    const line = `${mode}\t${status}\t${route}`;
    console.log(line);
    if (status === 500) failures.push(line);
  }
}

console.log(`SUMMARY ${JSON.stringify(counts)} failures ${failures.length} auth ${cookie ? "yes" : "no"}`);
if (failures.length) process.exitCode = 1;
