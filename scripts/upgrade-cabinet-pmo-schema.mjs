/**
 * Prime Minister's Office pillars: tenders, humanitarian relief, gazette, Jerusalem support.
 * Does not alter existing wallet rows, border permits, or earlier RPCs.
 * Tender debit uses wallets.last_updated. Execute is limited to service_role.
 * Usage: node scripts/upgrade-cabinet-pmo-schema.mjs
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

function ledgerInsert(hasStatus) {
  if (hasStatus) {
    return `
  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (
    v_wallet_id,
    v_price,
    'debit',
    'رسوم كراسة عطاء حكومي — ' || v_token,
    v_token,
    'completed'
  );`;
  }
  return `
  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id)
  VALUES (
    v_wallet_id,
    v_price,
    'debit',
    'رسوم كراسة عطاء حكومي — ' || v_token,
    v_token
  );`;
}

function buildSql(hasStatus) {
  return `
BEGIN;

CREATE TABLE IF NOT EXISTS public_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('works', 'supplies', 'consulting', 'it_systems')),
  brochure_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  estimated_value NUMERIC(14,2) NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_evaluation', 'awarded', 'cancelled')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES public_tenders(id) ON DELETE CASCADE,
  purchase_token TEXT UNIQUE NOT NULL DEFAULT ('BOU-TND-' || upper(substr(md5(random()::text), 1, 8))),
  amount_paid NUMERIC(10,2) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_tender UNIQUE (user_id, tender_id)
);

CREATE TABLE IF NOT EXISTS cabinet_humanitarian_relief (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_number TEXT UNIQUE NOT NULL DEFAULT ('PMO-AID-' || upper(substr(md5(random()::text), 1, 8))),
  aid_type TEXT NOT NULL CHECK (aid_type IN ('exceptional_medical', 'home_reconstruction', 'urgent_stipend', 'education_grant')),
  description TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'high' CHECK (urgency_level IN ('critical', 'high', 'standard')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'field_investigation', 'approved_by_pm', 'disbursed', 'rejected')),
  financial_grant_awarded NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS official_gazette_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_number INT UNIQUE NOT NULL,
  issuance_date DATE NOT NULL,
  title TEXT NOT NULL,
  decree_type TEXT NOT NULL CHECK (decree_type IN ('presidential_decree', 'cabinet_decision', 'ministerial_instruction')),
  summary TEXT NOT NULL,
  full_text TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jerusalem_support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id TEXT UNIQUE NOT NULL DEFAULT ('JLM-RES-' || upper(substr(md5(random()::text), 1, 8))),
  support_type TEXT NOT NULL CHECK (support_type IN ('arnona_relief', 'legal_eviction_defense', 'commercial_subsidy', 'building_renovation')),
  property_address TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'legal_assigned', 'subsidy_approved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenders_status ON public_tenders(status);
CREATE INDEX IF NOT EXISTS idx_tender_purchases_user ON tender_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_relief_user ON cabinet_humanitarian_relief(user_id);
CREATE INDEX IF NOT EXISTS idx_gazette_edition ON official_gazette_editions(edition_number);
CREATE INDEX IF NOT EXISTS idx_jerusalem_user ON jerusalem_support_cases(user_id);

CREATE OR REPLACE FUNCTION purchase_tender_brochure_rpc(
  p_user_id UUID,
  p_tender_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(10,2);
  v_price NUMERIC(10,2);
  v_status TEXT;
  v_token TEXT;
  v_wallet_id UUID;
  v_profile_status TEXT;
  v_verified BOOLEAN;
BEGIN
  SELECT status, is_verified INTO v_profile_status, v_verified
  FROM profiles WHERE id = p_user_id;
  IF v_profile_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'شراء كراسة العطاء يتطلب اعتماد الهوية الرسمية أولاً.');
  END IF;

  SELECT brochure_price, status INTO v_price, v_status
  FROM public_tenders WHERE id = p_tender_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العطاء الحكومي المطلوب غير موجود');
  END IF;

  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا العطاء مغلق أو قيد الترسية حالياً');
  END IF;

  IF v_price IS NULL OR v_price < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'رسم الكراسة غير معتمد');
  END IF;

  IF EXISTS (SELECT 1 FROM tender_purchases WHERE user_id = p_user_id AND tender_id = p_tender_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم شراء كراسة هذا العطاء مسبقاً');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المحفظة الرقمية غير موجودة');
  END IF;

  IF v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد رسوم كراسة العطاء');
  END IF;

  UPDATE wallets
  SET balance = balance - v_price, last_updated = NOW()
  WHERE id = v_wallet_id;

  v_token := 'BOU-TND-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO tender_purchases (user_id, tender_id, purchase_token, amount_paid)
  VALUES (p_user_id, p_tender_id, v_token, v_price);

  ${ledgerInsert(hasStatus)}

  RETURN jsonb_build_object(
    'success', true,
    'purchase_token', v_token,
    'amount_deducted', v_price,
    'new_balance', v_balance - v_price
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم شراء كراسة هذا العطاء مسبقاً');
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_tender_brochure_rpc(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_tender_brochure_rpc(UUID, UUID) TO service_role;

ALTER TABLE public_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_humanitarian_relief ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_gazette_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jerusalem_support_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read open tenders" ON public_tenders;
DROP POLICY IF EXISTS "Users read own tender purchases" ON tender_purchases;
DROP POLICY IF EXISTS "Users manage own humanitarian relief" ON cabinet_humanitarian_relief;
DROP POLICY IF EXISTS "Users read own humanitarian relief" ON cabinet_humanitarian_relief;
DROP POLICY IF EXISTS "Users insert own humanitarian relief" ON cabinet_humanitarian_relief;
DROP POLICY IF EXISTS "Public read official gazette" ON official_gazette_editions;
DROP POLICY IF EXISTS "Users manage own Jerusalem support cases" ON jerusalem_support_cases;
DROP POLICY IF EXISTS "Users read own Jerusalem support cases" ON jerusalem_support_cases;
DROP POLICY IF EXISTS "Users insert own Jerusalem support cases" ON jerusalem_support_cases;

CREATE POLICY "Public read open tenders" ON public_tenders FOR SELECT USING (true);
CREATE POLICY "Users read own tender purchases" ON tender_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own humanitarian relief" ON cabinet_humanitarian_relief
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own humanitarian relief" ON cabinet_humanitarian_relief
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'submitted'
    AND COALESCE(financial_grant_awarded, 0) = 0
  );
CREATE POLICY "Public read official gazette" ON official_gazette_editions FOR SELECT USING (true);
CREATE POLICY "Users read own Jerusalem support cases" ON jerusalem_support_cases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own Jerusalem support cases" ON jerusalem_support_cases
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending_review'
  );

REVOKE INSERT, UPDATE, DELETE ON public_tenders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON tender_purchases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON official_gazette_editions FROM anon, authenticated;
REVOKE UPDATE, DELETE ON cabinet_humanitarian_relief FROM anon, authenticated;
REVOKE UPDATE, DELETE ON jerusalem_support_cases FROM anon, authenticated;
GRANT SELECT ON public_tenders TO anon, authenticated;
GRANT SELECT ON official_gazette_editions TO anon, authenticated;
GRANT SELECT ON tender_purchases TO authenticated;
GRANT SELECT, INSERT ON cabinet_humanitarian_relief TO authenticated;
GRANT SELECT, INSERT ON jerusalem_support_cases TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
`;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const walletCols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'last_updated'`
  );
  if (!walletCols.rowCount) {
    console.error("wallets.last_updated is missing; migration aborted");
    process.exitCode = 1;
  } else {
    const txCols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'wallet_transactions'`
    );
    const hasStatus = txCols.rows.some((row) => row.column_name === "status");
    const before = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM wallets) AS wallets,
        (SELECT count(*)::int FROM border_permits) AS borders
    `);
    await pool.query(buildSql(hasStatus));
    const after = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM wallets) AS wallets,
        (SELECT count(*)::int FROM border_permits) AS borders,
        to_regclass('public.public_tenders') IS NOT NULL AS tenders,
        to_regclass('public.tender_purchases') IS NOT NULL AS purchases,
        to_regclass('public.cabinet_humanitarian_relief') IS NOT NULL AS relief,
        to_regclass('public.official_gazette_editions') IS NOT NULL AS gazette,
        to_regclass('public.jerusalem_support_cases') IS NOT NULL AS jerusalem,
        to_regprocedure('public.purchase_tender_brochure_rpc(uuid,uuid)') IS NOT NULL AS rpc,
        (SELECT count(*)::int FROM pg_policies WHERE tablename IN (
          'public_tenders','tender_purchases','cabinet_humanitarian_relief','official_gazette_editions','jerusalem_support_cases'
        )) AS policies
    `);
    const same =
      before.rows[0].wallets === after.rows[0].wallets &&
      before.rows[0].borders === after.rows[0].borders;
    console.log(JSON.stringify({
      wallets_unchanged: same,
      wallet_rows: after.rows[0].wallets,
      border_rows: after.rows[0].borders,
      ledger_status_column: hasStatus,
      tenders: after.rows[0].tenders,
      purchases: after.rows[0].purchases,
      relief: after.rows[0].relief,
      gazette: after.rows[0].gazette,
      jerusalem: after.rows[0].jerusalem,
      rpc: after.rows[0].rpc,
      policies: after.rows[0].policies,
    }));
    if (!same || !after.rows[0].rpc) process.exitCode = 1;
  }
} catch (error) {
  console.error("PMO migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
