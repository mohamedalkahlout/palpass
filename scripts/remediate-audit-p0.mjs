/**
 * Revoke public execution of the three wallet RPCs and reject anonymous callers.
 * Does not change balances, bills, or permit rows.
 * Usage: node scripts/remediate-audit-p0.mjs
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

REVOKE ALL ON FUNCTION public.pay_bill_rpc(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pay_violation_rpc(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contribute_to_charity_rpc(uuid, uuid, numeric, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pay_bill_rpc(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pay_violation_rpc(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.contribute_to_charity_rpc(uuid, uuid, numeric, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.assert_actor_or_service(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role TEXT;
  v_auth_uid UUID;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  v_auth_uid := auth.uid();

  IF v_jwt_role = 'service_role' THEN
    RETURN;
  END IF;

  IF v_auth_uid IS NULL OR v_jwt_role = 'anon' THEN
    RAISE EXCEPTION 'رفض أمني: غير مصرح بتنفيذ المعاملات المالية لهوية غير موثقة';
  END IF;

  IF v_auth_uid <> p_user_id THEN
    RAISE EXCEPTION 'رفض أمني: لا يمكنك التصرف في حساب مواطن آخر';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
`;

const NAMES = [
  "pay_bill_rpc",
  "pay_violation_rpc",
  "contribute_to_charity_rpc",
  "submit_border_permit_rpc",
  "purchase_tender_brochure_rpc",
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const before = await pool.query(`SELECT count(*)::int AS n FROM wallets`);
  await pool.query(sql);
  const { rows } = await pool.query(
    `SELECT p.proname,
            has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authn,
            has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = ANY($1)`,
    [NAMES]
  );
  const after = await pool.query(`SELECT count(*)::int AS n FROM wallets`);
  const leaked = rows.filter((row) => row.anon || row.authn || !row.svc);
  console.log(JSON.stringify({
    wallets_unchanged: before.rows[0].n === after.rows[0].n,
    wallet_rows: after.rows[0].n,
    functions: rows.map((row) => ({
      name: row.proname,
      anon: row.anon,
      authenticated: row.authn,
      service_role: row.svc,
    })),
  }));
  if (before.rows[0].n !== after.rows[0].n || leaked.length || rows.length !== NAMES.length) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("P0 remediation failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
