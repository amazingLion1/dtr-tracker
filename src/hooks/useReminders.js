import { useState, useEffect } from 'react'

const MILESTONES = [
  { hour: 8,  minute: 0,  message: "Good morning! Don't forget to Time In AM." },
  { hour: 12, minute: 0,  message: "Lunch break! Remember to Time Out AM." },
  { hour: 13, minute: 0,  message: "Break is over. Don't forget to Time In PM." },
  { hour: 17, minute: 0,  message: "Day is done! Time to Time Out PM." },
]

export function useReminders(userId) {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('dtr-reminders') === 'true'
  })

  // Request permission if enabled but not granted
  const toggleReminders = async () => {
    if (!enabled) {
      if (!('Notification' in window)) {
        alert('This browser does not support desktop notifications.')
        return
      }
      if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission()
        if (p !== 'granted') return
      }
      setEnabled(true)
      localStorage.setItem('dtr-reminders', 'true')
    } else {
      setEnabled(false)
      localStorage.setItem('dtr-reminders', 'false')
    }
  }

  useEffect(() => {
    if (!enabled || !userId) return

    const checkTime = () => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const today = now.toLocaleDateString()

      MILESTONES.forEach(target => {
        // If we crossed the target time in the last 2 minutes
        if (h === target.hour && m >= target.minute && m <= target.minute + 2) {
          const key = `dtr-notif-${target.hour}-${target.minute}-${today}`
          if (!localStorage.getItem(key)) {
            // Fire notification
            if (Notification.permission === 'granted') {
              new Notification('DTR Tracker Reminder', {
                body: target.message,
                icon: '/favicon.svg'
              })
              localStorage.setItem(key, 'fired')
            }
          }
        }
      })
    }

    // Check once immediately, then every 60 seconds
    checkTime()
    const timer = setInterval(checkTime, 60000)

    return () => clearInterval(timer)
  }, [enabled, userId])

  return { remindersEnabled: enabled, toggleReminders }
}
