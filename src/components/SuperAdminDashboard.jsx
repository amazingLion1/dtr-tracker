import { useState, useEffect } from 'react'
import { UserPlus, Users, Trash2, Shield, Search, ChevronRight, Mail, Building2, UserCheck, ShieldAlert, Key, Plus, X } from 'lucide-react'
import { fetchProfiles, adminCreateUser, adminDeleteUser, adminResetPassword } from '../lib/api'
import { useToast } from './ui/Toast'
import ConfirmDialog from './ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const toast = useToast()

  const [formData, setFormData] = useState({ email: '', password: '', name: '', company: '', role: 'intern' })
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const allUsers = await fetchProfiles()
      setUsers(allUsers)
    } catch (err) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await adminCreateUser(formData.email, formData.password, formData.name, formData.company, formData.role)
      toast.success(`${formData.role === 'supervisor' ? 'Supervisor' : 'Student'} account created!`)
      setShowCreateModal(false)
      setFormData({ email: '', password: '', name: '', company: '', role: 'intern' })
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminDeleteUser(deleteTarget.id)
      toast.success('Account deleted')
      setDeleteTarget(null)
      loadUsers()
    } catch (err) {
      toast.error('Failed to delete user')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetTarget || !newPassword) return
    setResetting(true)
    try {
      await adminResetPassword(resetTarget.id, newPassword)
      toast.success(`Password updated for ${resetTarget.name}`)
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      toast.error('Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-text-primary text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-text-secondary text-sm font-medium mt-1">Manage infrastructure, user accounts, and permissions</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-accent/20 transition-all flex items-center gap-2"
        >
          <UserPlus size={18} />
          Create New Account
        </button>
      </header>

      {/* Grid Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverviewCard icon={Users} label="Total Users" value={users.length} color="indigo" />
        <OverviewCard icon={UserCheck} label="Supervisors" value={users.filter(u => u.role === 'supervisor').length} color="emerald" />
        <OverviewCard icon={Shield} label="Students" value={users.filter(u => u.role === 'intern').length} color="blue" />
        <OverviewCard icon={ShieldAlert} label="Admins" value={users.filter(u => u.role === 'superadmin').length} color="red" />
      </div>

      {/* User Table */}
      <section className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-border bg-surface-2/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">User Registry</h2>
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search registry..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-all"
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="py-20 text-center text-text-secondary text-sm italic">Loading accounts...</div>
          ) : filteredUsers.length > 0 ? filteredUsers.map(user => (
            <div key={user.id} className="group flex items-center gap-4 px-8 py-5 hover:bg-surface-2/30 transition-all">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0
                ${user.role === 'supervisor' ? 'bg-emerald-500/10 text-emerald-500' : user.role === 'superadmin' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
                {user.name?.[0].toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-bold text-lg tracking-tight truncate">{user.name}</span>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest
                    ${user.role === 'supervisor' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : user.role === 'superadmin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-text-secondary text-xs">{user.email} • {user.company || 'No Company'}</p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setResetTarget(user)} className="p-2 hover:bg-accent/10 text-accent rounded-lg transition-colors" title="Reset Password">
                  <Key size={16} />
                </button>
                <button onClick={() => setDeleteTarget(user)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" title="Delete User">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center text-text-secondary italic">No results found.</div>
          )}
        </div>
      </section>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-border w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
              <h3 className="text-2xl font-bold text-text-primary mb-2">Reset Password</h3>
              <p className="text-text-secondary text-sm mb-8">Update password for {resetTarget.name}</p>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <input required type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" 
                  className="w-full bg-surface-2 border border-border rounded-xl px-5 py-4 text-sm text-text-primary focus:outline-none focus:border-accent" />
                <div className="flex gap-4">
                  <button type="submit" disabled={resetting} className="flex-1 bg-accent text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/20">
                    {resetting ? 'Updating...' : 'Save New Password'}
                  </button>
                  <button type="button" onClick={() => setResetTarget(null)} className="flex-1 bg-surface-2 text-text-primary font-bold py-4 rounded-xl border border-border">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create User Modal (Simplified) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface border border-border w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative">
                <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-text-secondary hover:text-text-primary"><X size={24} /></button>
                <h3 className="text-2xl font-bold text-text-primary mb-6">Create New Account</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4 mb-4">
                      {['intern', 'supervisor'].map(r => (
                        <button key={r} type="button" onClick={() => setFormData({...formData, role: r})}
                          className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all
                            ${formData.role === r ? 'bg-accent text-white border-accent' : 'bg-bg text-text-secondary border-border'}`}>
                          {r}
                        </button>
                      ))}
                   </div>
                   <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full bg-surface-2 border border-border rounded-xl px-5 py-3 text-sm" />
                   <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email Address" type="email" className="w-full bg-surface-2 border border-border rounded-xl px-5 py-3 text-sm" />
                   <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Company Name" className="w-full bg-surface-2 border border-border rounded-xl px-5 py-3 text-sm" />
                   <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Password" type="password" className="w-full bg-surface-2 border border-border rounded-xl px-5 py-3 text-sm" />
                   <button type="submit" disabled={creating} className="w-full bg-accent text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/20 mt-4">
                      {creating ? 'Creating...' : 'Create Account'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Account?" 
        message="This action is irreversible." variant="danger" confirmLabel="Delete Now" />
    </div>
  )
}

function OverviewCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20'
  }
  return (
    <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm transition-all hover:shadow-md">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-text-primary tabular-nums">{value}</div>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}
