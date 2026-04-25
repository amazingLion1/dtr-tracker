import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

/**
 * PWA install prompt — shows a dismissible banner when the app is installable.
 * Intercepts the `beforeinstallprompt` event for a custom install experience.
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('dtr-pwa-dismissed') === 'true'
  })
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('dtr-pwa-dismissed', 'true')
  }

  if (installed || dismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[90] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
          <Download size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary font-bold text-sm">Install DTR Tracker</h3>
          <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
            Add to your home screen for quick access and offline support.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-text-secondary text-xs hover:text-text-primary transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-text-secondary/40 hover:text-text-primary transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
