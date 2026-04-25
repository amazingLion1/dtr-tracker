/**
 * DTR Tracker v2 Migration — uses Supabase JS client with service role key.
 * No extra dependencies needed.
 * 
 * Run: node scripts/migrate-v2.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
})

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function migrate() {
  console.log('🔄 DTR Tracker v2 Migration\n')

  // ── 1. Test required_hours column ─────────────────────────────────────────
  console.log('1️⃣  Checking required_hours column on profiles...')
  const { data: profileTest, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name, required_hours')
    .limit(5)

  if (profileErr && profileErr.message.includes('required_hours')) {
    console.log('   ❌ Column missing — needs manual SQL (see below)')
  } else if (profileErr) {
    console.log(`   ⚠️  ${profileErr.message}`)
  } else {
    console.log(`   ✅ Column exists! ${profileTest.length} profiles:`)
    profileTest.forEach(p => console.log(`      • ${p.name}: ${p.required_hours ?? 486} hrs target`))
  }

  // ── 2. Test dtr_approvals table ───────────────────────────────────────────
  console.log('\n2️⃣  Checking dtr_approvals table...')
  const { data: approvalTest, error: approvalErr } = await supabase
    .from('dtr_approvals')
    .select('id')
    .limit(1)

  if (approvalErr && (approvalErr.message.includes('does not exist') || approvalErr.code === '42P01' || approvalErr.message.includes('relation'))) {
    console.log('   ❌ Table missing — needs manual SQL (see below)')
  } else if (approvalErr) {
    console.log(`   ⚠️  ${approvalErr.message}`)
  } else {
    console.log(`   ✅ Table exists! ${approvalTest.length} approvals found`)
  }

  // ── 3. Verify all tables ──────────────────────────────────────────────────
  console.log('\n3️⃣  Table verification:')
  for (const table of ['profiles', 'dtr_entries', 'journal_entries', 'dtr_approvals']) {
    const { error } = await supabase.from(table).select('id').limit(1)
    const status = error ? (error.message.includes('does not exist') ? '❌ MISSING' : `⚠️  ${error.message}`) : '✅ OK'
    console.log(`   ${table}: ${status}`)
  }

  // ── Print SQL for anything missing ────────────────────────────────────────
  const needsSQL = []
  
  if (profileErr && profileErr.message.includes('required_hours')) {
    needsSQL.push('ALTER TABLE profiles ADD COLUMN required_hours INT DEFAULT 486;')
  }

  const { error: approvalCheck } = await supabase.from('dtr_approvals').select('id').limit(1)
  if (approvalCheck && (approvalCheck.message.includes('does not exist') || approvalCheck.code === '42P01' || approvalCheck.message.includes('relation'))) {
    needsSQL.push(`
CREATE TABLE dtr_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_key   TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, month_key)
);

ALTER TABLE dtr_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select" ON dtr_approvals FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor());

CREATE POLICY "approvals_insert" ON dtr_approvals FOR INSERT TO authenticated
  WITH CHECK (public.is_supervisor());

CREATE POLICY "approvals_update" ON dtr_approvals FOR UPDATE TO authenticated
  WITH CHECK (public.is_supervisor());

CREATE POLICY "approvals_delete" ON dtr_approvals FOR DELETE TO authenticated
  USING (public.is_supervisor());`)
  }

  if (needsSQL.length > 0) {
    console.log('\n' + '='.repeat(60))
    console.log('📋 SQL to run in Supabase SQL Editor:')
    console.log('='.repeat(60))
    console.log(needsSQL.join('\n\n'))
    console.log('='.repeat(60))
  } else {
    console.log('\n🎉 All v2 features are ready! No SQL changes needed.')
  }
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
