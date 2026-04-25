import { Users, Search, ChevronRight, Building2, Calendar, UserPlus, Trash2, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchAllDtrEntries, fetchAllSignatureRequests } from '../lib/api'
import { calcHours, getTodayKey } from '../utils/dateUtils'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function SupervisorDashboard({ users, profile, onSelectUser, onCreateStudent, onDeleteUser }) {
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [allDtrData, setAllDtrData] = useState([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [signatureRequests, setSignatureRequests] = useState([])
  const toast = useToast()
  
  const interns = users.filter(u => 
    u.role !== 'supervisor' && 
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.company.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    setAnalyticsLoading(true)
    fetchAllDtrEntries()
      .then(data => setAllDtrData(data))
      .catch(() => setAllDtrData([]))
      .finally(() => setAnalyticsLoading(false))
      
    fetchAllSignatureRequests()
      .then(reqs => {
        setSignatureRequests(reqs.filter(r => r.data.assigned_supervisor_id === profile.id))
      })
      .catch(() => setSignatureRequests([]))
  }, [users, profile.id])

  const todayKey = getTodayKey(new Date())
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const internIds = new Set(users.filter(u => u.role !== 'supervisor').map(u => u.id))
  const loggedInToday = new Set(allDtrData.filter(e => e.date === todayKey && internIds.has(e.profile_id) && (e.time_in_am || e.time_in_pm)).map(e => e.profile_id))

  const handleDelete = () => {
    if (!deleteTarget) return
    onDeleteUser?.(deleteTarget.id)
    toast.success(`${deleteTarget.name}'s account has been removed`)
    setDeleteTarget(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-text-primary text-3xl font-bold tracking-tight">Supervisor Panel</h1>
          <p className="text-text-secondary text-sm font-medium mt-1">Manage intern records and monitor activity</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent w-48 md:w-64 transition-all"
            />
          </div>
          <button onClick={onCreateStudent} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20 transition-all active:scale-95 flex items-center gap-2">
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add Student</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Interns" value={interns.length} color="indigo" />
        <StatCard icon={CheckCircle2} label="Present Today" value={loggedInToday.size} color="emerald" />
        <StatCard icon={Building2} label="Companies" value={new Set(interns.map(u => u.company)).size} color="blue" />
        <StatCard icon={AlertTriangle} label="Pending Sign" value={signatureRequests.length} color="amber" />
      </div>

      {/* Signature Alerts */}
      {signatureRequests.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-[2rem] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <AlertTriangle size={24} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-text-primary">Action Required</h3>
                <p className="text-xs text-text-secondary">You have {signatureRequests.length} pending signature requests to review.</p>
             </div>
          </div>
          <button onClick={() => {}} className="text-accent text-xs font-bold uppercase tracking-widest hover:underline">View All</button>
        </div>
      )}

      {/* Intern List */}
      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-border bg-surface-2/30 flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Registered Interns</h2>
          <span className="text-[10px] font-bold text-text-secondary">{interns.length} total</span>
        </div>
        
        <div className="divide-y divide-border">
          {interns.length > 0 ? interns.map(user => (
            <div key={user.id} className="group flex items-center gap-4 px-8 py-5 hover:bg-surface-2/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-bg border border-border flex items-center justify-center text-accent font-bold text-lg">
                {user.name[0].toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-bold text-lg tracking-tight truncate">{user.name}</span>
                  {loggedInToday.has(user.id) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Present today" />}
                </div>
                <p className="text-text-secondary text-xs font-medium">{user.company}</p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onSelectUser(user.id)} className="px-4 py-2 bg-bg border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-primary hover:border-accent hover:text-accent transition-all">
                  Inspect
                </button>
                <button onClick={() => setDeleteTarget(user)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center text-text-secondary italic">No results found.</div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Remove ${deleteTarget?.name}?`}
        message={`This will permanently delete this intern's account and all their records.`}
        confirmLabel="Remove Intern"
        variant="danger"
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
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
