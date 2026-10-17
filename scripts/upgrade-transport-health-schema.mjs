/**
 * Driving licences, vehicles, and the Ministry of Health hospital network.
 * Does not alter wallets, border permits, or financial RPCs.
 * Usage: node scripts/upgrade-transport-health-schema.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = `
BEGIN;

CREATE TABLE IF NOT EXISTS driving_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE NOT NULL,
  license_class TEXT NOT NULL CHECK (license_class IN ('B_private', 'D1_commercial_taxi', 'C1_light_truck', 'A_motorcycle')),
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  blood_type TEXT NOT NULL,
  demerit_points INT NOT NULL DEFAULT 0,
  restrictions TEXT DEFAULT 'نظارة طبية / قيادة نهارية',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citizen_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate_number TEXT UNIQUE NOT NULL,
  make_model TEXT NOT NULL,
  model_year INT NOT NULL,
  vin_chassis TEXT UNIQUE NOT NULL,
  license_expiry DATE NOT NULL,
  annual_license_fee NUMERIC(10,2) NOT NULL DEFAULT 650.00,
  insurance_status TEXT NOT NULL DEFAULT 'valid' CHECK (insurance_status IN ('valid', 'expired', 'uninsured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS palestinian_hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('government_moh', 'charitable_ngo', 'private')),
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_status TEXT NOT NULL DEFAULT 'open_24_7' CHECK (emergency_status IN ('open_24_7', 'high_capacity', 'diverting_critical')),
  departments JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_bed_capacity INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES palestinian_hospitals(id) ON DELETE CASCADE,
  clinic_department TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL DEFAULT ('REF-MOH-' || upper(substr(md5(random()::text), 1, 8))),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driving_licenses_user ON driving_licenses (user_id);
CREATE INDEX IF NOT EXISTS idx_citizen_vehicles_user ON citizen_vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_governorate ON palestinian_hospitals (governorate);
CREATE INDEX IF NOT EXISTS idx_hospital_appointments_user ON hospital_appointments (user_id);

ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS fare NUMERIC(10,2);

ALTER TABLE driving_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE palestinian_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own driving license" ON driving_licenses;
DROP POLICY IF EXISTS "Users read own vehicles" ON citizen_vehicles;
DROP POLICY IF EXISTS "Public read hospital network" ON palestinian_hospitals;
DROP POLICY IF EXISTS "Users manage own hospital appointments" ON hospital_appointments;

CREATE POLICY "Users read own driving license" ON driving_licenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own vehicles" ON citizen_vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public read hospital network" ON palestinian_hospitals FOR SELECT USING (true);
CREATE POLICY "Users manage own hospital appointments" ON hospital_appointments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON driving_licenses FROM anon;
REVOKE ALL ON citizen_vehicles FROM anon;
GRANT SELECT ON driving_licenses TO authenticated;
GRANT SELECT ON citizen_vehicles TO authenticated;
GRANT SELECT ON palestinian_hospitals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hospital_appointments TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
`;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const before = await pool.query(`SELECT count(*)::int AS n FROM wallets`);
  await pool.query(sql);
  const after = await pool.query(`SELECT count(*)::int AS n FROM wallets`);
  const tables = await pool.query(
    `SELECT c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND c.relname = ANY($1)`,
    [["driving_licenses", "citizen_vehicles", "palestinian_hospitals", "hospital_appointments"]]
  );
  console.log(JSON.stringify({
    wallets_unchanged: before.rows[0].n === after.rows[0].n,
    wallet_rows: after.rows[0].n,
    tables: tables.rows.map((row) => row.relname).sort(),
  }));
  if (before.rows[0].n !== after.rows[0].n || tables.rows.length !== 4) process.exitCode = 1;
} catch (error) {
  console.error("Schema upgrade failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
