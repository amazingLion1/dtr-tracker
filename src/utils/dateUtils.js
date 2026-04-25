/** Returns 'YYYY-MM-DD' key for given date */
export function getTodayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Returns 'HH:MM AM/PM' */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/** Parses '08:00 AM' -> minutes since midnight */
function parseTimeToMinutes(t) {
  if (!t) return null
  const [time, period] = t.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + m
}

/**
 * Calculates total hours worked from AM and PM sessions.
 * Returns a number (decimal hours).
 */
export function calcHours(timeInAM, timeOutAM, timeInPM, timeOutPM) {
  let total = 0
  const inAM  = parseTimeToMinutes(timeInAM)
  const outAM = parseTimeToMinutes(timeOutAM)
  const inPM  = parseTimeToMinutes(timeInPM)
  const outPM = parseTimeToMinutes(timeOutPM)

  if (inAM !== null && outAM !== null && outAM > inAM) {
    total += (outAM - inAM) / 60
  }
  if (inPM !== null && outPM !== null && outPM > inPM) {
    total += (outPM - inPM) / 60
  }
  return total
}

/** Returns full month name */
export function getMonthName(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long' })
}

/** Returns array of days in a given month (1-indexed) */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

/** Returns short month+year string e.g. 'March 2026' */
export function formatMonthYear(year, month) {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Converts 'HH:mm' (24hr) to 'hh:mm AM/PM' */
export function convert24to12(time24) {
  if (!time24) return ''
  let [h, m] = time24.split(':')
  h = parseInt(h, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
}

/** Converts 'hh:mm AM/PM' to 'HH:mm' (24hr for <input type="time">) */
export function convert12to24(time12) {
  if (!time12) return ''
  const parts = time12.split(' ')
  if (parts.length !== 2) return ''
  let [h, m] = parts[0].split(':')
  h = parseInt(h, 10)
  const ampm = parts[1].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m}`
}

/** Returns formatted date range for a specific week (1-5) e.g., "Apr 1 - Apr 7" */
export function getWeekDateRange(year, month, weekNum) {
  const startDay = (weekNum - 1) * 7 + 1
  if (startDay > getDaysInMonth(year, month)) return ''

  let endDay = startDay + 6
  const maxDays = getDaysInMonth(year, month)
  if (endDay > maxDays || weekNum === 5) endDay = maxDays

  const monthStr = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })
  return `${monthStr} ${startDay} - ${monthStr} ${endDay}, ${year}`
}
