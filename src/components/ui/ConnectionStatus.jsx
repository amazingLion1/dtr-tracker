import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

/**
 * Inline connection status indicator for the navbar.
 * Shows a subtle badge when offline, and a syncing animation when reconnecting.
 */
export default function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 3000)
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && !justReconnected) return null

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300
        ${online
          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-in fade-in duration-300'
          : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
        }`}
      role="status"
      aria-live="polite"
    >
      {online ? (
        <>
          <RefreshCw size={10} className="animate-spin" />
          <span>Syncing</span>
        </>
      ) : (
        <>
          <WifiOff size={10} />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}
