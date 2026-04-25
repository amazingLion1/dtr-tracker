import { calcHours } from './dateUtils'

export function exportDtrToCsv(dtrData, year, month, profileName, monthStr) {
  // Config
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  // CSV Header
  const rows = [
    ['Daily Time Record'],
    ['Intern:', profileName, 'Month:', monthStr],
    [],
    ['Date', 'In AM', 'Out AM', 'In PM', 'Out PM', 'Status', 'Hours']
  ]

  let totalHours = 0

  // Rows
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthKey}-${String(d).padStart(2, '0')}`
    const entry = dtrData[key] || {}
    
    let hours = 0
    let status = entry.statusTag || ''
    
    // Ignore time fields if marked as Leave or Holiday
    if (status !== 'leave' && status !== 'holiday') {
      hours = calcHours(entry.timeInAM, entry.timeOutAM, entry.timeInPM, entry.timeOutPM) || 0
      totalHours += hours
    } else {
      status = status.toUpperCase()
    }

    rows.push([
      String(d).padStart(2, '0'),
      entry.timeInAM || '',
      entry.timeOutAM || '',
      entry.timeInPM || '',
      entry.timeOutPM || '',
      status,
      hours > 0 ? hours.toFixed(2) : ''
    ])
  }

  // Footer
  rows.push([])
  rows.push(['', '', '', '', 'Total Rendered Hours:', totalHours.toFixed(2)])

  // Convert to CSV string, handling simple quotes just in case
  const csvContent = rows
    .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // Generate invisible link and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `DTR_${profileName.replace(/\s+/g, '_')}_${monthKey}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
