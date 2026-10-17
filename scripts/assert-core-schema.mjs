import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Client } = pg;
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const columns = await client.query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN (
      'national_id', 'full_name', 'phone', 'governorate', 'region', 'city',
      'verification_doc_url', 'status', 'role', 'is_verified'
    )
  ORDER BY column_name
`);

const checks = await client.query(`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND conname IN ('profiles_status_check', 'profiles_role_check')
  ORDER BY conname
`);

const sync = await client.query(`
  SELECT
    count(*)::int AS total,
    count(*) FILTER (
      WHERE governorate IS NOT NULL
        AND btrim(governorate) <> ''
        AND region = governorate
    )::int AS synced_from_region
  FROM profiles
`);

await client.end();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const rest = await admin.from("profiles").select("id, national_id, governorate, status").limit(1);

console.log(JSON.stringify({
  columns: columns.rows,
  checks: checks.rows,
  sync: sync.rows[0],
  postgrest: rest.error
    ? { ok: false, code: rest.error.code, message: rest.error.message }
    : { ok: true, rows: rest.data?.length ?? 0, governoratePresent: rest.data?.[0] ? Object.prototype.hasOwnProperty.call(rest.data[0], "governorate") : true },
}, null, 2));
