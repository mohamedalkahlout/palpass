/**
 * PALPASS Super-App unified migration + civic seeds.
 * Phase 1 gate: DDL (11 modules) + RLS + indexes + RPC + seed accredited citizen.
 *
 * Usage: node scripts/migrate-superapp-unified.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
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

const DDL = `
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Indexes on existing core tables
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON wallet_transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests (created_at);

CREATE TABLE IF NOT EXISTS civic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('driving_license', 'vehicle_registration', 'health_insurance', 'family_book')),
  doc_number TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_civic_documents_user_id ON civic_documents (user_id);

CREATE TABLE IF NOT EXISTS border_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crossing_name TEXT NOT NULL CHECK (crossing_name IN ('karameh_bridge', 'rafah_crossing', 'erez_crossing')),
  travel_date DATE NOT NULL,
  travel_purpose TEXT NOT NULL,
  companions_count INT NOT NULL DEFAULT 0,
  permit_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'approved', 'rejected')),
  qr_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_border_permits_user_id ON border_permits (user_id);

CREATE TABLE IF NOT EXISTS civic_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ministry_code TEXT NOT NULL,
  ministry_name_ar TEXT NOT NULL,
  ministry_name_en TEXT NOT NULL,
  service_name_ar TEXT NOT NULL,
  service_name_en TEXT NOT NULL,
  branch_location_ar TEXT NOT NULL,
  branch_location_en TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  booking_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'attended', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_civic_appointments_user_id ON civic_appointments (user_id);

CREATE TABLE IF NOT EXISTS hajj_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_year INT NOT NULL DEFAULT 2026,
  mahram_name TEXT,
  health_status TEXT NOT NULL DEFAULT 'fit' CHECK (health_status IN ('fit', 'chronic_condition', 'needs_companion')),
  lottery_status TEXT NOT NULL DEFAULT 'registered' CHECK (lottery_status IN ('registered', 'nominated', 'accepted', 'deferred')),
  priority_points INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hajj_applications_user_id ON hajj_applications (user_id);

CREATE TABLE IF NOT EXISTS justice_powers_of_attorney (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_national_id TEXT NOT NULL,
  agent_full_name TEXT NOT NULL,
  poa_type TEXT NOT NULL CHECK (poa_type IN ('general', 'real_estate', 'legal_litigation', 'banking', 'vehicle')),
  poa_number TEXT NOT NULL UNIQUE,
  terms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poa_principal_id ON justice_powers_of_attorney (principal_id);

CREATE TABLE IF NOT EXISTS criminal_clearance_certs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cert_number TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('processing', 'issued', 'rejected')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qr_verification_token TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_criminal_certs_user_id ON criminal_clearance_certs (user_id);

CREATE TABLE IF NOT EXISTS charity_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gaza_relief', 'debtors', 'orphans', 'healthcare', 'winter_aid')),
  target_amount NUMERIC(12, 2) NOT NULL,
  collected_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  beneficiaries_count INT NOT NULL DEFAULT 0,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charity_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES charity_campaigns(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  receipt_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_charity_contrib_donor ON charity_contributions (donor_id);
CREATE INDEX IF NOT EXISTS idx_charity_contrib_campaign ON charity_contributions (campaign_id);

CREATE TABLE IF NOT EXISTS civic_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('water_network', 'electricity', 'roads_potholes', 'price_gouging', 'sanitation')),
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  location_description TEXT NOT NULL,
  details TEXT NOT NULL,
  photo_url TEXT,
  report_tracking_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_investigation', 'assigned', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_civic_reports_user_id ON civic_incident_reports (user_id);

CREATE TABLE IF NOT EXISTS medical_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  chronic_diseases TEXT[],
  allergies TEXT[],
  primary_health_center TEXT NOT NULL,
  insurance_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vaccination_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vaccine_name_ar TEXT NOT NULL,
  vaccine_name_en TEXT NOT NULL,
  dose_number INT NOT NULL,
  administered_date DATE NOT NULL,
  health_facility TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vaccination_user_id ON vaccination_records (user_id);

CREATE TABLE IF NOT EXISTS aid_ration_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL UNIQUE,
  household_size INT NOT NULL DEFAULT 1,
  ration_status TEXT NOT NULL DEFAULT 'eligible' CHECK (ration_status IN ('eligible', 'disbursed', 'under_review')),
  next_distribution_cycle TEXT NOT NULL,
  center_location_ar TEXT NOT NULL,
  center_location_en TEXT NOT NULL,
  qr_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aid_ration_user_id ON aid_ration_cards (user_id);

CREATE TABLE IF NOT EXISTS commercial_trade_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name_ar TEXT NOT NULL,
  business_name_en TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  activity_type TEXT NOT NULL,
  governorate TEXT NOT NULL,
  inspection_status TEXT NOT NULL DEFAULT 'compliant' CHECK (inspection_status IN ('compliant', 'inspection_due', 'violation_issued')),
  expires_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_licenses_owner ON commercial_trade_licenses (owner_id);

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'interview', 'rejected', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_job_apps_user_id ON job_applications (user_id);

ALTER TABLE criminal_clearance_certs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE criminal_clearance_certs SET created_at = COALESCE(created_at, issued_at, NOW()) WHERE created_at IS NULL;
ALTER TABLE criminal_clearance_certs ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE aid_ration_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE aid_ration_cards SET created_at = COALESCE(created_at, updated_at, NOW()) WHERE created_at IS NULL;
ALTER TABLE aid_ration_cards ALTER COLUMN created_at SET DEFAULT NOW();

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

-- RLS
ALTER TABLE civic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE border_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hajj_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE justice_powers_of_attorney ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_clearance_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aid_ration_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_trade_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own documents" ON civic_documents;
CREATE POLICY "Users read own documents" ON civic_documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own border permits" ON border_permits;
CREATE POLICY "Users access own border permits" ON border_permits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own appointments" ON civic_appointments;
CREATE POLICY "Users access own appointments" ON civic_appointments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own hajj apps" ON hajj_applications;
CREATE POLICY "Users access own hajj apps" ON hajj_applications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own POA" ON justice_powers_of_attorney;
CREATE POLICY "Users access own POA" ON justice_powers_of_attorney FOR ALL USING (auth.uid() = principal_id) WITH CHECK (auth.uid() = principal_id);

DROP POLICY IF EXISTS "Users read own criminal certs" ON criminal_clearance_certs;
CREATE POLICY "Users read own criminal certs" ON criminal_clearance_certs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read charity campaigns" ON charity_campaigns;
CREATE POLICY "Public read charity campaigns" ON charity_campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users access own contributions" ON charity_contributions;
CREATE POLICY "Users access own contributions" ON charity_contributions FOR ALL USING (auth.uid() = donor_id) WITH CHECK (auth.uid() = donor_id);

DROP POLICY IF EXISTS "Users access own reports" ON civic_incident_reports;
CREATE POLICY "Users access own reports" ON civic_incident_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own medical" ON medical_profiles;
CREATE POLICY "Users access own medical" ON medical_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own vaccines" ON vaccination_records;
CREATE POLICY "Users read own vaccines" ON vaccination_records FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own ration cards" ON aid_ration_cards;
CREATE POLICY "Users read own ration cards" ON aid_ration_cards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own trade licenses" ON commercial_trade_licenses;
CREATE POLICY "Users access own trade licenses" ON commercial_trade_licenses FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users access own job apps" ON job_applications;
CREATE POLICY "Users access own job apps" ON job_applications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic charity contribution RPC (row lock + ledger)
CREATE OR REPLACE FUNCTION public.contribute_to_charity(
  p_campaign_id UUID,
  p_amount NUMERIC,
  p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS TABLE(receipt_number TEXT, new_balance NUMERIC, campaign_collected NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_wallet wallets%ROWTYPE;
  v_campaign charity_campaigns%ROWTYPE;
  v_receipt TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT * INTO v_campaign FROM charity_campaigns WHERE id = p_campaign_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND';
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE wallets SET balance = balance - p_amount, last_updated = NOW() WHERE id = v_wallet.id
  RETURNING balance INTO new_balance;

  UPDATE charity_campaigns
  SET collected_amount = collected_amount + p_amount
  WHERE id = p_campaign_id
  RETURNING collected_amount INTO campaign_collected;

  v_receipt := 'EHSAN-PS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO charity_contributions (campaign_id, donor_id, amount, is_anonymous, receipt_number)
  VALUES (p_campaign_id, v_uid, p_amount, COALESCE(p_is_anonymous, false), v_receipt);

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id)
  VALUES (v_wallet.id, -p_amount, 'debit', 'Charity contribution / مساهمة خيرية', v_receipt);

  receipt_number := v_receipt;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.contribute_to_charity(UUID, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribute_to_charity(UUID, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contribute_to_charity(UUID, NUMERIC, BOOLEAN) TO service_role;

-- Ensure RLS helper is callable by citizen JWTs (profiles_admin_all evaluates is_admin())
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

COMMIT;
`;

async function seedCitizen(client, userId) {
  const qr = crypto.randomBytes(16).toString("hex");

  await client.query(
    `UPDATE profiles SET status = 'active', is_verified = true, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
  await client.query(
    `INSERT INTO wallets (user_id, balance, currency)
     VALUES ($1, 500.00, 'ILS')
     ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(wallets.balance, 500.00), last_updated = NOW()`,
    [userId]
  );

  const docs = [
    [
      userId,
      "driving_license",
      "DL-PS-2026-88421",
      "رخصة قيادة خصوصية — فئة B",
      "Private Driving License — Class B",
      "2030-12-31",
      JSON.stringify({ class: "B", blood_type: "O+", issuing_authority: "وزارة النقل والمواصلات" }),
    ],
    [
      userId,
      "vehicle_registration",
      "VR-PS-7-22481",
      "رخصة مركبة — هيونداي أكسنت 2022",
      "Vehicle Registration — Hyundai Accent 2022",
      "2027-06-30",
      JSON.stringify({ make: "Hyundai", model: "Accent", year: 2022, plate: "7-22481" }),
    ],
    [
      userId,
      "health_insurance",
      "HI-PS-GZA-99102",
      "بطاقة التأمين الصحي الوطني",
      "National Health Insurance Card",
      "2026-12-31",
      JSON.stringify({ provider: "وزارة الصحة", coverage: "شامل" }),
    ],
  ];
  for (const d of docs) {
    await client.query(
      `INSERT INTO civic_documents (user_id, doc_type, doc_number, title_ar, title_en, expiry_date, meta_data, status)
       VALUES ($1,$2,$3,$4,$5,$6::date,$7::jsonb,'active')
       ON CONFLICT (doc_number) DO NOTHING`,
      d
    );
  }

  await client.query(
    `INSERT INTO border_permits (user_id, crossing_name, travel_date, travel_purpose, companions_count, permit_number, status, qr_token)
     SELECT $1, 'karameh_bridge', CURRENT_DATE + 14, 'زيارة عائلية / Family visit', 1, 'BRD-KAR-2026-4412', 'approved', $2
     WHERE NOT EXISTS (SELECT 1 FROM border_permits WHERE permit_number = 'BRD-KAR-2026-4412')`,
    [userId, qr]
  );

  await client.query(
    `INSERT INTO civic_appointments (
       user_id, ministry_code, ministry_name_ar, ministry_name_en,
       service_name_ar, service_name_en, branch_location_ar, branch_location_en,
       appointment_date, time_slot, booking_reference, status
     ) SELECT $1, 'MOT', 'وزارة النقل والمواصلات', 'Ministry of Transport',
       'تجديد رخصة القيادة', 'Driving License Renewal', 'مديرية النقل — دير البلح', 'Transport Directorate — Deir al-Balah',
       CURRENT_DATE + 7, '10:30', 'PAL-APT-7721', 'confirmed'
     WHERE NOT EXISTS (SELECT 1 FROM civic_appointments WHERE booking_reference = 'PAL-APT-7721')`,
    [userId]
  );

  await client.query(
    `INSERT INTO justice_powers_of_attorney (
       principal_id, agent_national_id, agent_full_name, poa_type, poa_number, terms, status, expires_at
     ) SELECT $1, '405050505', 'أحمد محمود دياب', 'general', 'POA-2026-9481',
       'وكالة عامة لإتمام المعاملات المدنية والمالية أمام الجهات الرسمية.', 'active', CURRENT_DATE + 365
     WHERE NOT EXISTS (SELECT 1 FROM justice_powers_of_attorney WHERE poa_number = 'POA-2026-9481')`,
    [userId]
  );

  await client.query(
    `INSERT INTO criminal_clearance_certs (user_id, cert_number, purpose, status, qr_verification_token)
     SELECT $1, 'CCC-PS-2026-3318', 'توظيف حكومي / Government employment', 'issued', $2
     WHERE NOT EXISTS (SELECT 1 FROM criminal_clearance_certs WHERE cert_number = 'CCC-PS-2026-3318')`,
    [userId, crypto.randomBytes(12).toString("hex")]
  );

  const campaigns = [
    [
      "إغاثة غزة العاجلة",
      "Urgent Gaza Relief",
      "دعم الأسر المتضررة بالمواد الغذائية والطبية في قطاع غزة.",
      "Food and medical support for affected families in Gaza.",
      "gaza_relief",
      250000,
      87500,
      4200,
      true,
    ],
    [
      "فك كرب الغارمين",
      "Debtors Relief Fund",
      "مساهمة وطنية لسداد ديون المواطنين المتعثرين.",
      "National fund to relieve citizens burdened by debt.",
      "debtors",
      100000,
      31200,
      180,
      true,
    ],
    [
      "حملة الشتاء الدافئ",
      "Winter Aid Campaign",
      "بطانيات ووقود تدفئة للعائلات في المخيمات والمناطق الباردة.",
      "Blankets and heating support for families in camps and cold regions.",
      "winter_aid",
      80000,
      22150,
      960,
      true,
    ],
  ];
  for (const c of campaigns) {
    await client.query(
      `INSERT INTO charity_campaigns (
         title_ar, title_en, description_ar, description_en, category,
         target_amount, collected_amount, beneficiaries_count, is_featured, status
       ) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,'active'
       WHERE NOT EXISTS (SELECT 1 FROM charity_campaigns WHERE title_en = $2)`,
      c
    );
  }

  await client.query(
    `INSERT INTO medical_profiles (user_id, blood_type, chronic_diseases, allergies, primary_health_center, insurance_number)
     VALUES ($1, 'O+', ARRAY[]::text[], ARRAY['Penicillin']::text[], 'مركز دير البلح الصحي الأولي', 'HI-PS-GZA-99102')
     ON CONFLICT (user_id) DO UPDATE SET
       blood_type = EXCLUDED.blood_type,
       allergies = EXCLUDED.allergies,
       primary_health_center = EXCLUDED.primary_health_center,
       insurance_number = EXCLUDED.insurance_number`,
    [userId]
  );

  await client.query(
    `INSERT INTO vaccination_records (user_id, vaccine_name_ar, vaccine_name_en, dose_number, administered_date, health_facility, batch_number)
     SELECT $1, 'كوفيد-19 (فايزر)', 'COVID-19 (Pfizer)', 2, '2024-03-15', 'مركز دير البلح الصحي', 'PF-88421'
     WHERE NOT EXISTS (
       SELECT 1 FROM vaccination_records WHERE user_id = $1 AND vaccine_name_en = 'COVID-19 (Pfizer)' AND dose_number = 2
     )`,
    [userId]
  );
  await client.query(
    `INSERT INTO vaccination_records (user_id, vaccine_name_ar, vaccine_name_en, dose_number, administered_date, health_facility, batch_number)
     SELECT $1, 'الإنفلونزا الموسمية', 'Seasonal Influenza', 1, '2025-11-02', 'مركز دير البلح الصحي', 'FLU-2025-11'
     WHERE NOT EXISTS (
       SELECT 1 FROM vaccination_records WHERE user_id = $1 AND vaccine_name_en = 'Seasonal Influenza' AND dose_number = 1
     )`,
    [userId]
  );

  await client.query(
    `INSERT INTO aid_ration_cards (
       user_id, card_number, household_size, ration_status, next_distribution_cycle,
       center_location_ar, center_location_en, qr_hash
     ) SELECT $1, 'RATION-PS-55201', 5, 'eligible', 'أكتوبر 2026 / October 2026',
       'مركز التوزيع — دير البلح', 'Distribution Center — Deir al-Balah', $2
     WHERE NOT EXISTS (SELECT 1 FROM aid_ration_cards WHERE card_number = 'RATION-PS-55201')`,
    [userId, crypto.randomBytes(16).toString("hex")]
  );

  await client.query(
    `INSERT INTO commercial_trade_licenses (
       owner_id, business_name_ar, business_name_en, license_number, activity_type, governorate, inspection_status, expires_at
     ) SELECT $1, 'شركة دياب للخدمات اللوجستية', 'Diab Logistics Co.', 'TRD-GZA-2026-118',
       'نقل وبضائع / Freight & logistics', 'Gaza', 'compliant', CURRENT_DATE + 400
     WHERE NOT EXISTS (SELECT 1 FROM commercial_trade_licenses WHERE license_number = 'TRD-GZA-2026-118')`,
    [userId]
  );

  await client.query(
    `INSERT INTO hajj_applications (user_id, season_year, mahram_name, health_status, lottery_status, priority_points)
     SELECT $1, 2026, NULL, 'fit', 'registered', 120
     WHERE NOT EXISTS (SELECT 1 FROM hajj_applications WHERE user_id = $1 AND season_year = 2026)`,
    [userId]
  );
}

async function main() {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  const client = await pool.connect();
  try {
    console.log("[Phase 1] Running DDL + RLS + RPC…");
    await client.query(DDL);
    console.log("[Phase 1] DDL committed.");

    const { rows: pending } = await client.query(
      `SELECT id, national_id, full_name FROM profiles
       WHERE role = 'citizen' AND status = 'pending'
       ORDER BY created_at ASC LIMIT 1`
    );
    if (!pending[0]) {
      console.warn("[Phase 1] No pending citizen to accredit/seed.");
    } else {
      console.log(`[Phase 1] Seeding accredited demo citizen: ${pending[0].full_name} (${pending[0].national_id})`);
      await client.query("BEGIN");
      await seedCitizen(client, pending[0].id);
      await client.query("COMMIT");
    }

    const verify = await client.query(`
      SELECT t AS table_name, (
        SELECT count(*)::int FROM information_schema.tables
        WHERE table_schema='public' AND table_name = t
      ) AS exists_flag,
      CASE t
        WHEN 'civic_documents' THEN (SELECT count(*)::int FROM civic_documents)
        WHEN 'border_permits' THEN (SELECT count(*)::int FROM border_permits)
        WHEN 'civic_appointments' THEN (SELECT count(*)::int FROM civic_appointments)
        WHEN 'hajj_applications' THEN (SELECT count(*)::int FROM hajj_applications)
        WHEN 'justice_powers_of_attorney' THEN (SELECT count(*)::int FROM justice_powers_of_attorney)
        WHEN 'criminal_clearance_certs' THEN (SELECT count(*)::int FROM criminal_clearance_certs)
        WHEN 'charity_campaigns' THEN (SELECT count(*)::int FROM charity_campaigns)
        WHEN 'charity_contributions' THEN (SELECT count(*)::int FROM charity_contributions)
        WHEN 'civic_incident_reports' THEN (SELECT count(*)::int FROM civic_incident_reports)
        WHEN 'medical_profiles' THEN (SELECT count(*)::int FROM medical_profiles)
        WHEN 'vaccination_records' THEN (SELECT count(*)::int FROM vaccination_records)
        WHEN 'aid_ration_cards' THEN (SELECT count(*)::int FROM aid_ration_cards)
        WHEN 'commercial_trade_licenses' THEN (SELECT count(*)::int FROM commercial_trade_licenses)
        WHEN 'job_applications' THEN (SELECT count(*)::int FROM job_applications)
      END AS row_count
      FROM unnest(ARRAY[
        'civic_documents','border_permits','civic_appointments','hajj_applications',
        'justice_powers_of_attorney','criminal_clearance_certs','charity_campaigns',
        'charity_contributions','civic_incident_reports','medical_profiles',
        'vaccination_records','aid_ration_cards','commercial_trade_licenses','job_applications'
      ]) AS t
    `);

    console.log("\n[Phase 1 Verification]");
    console.table(verify.rows);

    const missing = verify.rows.filter((r) => r.exists_flag === 0);
    if (missing.length) {
      console.error("FAIL: missing tables", missing);
      process.exitCode = 1;
    } else {
      console.log("✅ Phase 1 PASSED — all tables present, seeds applied.");
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
