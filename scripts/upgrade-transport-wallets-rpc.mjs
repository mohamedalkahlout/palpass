/**
 * Atomic Ministry of Transport renewals. Debits wallets under FOR UPDATE.
 * EXECUTE is granted only to service_role.
 * Usage: node scripts/upgrade-transport-wallets-rpc.mjs
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

CREATE OR REPLACE FUNCTION public.renew_driving_license_rpc(
  p_user_id UUID,
  p_license_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(10,2);
  v_fee NUMERIC(10,2) := 180.00;
  v_current_expiry DATE;
  v_new_expiry DATE;
  v_wallet_id UUID;
  v_status TEXT;
  v_verified BOOLEAN;
BEGIN
  PERFORM assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT expiry_date INTO v_current_expiry
  FROM driving_licenses
  WHERE id = p_license_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'رخصة القيادة غير موجودة أو لا تخص صاحب الجلسة');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المحفظة الرقمية غير مفعلة');
  END IF;

  IF v_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد رسم تجديد الرخصة (180.00 ₪)');
  END IF;

  v_new_expiry := (GREATEST(v_current_expiry, CURRENT_DATE) + INTERVAL '5 years')::date;

  UPDATE wallets
  SET balance = balance - v_fee, last_updated = NOW()
  WHERE user_id = p_user_id;

  UPDATE driving_licenses
  SET expiry_date = v_new_expiry, status = 'active'
  WHERE id = p_license_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_fee, 'debit', 'رسم تجديد رخصة القيادة — وزارة النقل والمواصلات', p_license_id::text, 'completed');

  RETURN jsonb_build_object(
    'success', true,
    'amount_deducted', v_fee,
    'new_balance', v_balance - v_fee,
    'new_expiry', v_new_expiry
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_vehicle_license_rpc(
  p_user_id UUID,
  p_vehicle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(10,2);
  v_fee NUMERIC(10,2);
  v_current_expiry DATE;
  v_new_expiry DATE;
  v_wallet_id UUID;
  v_status TEXT;
  v_verified BOOLEAN;
BEGIN
  PERFORM assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT annual_license_fee, license_expiry INTO v_fee, v_current_expiry
  FROM citizen_vehicles
  WHERE id = p_vehicle_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'بيانات المركبة غير مسجلة لصالح هذا الحساب');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المحفظة الرقمية غير مفعلة');
  END IF;

  IF v_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد رسوم ترخيص المركبة');
  END IF;

  v_new_expiry := (GREATEST(v_current_expiry, CURRENT_DATE) + INTERVAL '1 year')::date;

  UPDATE wallets
  SET balance = balance - v_fee, last_updated = NOW()
  WHERE user_id = p_user_id;

  UPDATE citizen_vehicles
  SET license_expiry = v_new_expiry, insurance_status = 'valid'
  WHERE id = p_vehicle_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_fee, 'debit', 'رسم تجديد رخصة سير المركبة — الديناموميتر', p_vehicle_id::text, 'completed');

  RETURN jsonb_build_object(
    'success', true,
    'amount_deducted', v_fee,
    'new_balance', v_balance - v_fee,
    'new_expiry', v_new_expiry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_driving_license_rpc(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_vehicle_license_rpc(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_driving_license_rpc(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_vehicle_license_rpc(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
`;

const NAMES = ["renew_driving_license_rpc", "renew_vehicle_license_rpc"];

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
  console.error("Transport RPC upgrade failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
