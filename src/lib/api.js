import { supabase, createTempClient } from './supabase'

/**
 * Helper: throws if supabase is not configured.
 */
function requireSupabase() {
  if (!supabase) throw new Error('Supabase not configured')
}

/**
 * Advanced: Retry wrapper for API calls to handle network flakiness.
 */
async function withRetry(fn, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Don't retry auth errors or missing data
      if (error.status === 401 || error.status === 403 || error.status === 404) throw error;
      if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw lastError;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  })
}

export async function signOut() {
  requireSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  requireSupabase()
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
  return supabase.auth.onAuthStateChange(callback)
}

export async function resetPassword(email) {
  requireSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

/** Change password for the currently logged-in user */
export async function changePassword(newPassword) {
  requireSupabase()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

/** Fetch the profile linked to the currently logged-in auth user. */
export async function fetchMyProfile(authId) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, company, role, auth_id, created_at, required_hours')
      .eq('auth_id', authId)
      .single()
    if (error) throw error
    return data
  })
}

/** Fetch all profiles (RLS will filter based on role). */
export async function fetchProfiles() {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, company, role, auth_id, created_at, required_hours')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  })
}

/** Fetch all supervisors (now allowed by the new RLS policy). */
export async function fetchSupervisors() {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, company')
      .eq('role', 'supervisor')
    if (error) throw error
    return data
  })
}

/** Create a new profile in Supabase, returns the created row. */
export async function createProfile(name, company, role = 'intern', authId = null) {
  requireSupabase()
  const insertData = { name, company, role }
  if (authId) insertData.auth_id = authId
  const { data, error } = await supabase
    .from('profiles')
    .insert(insertData)
    .select('id, name, company, role')
    .single()
  if (error) throw error
  return data
}

/** Update a profile's editable fields. */
export async function updateProfile(profileId, fields) {
  requireSupabase()
  const updateData = {}
  if (fields.name !== undefined)    updateData.name = fields.name
  if (fields.company !== undefined) updateData.company = fields.company
  if (fields.required_hours !== undefined) updateData.required_hours = fields.required_hours

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId)
    .select('id, name, company, role, auth_id, created_at, required_hours')
    .single()
  if (error) throw error
  return data
}

/** Delete a profile by ID — cascades to dtr_entries and journal_entries. */
export async function deleteProfile(id) {
  requireSupabase()
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Admin: create a new student account (auth user + profile).
 * Uses a temp client for signUp so the admin stays logged in.
 */
export async function adminCreateUser(email, password, name, company, role) {
  requireSupabase()
  const tempClient = createTempClient()
  if (!tempClient) throw new Error('Could not create temp client')

  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email,
    password,
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('User creation failed')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      name,
      company,
      role,
      auth_id: authData.user.id,
    })
    .select('id, name, company, role, auth_id')
    .single()
  if (profileError) throw profileError

  return { user: authData.user, profile }
}

/**
 * SuperAdmin: Reset password for any user by their auth_id.
 * Note: This requires the SuperAdmin to have appropriate permissions or use a specific flow.
 * In a real-world scenario, you might send a password reset email.
 */
export async function adminResetPassword(email) {
  requireSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

/**
 * Admin: delete a student account (profile + auth user).
 */
export async function adminDeleteUser(profileId) {
  requireSupabase()
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)
  if (error) throw error
}

// ─── DTR Entries ──────────────────────────────────────────────────────────────

export async function fetchDtrEntries(profileId) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('dtr_entries')
      .select('date, time_in_am, time_out_am, time_in_pm, time_out_pm, status_tag')
      .eq('profile_id', profileId)
    if (error) throw error

    return Object.fromEntries(
      data.map(row => [
        row.date,
        {
          timeInAM:  row.time_in_am  || '',
          timeOutAM: row.time_out_am || '',
          timeInPM:  row.time_in_pm  || '',
          timeOutPM: row.time_out_pm || '',
          statusTag: row.status_tag  || '',
        },
      ])
    )
  })
}

/** Fetch DTR entries for ALL interns (supervisor only, for analytics) */
export async function fetchAllDtrEntries() {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('dtr_entries')
      .select('profile_id, date, time_in_am, time_out_am, time_in_pm, time_out_pm, status_tag')
    if (error) throw error
    return data
  })
}

export async function upsertDtrEntry(profileId, date, fields) {
  requireSupabase()
  const { error } = await supabase
    .from('dtr_entries')
    .upsert(
      {
        profile_id:  profileId,
        date,
        time_in_am:  fields.timeInAM  || null,
        time_out_am: fields.timeOutAM || null,
        time_in_pm:  fields.timeInPM  || null,
        time_out_pm: fields.timeOutPM || null,
        status_tag:  fields.statusTag || null,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'profile_id,date' }
    )
  if (error) throw error
}

export async function deleteDtrEntry(profileId, date) {
  requireSupabase()
  const { error } = await supabase
    .from('dtr_entries')
    .delete()
    .eq('profile_id', profileId)
    .eq('date', date)
  if (error) throw error
}

// ─── Month Data & Signatures (Uses dtr_approvals table) ──────────────────────

/** Fetch all data (signatures, approvals, requests) for a given month. */
export async function fetchMonthData(profileId, monthKey) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('dtr_approvals')
      .select('approved_by, approved_at')
      .eq('profile_id', profileId)
      .eq('month_key', monthKey)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows found"
    
    if (data && data.approved_by) {
      try {
        const parsed = JSON.parse(data.approved_by)
        return typeof parsed === 'object' ? parsed : { supervisorName: data.approved_by }
      } catch {
        return { supervisorName: data.approved_by }
      }
    }
    
    // Fallback to localStorage
    const lsKey = `monthData-${profileId}-${monthKey}`
    try { return JSON.parse(localStorage.getItem(lsKey) || '{}') } catch { return {} }
  })
}

/** Fetch all approval records for a student */
export async function fetchUserApprovals(profileId) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('dtr_approvals')
      .select('*')
      .eq('profile_id', profileId)
    if (error) throw error
    return data.map(row => {
      let parsed = {}
      try { parsed = JSON.parse(row.approved_by) } catch {}
      return { ...row, data: parsed }
    })
  })
}

/** Update specific fields in the month data JSON. */
export async function updateMonthData(profileId, monthKey, updates) {
  const currentData = await fetchMonthData(profileId, monthKey)
  const newData = { ...currentData, ...updates }
  const jsonStr = JSON.stringify(newData)
  
  localStorage.setItem(`monthData-${profileId}-${monthKey}`, jsonStr)

  requireSupabase()
  const { error } = await supabase
    .from('dtr_approvals')
    .upsert({
      profile_id: profileId,
      month_key:  monthKey,
      approved_by: jsonStr,
      approved_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,month_key' })
  if (error) throw error
}

/** Bulk update month data for multiple interns (Bulk Approval) */
export async function bulkUpdateMonthData(updates) {
  // updates: [{ profile_id, month_key, jsonStr }]
  requireSupabase()
  const { error } = await supabase
    .from('dtr_approvals')
    .upsert(updates.map(u => ({
      profile_id: u.profile_id,
      month_key:  u.month_key,
      approved_by: u.jsonStr,
      approved_at: new Date().toISOString(),
    })), { onConflict: 'profile_id,month_key' })
  if (error) throw error
}

/** Fetch all signature requests for supervisor dashboard */
export async function fetchAllSignatureRequests() {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('dtr_approvals')
      .select('profile_id, month_key, approved_by')
    if (error) throw error

    const requests = []
    data.forEach(row => {
      try {
        const parsed = JSON.parse(row.approved_by)
        requests.push({ profile_id: row.profile_id, month_key: row.month_key, data: parsed })
      } catch {}
    })
    return requests
  })
}

// ─── Journal Entries ───────────────────────────────────────────────────────────

export async function fetchJournalEntries(profileId) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('year, month, week_num, task, doc_note')
      .eq('profile_id', profileId)
    if (error) throw error

    return Object.fromEntries(
      data.map(row => [
        `${row.year}-${String(row.month).padStart(2, '0')}-w${row.week_num}`,
        {
          task:    row.task     || '',
          docNote: row.doc_note || '',
        },
      ])
    )
  })
}

export async function upsertJournalEntry(profileId, year, month, weekNum, fields) {
  requireSupabase()
  const { error } = await supabase
    .from('journal_entries')
    .upsert(
      {
        profile_id: profileId,
        year,
        month,
        week_num:   weekNum,
        task:       fields.task    ?? '',
        doc_note:   fields.docNote ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,year,month,week_num' }
    )
  if (error) throw error
}
// ─── Archiving ───────────────────────────────────────────────────────────────

export async function archiveDocument(profileId, monthKey, type, data) {
  requireSupabase()
  const { error } = await supabase
    .from('archived_documents')
    .insert({
      profile_id: profileId,
      month_key:  monthKey,
      type:       type,
      data:       data
    })
  if (error) throw error
}

export async function fetchArchivedDocuments(profileId) {
  requireSupabase()
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('archived_documents')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  })
}
