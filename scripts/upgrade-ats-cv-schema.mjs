/**
 * Citizen ATS resume table.
 * Usage: node scripts/upgrade-ats-cv-schema.mjs
 *
 * CVs stay private to the owner. Employers receive a snapshot on the
 * application row; the table is not world-readable.
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

CREATE TABLE IF NOT EXISTS citizen_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL DEFAULT 'professional' CHECK (template_type IN ('professional', 'academic')),
  personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  work_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  academic_publications JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_cv UNIQUE (user_id)
);

ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cv_snapshot JSONB;

ALTER TABLE citizen_cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own CV" ON citizen_cvs;
CREATE POLICY "Users manage own CV" ON citizen_cvs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public/Employers view submitted applicant CVs" ON citizen_cvs;
DROP POLICY IF EXISTS "Employers read submitted applicant CVs" ON citizen_cvs;
CREATE POLICY "Employers read submitted applicant CVs" ON citizen_cvs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM job_applications ja
      JOIN job_postings jp ON jp.id = ja.job_id
      WHERE ja.user_id = citizen_cvs.user_id
        AND jp.posted_by = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_citizen_cvs_user ON citizen_cvs(user_id);

COMMIT;
`;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  await pool.query(sql);
  const { rows } = await pool.query(`
    SELECT
      to_regclass('public.citizen_cvs') IS NOT NULL AS citizen_cvs,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'job_applications' AND column_name = 'cv_snapshot'
      ) AS cv_snapshot
  `);
  console.log(JSON.stringify(rows[0]));
} catch (err) {
  console.error("ATS schema upgrade failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
