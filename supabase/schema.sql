-- ============================================================
-- PALPASS – Full Database Schema + RLS Policies
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ── Enable UUID generation ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  national_id          TEXT UNIQUE NOT NULL,
  full_name            TEXT NOT NULL,
  phone                TEXT,
  email                TEXT UNIQUE,
  governorate          TEXT,
  city                 TEXT,
  region               TEXT,
  avatar_url           TEXT,
  verification_doc_url TEXT NOT NULL,
  personal_photo_url   TEXT,
  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  role                 TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','admin','moderator')),
  cv_public            BOOLEAN DEFAULT TRUE,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS: Profiles ────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Admins can see ALL profiles
CREATE POLICY "profiles_admin_all"    ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ════════════════════════════════════════════════════════════
-- 2. CV SECTIONS (Education & Experience)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cv_education (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  degree      TEXT NOT NULL,
  institution TEXT NOT NULL,
  year        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_experience (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  company     TEXT NOT NULL,
  from_year   TEXT,
  to_year     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cv_education  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_edu_own"  ON cv_education  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "cv_exp_own"  ON cv_experience FOR ALL USING (auth.uid() = user_id);
-- Public CV visibility
CREATE POLICY "cv_edu_public"  ON cv_education  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.cv_public = TRUE));
CREATE POLICY "cv_exp_public"  ON cv_experience FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.cv_public = TRUE));

-- ════════════════════════════════════════════════════════════
-- 3. WALLET
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance      NUMERIC(12,2) DEFAULT 0.00,
  currency     TEXT DEFAULT 'ILS',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id   UUID REFERENCES wallets(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  type        TEXT CHECK (type IN ('credit','debit')),
  description TEXT,
  ref_id      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_own"        ON wallets             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wallet_tx_select"  ON wallet_transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));
-- Allow users to INSERT their own wallet transactions (debits/credits from payment actions)
CREATE POLICY "wallet_tx_insert"  ON wallet_transactions FOR INSERT
  WITH CHECK (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));
-- Admins can manage all transactions
CREATE POLICY "wallet_tx_admin"   ON wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 4. NOTIFICATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'system' CHECK (type IN ('system','personal','alert','aid')),
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_own"        ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
-- Service-role (adminClient) can insert notifications for ANY user.
-- The Supabase service_role key bypasses RLS entirely, so this policy
-- is a documentation note; no explicit policy is needed for service_role.
-- HOWEVER: for explicit clarity, allow admin users to also insert via normal auth:
CREATE POLICY "notif_admin_insert" ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL -- service_role (no JWT) — always allowed
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ════════════════════════════════════════════════════════════
-- 5. GOVERNMENT SERVICES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS service_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('passport','id_validation','land_doc','border_crossing','hajj','aid')),
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','approved','rejected')),
  notes        TEXT,
  admin_notes  TEXT,
  attachments  TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER svc_req_updated BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE POLICY "svc_req_own"       ON service_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "svc_req_insert"    ON service_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "svc_req_admin_all" ON service_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 6. VIOLATIONS & BILLS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS violations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  reason      TEXT,
  location    TEXT,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','instalment')),
  issued_at   DATE,
  paid_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  due_date    DATE,
  status      TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid')),
  paid_at     TIMESTAMPTZ
);

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viol_own"  ON violations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "bills_own" ON bills      FOR ALL USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- 7. TRANSPORTATION
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS taxi_offices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  phone       TEXT,
  description TEXT,
  image_url   TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bus_routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_number   TEXT NOT NULL,
  from_city    TEXT NOT NULL,
  to_city      TEXT NOT NULL,
  schedule     JSONB,       -- array of departure times
  driver_name  TEXT,
  driver_image TEXT,
  bus_image    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE taxi_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes   ENABLE ROW LEVEL SECURITY;

-- Public read for approved entries
CREATE POLICY "taxi_public_read" ON taxi_offices FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "bus_public_read"  ON bus_routes   FOR SELECT USING (is_active   = TRUE);
CREATE POLICY "taxi_admin_all"   ON taxi_offices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "bus_admin_all"    ON bus_routes   FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 8. RESTAURANTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS restaurants (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID REFERENCES profiles(id),
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  description  TEXT,
  logo_url     TEXT,
  cover_url    TEXT,
  phone        TEXT,
  pdf_menu_url TEXT,
  tags         TEXT[],
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rest_public_approved" ON restaurants FOR SELECT USING (status = 'approved');
CREATE POLICY "rest_owner_own"       ON restaurants FOR ALL   USING (auth.uid() = owner_id);
CREATE POLICY "rest_admin_all"       ON restaurants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 9. JOBS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS job_postings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_by    UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  organization TEXT NOT NULL,
  type         TEXT DEFAULT 'private' CHECK (type IN ('government','private')),
  location     TEXT,
  description  TEXT,
  salary       TEXT,
  tags         TEXT[],
  image_url    TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','closed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_public_approved" ON job_postings FOR SELECT USING (status = 'approved');
CREATE POLICY "jobs_poster_own"      ON job_postings FOR ALL   USING (auth.uid() = posted_by);
CREATE POLICY "jobs_admin_all"       ON job_postings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 10. NEWS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS news_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  excerpt      TEXT,
  content      TEXT,
  image_url    TEXT,
  category     TEXT,
  source_label TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','published','archived')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_public_published" ON news_posts FOR SELECT USING (status = 'published');
CREATE POLICY "news_author_own"       ON news_posts FOR ALL   USING (auth.uid() = author_id);
CREATE POLICY "news_admin_all"        ON news_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 11. AID / CHARITY
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS aid_packages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT CHECK (type IN ('material','financial','mixed')),
  eligibility   TEXT,
  distribution_date DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aid_claims (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID REFERENCES aid_packages(id),
  user_id    UUID REFERENCES profiles(id),
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','claimed')),
  claimed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS donations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id     UUID REFERENCES profiles(id),
  initiative   TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  wallet_ref   UUID,
  donated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aid_claims   ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aid_public"       ON aid_packages FOR SELECT USING (is_active = TRUE);
CREATE POLICY "aid_claims_own"   ON aid_claims   FOR ALL   USING (auth.uid() = user_id);
CREATE POLICY "donations_own"    ON donations    FOR ALL   USING (auth.uid() = donor_id);
CREATE POLICY "aid_admin_all"    ON aid_packages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ════════════════════════════════════════════════════════════
-- 12. STORAGE BUCKETS (run separately in Supabase dashboard or via API)
-- ════════════════════════════════════════════════════════════
-- Create the following buckets in Supabase Dashboard → Storage:
-- • "avatars"           → public  (profile photos)
-- • "verification-docs" → private (ID verification uploads)
-- • "menus"             → public  (restaurant PDF menus)
-- • "restaurant-images" → public  (restaurant cover/logo)
-- • "job-images"        → public  (job posting images)

-- ════════════════════════════════════════════════════════════
-- 13. SEED: Initial Admin User (run AFTER creating your auth user)
-- Replace '00000000-0000-0000-0000-000000000000' with your actual Supabase user UUID
-- ════════════════════════════════════════════════════════════
-- INSERT INTO profiles (id, national_id, full_name, email, role, is_verified, status)
-- VALUES ('YOUR_ADMIN_UUID', '000000000', 'System Admin', 'admin@palpass.gov', 'admin', TRUE, 'active');

-- Seed mock wallet for testing (run after profile is created)
-- INSERT INTO wallets (user_id, balance, currency) VALUES ('YOUR_USER_UUID', 34500.00, 'ILS');

-- Seed mock violations for testing
-- INSERT INTO violations (user_id, type, reason, location, amount, status, issued_at)
-- VALUES ('YOUR_USER_UUID', 'Traffic Ticket', 'Speeding 90km/h in 60 zone', 'Ramallah-Jerusalem Rd', 500, 'unpaid', '2026-02-15');

-- Seed mock bills
-- INSERT INTO bills (user_id, provider, amount, due_date, status)
-- VALUES ('YOUR_USER_UUID', 'Jerusalem District Electricity Co.', 320.50, '2026-03-25', 'unpaid');
