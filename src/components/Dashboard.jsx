import { useState, useEffect, useMemo } from 'react'
import { Clock, Sun, Moon, Coffee, CheckCircle2, Calendar, TrendingUp, AlertCircle, Target, FileText, ShieldCheck } from 'lucide-react'
import { useDtrData } from '../hooks/useDtrData'
import { getTodayKey, formatTime, calcHours } from '../utils/dateUtils'
import { useToast } from './ui/Toast'
import { fetchUserApprovals, fetchMonthData } from '../lib/api'
import { Skeleton, CardSkeleton } from './ui/Skeleton'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store'

export default function Dashboard({ profile, userId }) {
  const [now, setNow] = useState(new Date())
  const { dtrData, setField, isLoading } = useDtrData(userId)
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

  // ── Stats Calculations ───────────────────────────────────────────────────
  const todayHours = calcHours(todayEntry.timeInAM, todayEntry.timeOutAM, todayEntry.timeInPM, todayEntry.timeOutPM)
  const monthEntries = Object.entries(dtrData).filter(([k]) => k.startsWith(monthKey))
  const monthTotal = monthEntries.reduce((sum, [, e]) => sum + calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM), 0)
  const totalAllTimeHours = Object.values(dtrData).reduce((sum, e) => sum + calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM), 0)
  const requiredHours = profile?.required_hours || 486
  const progressPercent = Math.min((totalAllTimeHours / requiredHours) * 100, 100)

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-9 w-64" />
        <CardSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Simple Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-3xl font-bold tracking-tight">
            Hi, {profile.name.split(' ')[0]} 👋
          </h1>
          <p className="text-text-secondary text-sm font-medium mt-1">{dateStr}</p>
        </div>
        <div className="bg-surface-2 border border-border px-6 py-3 rounded-2xl text-right">
          <p className="text-2xl font-bold text-text-primary tabular-nums leading-none">{timeStr}</p>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">Real-time Clock</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Today's Hours" value={`${todayHours.toFixed(1)}h`} color="indigo" />
        <StatCard icon={TrendingUp} label="This Month" value={`${monthTotal.toFixed(1)}h`} color="emerald" />
        <StatCard icon={Target} label="Overall Progress" value={`${progressPercent.toFixed(1)}%`} color="blue" />
        <StatCard icon={Calendar} label="Target Goal" value={`${requiredHours}h`} color="amber" />
      </div>

      {/* Logging & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Time Logger */}
        <section className="lg:col-span-2 bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Log Attendance</h3>
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
               <Clock size={20} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
               <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">Morning Shift</p>
               <div className="grid grid-cols-2 gap-2">
                  <TimeButton label="In" value={todayEntry.timeInAM} onClick={() => setTodayField('timeInAM')} active={!todayEntry.timeInAM} disabled={isLocked || !!todayEntry.timeInAM} />
                  <TimeButton label="Out" value={todayEntry.timeOutAM} onClick={() => setTodayField('timeOutAM')} active={!!todayEntry.timeInAM && !todayEntry.timeOutAM} disabled={isLocked || !todayEntry.timeInAM || !!todayEntry.timeOutAM} />
               </div>
            </div>
            <div className="space-y-3">
               <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">Afternoon Shift</p>
               <div className="grid grid-cols-2 gap-2">
                  <TimeButton label="In" value={todayEntry.timeInPM} onClick={() => setTodayField('timeInPM')} active={!!todayEntry.timeOutAM && !todayEntry.timeInPM} disabled={isLocked || !todayEntry.timeOutAM || !!todayEntry.timeInPM} />
                  <TimeButton label="Out" value={todayEntry.timeOutPM} onClick={() => setTodayField('timeOutPM')} active={!!todayEntry.timeInPM && !todayEntry.timeOutPM} disabled={isLocked || !todayEntry.timeInPM || !!todayEntry.timeOutPM} />
               </div>
            </div>
          </div>
        </section>

        {/* Verification Status */}
        <section className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Recent Records</h3>
          <div className="space-y-3">
            {approvals.length > 0 ? approvals.slice(0, 4).map(app => (
              <div key={app.month_key} className="flex items-center justify-between p-4 bg-bg border border-border rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-primary">{app.month_key}</span>
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">Approved</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <CheckCircle2 size={16} />
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                 <FileText size={40} className="mx-auto text-text-secondary/10 mb-2" />
                 <p className="text-xs text-text-secondary italic">No approved records yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

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
    <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-text-primary tabular-nums">{value}</div>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}

function TimeButton({ label, value, onClick, active, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-2xl border text-xs font-bold transition-all
        ${value 
          ? 'bg-bg text-text-primary border-border cursor-default' 
          : active 
            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 active:scale-95' 
            : 'bg-surface-2 text-text-secondary border-transparent opacity-40 cursor-not-allowed'}`}
    >
      {value || (active ? `Log ${label}` : label)}
    </button>
  )
}
