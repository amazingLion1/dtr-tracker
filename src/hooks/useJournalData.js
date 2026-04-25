import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchJournalEntries, upsertJournalEntry } from '../lib/api'
import { useLocalStorage } from './useLocalStorage'

const DEBOUNCE_MS = 600

/**
 * Manages Weekly Journal data for a given user.
 *
 * Text data (task, docNote) → synced to Supabase + localStorage cache
 * Image data (images[])    → browser-only via localStorage (kept offline)
 *
 * Returns:
 *   getWeek(weekKey)         → merged { task, docNote, images[] }
 *   setField(weekKey, field, value) → writes text to Supabase / images to localStorage
 *   isLoading                → true while fetching from Supabase
 */
export function useJournalData(userId) {
  const [textData, setTextDataState] = useState({})
  const [isLoading, setIsLoading]    = useState(true)

  // Images stay in localStorage only (base64 images are browser-only)
  const [imageStore, setImageStore]  = useLocalStorage(`journal-images-${userId}`, {})

  // Ref to always have the latest textData without stale closures
  const textDataRef    = useRef({})
  const debounceTimers = useRef({})

  // ── Load text data from Supabase on mount / user switch ─────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return }

    setIsLoading(true)
    fetchJournalEntries(userId)
      .then(data => {
        textDataRef.current = data
        setTextDataState(data)
        try { localStorage.setItem(`journal-data-${userId}`, JSON.stringify(data)) } catch {}
      })
      .catch(() => {
        // Offline fallback: read localStorage cache
        try {
          const cached = localStorage.getItem(`journal-data-${userId}`)
          const parsed = cached ? JSON.parse(cached) : {}
          textDataRef.current = parsed
          setTextDataState(parsed)
        } catch { /* ignore */ }
      })
      .finally(() => setIsLoading(false))
  }, [userId])

  // ── Get merged week entry (text + images) ────────────────────────────────────
  const getWeek = useCallback((weekKey) => ({
    ...(textData[weekKey] || {}),
    images: imageStore[weekKey] || [],
  }), [textData, imageStore])

  // ── Set a field on a week entry ──────────────────────────────────────────────
  const setField = useCallback((weekKey, field, value) => {
    if (field === 'images') {
      // Images are localStorage-only
      setImageStore(prev => ({ ...prev, [weekKey]: value }))
      return
    }

    // Text fields: update state → localStorage cache → debounced Supabase upsert
    setTextDataState(prev => {
      const entry   = { ...(prev[weekKey] || {}), [field]: value }
      const updated = { ...prev, [weekKey]: entry }

      // Keep ref in sync for debounce closure
      textDataRef.current = updated
      try { localStorage.setItem(`journal-data-${userId}`, JSON.stringify(updated)) } catch {}

      // Debounce Supabase upsert per week key
      if (debounceTimers.current[weekKey]) clearTimeout(debounceTimers.current[weekKey])
      debounceTimers.current[weekKey] = setTimeout(() => {
        // Read from ref so we get the latest combined state
        const latest = textDataRef.current[weekKey] || {}
        // Parse weekKey: 'YYYY-MM-wN'
        const parts   = weekKey.split('-')
        const year    = parseInt(parts[0], 10)
        const month   = parseInt(parts[1], 10)
        const weekNum = parseInt(parts[2].replace('w', ''), 10)

        upsertJournalEntry(userId, year, month, weekNum, {
          task:    latest.task    || '',
          docNote: latest.docNote || '',
        }).catch(err => console.error('[Journal upsert]', err))
      }, DEBOUNCE_MS)

      return updated
    })
  }, [userId, setImageStore])

  return { getWeek, setField, isLoading }
}
