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
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Simple Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">
            Hi, {profile.name.split(' ')[0]} 👋
          </h1>
          <p className="text-text-secondary text-sm">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary tabular-nums">{timeStr}</p>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{status.label}</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Today" value={`${todayHours.toFixed(1)}h`} />
        <StatCard icon={TrendingUp} label="This Month" value={`${monthTotal.toFixed(1)}h`} />
        <StatCard icon={Target} label="Total Progress" value={`${progressPercent.toFixed(1)}%`} />
        <StatCard icon={Calendar} label="Work Days" value={daysWorked} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Logging */}
        <section className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
            <Clock size={16} className="text-accent" /> Log Your Time
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TimeButton label="In AM" value={todayEntry.timeInAM} onClick={() => setTodayField('timeInAM')} locked={isLocked} icon={Sun} />
            <TimeButton label="Out AM" value={todayEntry.timeOutAM} onClick={() => setTodayField('timeOutAM')} locked={isLocked || !todayEntry.timeInAM} icon={Coffee} />
            <TimeButton label="In PM" value={todayEntry.timeInPM} onClick={() => setTodayField('timeInPM')} locked={isLocked || !todayEntry.timeOutAM} icon={Moon} />
            <TimeButton label="Out PM" value={todayEntry.timeOutPM} onClick={() => setTodayField('timeOutPM')} locked={isLocked || !todayEntry.timeInPM} icon={CheckCircle2} />
          </div>
        </section>

        {/* Verification Status */}
        <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" /> Recent Approvals
          </h3>
          <div className="space-y-3">
            {approvals.slice(0, 3).map(app => (
              <div key={app.month_key} className="flex items-center justify-between p-3 bg-bg border border-border rounded-lg">
                <span className="text-xs font-bold text-text-primary">{app.month_key}</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
            ))}
            {approvals.length === 0 && (
              <p className="text-center text-xs text-text-secondary italic py-4">No records yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Chart */}
      <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Weekly Hours Trend</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="hours" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <Icon size={16} className="text-accent mb-3" />
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}

function TimeButton({ label, icon: Icon, value, onClick, locked }) {
  return (
    <button
      onClick={onClick}
      disabled={!!value || locked}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
        ${value
          ? 'bg-gray-50 border-gray-200 opacity-50'
          : locked
            ? 'bg-gray-50 border-gray-200 opacity-20'
            : 'bg-white border-border hover:border-accent hover:shadow-md cursor-pointer group'
        }`}
    >
      <Icon size={18} className={`transition-colors ${value || locked ? 'text-gray-400' : 'text-accent group-hover:scale-110'}`} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{label}</span>
      {value && <span className="text-xs font-bold text-text-primary tabular-nums">{value}</span>}
    </button>
  )
}
