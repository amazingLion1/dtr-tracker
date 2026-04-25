// Seed default Admin and Student accounts for the DTR Tracker.
//
// Usage:
//   node scripts/seed-users.js
//
// Required env vars:
//   SUPABASE_URL          – your Supabase project URL
//   SUPABASE_SERVICE_KEY  – your Supabase service_role key (NOT the anon key)
//
// This script will:
//   1. Create an admin auth user (admin@kcp.edu.ph / Admin@1234)
//   2. Create a student auth user (student@kcp.edu.ph / Student@1234)
//   3. Create matching profile rows in the `profiles` table

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables.')
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY before running.')
  console.error('')
  console.error('   Example:')
  console.error('     $env:SUPABASE_URL="https://xxx.supabase.co"')
  console.error('     $env:SUPABASE_SERVICE_KEY="eyJ..."')
  console.error('     node scripts/seed-users.js')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const ACCOUNTS = [
  {
    email: 'admin@kcp.edu.ph',
    password: 'Admin@1234',
    name: 'Admin KCP',
    company: "King's College of the Philippines",
    role: 'supervisor',
  },
  {
    email: 'student@kcp.edu.ph',
    password: 'Student@1234',
    name: 'Juan Dela Cruz',
    company: "King's College of the Philippines",
    role: 'intern',
  },
  {
    email: 'superadmin@kcp.edu.ph',
    password: 'SuperAdmin@1234',
    name: 'Super Admin',
    company: "System Administrator",
    role: 'superadmin',
  },
]

async function seedUser({ email, password, name, company, role }) {
  console.log(`\n── Creating ${role}: ${email} ──`)

  // 1. Create auth user (skip if already exists)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so they can login immediately
  })

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.status === 422) {
      console.log(`   ⚠ Auth user already exists for ${email}, looking up...`)
      // Fetch existing user
      const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers()
      const existing = existingUsers?.find(u => u.email === email)
      if (existing) {
        console.log(`   Found existing auth user: ${existing.id}`)
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_id', existing.id)
          .single()
        if (existingProfile) {
          console.log(`   ✓ Profile already exists. Skipping.`)
          return
        }
        // Create profile for existing auth user
        const { error: pErr } = await supabase
          .from('profiles')
          .insert({ name, company, role, auth_id: existing.id })
        if (pErr) throw pErr
        console.log(`   ✓ Profile created for existing auth user.`)
        return
      }
      throw authError
    }
    throw authError
  }

  const userId = authData.user.id
  console.log(`   ✓ Auth user created: ${userId}`)

  // 2. Create profile row
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ name, company, role, auth_id: userId })

  if (profileError) throw profileError
  console.log(`   ✓ Profile created: ${name} (${role})`)
}

async function run() {
  console.log('🌱 Seeding DTR Tracker accounts...\n')

  for (const account of ACCOUNTS) {
    try {
      await seedUser(account)
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`)
    }
  }

  console.log('\n════════════════════════════════════════')
  console.log('  ✅ Seeding complete!')
  console.log('')
  console.log('  SuperAdmin Login:')
  console.log('    Email:    superadmin@kcp.edu.ph')
  console.log('    Password: SuperAdmin@1234')
  console.log('')
  console.log('  Admin Login:')
  console.log('    Email:    admin@kcp.edu.ph')
  console.log('    Password: Admin@1234')
  console.log('')
  console.log('  Student Login:')
  console.log('    Email:    student@kcp.edu.ph')
  console.log('    Password: Student@1234')
  console.log('════════════════════════════════════════\n')
}

run()
