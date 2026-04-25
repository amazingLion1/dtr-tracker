import { useState } from 'react'
import { ArrowLeft, User, Building2, Lock, Eye, EyeOff, Save, CheckCircle2, Target } from 'lucide-react'
import { updateProfile, changePassword } from '../lib/api'
import { useToast } from './ui/Toast'

/**
 * Settings page — profile editing + password change.
 *
 * Props:
 *  - profile: current user profile object
 *  - onBack: navigate back
 *  - onProfileUpdated: callback with updated profile data
 */
export default function Settings({ profile, onBack, onProfileUpdated }) {
  const toast = useToast()

  // Profile form
  const [name, setName]       = useState(profile?.name || '')
  const [company, setCompany] = useState(profile?.company || '')
  const [requiredHours, setRequiredHours] = useState(profile?.required_hours || 486)
  const [profileLoading, setProfileLoading] = useState(false)

  // Password form
  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPass, setShowNewPass]         = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [passLoading, setPassLoading]         = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || !company.trim()) return

    setProfileLoading(true)
    try {
      const updated = await updateProfile(profile.id, {
        name: name.trim(),
        company: company.trim(),
        required_hours: parseInt(requiredHours) || 486,
      })
      onProfileUpdated?.(updated)
      toast.success('Profile updated successfully')
    } catch (err) {
      console.error('[Settings]', err)
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setPassLoading(true)
    try {
      await changePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully')
    } catch (err) {
      console.error('[Settings]', err)
      toast.error(err.message || 'Failed to change password')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-surface border border-border hover:border-border-bright flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-text-secondary text-xs mt-0.5">Manage your profile and security</p>
        </div>
      </div>

      {/* Profile Section */}
      <form onSubmit={handleProfileSave} className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-text-primary font-bold text-sm flex items-center gap-2">
            <User size={14} className="text-accent" />
            Profile Information
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="input pl-9"
                required
              />
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
                placeholder="Your company"
                className="input pl-9"
                required
              />
            </div>
          </div>

          {profile?.role !== 'supervisor' && (
            <div>
              <label className="label">Required OJT Hours</label>
              <div className="relative">
                <Target size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="number"
                  value={requiredHours}
                  onChange={e => setRequiredHours(e.target.value)}
                  placeholder="486"
                  min="1"
                  className="input pl-9"
                />
              </div>
              <p className="text-text-secondary/60 text-[10px] mt-1.5">Total hours you need to complete for your OJT</p>
            </div>
          )}

          <button
            type="submit"
            disabled={profileLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {profileLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <><Save size={14} /> Save Changes</>
            )}
          </button>
        </div>
      </form>

      {/* Password Section */}
      <form onSubmit={handlePasswordChange} className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-text-primary font-bold text-sm flex items-center gap-2">
            <Lock size={14} className="text-accent" />
            Change Password
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="input pl-9 pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="input pl-9 pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-[10px] mt-1.5 font-medium">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={passLoading || !newPassword || !confirmPassword}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {passLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Changing…
              </span>
            ) : (
              <><Lock size={14} /> Change Password</>
            )}
          </button>
        </div>
      </form>

      {/* Account info */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="label mb-3">Account Details</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Role</span>
            <span className="text-text-primary font-semibold capitalize">{profile?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Member since</span>
            <span className="text-text-primary font-semibold">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Profile ID</span>
            <span className="text-text-primary/40 font-mono text-xs">{profile?.id?.slice(0, 8)}…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
