// Schema setup for Supabase PostgreSQL
// Run once: DATABASE_URL=postgresql://... node scripts/create-schema.js
//
// Requires DATABASE_URL environment variable.

import pg from 'pg'

const { Client } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ Missing DATABASE_URL environment variable.')
  console.error('   Usage: DATABASE_URL=postgresql://... node scripts/create-schema.js')
  process.exit(1)
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

const SQL = `
-- ╔════════════════════════════════════════════════════════════════════╗
-- ║  DTR Tracker Schema  (with Supabase Auth integration)            ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  company    TEXT NOT NULL,
  role       TEXT DEFAULT 'intern',
  required_hours INT DEFAULT 486,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add auth_id if table already exists without it
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Migration: add role if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'intern';
  END IF;
END $$;

-- Migration: add required_hours if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'required_hours'
  ) THEN
    ALTER TABLE profiles ADD COLUMN required_hours INT DEFAULT 486;
  END IF;
END $$;

-- 2. DTR Entries
CREATE TABLE IF NOT EXISTS dtr_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  time_in_am  TEXT,
  time_out_am TEXT,
  time_in_pm  TEXT,
  time_out_pm TEXT,
  status_tag  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dtr_entries' AND column_name = 'status_tag'
  ) THEN
    ALTER TABLE dtr_entries ADD COLUMN status_tag TEXT;
  END IF;
END $$;

-- 3. Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  month       INT NOT NULL,
  week_num    INT NOT NULL CHECK (week_num BETWEEN 1 AND 5),
  task        TEXT DEFAULT '',
  doc_note    TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, year, month, week_num)
);

-- 4. DTR Approvals (server-side approval storage)
CREATE TABLE IF NOT EXISTS dtr_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_key   TEXT NOT NULL,  -- format: 'YYYY-MM'
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, month_key)
);

-- ╔════════════════════════════════════════════════════════════════════╗
-- ║  Row Level Security                                               ║
-- ╚════════════════════════════════════════════════════════════════════╝

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dtr_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dtr_approvals   ENABLE ROW LEVEL SECURITY;

-- Drop old wide-open policies if they exist
DROP POLICY IF EXISTS "anon_all" ON profiles;
DROP POLICY IF EXISTS "anon_all" ON dtr_entries;
DROP POLICY IF EXISTS "anon_all" ON journal_entries;

-- Helper: is the current user a supervisor?
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'supervisor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- SELECT: own profile, or all if supervisor
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING ( auth_id = auth.uid() OR public.is_supervisor() );

-- INSERT: only supervisors can create profiles
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK ( public.is_supervisor() );

-- UPDATE: own profile, or any if supervisor
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING ( auth_id = auth.uid() OR public.is_supervisor() );

-- DELETE: only supervisors
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated
  USING ( public.is_supervisor() );

-- ── DTR Entries ───────────────────────────────────────────────────────────────
-- Own entries, or all if supervisor
DROP POLICY IF EXISTS "dtr_select" ON dtr_entries;
CREATE POLICY "dtr_select" ON dtr_entries FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "dtr_insert" ON dtr_entries;
CREATE POLICY "dtr_insert" ON dtr_entries FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "dtr_update" ON dtr_entries;
CREATE POLICY "dtr_update" ON dtr_entries FOR UPDATE TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "dtr_delete" ON dtr_entries;
CREATE POLICY "dtr_delete" ON dtr_entries FOR DELETE TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

-- ── Journal Entries ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "journal_select" ON journal_entries;
CREATE POLICY "journal_select" ON journal_entries FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "journal_insert" ON journal_entries;
CREATE POLICY "journal_insert" ON journal_entries FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "journal_update" ON journal_entries;
CREATE POLICY "journal_update" ON journal_entries FOR UPDATE TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "journal_delete" ON journal_entries;
CREATE POLICY "journal_delete" ON journal_entries FOR DELETE TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

-- ── DTR Approvals ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approvals_select" ON dtr_approvals;
CREATE POLICY "approvals_select" ON dtr_approvals FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR public.is_supervisor()
  );

DROP POLICY IF EXISTS "approvals_insert" ON dtr_approvals;
CREATE POLICY "approvals_insert" ON dtr_approvals FOR INSERT TO authenticated
  WITH CHECK ( public.is_supervisor() );

DROP POLICY IF EXISTS "approvals_update" ON dtr_approvals;
CREATE POLICY "approvals_update" ON dtr_approvals FOR UPDATE TO authenticated
  WITH CHECK ( public.is_supervisor() );

DROP POLICY IF EXISTS "approvals_delete" ON dtr_approvals;
CREATE POLICY "approvals_delete" ON dtr_approvals FOR DELETE TO authenticated
  USING ( public.is_supervisor() );
`

async function run() {
  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('Connected! Running schema SQL...')
    await client.query(SQL)
    console.log('✅ Schema created successfully!')
    console.log('   Tables: profiles, dtr_entries, journal_entries, dtr_approvals')
    console.log('   RLS: Auth-based policies (own data + supervisor override)')
    console.log('   Function: public.is_supervisor()')
    console.log('   New: required_hours column on profiles')
    console.log('   New: dtr_approvals table for server-side approval storage')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
