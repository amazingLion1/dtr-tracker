import { useState } from 'react'
import { CalendarDays, Mail, Lock, ArrowRight, Sun, Moon, Eye, EyeOff, KeyRound } from 'lucide-react'
import { signIn, resetPassword } from '../lib/api'

export default function Login({ isDark, toggleTheme, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setIsLoading(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      onSuccess?.()
    } catch (err) {
      console.error('[Login]', err)
      if (err.message?.includes('Invalid login')) {
        setError('Invalid email or password. Please try again.')
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setIsLoading(true)
    try {
      await resetPassword(resetEmail.trim())
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Theme toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-all border border-border"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5 shadow-lg shadow-accent/5">
            <CalendarDays size={30} className="text-accent" />
          </div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">DTR Tracker</h1>
          <p className="text-text-secondary text-xs mt-1 tracking-wide">King's College of the Philippines</p>
        </div>

        {showReset ? (
          /* ── Password Reset ── */
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {resetSent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
                <KeyRound size={28} className="text-emerald-500 mx-auto mb-3" />
                <h2 className="text-text-primary font-bold text-sm mb-1">Check your email</h2>
                <p className="text-text-secondary text-xs">
                  We sent a password reset link to <span className="font-semibold text-text-primary">{resetEmail}</span>
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-2">
                  <h2 className="text-text-primary font-bold text-lg">Reset Password</h2>
                  <p className="text-text-secondary text-xs mt-1">Enter your email to receive a reset link</p>
                </div>
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="input pl-9"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </>
            )}
            <button
              onClick={() => { setShowReset(false); setResetSent(false); setError('') }}
              className="w-full text-center text-xs text-text-secondary hover:text-accent transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        ) : (
          /* ── Login Form ── */
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@email.com"
                  className="input pl-9"
                  autoFocus
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
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email); setError('') }}
              className="w-full text-center text-xs text-text-secondary hover:text-accent transition-colors"
            >
              Forgot password?
            </button>
          </form>
        )}

        <p className="text-center text-text-secondary/40 text-[10px] mt-10 tracking-wide">
          Contact your supervisor for account access
        </p>
      </div>
    </div>
  )
}
