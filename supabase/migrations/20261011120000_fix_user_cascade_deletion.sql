-- ==============================================================================
-- Migration: 20261011120000_fix_user_cascade_deletion.sql
-- Description: Ensure ON DELETE CASCADE on all foreign key constraints referencing
--              auth.users(id) and profiles(id) across profiles, wallets, and
--              notifications to prevent HTTP 500 when deleting auth users.
-- Idempotent: Fully safe to run multiple times.
-- ==============================================================================

BEGIN;

-- 1. Helper block: Fix foreign key constraints on public.profiles
--    profiles.id -> auth.users(id) ON DELETE CASCADE
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any existing foreign key constraint on public.profiles referencing auth.users
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.conrelid = 'public.profiles'::regclass
          AND c.contype = 'f'
          AND c.confrelid = 'auth.users'::regclass
    ) LOOP
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I;', r.conname);
    END LOOP;

    -- Re-add standard profiles_id_fkey with ON DELETE CASCADE
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.conname = 'profiles_id_fkey'
          AND c.conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_id_fkey
            FOREIGN KEY (id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;


-- 2. Helper block: Fix foreign key constraints on public.wallets
--    Handles direct reference to auth.users(id) OR reference to profiles(id)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop existing foreign keys on wallets referencing auth.users or profiles
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.conrelid = 'public.wallets'::regclass
          AND c.contype = 'f'
          AND c.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
    ) LOOP
        EXECUTE format('ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS %I;', r.conname);
    END LOOP;

    -- Re-add standard wallets_user_id_fkey referencing profiles(id) ON DELETE CASCADE
    -- Note: profiles.id cascades from auth.users(id), ensuring deletion cascades cleanly.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.conname = 'wallets_user_id_fkey'
          AND c.conrelid = 'public.wallets'::regclass
    ) THEN
        ALTER TABLE public.wallets
            ADD CONSTRAINT wallets_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.profiles(id)
            ON DELETE CASCADE;
    END IF;
END $$;


-- 3. Helper block: Fix foreign key constraints on public.notifications
--    Handles direct reference to auth.users(id) OR reference to profiles(id)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop existing foreign keys on notifications referencing auth.users or profiles
    FOR r IN (
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.conrelid = 'public.notifications'::regclass
          AND c.contype = 'f'
          AND c.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
    ) LOOP
        EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I;', r.conname);
    END LOOP;

    -- Re-add standard notifications_user_id_fkey referencing profiles(id) ON DELETE CASCADE
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND c.conname = 'notifications_user_id_fkey'
          AND c.conrelid = 'public.notifications'::regclass
    ) THEN
        ALTER TABLE public.notifications
            ADD CONSTRAINT notifications_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.profiles(id)
            ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
