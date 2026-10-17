/**
 * B-tree indexes on created_at for civic chronological feeds.
 * Usage: node scripts/add-civic-indexes.mjs
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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const INDEX_NAMES = [
  "idx_civic_docs_created",
  "idx_border_permits_created",
  "idx_civic_appointments_created",
  "idx_hajj_apps_created",
  "idx_poa_created",
  "idx_criminal_certs_created",
  "idx_charity_campaigns_created",
  "idx_charity_contributions_created",
  "idx_civic_reports_created",
  "idx_vaccines_created",
  "idx_aid_ration_created",
  "idx_trade_licenses_created",
  "idx_job_apps_created",
];

const SQL = `
BEGIN;

-- criminal_clearance_certs and aid_ration_cards shipped with issued_at / updated_at only.
ALTER TABLE criminal_clearance_certs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE criminal_clearance_certs
  SET created_at = COALESCE(created_at, issued_at, NOW())
  WHERE created_at IS NULL;
ALTER TABLE criminal_clearance_certs
  ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE criminal_clearance_certs
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE aid_ration_cards
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE aid_ration_cards
  SET created_at = COALESCE(created_at, updated_at, NOW())
  WHERE created_at IS NULL;
ALTER TABLE aid_ration_cards
  ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE aid_ration_cards
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_civic_docs_created ON civic_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_border_permits_created ON border_permits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_appointments_created ON civic_appointments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hajj_apps_created ON hajj_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poa_created ON justice_powers_of_attorney (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_criminal_certs_created ON criminal_clearance_certs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_charity_campaigns_created ON charity_campaigns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_charity_contributions_created ON charity_contributions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_reports_created ON civic_incident_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vaccines_created ON vaccination_records (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aid_ration_created ON aid_ration_cards (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_licenses_created ON commercial_trade_licenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_apps_created ON job_applications (created_at DESC);

COMMIT;
`;

async function main() {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  const client = await pool.connect();
  try {
    await client.query(SQL);

    const found = await client.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = ANY($1::text[])
       ORDER BY indexname`,
      [INDEX_NAMES]
    );

    console.log(`\n[Indexes] ${found.rowCount}/${INDEX_NAMES.length}`);
    console.table(found.rows.map((r) => ({ index: r.indexname })));

    const explain = await client.query(
      `EXPLAIN (ANALYZE, FORMAT TEXT)
       SELECT id FROM civic_documents ORDER BY created_at DESC LIMIT 20`
    );
    console.log("\n[Query plan] civic_documents ORDER BY created_at DESC");
    for (const row of explain.rows) console.log(row["QUERY PLAN"]);

    if (found.rowCount !== INDEX_NAMES.length) {
      const have = new Set(found.rows.map((r) => r.indexname));
      console.error(
        "FAIL missing indexes:",
        INDEX_NAMES.filter((n) => !have.has(n))
      );
      process.exitCode = 1;
    } else {
      console.log("✅ Civic created_at indexes applied.");
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("Index migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
