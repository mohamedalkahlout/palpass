-- ============================================================
-- PALPASS — Align profiles to the civic identity model
-- Safe to run more than once (IF EXISTS / IF NOT EXISTS).
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_doc_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE profiles
SET governorate = region
WHERE (governorate IS NULL OR btrim(governorate) = '')
  AND region IS NOT NULL
  AND btrim(region) <> '';

UPDATE profiles
SET region = governorate
WHERE (region IS NULL OR btrim(region) = '')
  AND governorate IS NOT NULL
  AND btrim(governorate) <> '';

UPDATE profiles
SET verification_doc_url = ''
WHERE verification_doc_url IS NULL;

UPDATE profiles
SET is_verified = FALSE
WHERE is_verified IS NULL;

UPDATE profiles
SET role = 'moderator'
WHERE role = 'provider';

UPDATE profiles
SET role = 'citizen'
WHERE role IS NULL OR role NOT IN ('citizen', 'admin', 'moderator');

UPDATE profiles
SET status = 'active'
WHERE status = 'approved';

UPDATE profiles
SET status = 'suspended'
WHERE status = 'rejected';

UPDATE profiles
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending', 'active', 'suspended');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('citizen', 'admin', 'moderator'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'suspended'));

ALTER TABLE profiles ALTER COLUMN verification_doc_url SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN is_verified SET DEFAULT FALSE;
ALTER TABLE profiles ALTER COLUMN is_verified SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'citizen';
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE profiles ALTER COLUMN status SET NOT NULL;
