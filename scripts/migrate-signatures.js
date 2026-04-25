import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const SQL = `
-- 1. Document Signatures
CREATE TABLE IF NOT EXISTS document_signatures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_key      TEXT NOT NULL,
  document_type  TEXT NOT NULL, -- 'dtr' or 'journal'
  role           TEXT NOT NULL, -- 'intern' or 'supervisor'
  signature_data TEXT NOT NULL, -- Base64 Data URL
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, month_key, document_type, role)
);

-- 2. Signature Requests
CREATE TABLE IF NOT EXISTS signature_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_key      TEXT NOT NULL,
  document_type  TEXT NOT NULL, -- 'dtr' or 'journal'
  status         TEXT DEFAULT 'pending', -- 'pending', 'signed'
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, month_key, document_type)
);

-- RLS
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Signatures RLS
DROP POLICY IF EXISTS "sig_select" ON document_signatures;
CREATE POLICY "sig_select" ON document_signatures FOR SELECT TO authenticated
  USING ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );

DROP POLICY IF EXISTS "sig_insert" ON document_signatures;
CREATE POLICY "sig_insert" ON document_signatures FOR INSERT TO authenticated
  WITH CHECK ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );

DROP POLICY IF EXISTS "sig_update" ON document_signatures;
CREATE POLICY "sig_update" ON document_signatures FOR UPDATE TO authenticated
  WITH CHECK ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );

DROP POLICY IF EXISTS "sig_delete" ON document_signatures;
CREATE POLICY "sig_delete" ON document_signatures FOR DELETE TO authenticated
  USING ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );

-- Requests RLS
DROP POLICY IF EXISTS "req_select" ON signature_requests;
CREATE POLICY "req_select" ON signature_requests FOR SELECT TO authenticated
  USING ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );

DROP POLICY IF EXISTS "req_insert" ON signature_requests;
CREATE POLICY "req_insert" ON signature_requests FOR INSERT TO authenticated
  WITH CHECK ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) );

DROP POLICY IF EXISTS "req_update" ON signature_requests;
CREATE POLICY "req_update" ON signature_requests FOR UPDATE TO authenticated
  WITH CHECK ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );

DROP POLICY IF EXISTS "req_delete" ON signature_requests;
CREATE POLICY "req_delete" ON signature_requests FOR DELETE TO authenticated
  USING ( profile_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()) OR public.is_supervisor() );
`

async function run() {
  console.log('🔄 Checking if signature tables exist...')
  
  const { error } = await supabase.from('signature_requests').select('id').limit(1)
  
  if (error && (error.message.includes('does not exist') || error.code === '42P01' || error.message.includes('relation'))) {
    console.log('\n❌ Signature tables missing. Please run the following SQL in your Supabase SQL Editor:\n')
    console.log('='.repeat(80))
    console.log(SQL)
    console.log('='.repeat(80))
  } else if (error) {
    console.log(`⚠️  Error checking tables: ${error.message}`)
  } else {
    console.log('✅ Signature tables already exist!')
  }
}

run()
