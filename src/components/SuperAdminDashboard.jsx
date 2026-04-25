import { useState, useEffect } from 'react'
import { UserPlus, Users, Trash2, Shield, Search, ChevronRight, Mail, Building2, UserCheck, ShieldAlert, Key, Sparkles, Plus, MoreVertical, X } from 'lucide-react'
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

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    role: 'intern'
  })
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

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
      await adminCreateUser(
        formData.email,
        formData.password,
        formData.name,
        formData.company,
        formData.role
      )
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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-red-500 mb-1">
             <ShieldAlert size={14} className="animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized Personnel Only</span>
          </div>
          <h1 className="text-text-primary text-4xl font-black tracking-tight">System Control</h1>
          <p className="text-text-secondary text-sm font-medium mt-1">Manage infrastructure, users, and security protocol</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95 flex items-center gap-3"
        >
          <Plus size={18} strokeWidth={3} />
          Create Account
        </button>
      </header>

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OverviewCard icon={Users} label="Total Assets" value={users.length} color="accent" />
        <OverviewCard icon={UserCheck} label="Supervisors" value={users.filter(u => u.role === 'supervisor').length} color="emerald" />
        <OverviewCard icon={Shield} label="Students" value={users.filter(u => u.role === 'intern').length} color="blue" />
        <OverviewCard icon={ShieldAlert} label="SuperAdmins" value={users.filter(u => u.role === 'superadmin').length} color="red" />
      </div>

      {/* Main Table Container */}
      <section className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
        <div className="px-8 py-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-2/30">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary">
                <Search size={16} />
             </div>
             <h2 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">User Registry</h2>
          </div>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by name, email or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg border border-border rounded-2xl pl-5 pr-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary text-[11px] font-black uppercase tracking-[0.2em]">Synchronizing Registry...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 divide-y divide-border/50">
              {filteredUsers.map(user => (
                <motion.div 
                  layout
                  key={user.id} 
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 px-8 py-5 hover:bg-surface-2/60 transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm
                    ${user.role === 'supervisor' ? 'bg-emerald-500/10 text-emerald-500' : user.role === 'superadmin' ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
                    {user.name?.[0].toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-text-primary font-black text-lg tracking-tight truncate">{user.name}</span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest
                        ${user.role === 'supervisor' ? 'bg-emerald-500 text-white' : user.role === 'superadmin' ? 'bg-red-500 text-white' : 'bg-accent text-white'}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-text-secondary text-xs font-bold flex items-center gap-1.5">
                        <Mail size={12} className="opacity-50" /> {user.email}
                      </span>
                      <span className="text-text-secondary text-xs font-bold flex items-center gap-1.5">
                        <Building2 size={12} className="opacity-50" /> {user.company || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResetTarget(user)}
                      className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all"
                      title="Reset Password"
                    >
                      <Key size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary/40 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
               <div className="w-20 h-20 rounded-[2.5rem] bg-surface-2 flex items-center justify-center mx-auto mb-6 text-text-secondary/20">
                  <Search size={32} />
               </div>
               <p className="text-text-secondary font-black uppercase tracking-[0.2em] text-sm">No Results Found</p>
               <p className="text-text-secondary/60 text-[10px] font-medium mt-1">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      </section>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-border w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                 <button onClick={() => setResetTarget(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="w-16 h-16 rounded-[1.5rem] bg-accent/10 flex items-center justify-center text-accent mb-6">
                <Key size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-text-primary mb-1">Security Reset</h3>
              <p className="text-text-secondary text-sm font-medium mb-8">Update authentication credentials for <span className="text-text-primary font-bold">{resetTarget.name}</span>.</p>
              
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">New System Password</label>
                  <input
                    required
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter highly secure password"
                    className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-4 text-sm text-text-primary focus:outline-none focus:border-accent transition-all shadow-inner"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={resetting || !newPassword}
                    className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-accent/20 disabled:opacity-50"
                  >
                    {resetting ? 'Overwriting...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-border w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                 <button onClick={() => setShowCreateModal(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                    <X size={24} />
                 </button>
              </div>

              <h3 className="text-3xl font-black text-text-primary mb-2">New Account</h3>
              <p className="text-text-secondary text-sm font-medium mb-10">Provision new access credentials for the system.</p>
              
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">Access Level</label>
                  <div className="grid grid-cols-2 gap-3">
                    <RoleButton 
                      active={formData.role === 'intern'} 
                      onClick={() => setFormData({ ...formData, role: 'intern' })}
                      icon={Users}
                      label="Intern"
                    />
                    <RoleButton 
                      active={formData.role === 'supervisor'} 
                      onClick={() => setFormData({ ...formData, role: 'supervisor' })}
                      icon={Shield}
                      label="Supervisor"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <InputField label="Full Identity" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. John Doe" />
                   <InputField label="Assigned Company" value={formData.company} onChange={v => setFormData({ ...formData, company: v })} placeholder="e.g. Acme Corp" />
                </div>

                <InputField label="Network Address (Email)" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} placeholder="name@example.com" />
                <InputField label="Initial Access Token" type="password" value={formData.password} onChange={v => setFormData({ ...formData, password: v })} placeholder="••••••••" />

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-black uppercase tracking-widest py-4 rounded-[1.5rem] transition-all shadow-2xl shadow-accent/20 disabled:opacity-50"
                  >
                    {creating ? 'Provisioning...' : 'Authorize & Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Revoke Access?"
        message={`This action will permanently delete ${deleteTarget?.name}'s account and all associated data. This is irreversible.`}
        variant="danger"
        confirmLabel="Confirm Deletion"
      />
    </div>
  )
}

function OverviewCard({ icon: Icon, label, value, color }) {
  const colors = {
    accent: 'bg-accent/10 text-accent border-accent/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20'
  }
  return (
    <div className="bg-surface border border-border rounded-[2rem] p-6 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-2xl font-black text-text-primary tabular-nums">{value}</div>
        <div className="text-[10px] uppercase font-black text-text-secondary tracking-[0.1em]">{label}</div>
      </div>
    </div>
  )
}

function RoleButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-3 py-3.5 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all
        ${active ? 'bg-accent text-white border-accent shadow-lg shadow-accent/10' : 'bg-surface-2 border-border text-text-secondary hover:border-accent/30'}`}
    >
      <Icon size={16} /> {label}
    </button>
  )
}

function InputField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">{label}</label>
      <input
        required
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-3.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-all shadow-inner"
      />
    </div>
  )
}
