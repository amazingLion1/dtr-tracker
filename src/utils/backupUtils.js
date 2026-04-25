import { fetchDtrEntries, fetchJournalEntries, upsertDtrEntry, upsertJournalEntry } from '../lib/api'

/**
 * Export a full backup of the user's data (localStorage cache + cloud data).
 * Downloads as a JSON file.
 */
export async function exportBackup(profileId) {
  let dtrCloud = {}
  let journalCloud = {}

  // Attempt to fetch the latest data from Supabase
  try {
    dtrCloud = await fetchDtrEntries(profileId)
  } catch {
    // Fall back to localStorage if offline
    try {
      const cached = localStorage.getItem(`dtr-data-${profileId}`)
      dtrCloud = cached ? JSON.parse(cached) : {}
    } catch { /* ignore */ }
  }

  try {
    journalCloud = await fetchJournalEntries(profileId)
  } catch {
    try {
      const cached = localStorage.getItem(`journal-data-${profileId}`)
      journalCloud = cached ? JSON.parse(cached) : {}
    } catch { /* ignore */ }
  }

  // Also grab localStorage-only data (images, approvals)
  let journalImages = {}
  try {
    const raw = localStorage.getItem(`journal-images-${profileId}`)
    journalImages = raw ? JSON.parse(raw) : {}
  } catch { /* ignore */ }

  // Collect all month approval keys
  const approvals = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(`dtr-approval-${profileId}-`)) {
      approvals[key] = localStorage.getItem(key)
    }
  }

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    profileId,
    dtr: dtrCloud,
    journal: journalCloud,
    journalImages,
    approvals,
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2))
  const link = document.createElement('a')
  link.setAttribute("href", dataStr)
  link.setAttribute("download", `DTR_Backup_${profileId}_${new Date().getTime()}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Import a backup file and restore data to both localStorage and Supabase.
 * Supports both legacy (v1) and new (v2) backup formats.
 */
export async function importBackup(profileId, file, onSuccess) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result)

      // ── Legacy v1 format (raw localStorage strings) ──────────────────────
      if (!parsed.version || parsed.version < 2) {
        if (parsed.dtr) localStorage.setItem(`dtr-data-${profileId}`, parsed.dtr)
        if (parsed.journal) localStorage.setItem(`journal-data-${profileId}`, parsed.journal)
        onSuccess()
        return
      }

      // ── v2 format (structured objects) ────────────────────────────────────
      // Restore DTR entries to localStorage cache
      if (parsed.dtr && typeof parsed.dtr === 'object') {
        localStorage.setItem(`dtr-data-${profileId}`, JSON.stringify(parsed.dtr))

        // Also sync each entry to Supabase
        for (const [dateKey, entry] of Object.entries(parsed.dtr)) {
          try {
            await upsertDtrEntry(profileId, dateKey, {
              timeInAM:  entry.timeInAM  || null,
              timeOutAM: entry.timeOutAM || null,
              timeInPM:  entry.timeInPM  || null,
              timeOutPM: entry.timeOutPM || null,
              statusTag: entry.statusTag || null,
            })
          } catch { /* continue restoring even if one entry fails */ }
        }
      }

      // Restore journal entries
      if (parsed.journal && typeof parsed.journal === 'object') {
        localStorage.setItem(`journal-data-${profileId}`, JSON.stringify(parsed.journal))

        for (const [weekKey, entry] of Object.entries(parsed.journal)) {
          try {
            const parts   = weekKey.split('-')
            const year    = parseInt(parts[0], 10)
            const month   = parseInt(parts[1], 10)
            const weekNum = parseInt(parts[2].replace('w', ''), 10)
            await upsertJournalEntry(profileId, year, month, weekNum, {
              task:    entry.task    || '',
              docNote: entry.docNote || '',
            })
          } catch { /* continue */ }
        }
      }

      // Restore journal images (localStorage-only)
      if (parsed.journalImages && typeof parsed.journalImages === 'object') {
        localStorage.setItem(`journal-images-${profileId}`, JSON.stringify(parsed.journalImages))
      }

      // Restore approval locks (localStorage-only)
      if (parsed.approvals && typeof parsed.approvals === 'object') {
        for (const [key, value] of Object.entries(parsed.approvals)) {
          localStorage.setItem(key, value)
        }
      }

      onSuccess()
    } catch (err) {
      console.error('[importBackup]', err)
      alert("Invalid backup file.")
    }
  }
  reader.readAsText(file)
}
