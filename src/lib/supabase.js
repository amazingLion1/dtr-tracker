import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Main Supabase client — persists auth session
let supabase = null

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} else {
  console.warn(
    '[DTR Tracker] Supabase credentials not configured.\n' +
    'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

/**
 * Creates a temporary Supabase client that does NOT persist sessions.
 * Used by admins to sign up new users without logging themselves out.
 */
export function createTempClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export { supabase }
