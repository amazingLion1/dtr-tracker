import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let toastIdCounter = 0

/**
 * Toast Provider — wrap your app in <ToastProvider> to enable useToast() everywhere.
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Entry saved')
 *   toast.error('Failed to save')
 *   toast.info('CSV exported')
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 200) // match exit animation duration
  }, [])

  const addToast = useCallback((type, message, duration = 3500) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, type, message, exiting: false }])
    timersRef.current[id] = setTimeout(() => removeToast(id), duration)
    return id
  }, [removeToast])

  const toast = useCallback({
    success: (msg, duration) => addToast('success', msg, duration),
    error:   (msg, duration) => addToast('error', msg, duration || 5000),
    info:    (msg, duration) => addToast('info', msg, duration),
    warning: (msg, duration) => addToast('warning', msg, duration || 4500),
  }, [addToast])

  // Fix: useCallback can't return an object like that. Use useMemo-style approach.
  const toastApi = useRef(null)
  if (!toastApi.current) {
    toastApi.current = {
      success: (msg, duration) => addToast('success', msg, duration),
      error:   (msg, duration) => addToast('error', msg, duration || 5000),
      info:    (msg, duration) => addToast('info', msg, duration),
      warning: (msg, duration) => addToast('warning', msg, duration || 4500),
    }
  }
  // Keep methods in sync with latest addToast
  toastApi.current.success = (msg, duration) => addToast('success', msg, duration)
  toastApi.current.error   = (msg, duration) => addToast('error', msg, duration || 5000)
  toastApi.current.info    = (msg, duration) => addToast('info', msg, duration)
  toastApi.current.warning = (msg, duration) => addToast('warning', msg, duration || 4500)

  return (
    <ToastContext.Provider value={toastApi.current}>
      {children}

      {/* Toast container — bottom-right on desktop, bottom-center on mobile */}
      <div className="fixed bottom-4 right-4 z-[400] flex flex-col-reverse gap-2 max-w-[360px] w-full pointer-events-none sm:bottom-6 sm:right-6">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => {
              clearTimeout(timersRef.current[t.id])
              removeToast(t.id)
            }}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const iconMap = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertCircle,
}

const colorMap = {
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-500', text: 'text-emerald-400' },
  error:   { bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'text-red-400',     text: 'text-red-400' },
  info:    { bg: 'bg-accent/10',       border: 'border-accent/20',      icon: 'text-accent',      text: 'text-accent' },
  warning: { bg: 'bg-yellow-500/10',   border: 'border-yellow-500/20',  icon: 'text-yellow-400',  text: 'text-yellow-400' },
}

function ToastItem({ toast, onDismiss }) {
  const Icon = iconMap[toast.type] || Info
  const c = colorMap[toast.type] || colorMap.info

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-xl
        bg-surface/95 ${c.border}
        ${toast.exiting
          ? 'animate-out fade-out slide-out-to-right-5 duration-200'
          : 'animate-in fade-in slide-in-from-right-5 duration-300'
        }`}
      role="alert"
    >
      <Icon size={16} className={`${c.icon} shrink-0 mt-0.5`} />
      <p className="text-text-primary text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-text-secondary/50 hover:text-text-primary transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  )
}
