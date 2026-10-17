/**
 * Sovereign border clearance upgrade.
 * Usage: node scripts/upgrade-border-clearance.mjs
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

ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS full_name_passport_ar TEXT;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS full_name_passport_en TEXT;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS passport_expiry_date DATE;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS destination_country TEXT;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS travel_category TEXT;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS companions_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS special_logistics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS coordination_fee_ils NUMERIC(10, 2) NOT NULL DEFAULT 170.00;
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.border_permits ADD COLUMN IF NOT EXISTS clearance_tracking_code TEXT;

UPDATE public.border_permits SET companions_data = '[]'::jsonb WHERE companions_data IS NULL;
UPDATE public.border_permits SET special_logistics = '{}'::jsonb WHERE special_logistics IS NULL;
UPDATE public.border_permits SET payment_status = 'unpaid' WHERE payment_status IS NULL;
UPDATE public.border_permits SET coordination_fee_ils = 170.00 WHERE coordination_fee_ils IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'border_permits_travel_category_check'
  ) THEN
    ALTER TABLE public.border_permits
      ADD CONSTRAINT border_permits_travel_category_check
      CHECK (
        travel_category IS NULL OR travel_category IN (
          'medical', 'education', 'business', 'humanitarian', 'tourism_family', 'delegation'
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'border_permits_payment_status_check'
  ) THEN
    ALTER TABLE public.border_permits
      ADD CONSTRAINT border_permits_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid', 'exempt'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS border_permits_clearance_tracking_code_key
  ON public.border_permits (clearance_tracking_code);

CREATE OR REPLACE FUNCTION public.submit_border_permit_rpc(
  p_user_id UUID,
  p_crossing TEXT,
  p_travel_date DATE,
  p_travel_purpose TEXT,
  p_name_ar TEXT,
  p_name_en TEXT,
  p_passport_no TEXT,
  p_passport_expiry DATE,
  p_destination TEXT,
  p_category TEXT,
  p_companions JSONB,
  p_logistics JSONB,
  p_fee NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_status TEXT;
  v_verified BOOLEAN;
  v_tracking TEXT;
  v_permit_id UUID;
  v_wallet_id UUID;
  v_companions JSONB;
  v_logistics JSONB;
  v_qr TEXT;
BEGIN
  PERFORM public.assert_actor_or_service(p_user_id);

  IF p_crossing IS NULL OR p_crossing NOT IN ('karameh_bridge', 'rafah_crossing', 'erez_crossing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'معبر غير صالح.');
  END IF;
  IF p_travel_date IS NULL OR p_travel_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'تاريخ السفر يجب أن يكون اليوم أو بعده.');
  END IF;
  IF p_travel_purpose IS NULL OR char_length(btrim(p_travel_purpose)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الغرض من السفر مطلوب.');
  END IF;
  IF p_name_ar IS NULL OR char_length(btrim(p_name_ar)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الاسم العربي كما في الجواز مطلوب.');
  END IF;
  IF p_name_en IS NULL OR p_name_en !~ '^[A-Za-z][A-Za-z ''-]{1,80}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الاسم الإنجليزي يجب أن يطابق حروف الجواز اللاتينية.');
  END IF;
  IF p_passport_no IS NULL OR upper(btrim(p_passport_no)) !~ '^[A-Z0-9]{5,12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'رقم الجواز غير صالح.');
  END IF;
  IF p_passport_expiry IS NULL OR p_passport_expiry <= p_travel_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن يكون الجواز سارياً بعد تاريخ السفر.');
  END IF;
  IF p_destination IS NULL OR char_length(btrim(p_destination)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'بلد الوجهة مطلوب.');
  END IF;
  IF p_category IS NULL OR p_category NOT IN (
    'medical', 'education', 'business', 'humanitarian', 'tourism_family', 'delegation'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'فئة السفر غير معتمدة.');
  END IF;
  IF p_fee IS NULL OR p_fee <> 170.00 THEN
    RETURN jsonb_build_object('success', false, 'error', 'رسوم التنسيق والمغادرة السيادية ثابتة بمبلغ 170.00 شيكل.');
  END IF;

  v_companions := CASE
    WHEN p_companions IS NULL OR jsonb_typeof(p_companions) <> 'array' THEN '[]'::jsonb
    ELSE p_companions
  END;
  IF jsonb_array_length(v_companions) > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للمرافقين هو 10.');
  END IF;

  v_logistics := jsonb_build_object(
    'wheelchair', COALESCE((p_logistics ->> 'wheelchair')::boolean, false),
    'ambulance', COALESCE((p_logistics ->> 'ambulance')::boolean, false),
    'vip_hall', COALESCE((p_logistics ->> 'vip_hall')::boolean, false)
  );

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'إصدار تصاريح السفر يتطلب اعتماد وتدقيق الهوية الرسمية من قبل الشؤون المدنية أولاً.'
    );
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < 170.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'رصيد المحفظة الرقمية غير كافٍ لسداد رسوم التنسيق والمغادرة السيادية (170 شيكل).'
    );
  END IF;

  UPDATE wallets
  SET balance = balance - 170.00, last_updated = NOW()
  WHERE id = v_wallet_id;

  v_tracking := 'PAL-BRD-' || UPPER(SUBSTRING(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_qr := 'PAL-PASS-VERIFIED-' || v_tracking;

  INSERT INTO border_permits (
    user_id, crossing_name, travel_date, travel_purpose, companions_count,
    permit_number, status, qr_token, full_name_passport_ar, full_name_passport_en,
    passport_number, passport_expiry_date, destination_country, travel_category,
    companions_data, special_logistics, coordination_fee_ils, payment_status,
    clearance_tracking_code
  ) VALUES (
    p_user_id, p_crossing, p_travel_date, btrim(p_travel_purpose), jsonb_array_length(v_companions),
    v_tracking, 'under_review', v_qr, btrim(p_name_ar), btrim(p_name_en),
    upper(btrim(p_passport_no)), p_passport_expiry, btrim(p_destination), p_category,
    v_companions, v_logistics, 170.00, 'paid', v_tracking
  ) RETURNING id INTO v_permit_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (
    v_wallet_id,
    170.00,
    'debit',
    'رسوم تنسيق ومغادرة المعابر السيادية — تصريح #' || v_tracking,
    v_tracking,
    'completed'
  );

  RETURN jsonb_build_object(
    'success', true,
    'trackingCode', v_tracking,
    'permitId', v_permit_id,
    'qrToken', v_qr,
    'newBalance', v_balance - 170.00,
    'paymentStatus', 'paid',
    'status', 'under_review'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_border_permit_rpc(
  UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, JSONB, JSONB, NUMERIC
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_border_permit_rpc(
  UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, JSONB, JSONB, NUMERIC
) TO service_role;

DROP POLICY IF EXISTS "Users access own border permits" ON public.border_permits;
DROP POLICY IF EXISTS "Verified users access own border permits" ON public.border_permits;
DROP POLICY IF EXISTS "Verified users read own border permits" ON public.border_permits;
CREATE POLICY "Verified users read own border permits" ON public.border_permits
FOR SELECT USING (
  auth.uid() = user_id
  AND (SELECT is_verified FROM public.profiles WHERE id = auth.uid()) = true
);
REVOKE INSERT, UPDATE, DELETE ON public.border_permits FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

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
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'border_permits' AND column_name = 'clearance_tracking_code'
        ) AS tracking_col,
        EXISTS (
          SELECT 1 FROM pg_proc WHERE proname = 'submit_border_permit_rpc'
        ) AS rpc,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'wallets' AND column_name = 'last_updated'
        ) AS wallet_stamp
    `);
    console.log(check.rows[0]);
    console.log("Border clearance upgrade applied.");
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
