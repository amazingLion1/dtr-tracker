import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Reusable animated confirmation dialog.
 *
 * Props:
 *  - open (bool)
 *  - onClose ()
 *  - onConfirm ()
 *  - title (string)
 *  - message (string | ReactNode)
 *  - confirmLabel (string, default "Confirm")
 *  - cancelLabel (string, default "Cancel")
 *  - variant ("danger" | "warning" | "default")
 *  - icon (ReactNode, optional override)
 *  - input (bool)  – if true, renders a text input and passes value to onConfirm(value)
 *  - inputPlaceholder (string)
 */
export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon,
  input = false,
  inputPlaceholder = '',
}) {
  const inputRef = useRef(null)
  const backdropRef = useRef(null)

  useEffect(() => {
    if (open && input) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, input])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const colors = {
    danger:  { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     btn: 'bg-red-500 hover:bg-red-600',    iconColor: 'text-red-400' },
    warning: { bg: 'bg-yellow-500/10',   border: 'border-yellow-500/20',  text: 'text-yellow-400',  btn: 'bg-yellow-500 hover:bg-yellow-600', iconColor: 'text-yellow-400' },
    default: { bg: 'bg-accent/10',       border: 'border-accent/20',      text: 'text-accent',      btn: 'bg-accent hover:bg-accent-hover', iconColor: 'text-accent' },
  }
  const c = colors[variant] || colors.default

  const handleConfirm = () => {
    if (input) {
      const val = inputRef.current?.value?.trim()
      if (!val) return
      onConfirm(val)
    } else {
      onConfirm()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm()
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center shrink-0`}>
              {icon || <AlertTriangle size={18} className={c.iconColor} />}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Close dialog"
            >
              <X size={14} />
            </button>
          </div>
          <h2 id="confirm-title" className="text-text-primary font-bold text-base mt-3">{title}</h2>
          {message && <p className="text-text-secondary text-sm mt-1.5 leading-relaxed">{message}</p>}

          {input && (
            <input
              ref={inputRef}
              type="text"
              placeholder={inputPlaceholder}
              onKeyDown={handleKeyDown}
              className="input mt-3"
            />
          )}
        </div>

        {/* Actions */}
        <div className="bg-surface-2/50 border-t border-border px-5 py-3.5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${c.btn} transition-colors active:scale-[0.97] shadow-lg shadow-black/10`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
