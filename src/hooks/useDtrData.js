import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchDtrEntries, upsertDtrEntry, deleteDtrEntry } from '../lib/api'

const DEBOUNCE_MS = 600

/**
 * Manages DTR data for a given user.
 * - On mount: fetches from Supabase, falls back to localStorage cache if offline.
 * - setField: updates local state immediately + debounces Supabase upsert (600ms).
 * - clearDay: removes a day's entry locally + deletes from Supabase.
 */
export function useDtrData(userId) {
  const [dtrData, setDtrDataState] = useState({})
  const [isLoading, setIsLoading]  = useState(true)

  // Ref to always have the latest dtrData without stale closures in debounce callbacks
  const dtrDataRef     = useRef({})
  const debounceTimers = useRef({})

  // ── Load from Supabase on mount / user switch ────────────────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return }

    setIsLoading(true)
    fetchDtrEntries(userId)
      .then(data => {
        dtrDataRef.current = data
        setDtrDataState(data)
        try { localStorage.setItem(`dtr-data-${userId}`, JSON.stringify(data)) } catch {}
      })
      .catch(() => {
        // Offline fallback: read localStorage cache
        try {
          const cached = localStorage.getItem(`dtr-data-${userId}`)
          const parsed = cached ? JSON.parse(cached) : {}
          dtrDataRef.current = parsed
          setDtrDataState(parsed)
        } catch { /* ignore */ }
      })
      .finally(() => setIsLoading(false))
  }, [userId])

  // ── Set a single time-field on a date entry ──────────────────────────────────
  const setField = useCallback((dateKey, field, value) => {
    setDtrDataState(prev => {
      const entry   = { ...(prev[dateKey] || {}), [field]: value }
      const updated = { ...prev, [dateKey]: entry }

      // Keep ref in sync for debounce closures
      dtrDataRef.current = updated

      // Persist to localStorage cache immediately
      try { localStorage.setItem(`dtr-data-${userId}`, JSON.stringify(updated)) } catch {}

      // Debounce the Supabase upsert (avoids a write per keystroke)
      if (debounceTimers.current[dateKey]) clearTimeout(debounceTimers.current[dateKey])
      debounceTimers.current[dateKey] = setTimeout(() => {
        const latest = dtrDataRef.current[dateKey] || {}
        upsertDtrEntry(userId, dateKey, {
          timeInAM:  latest.timeInAM  || null,
          timeOutAM: latest.timeOutAM || null,
          timeInPM:  latest.timeInPM  || null,
          timeOutPM: latest.timeOutPM || null,
          statusTag: latest.statusTag || null,
        }).catch(err => console.error('[DTR upsert]', err))
      }, DEBOUNCE_MS)

      return updated
    })
  }, [userId])

  // ── Clear an entire day's entry ──────────────────────────────────────────────
  const clearDay = useCallback((dateKey) => {
    // Cancel any pending debounce for this day first
    if (debounceTimers.current[dateKey]) {
      clearTimeout(debounceTimers.current[dateKey])
      delete debounceTimers.current[dateKey]
    }

    setDtrDataState(prev => {
      const updated = { ...prev }
      delete updated[dateKey]
      dtrDataRef.current = updated
      try { localStorage.setItem(`dtr-data-${userId}`, JSON.stringify(updated)) } catch {}
      return updated
    })

    // Delete from Supabase (fails silently if row doesn't exist yet)
    deleteDtrEntry(userId, dateKey).catch(err => console.error('[DTR delete]', err))
  }, [userId])

  return { dtrData, setField, clearDay, isLoading }
}
