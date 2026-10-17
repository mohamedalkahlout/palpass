/**
 * Zero-trust database hardening for PALPASS.
 * Usage: node scripts/harden-database-security.mjs
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

const SQL = `
BEGIN;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := COALESCE(auth.jwt() ->> 'role', '');
  actor_is_admin BOOLEAN := FALSE;
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Direct maintenance sessions have no JWT. Citizen and admin API calls always do.
  IF jwt_role = '' AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO actor_is_admin;

  IF actor_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل الرتبة السيادية لحسابك.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل حالة الاعتماد الرسمي لحسابك.';
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل علامة التوثيق الرسمية.';
  END IF;
  IF NEW.national_id IS DISTINCT FROM OLD.national_id THEN
    RAISE EXCEPTION 'رقم الهوية الوطنية السيادي غير قابل للتعديل بعد التسجيل.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

DROP POLICY IF EXISTS "wallet_own" ON public.wallets;
DROP POLICY IF EXISTS "Allow individual wallet access" ON public.wallets;
DROP POLICY IF EXISTS "Users read own wallet" ON public.wallets;
CREATE POLICY "Users read own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM anon, authenticated;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS status TEXT;

CREATE OR REPLACE FUNCTION public.assert_actor_or_service(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  jwt_role TEXT := COALESCE(auth.jwt() ->> 'role', '');
BEGIN
  IF jwt_role = 'authenticated' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ هذه المعاملة على هوية أخرى.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.contribute_to_charity_rpc(
  p_donor_id UUID,
  p_campaign_id UUID,
  p_amount NUMERIC,
  p_is_anonymous BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_status TEXT;
  v_verified BOOLEAN;
  v_receipt TEXT;
  v_wallet_id UUID;
BEGIN
  PERFORM public.assert_actor_or_service(p_donor_id);

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ التبرع غير صالح.');
  END IF;

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_donor_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_donor_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة الرقمية غير كافٍ لإتمام التبرع.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM charity_campaigns WHERE id = p_campaign_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحملة غير موجودة أو مغلقة.');
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount, last_updated = NOW()
  WHERE user_id = p_donor_id;

  UPDATE charity_campaigns
  SET collected_amount = collected_amount + p_amount
  WHERE id = p_campaign_id;

  v_receipt := 'EHSAN-PS-' || UPPER(SUBSTRING(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO charity_contributions (campaign_id, donor_id, amount, is_anonymous, receipt_number)
  VALUES (p_campaign_id, p_donor_id, p_amount, COALESCE(p_is_anonymous, false), v_receipt);

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, p_amount, 'debit', 'مساهمة خيرية عبر منصة إحسان الوطنية', v_receipt, 'completed');

  RETURN jsonb_build_object('success', true, 'receiptNumber', v_receipt, 'newBalance', v_balance - p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_bill_rpc(
  p_user_id UUID,
  p_bill_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_bill_amount NUMERIC;
  v_bill_status TEXT;
  v_status TEXT;
  v_verified BOOLEAN;
  v_wallet_id UUID;
BEGIN
  PERFORM public.assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT amount, status INTO v_bill_amount, v_bill_status
  FROM bills WHERE id = p_bill_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة أو غير مسجلة على هذه الهوية.');
  END IF;
  IF v_bill_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الفاتورة مسددة مسبقاً.');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < v_bill_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد قيمة الفاتورة.');
  END IF;

  UPDATE wallets
  SET balance = balance - v_bill_amount, last_updated = NOW()
  WHERE user_id = p_user_id;
  UPDATE bills
  SET status = 'paid', paid_at = NOW()
  WHERE id = p_bill_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_bill_amount, 'debit', 'سداد مستحقات وفواتير حكومية', p_bill_id::text, 'completed');

  RETURN jsonb_build_object('success', true, 'newBalance', v_balance - v_bill_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_violation_rpc(
  p_user_id UUID,
  p_violation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_violation_amount NUMERIC;
  v_violation_status TEXT;
  v_status TEXT;
  v_verified BOOLEAN;
  v_wallet_id UUID;
BEGIN
  PERFORM public.assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT amount, status INTO v_violation_amount, v_violation_status
  FROM violations WHERE id = p_violation_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخالفة غير موجودة.');
  END IF;
  IF v_violation_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه المخالفة مسددة مسبقاً.');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < v_violation_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد المخالفة.');
  END IF;

  UPDATE wallets
  SET balance = balance - v_violation_amount, last_updated = NOW()
  WHERE user_id = p_user_id;
  UPDATE violations
  SET status = 'paid', paid_at = NOW()
  WHERE id = p_violation_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_violation_amount, 'debit', 'سداد مخالفة سير ونقل', p_violation_id::text, 'completed');

  RETURN jsonb_build_object('success', true, 'newBalance', v_balance - v_violation_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.contribute_to_charity_rpc(UUID, UUID, NUMERIC, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_bill_rpc(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_violation_rpc(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribute_to_charity_rpc(UUID, UUID, NUMERIC, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.pay_bill_rpc(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.pay_violation_rpc(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.contribute_to_charity(UUID, NUMERIC, BOOLEAN) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users access own border permits" ON public.border_permits;
DROP POLICY IF EXISTS "Verified users access own border permits" ON public.border_permits;
CREATE POLICY "Verified users access own border permits" ON public.border_permits
FOR ALL USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Users access own appointments" ON public.civic_appointments;
DROP POLICY IF EXISTS "Verified users access own appointments" ON public.civic_appointments;
CREATE POLICY "Verified users access own appointments" ON public.civic_appointments
FOR ALL USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Users access own hajj apps" ON public.hajj_applications;
DROP POLICY IF EXISTS "Verified users access own hajj apps" ON public.hajj_applications;
CREATE POLICY "Verified users access own hajj apps" ON public.hajj_applications
FOR ALL USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Users access own POA" ON public.justice_powers_of_attorney;
DROP POLICY IF EXISTS "Verified users access own POA" ON public.justice_powers_of_attorney;
CREATE POLICY "Verified users access own POA" ON public.justice_powers_of_attorney
FOR ALL USING (
  auth.uid() = principal_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = principal_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Users access own reports" ON public.civic_incident_reports;
DROP POLICY IF EXISTS "Verified users access own reports" ON public.civic_incident_reports;
CREATE POLICY "Verified users access own reports" ON public.civic_incident_reports
FOR ALL USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Users access own job apps" ON public.job_applications;
DROP POLICY IF EXISTS "Verified users access own job apps" ON public.job_applications;
CREATE POLICY "Verified users access own job apps" ON public.job_applications
FOR ALL USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "Users access own contributions" ON public.charity_contributions;
DROP POLICY IF EXISTS "Verified users access own contributions" ON public.charity_contributions;
CREATE POLICY "Verified users access own contributions" ON public.charity_contributions
FOR ALL USING (
  auth.uid() = donor_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
) WITH CHECK (
  auth.uid() = donor_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);

DROP POLICY IF EXISTS "bills_own" ON public.bills;
DROP POLICY IF EXISTS "Verified users read own bills" ON public.bills;
CREATE POLICY "Verified users read own bills" ON public.bills
FOR SELECT USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);
REVOKE INSERT, UPDATE, DELETE ON public.bills FROM anon, authenticated;

DROP POLICY IF EXISTS "viol_own" ON public.violations;
DROP POLICY IF EXISTS "Verified users read own violations" ON public.violations;
CREATE POLICY "Verified users read own violations" ON public.violations
FOR SELECT USING (
  auth.uid() = user_id AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);
REVOKE INSERT, UPDATE, DELETE ON public.violations FROM anon, authenticated;

ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_user_id_fkey;
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_donor_id_fkey;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_donor_id_fkey
  FOREIGN KEY (donor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_user_id ON public.violations(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

COMMIT;
`;

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try {
    await client.query(SQL);
    const check = await client.query(`
      SELECT
        EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_profile_sensitive_columns') AS profile_trigger,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pay_bill_rpc') AS pay_bill,
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'contribute_to_charity_rpc') AS charity_rpc,
        EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_user_id') AS bills_idx
    `);
    console.log(check.rows[0]);
    console.log("Database hardening applied.");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
