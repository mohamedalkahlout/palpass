-- ============================================================
-- PALPASS – Auth System Migration
-- Run this in Supabase SQL Editor to ensure the schema supports
-- the National ID-based authentication system.
-- All changes are safe to run on an existing database (IF NOT EXISTS / idempotent).
-- ============================================================

-- ── 1. Ensure national_id column exists and is properly constrained ───
-- (Already in the main schema, but safe to run as a migration check)
DO $$
BEGIN
  -- Add national_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'national_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN national_id TEXT UNIQUE NOT NULL DEFAULT '';
  END IF;
END$$;

-- ── 2. Create index for fast National ID lookups ──────────────────────
-- This is critical since every login requires a national_id → email lookup
CREATE INDEX IF NOT EXISTS idx_profiles_national_id ON profiles(national_id);

-- ── 3. Ensure email column is not used as primary login identifier ─────
-- email remains in profiles for notification-only purposes.
-- No changes needed to the column itself — just a documentation note.
-- IMPORTANT: Supabase Auth still uses email internally (transparent to users).
-- Users only ever see/enter their National ID.

-- ── 4. Remove any stray password column from profiles (if it ever existed) ─
-- Passwords are ONLY stored in Supabase Auth (auth.users), never in profiles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'password'
  ) THEN
    ALTER TABLE profiles DROP COLUMN password;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE profiles DROP COLUMN password_hash;
  END IF;
END$$;

-- ── 5. RLS Policy: Allow service role to query profiles by national_id ─
-- The admin (service_role) client bypasses RLS automatically.
-- No additional policy needed for the service role.

-- ── 6. Verify the profiles table structure ────────────────────────────
-- Expected columns after migration:
--   id UUID PK (= auth.users.id)
--   national_id TEXT UNIQUE NOT NULL   ← used as the public login identifier
--   full_name TEXT NOT NULL
--   phone TEXT
--   email TEXT UNIQUE                  ← for notifications only, not login
--   region TEXT
--   city TEXT
--   avatar_url TEXT
--   verification_doc_url TEXT
--   is_verified BOOLEAN
--   role TEXT ('citizen'|'admin'|'moderator')
--   cv_public BOOLEAN
--   status TEXT ('pending'|'active'|'suspended')
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ
-- ============================================================
