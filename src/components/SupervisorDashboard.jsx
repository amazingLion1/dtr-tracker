import { Users, Search, ChevronRight, Building2, Calendar, UserPlus, Trash2, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchAllDtrEntries, fetchAllSignatureRequests } from '../lib/api'
import { calcHours, getTodayKey } from '../utils/dateUtils'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

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

  // ── Fetch analytics data ──────────────────────────────────────────────────
  useEffect(() => {
    setAnalyticsLoading(true)
    fetchAllDtrEntries()
      .then(data => setAllDtrData(data))
      .catch(() => setAllDtrData([]))
      .finally(() => setAnalyticsLoading(false))
      
    fetchAllSignatureRequests()
      .then(reqs => {
        // Only show requests assigned to this supervisor
        setSignatureRequests(reqs.filter(r => r.data.assigned_supervisor_id === profile.id))
      })
      .catch(() => setSignatureRequests([]))
  }, [users, profile.id])

  // ── Analytics calculations ────────────────────────────────────────────────
  const todayKey = getTodayKey(new Date())
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  const internIds = new Set(users.filter(u => u.role !== 'supervisor').map(u => u.id))

  // Who logged in today
  const todayEntries = allDtrData.filter(e => e.date === todayKey && internIds.has(e.profile_id))
  const loggedInToday = new Set(todayEntries.filter(e => e.time_in_am || e.time_in_pm).map(e => e.profile_id))
  
  // Monthly hours per intern
  const monthlyHours = {}
  allDtrData.filter(e => e.date?.startsWith(currentMonthKey) && internIds.has(e.profile_id)).forEach(e => {
    const hrs = calcHours(e.time_in_am || '', e.time_out_am || '', e.time_in_pm || '', e.time_out_pm || '')
    monthlyHours[e.profile_id] = (monthlyHours[e.profile_id] || 0) + hrs
  })

  // Compliance: % of weekdays this month with at least one entry
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const weekdaysSoFar = Array.from({ length: Math.min(now.getDate(), daysInMonth) }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
    return d.getDay() !== 0 && d.getDay() !== 6 ? 1 : 0
  }).reduce((a, b) => a + b, 0)

  const internCompliance = {}
  interns.forEach(intern => {
    const daysLogged = allDtrData.filter(e => 
      e.profile_id === intern.id && 
      e.date?.startsWith(currentMonthKey) && 
      (e.time_in_am || e.time_in_pm)
    ).length
    internCompliance[intern.id] = weekdaysSoFar > 0 ? Math.round((daysLogged / weekdaysSoFar) * 100) : 0
  })

  // Interns missing entries (haven't logged in 3+ days)
  const missingEntries = interns.filter(intern => {
    const lastEntry = allDtrData
      .filter(e => e.profile_id === intern.id && (e.time_in_am || e.time_in_pm))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!lastEntry) return true
    const daysSince = Math.floor((new Date() - new Date(lastEntry.date)) / (1000 * 60 * 60 * 24))
    return daysSince >= 3
  })

  const handleDelete = () => {
    if (!deleteTarget) return
    onDeleteUser?.(deleteTarget.id)
    toast.success(`${deleteTarget.name}'s account has been removed`)
    setDeleteTarget(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Supervisor Dashboard</h1>
          <p className="text-text-secondary text-sm mt-0.5">Manage and oversee intern records</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search interns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-all"
              aria-label="Search interns"
            />
          </div>
          <button
            onClick={onCreateStudent}
            className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm px-4 py-2"
          >
            <UserPlus size={15} />
            <span className="hidden sm:inline">Create Student</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">{interns.length}</div>
              <div className="text-[9px] uppercase font-bold text-text-secondary tracking-widest">Total Interns</div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">{loggedInToday.size}</div>
              <div className="text-[9px] uppercase font-bold text-text-secondary tracking-widest">Active Today</div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-secondary">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">{new Set(interns.map(u => u.company)).size}</div>
              <div className="text-[9px] uppercase font-bold text-text-secondary tracking-widest">Companies</div>
            </div>
          </div>
        </div>

        {missingEntries.length > 0 ? (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-text-primary">{missingEntries.length}</div>
                <div className="text-[9px] uppercase font-bold text-red-400 tracking-widest">Inactive 3d+</div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onCreateStudent}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 hover:bg-emerald-500/10 transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                <UserPlus size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary">New Student</div>
                <div className="text-[9px] uppercase font-bold text-text-secondary tracking-widest">Create Account</div>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Missing entries alert */}
      {missingEntries.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Missing Entries Alert</span>
          </div>
          <p className="text-text-secondary text-xs leading-relaxed">
            {missingEntries.map(u => u.name).join(', ')} {missingEntries.length === 1 ? 'has' : 'have'} not logged time in 3+ days.
          </p>
        </div>
      )}

      {/* Signature Requests */}
      {signatureRequests.length > 0 && (
        <div className="bg-surface border border-accent/30 rounded-3xl overflow-hidden shadow-[0_0_15px_rgba(var(--color-accent),0.1)]">
          <div className="px-6 py-4 border-b border-accent/20 flex items-center justify-between bg-accent/5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-accent uppercase tracking-wider">Pending Signatures</h2>
            </div>
            <span className="text-[10px] font-bold text-white bg-accent px-2 py-1 rounded-md uppercase">{signatureRequests.length} Requests</span>
          </div>
          <div className="divide-y divide-border">
            {signatureRequests.map(req => {
              const user = users.find(u => u.id === req.profile_id)
              if (!user) return null
              return (
                <div key={`${req.profile_id}-${req.month_key}`} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-2/60 transition-all">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-text-primary">{user.name} <span className="text-text-secondary font-normal">({req.month_key})</span></div>
                    <div className="text-xs text-text-secondary flex gap-3 mt-1">
                      {req.data.dtr_status === 'pending' && <span className="text-yellow-500 font-semibold">• DTR needs signature</span>}
                      {req.data.journal_status === 'pending' && <span className="text-yellow-500 font-semibold">• Journal needs signature</span>}
                    </div>
                  </div>
                  <button onClick={() => onSelectUser(user.id)} className="btn-primary text-xs px-3 py-1.5">Review</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Intern List */}
      <div className="bg-surface border border-border rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Intern List</h2>
          <span className="text-[10px] font-bold text-text-secondary bg-surface-2 px-2 py-1 rounded-md uppercase">{interns.length} Active</span>
        </div>
        
        <div className="divide-y divide-border">
          {interns.length > 0 ? interns.map(user => {
            const hours = monthlyHours[user.id] || 0
            const compliance = internCompliance[user.id] || 0
            const isActiveToday = loggedInToday.has(user.id)

            return (
              <div key={user.id} className="group flex items-center gap-4 px-6 py-4 hover:bg-surface-2/60 transition-all">
                <button
                  onClick={() => onSelectUser(user.id)}
                  className="flex-1 flex items-center gap-4 text-left"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                      <span className="text-accent text-lg font-bold">{user.name[0].toUpperCase()}</span>
                    </div>
                    {isActiveToday && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-surface" title="Active today" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-bold text-base truncate">{user.name}</span>
                      <div className="h-4 w-px bg-border" />
                      <span className="text-text-secondary text-xs truncate">{user.company}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-1.5 text-text-secondary/60 text-[10px]">
                        <Clock size={10} />
                        <span>{hours.toFixed(1)}h this month</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <TrendingUp size={10} className={compliance >= 80 ? 'text-emerald-500' : compliance >= 50 ? 'text-yellow-500' : 'text-red-400'} />
                        <span className={compliance >= 80 ? 'text-emerald-500' : compliance >= 50 ? 'text-yellow-500' : 'text-red-400'}>
                          {compliance}% compliance
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Inspect</span>
                    <ChevronRight size={16} className="text-accent" />
                  </div>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(user) }}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100
                    text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent"
                  title="Remove student"
                  aria-label={`Delete ${user.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          }) : (
            <div className="py-20 text-center">
              <Users size={48} className="mx-auto text-text-secondary/20 mb-4" />
              <p className="text-text-secondary font-medium italic">No interns found</p>
              <button
                onClick={onCreateStudent}
                className="mt-4 text-accent text-sm font-medium hover:underline"
              >
                Create your first student account →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.name}?`}
        message={`This will permanently remove ${deleteTarget?.name}'s account and all their DTR/journal data. This action cannot be undone.`}
        confirmLabel="Delete Account"
        variant="danger"
      />
    </div>
  )
}
