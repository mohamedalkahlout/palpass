/**
 * Cabinet ministerial tables. Does not alter wallets, border permits, or existing RPCs.
 * Usage: node scripts/upgrade-cabinet-services.mjs
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

CREATE TABLE IF NOT EXISTS education_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('tawjihi', 'university_degree', 'student_loan')),
  institution_name TEXT NOT NULL,
  degree_or_stream TEXT NOT NULL,
  seat_or_student_number TEXT NOT NULL,
  completion_year INT NOT NULL,
  gpa_or_grade NUMERIC(5,2) NOT NULL,
  verification_token TEXT UNIQUE NOT NULL DEFAULT ('PAL-EDU-' || upper(substr(md5(random()::text), 1, 8))),
  status TEXT NOT NULL DEFAULT 'certified' CHECK (status IN ('certified', 'pending_equivalency', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_clearance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clearance_code TEXT UNIQUE NOT NULL DEFAULT ('PAL-TAX-' || upper(substr(md5(random()::text), 1, 8))),
  purpose TEXT NOT NULL CHECK (purpose IN ('commercial_bid', 'travel', 'land_transfer', 'general_clearance')),
  income_tax_status TEXT NOT NULL DEFAULT 'settled' CHECK (income_tax_status IN ('settled', 'exempt', 'dues_pending')),
  vat_status TEXT NOT NULL DEFAULT 'settled' CHECK (vat_status IN ('settled', 'exempt', 'dues_pending')),
  property_tax_status TEXT NOT NULL DEFAULT 'settled' CHECK (property_tax_status IN ('settled', 'exempt', 'dues_pending')),
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  head_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_nid TEXT NOT NULL CHECK (member_nid ~ '^\\d{9}$'),
  member_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'son', 'daughter')),
  birth_date DATE NOT NULL,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  national_health_insured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_family_member UNIQUE (head_user_id, member_nid)
);

CREATE TABLE IF NOT EXISTS cabinet_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE NOT NULL DEFAULT ('PAL-CAB-' || upper(substr(md5(random()::text), 1, 8))),
  targeted_ministry TEXT NOT NULL,
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_ministerial_review', 'resolved', 'dismissed')),
  sla_due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  ministerial_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_user ON education_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_user ON tax_clearance_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_family_head ON family_registry(head_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON cabinet_complaints(user_id);

ALTER TABLE education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_clearance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own education records" ON education_records;
CREATE POLICY "Users read own education records" ON education_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own tax clearances" ON tax_clearance_certificates;
CREATE POLICY "Users read own tax clearances" ON tax_clearance_certificates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own family book" ON family_registry;
CREATE POLICY "Users read own family book" ON family_registry
  FOR SELECT USING (auth.uid() = head_user_id);

DROP POLICY IF EXISTS "Users read and create complaints" ON cabinet_complaints;
DROP POLICY IF EXISTS "Users insert own complaints" ON cabinet_complaints;
CREATE POLICY "Users read and create complaints" ON cabinet_complaints
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own complaints" ON cabinet_complaints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMIT;
`;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const before = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM wallets) AS wallets,
      (SELECT count(*)::int FROM border_permits) AS borders
  `);
  await pool.query(sql);
  const after = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM wallets) AS wallets,
      (SELECT count(*)::int FROM border_permits) AS borders,
      to_regclass('public.education_records') IS NOT NULL AS education,
      to_regclass('public.tax_clearance_certificates') IS NOT NULL AS tax,
      to_regclass('public.family_registry') IS NOT NULL AS family,
      to_regclass('public.cabinet_complaints') IS NOT NULL AS complaints,
      (SELECT count(*)::int FROM pg_indexes WHERE indexname IN ('idx_edu_user','idx_tax_user','idx_family_head','idx_complaints_user')) AS indexes,
      (SELECT count(*)::int FROM pg_policies WHERE tablename IN ('education_records','tax_clearance_certificates','family_registry','cabinet_complaints')) AS policies
  `);
  const same =
    before.rows[0].wallets === after.rows[0].wallets &&
    before.rows[0].borders === after.rows[0].borders;
  console.log(
    JSON.stringify({
      wallets_unchanged: same,
      wallet_rows: after.rows[0].wallets,
      border_rows: after.rows[0].borders,
      education: after.rows[0].education,
      tax: after.rows[0].tax,
      family: after.rows[0].family,
      complaints: after.rows[0].complaints,
      indexes: after.rows[0].indexes,
      policies: after.rows[0].policies,
    })
  );
  if (!same) process.exitCode = 1;
} catch (error) {
  console.error("Cabinet migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
