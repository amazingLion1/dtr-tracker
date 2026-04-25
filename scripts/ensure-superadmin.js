import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key not found in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createSuperAdmin() {
  const email = 'superadmin@kcp.edu.ph'
  const password = 'SuperAdmin@1234'
  const name = 'KCP SuperAdmin'
  const role = 'superadmin'

  console.log(`Checking if ${email} exists...`)

  // Note: We can't easily check auth users with anon key, 
  // but we can try to sign up or sign in.
  // The best way for the AI is to just try to sign up.
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('Auth user already exists.')
    } else {
      console.error('Error creating auth user:', error.message)
      return
    }
  } else {
    console.log('Auth user created successfully.')
  }

  // Now ensure profile exists
  // We need the auth_id. If we just signed up, it's in data.user.id.
  // If it already existed, we need to find it (which is hard with anon key).
  // But usually, the profile creation is what failed.
  
  if (data?.user?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        auth_id: data.user.id,
        name,
        company: 'KCP Central',
        role
      }, { onConflict: 'auth_id' })

    if (profileError) {
      console.error('Error creating profile:', profileError.message)
    } else {
      console.log('SuperAdmin profile ensured.')
    }
  }
}

createSuperAdmin()
