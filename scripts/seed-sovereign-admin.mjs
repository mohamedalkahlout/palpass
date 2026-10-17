/**
 * Seed a sovereign admin after purge (only if none exists).
 * Prints credentials once to stdout — store securely.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count } = await admin
  .from("profiles")
  .select("*", { count: "exact", head: true })
  .eq("role", "admin");

if ((count || 0) > 0) {
  console.log("Admin profile already exists — skip seed.");
  process.exit(0);
}

const email = process.env.PALPASS_ADMIN_EMAIL || "admin@palpass.gov.ps";
const password = process.env.PALPASS_ADMIN_PASSWORD || crypto.randomBytes(6).toString("hex");
const nationalId = "000000001";

const { data: authData, error: authError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    role: "admin",
    national_id: nationalId,
    full_name: "مدير المنظومة السيادية",
  },
});

if (authError) {
  console.error("Auth create failed:", authError.message);
  process.exit(1);
}

const userId = authData.user.id;
const { error: profileError } = await admin.from("profiles").insert({
  id: userId,
  national_id: nationalId,
  full_name: "مدير المنظومة السيادية",
  email,
  phone: "0590000000",
  governorate: "ramallah",
  city: "ramallah",
  region: "ramallah",
  verification_doc_url: "system/admin-placeholder",
  personal_photo_url: null,
  status: "active",
  is_verified: true,
  role: "admin",
});

if (profileError) {
  await admin.auth.admin.deleteUser(userId);
  console.error("Profile insert failed:", profileError.message);
  process.exit(1);
}

await admin.from("wallets").upsert({ user_id: userId, balance: 0, currency: "ILS" });

console.log("Sovereign admin seeded.");
console.log("  email:", email);
console.log("  national_id:", nationalId);
console.log("  password:", password);
console.log("Sign in at /auth/login with National ID + password.");
