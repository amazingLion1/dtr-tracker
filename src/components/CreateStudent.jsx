import { useState } from 'react'
import { UserPlus, Mail, Lock, User, Building2, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { adminCreateUser } from '../lib/api'

export default function CreateStudent({ onBack, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim() || !company.trim()) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const result = await adminCreateUser(email.trim(), password, name.trim(), company.trim(), 'intern')
      setSuccess({ name: name.trim(), email: email.trim() })
      setName('')
      setEmail('')
      setPassword('')
      setCompany('')
      onCreated?.(result.profile)
    } catch (err) {
      console.error('[CreateStudent]', err)
      if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
        setError('An account with this email already exists.')
      } else {
        setError(err.message || 'Could not create student account.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-surface border border-border hover:border-border-bright flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Create Student Account</h1>
          <p className="text-text-secondary text-xs mt-0.5">Register a new intern to the DTR system</p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-emerald-400 font-bold text-sm">Account Created Successfully!</h3>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                <span className="font-semibold text-text-primary">{success.name}</span> can now log in with:
              </p>
              <div className="mt-2 bg-surface/50 rounded-lg px-3 py-2 text-xs font-mono space-y-1">
                <div className="text-text-secondary">Email: <span className="text-text-primary">{success.email}</span></div>
                <div className="text-text-secondary">Password: <span className="text-text-primary/50">••••••</span> (as entered)</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="w-full mt-4 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Create another student
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span className="text-red-400 text-xs font-medium">{error}</span>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="input pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="student@kcp.edu.ph"
                className="input pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Min. 6 characters"
                className="input pl-9 pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Company / Organization</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="ABC Tech Solutions"
                className="input pl-9"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : (
              <><UserPlus size={15} /> Create Student Account</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
