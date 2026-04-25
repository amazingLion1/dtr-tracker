import { useState, useEffect, useMemo } from 'react'
import { Clock, Sun, Moon, Coffee, CheckCircle2, Calendar, TrendingUp, AlertCircle, Target, Sparkles, FileText, ShieldCheck, ArrowUpRight } from 'lucide-react'
import { useDtrData } from '../hooks/useDtrData'
import { getTodayKey, formatTime, calcHours, getMonthName } from '../utils/dateUtils'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'
import { fetchUserApprovals, fetchMonthData } from '../lib/api'
import { Skeleton, CardSkeleton } from './ui/Skeleton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

export default function Dashboard({ profile, userId }) {
  const [now, setNow] = useState(new Date())
  const { dtrData, setField, clearDay, isLoading } = useDtrData(userId)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [approvals, setApprovals] = useState([])
  const [monthData, setMonthData] = useState({})
  const toast = useToast()

  useEffect(() => {
    fetchUserApprovals(userId).then(setApprovals)
  }, [userId])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const todayKey = getTodayKey(now)
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const todayEntry = dtrData[todayKey] || {}

  useEffect(() => {
    fetchMonthData(userId, monthKey).then(setMonthData)
  }, [userId, monthKey])

  const isLocked = monthData.dtr_status === 'pending' || monthData.dtr_status === 'approved' || monthData.dtr_status === 'returned'

  const setTodayField = (field) => {
    if (isLocked) {
      toast.error('This month is locked (Pending/Approved). Cannot log time.')
      return
    }
    const time = formatTime(now)
    setField(todayKey, field, time)
    toast.success(`${field.replace('time', 'Time ').replace('AM', ' AM').replace('PM', ' PM')} logged: ${time}`)
  }

  const handleClearDay = () => {
    clearDay(todayKey)
    setShowClearConfirm(false)
    toast.info("Today's entries cleared")
  }

  // ── Stats Calculations ───────────────────────────────────────────────────
  const todayHours = calcHours(todayEntry.timeInAM, todayEntry.timeOutAM, todayEntry.timeInPM, todayEntry.timeOutPM)
  const monthEntries = Object.entries(dtrData).filter(([k]) => k.startsWith(monthKey))
  const monthTotal = monthEntries.reduce((sum, [, e]) => sum + calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM), 0)
  const daysWorked = monthEntries.filter(([, e]) => e.timeInAM || e.timeInPM).length
  const totalAllTimeHours = Object.values(dtrData).reduce((sum, e) => sum + calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM), 0)
  const requiredHours = profile?.required_hours || 486
  const progressPercent = Math.min((totalAllTimeHours / requiredHours) * 100, 100)

  // ── Chart Data: Last 7 Days Trend ────────────────────────────────────────
  const chartData = useMemo(() => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = getTodayKey(d)
      const entry = dtrData[key] || {}
      const hours = calcHours(entry.timeInAM, entry.timeOutAM, entry.timeInPM, entry.timeOutPM)
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: parseFloat(hours.toFixed(1))
      })
    }
    return data
  }, [dtrData])

  const getStatus = () => {
    if (!todayEntry.timeInAM)  return { label: 'Not started yet',         color: 'text-text-secondary', icon: AlertCircle }
    if (!todayEntry.timeOutAM) return { label: 'Morning session active',  color: 'text-accent',         icon: Sun }
    if (!todayEntry.timeInPM)  return { label: 'Lunch break',             color: 'text-yellow-500',     icon: Coffee }
    if (!todayEntry.timeOutPM) return { label: 'Afternoon session active', color: 'text-accent',        icon: Moon }
    return { label: 'Day complete!', color: 'text-emerald-500', icon: CheckCircle2 }
  }

  const status = getStatus()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <CardSkeleton />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-accent mb-1"
          >
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Status</span>
          </motion.div>
          <h1 className="text-text-primary text-3xl font-black tracking-tight">
            Hi, {profile.name.split(' ')[0]} 👋
          </h1>
          <p className="text-text-secondary text-sm font-medium">{dateStr}</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-surface border border-border rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-text-primary tabular-nums tracking-wide">{timeStr}</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clock & Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Hero Card */}
          <section className="relative overflow-hidden bg-gradient-to-br from-surface to-surface-2 border border-border rounded-[2.5rem] p-8 shadow-2xl shadow-accent/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4">Today's Session</p>
                <div key={status.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg border border-border shadow-sm mb-4 ${status.color}`}>
                  <status.icon size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{status.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                   <h2 className="text-5xl font-black text-text-primary tabular-nums tracking-tighter">
                     {todayHours.toFixed(1)}
                   </h2>
                   <span className="text-lg font-bold text-text-secondary">hours</span>
                </div>
                <p className="text-text-secondary text-xs mt-1 font-medium italic">Current progress for today</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                <ClockAction label="In AM"  icon={Sun}    value={todayEntry.timeInAM}  onClick={() => setTodayField('timeInAM')} locked={isLocked} />
                <ClockAction label="Out AM" icon={Coffee} value={todayEntry.timeOutAM} onClick={() => setTodayField('timeOutAM')} locked={isLocked || !todayEntry.timeInAM} />
                <ClockAction label="In PM"  icon={Moon}   value={todayEntry.timeInPM}  onClick={() => setTodayField('timeInPM')}  locked={isLocked || !todayEntry.timeOutAM} />
                <ClockAction label="Out PM" icon={CheckCircle2} value={todayEntry.timeOutPM} onClick={() => setTodayField('timeOutPM')} locked={isLocked || !todayEntry.timeInPM} />
              </div>
            </div>
          </section>

          {/* Productivity Chart */}
          <section className="bg-surface border border-border rounded-[2.5rem] p-8">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Productivity Trend</h3>
                   <p className="text-text-secondary text-[11px] font-medium mt-1">Daily hours logged this week</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full">
                   <ArrowUpRight size={12} />
                   <span>+2.4h</span>
                </div>
             </div>
             
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                         <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis 
                         dataKey="name" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-secondary)' }} 
                         dy={10}
                      />
                      <YAxis hide domain={[0, 10]} />
                      <Tooltip 
                         contentStyle={{ 
                            backgroundColor: 'var(--surface)', 
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '11px',
                            fontWeight: 'bold'
                         }}
                         itemStyle={{ color: 'var(--accent)' }}
                      />
                      <Area 
                         type="monotone" 
                         dataKey="hours" 
                         stroke="var(--accent)" 
                         strokeWidth={3} 
                         fillOpacity={1} 
                         fill="url(#colorHours)" 
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </section>
        </div>

        {/* Right Column: Progress & Vault */}
        <div className="space-y-6">
          {/* OJT Progress Card */}
          <section className="bg-surface-2 border border-border rounded-[2.5rem] p-8">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
                   <Target size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Total Progress</p>
                   <p className="text-sm font-bold text-text-primary tracking-tight">{totalAllTimeHours.toFixed(1)} / {requiredHours}h</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="relative h-4 w-full bg-bg border border-border rounded-full overflow-hidden p-0.5">
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover relative"
                   >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
                   </motion.div>
                </div>
                
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{progressPercent.toFixed(1)}% Done</span>
                   <span className="text-[10px] font-black text-accent uppercase tracking-widest">Target 100%</span>
                </div>
             </div>
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             <CompactStat icon={TrendingUp} label="Monthly" value={`${monthTotal.toFixed(1)}h`} />
             <CompactStat icon={Calendar}   label="Work Days" value={daysWorked} />
          </div>

          {/* Mini Vault */}
          <section className="bg-surface border border-border rounded-[2.5rem] overflow-hidden">
             <div className="p-6 border-b border-border bg-surface-2/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={16} className="text-emerald-500" />
                   <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Verified Vault</h3>
                </div>
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-black">
                   {approvals.filter(a => a.data.dtr_status === 'approved' || a.data.journal_status === 'approved').length}
                </div>
             </div>
             <div className="p-6 space-y-3">
                {approvals.slice(0, 3).map(app => (
                   <div key={app.month_key} className="flex items-center justify-between p-3 bg-surface-2 rounded-2xl border border-border/50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center">
                            <FileText size={14} className="text-text-secondary" />
                         </div>
                         <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">{app.month_key}</span>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                   </div>
                ))}
                {approvals.length === 0 && (
                   <p className="text-center text-[10px] text-text-secondary font-medium py-4 italic">No verified records found yet.</p>
                )}
             </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearDay}
        title="Clear Today's Entries"
        message="This will remove all time entries for today. This cannot be undone."
        confirmLabel="Clear Entries"
        variant="danger"
      />
    </div>
  )
}

function ClockAction({ label, icon: Icon, value, onClick, locked }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={!!value || locked}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200
        ${value
          ? 'bg-surface border-border opacity-40'
          : locked
            ? 'bg-surface border-border opacity-20 grayscale'
            : 'bg-bg border-border hover:border-accent hover:shadow-lg hover:shadow-accent/5 cursor-pointer group'
        }`}
    >
      <Icon size={16} className={`transition-colors ${value || locked ? 'text-text-secondary' : 'text-accent group-hover:scale-110'}`} />
      <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">{label}</span>
      {value && <span className="text-[10px] font-bold text-text-primary tabular-nums">{value}</span>}
    </motion.button>
  )
}

function CompactStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface border border-border rounded-[1.75rem] p-5">
      <Icon size={14} className="text-accent mb-3" />
      <p className="text-[9px] font-black text-text-secondary uppercase tracking-[0.15em] mb-1">{label}</p>
      <p className="text-xl font-black text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

function getGreeting(date) {
  const h = date.getHours()
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  return 'Evening'
}
