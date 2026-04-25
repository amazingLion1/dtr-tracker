import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Zap, Filter, Plus, User, UserCheck, RefreshCcw, LayoutGrid, List } from 'lucide-react'
import { useDtrData } from '../hooks/useDtrData'
import { calcHours, getDaysInMonth, formatMonthYear, getTodayKey, convert12to24, convert24to12, getMonthName } from '../utils/dateUtils'
import { fetchMonthData, updateMonthData, fetchSupervisors, archiveDocument } from '../lib/api'
import { useSwipeable } from 'react-swipeable'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'
import { useStore } from '../lib/store'
import { Skeleton, TableSkeleton } from './ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

export default function DTR({ userId }) {
  const { profile, setPage } = useStore()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [viewMode, setViewMode] = useState('table') 
  const [filter, setFilter] = useState('all')
  const { dtrData, setField: setDtrField, isLoading } = useDtrData(userId)
  const [approvedBy, setApprovedBy] = useState(null)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [showQuickFill, setShowQuickFill] = useState(false)
  const [calendarEditDay, setCalendarEditDay] = useState(null)
  const toast = useToast()

  const daysInMonth = getDaysInMonth(year, month)
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const isStudent = profile?.role !== 'supervisor'

  const [monthData, setMonthData] = useState({})
  const [supervisors, setSupervisors] = useState([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showRefreshDialog, setShowRefreshDialog] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchMonthData(userId, monthKey).then(data => {
      setMonthData(data || {})
      const isSigned = data?.dtr_status === 'approved' || data?.dtr_status === 'returned' || data?.dtr_status === 'pending'
      setApprovedBy(isSigned ? data?.supervisorName : null)
    })
  }, [userId, monthKey])

  const handleSign = async (name) => {
    setApprovedBy(name)
    setShowSignDialog(false)
    await updateMonthData(userId, monthKey, { supervisorName: name })
    toast.success(`DTR digitally signed by ${name}`)
  }
  
  useEffect(() => {
    if (isStudent) {
      fetchSupervisors().then(setSupervisors).catch(() => setSupervisors([]))
    }
  }, [isStudent])

  const handleSubmitDtr = async (supervisorId) => {
    try {
      await updateMonthData(userId, monthKey, { 
        dtr_status: 'pending',
        assigned_supervisor_id: supervisorId 
      })
      setMonthData(prev => ({ 
        ...prev, 
        dtr_status: 'pending',
        assigned_supervisor_id: supervisorId
      }))
      setShowSubmitModal(false)
      toast.success('DTR submitted for supervisor signature!')
    } catch (err) {
      toast.error('Submission failed: ' + err.message)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await archiveDocument(userId, monthKey, 'dtr', monthData)
      const resetFields = {
        dtr_status: null,
        dtr_intern_sig: null,
        dtr_supervisor_sig: null,
        assigned_supervisor_id: null
      }
      await updateMonthData(userId, monthKey, resetFields)
      setMonthData(prev => ({ ...prev, ...resetFields }))
      setApprovedBy(null)
      setShowRefreshDialog(false)
      toast.success('DTR process refreshed. Previous version archived.')
    } catch (err) {
      toast.error('Refresh failed: ' + err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const getEntry = (day) => {
    const key = `${monthKey}-${String(day).padStart(2, '0')}`
    return dtrData[key] || {}
  }

  const setField = (day, field, value) => {
    const key = `${monthKey}-${String(day).padStart(2, '0')}`
    setDtrField(key, field, value)
  }

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const totalRendered = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .reduce((sum, day) => { const e = getEntry(day); return sum + calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM) }, 0)

  const todayKey = getTodayKey(now)
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  const filteredDays = allDays.filter(day => {
    if (filter === 'all') return true
    const dow = new Date(year, month - 1, day).getDay()
    if (filter === 'weekdays') return dow !== 0 && dow !== 6
    if (filter === 'logged') {
      const e = getEntry(day)
      return e.timeInAM || e.timeInPM || e.statusTag
    }
    return true
  })

  const handleQuickFill = () => {
    let filled = 0
    allDays.forEach(day => {
      const dow = new Date(year, month - 1, day).getDay()
      if (dow === 0 || dow === 6) return 
      const e = getEntry(day)
      if (e.timeInAM || e.timeOutAM || e.timeInPM || e.timeOutPM || e.statusTag) return 
      setField(day, 'timeInAM',  '08:00 AM')
      setField(day, 'timeOutAM', '12:00 PM')
      setField(day, 'timeInPM',  '01:00 PM')
      setField(day, 'timeOutPM', '05:00 PM')
      filled++
    })
    setShowQuickFill(false)
    toast.success(`Quick filled ${filled} weekdays`)
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => nextMonth(),
    onSwipedRight: () => prevMonth(),
    preventScrollOnSwipe: true,
    trackMouse: true
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div {...handlers} className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-text-primary text-3xl font-black tracking-tight">Time Records</h1>
            <p className="text-text-secondary text-sm font-medium mt-1">{getMonthName(new Date(year, month-1))} {year}</p>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-2 p-1.5 rounded-[1.5rem] border border-border">
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl hover:bg-bg flex items-center justify-center text-text-secondary hover:text-accent transition-all">
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <span className="px-4 text-xs font-black uppercase tracking-widest text-text-primary tabular-nums">
              {getMonthName(new Date(year, month-1)).slice(0,3)} {year}
            </span>
            <button onClick={nextMonth} className="w-9 h-9 rounded-xl hover:bg-bg flex items-center justify-center text-text-secondary hover:text-accent transition-all">
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        </header>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex bg-surface-2 p-1 rounded-2xl border border-border">
              <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-surface shadow-lg text-accent' : 'text-text-secondary'}`}>
                <List size={14} /> Table
              </button>
              <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-surface shadow-lg text-accent' : 'text-text-secondary'}`}>
                <LayoutGrid size={14} /> Grid
              </button>
            </div>

            {viewMode === 'table' && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 rounded-2xl border border-border">
                {['all', 'weekdays', 'logged'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                      ${filter === f ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!approvedBy && isStudent && (
            <button
              onClick={() => setShowQuickFill(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface border border-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/30 hover:shadow-lg transition-all active:scale-95"
            >
              <Zap size={14} className="fill-accent/20" />
              Quick Fill
            </button>
          )}
        </div>

        {/* Form Identity Section */}
        {isStudent && (
          <section className="bg-surface border border-border rounded-[2rem] p-6 shadow-xl shadow-black/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">Student Identity</label>
                <input 
                  type="text"
                  value={monthData.internName || profile.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthData(prev => ({ ...prev, internName: val }));
                    updateMonthData(userId, monthKey, { internName: val });
                  }}
                  disabled={monthData.dtr_status === 'approved'}
                  placeholder="Official Name"
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-all shadow-inner disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">Authorized Supervisor</label>
                <select 
                  value={monthData.supervisorName || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthData(prev => ({ ...prev, supervisorName: val }));
                    updateMonthData(userId, monthKey, { supervisorName: val });
                  }}
                  disabled={monthData.dtr_status === 'approved'}
                  className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-all shadow-inner disabled:opacity-50 appearance-none cursor-pointer"
                >
                  <option value="">Select Official</option>
                  {supervisors.map(sv => (
                    <option key={sv.id} value={sv.name}>{sv.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-2/50 border-b border-border">
                    <th className="py-5 px-6 text-left text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] w-24">Calendar</th>
                    {['AM In', 'AM Out', 'PM In', 'PM Out'].map(h => (
                      <th key={h} className="py-5 px-2 text-center text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{h}</th>
                    ))}
                    <th className="py-5 px-6 text-center text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] w-24">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredDays.map(day => {
                    const entry = getEntry(day)
                    const key = `${monthKey}-${String(day).padStart(2, '0')}`
                    const hours = calcHours(entry.timeInAM, entry.timeOutAM, entry.timeInPM, entry.timeOutPM)
                    const isToday = key === todayKey
                    const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0
                    const isSpecial = entry.statusTag === 'leave' || entry.statusTag === 'holiday'
                    const isLocked = isWeekend || isSpecial || !!approvedBy || isStudent

                    return (
                      <tr key={day} className={`group transition-colors ${isToday ? 'bg-accent/5' : isWeekend ? 'bg-surface-2/20' : 'hover:bg-surface-2/40'}`}>
                        <td className="py-4 px-6">
                           <div className="flex flex-col">
                              <span className={`text-sm font-black tabular-nums ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                                {String(day).padStart(2, '0')}
                              </span>
                              <select 
                                value={entry.statusTag || ''} 
                                onChange={e => setField(day, 'statusTag', e.target.value)}
                                disabled={isStudent || !!approvedBy}
                                className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50 hover:text-accent bg-transparent outline-none cursor-pointer disabled:cursor-not-allowed"
                              >
                                <option value="">Normal</option>
                                <option value="leave">Leave</option>
                                <option value="holiday">Holiday</option>
                              </select>
                           </div>
                        </td>
                        {['timeInAM', 'timeOutAM', 'timeInPM', 'timeOutPM'].map(f => (
                          <td key={f} className="py-4 px-1.5 relative">
                             {isSpecial && f === 'timeInAM' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                   <span className="text-[9px] font-black text-text-secondary/30 uppercase tracking-[0.3em]">{entry.statusTag}</span>
                                </div>
                             )}
                             <input
                                type="time"
                                value={convert12to24(entry[f]) || ''}
                                onChange={e => setField(day, f, convert24to12(e.target.value))}
                                disabled={isLocked}
                                className={`w-full text-center text-xs font-bold tabular-nums bg-transparent border-none focus:text-accent transition-all
                                  ${isSpecial ? 'opacity-0' : 'opacity-100'}`}
                             />
                          </td>
                        ))}
                        <td className="py-4 px-6 text-center">
                           {hours > 0 ? (
                              <div className={`inline-flex px-2 py-1 rounded-lg text-[11px] font-black tabular-nums ${hours >= 8 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                 {hours.toFixed(1)}
                              </div>
                           ) : <span className="text-text-secondary/20 font-black">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-2/50 border-t border-border">
                    <td colSpan={5} className="py-6 px-8 text-right text-[11px] font-black text-text-secondary uppercase tracking-[0.2em]">Aggregate Monthly Volume</td>
                    <td className="py-6 px-8 text-center">
                       <div className="text-xl font-black text-accent tabular-nums tracking-tighter">{totalRendered.toFixed(1)}h</div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'calendar' && (
          <div className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl shadow-black/5">
             <div className="grid grid-cols-7 gap-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                   <div key={i} className="text-center text-[10px] font-black text-text-secondary uppercase tracking-widest pb-4 opacity-50">{d}</div>
                ))}
                {Array.from({ length: new Date(year, month-1, 1).getDay() }).map((_, i) => <div key={`e-${i}`} />)}
                {allDays.map(day => {
                   const entry = getEntry(day)
                   const hours = calcHours(entry.timeInAM, entry.timeOutAM, entry.timeInPM, entry.timeOutPM)
                   const active = calendarEditDay === day
                   return (
                      <button
                        key={day}
                        onClick={() => setCalendarEditDay(active ? null : day)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300
                          ${hours > 0 ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-105' : 'bg-surface-2 text-text-secondary hover:border-accent/30 border border-transparent'}
                          ${active ? 'ring-4 ring-accent/30 ring-offset-4 ring-offset-bg' : ''}`}
                      >
                         <span className="text-xs font-black">{day}</span>
                         {hours > 0 && <span className="text-[9px] font-bold opacity-80">{hours.toFixed(0)}h</span>}
                      </button>
                   )
                })}
             </div>
          </div>
        )}

        {/* Actions Footer */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 pt-4">
          <div className="flex items-center gap-4">
             <Legend color="bg-emerald-500" label="Full Day" />
             <Legend color="bg-yellow-500" label="Undertime" />
          </div>

          <div className="flex items-center gap-3">
             <AnimatePresence>
                {monthData.dtr_status === 'approved' ? (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                         <UserCheck size={14} className="text-emerald-500" />
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified by {monthData.supervisorName}</span>
                      </div>
                      <button onClick={() => setPage('print-dtr')} className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95">
                         Download PDF
                      </button>
                   </motion.div>
                ) : isStudent ? (
                   <div className="flex items-center gap-3">
                      <button onClick={() => setShowRefreshDialog(true)} className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-accent transition-all">
                         <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                      </button>
                      <button 
                        onClick={() => setShowSubmitModal(true)}
                        disabled={!!monthData.dtr_status}
                        className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {monthData.dtr_status === 'pending' ? 'Submission Pending' : 'Submit for Review'}
                      </button>
                   </div>
                ) : (
                   <button onClick={() => setShowSignDialog(true)} className="bg-surface border-2 border-accent text-accent px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-xl shadow-accent/5">
                      Authorize Signature
                   </button>
                )}
             </AnimatePresence>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <ConfirmDialog open={showSignDialog} onClose={() => setShowSignDialog(false)} onConfirm={handleSign} title="Digitally Sign Month" message="Authorize and lock this month's records." confirmLabel="Sign & Lock" variant="warning" input inputPlaceholder="Supervisor name" />
      <ConfirmDialog open={showRefreshDialog} onClose={() => setShowRefreshDialog(false)} onConfirm={handleRefresh} title="Refresh Process?" message="This will reset signatures and archive the current version." confirmLabel="Archive & Reset" variant="warning" />
      <ConfirmDialog open={showQuickFill} onClose={() => setShowQuickFill(false)} onConfirm={handleQuickFill} title="Quick Fill" message="Apply standard schedule to all empty weekdays?" confirmLabel="Apply" />

      {/* Supervisor Selector */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-border w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
              <h3 className="text-2xl font-black text-text-primary mb-2">Request Signature</h3>
              <p className="text-text-secondary text-sm font-medium mb-8">Select your designated supervisor for {formatMonthYear(year, month)}.</p>
              
              <div className="space-y-3 mb-8 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {supervisors.map(sv => (
                  <button key={sv.id} onClick={() => handleSubmitDtr(sv.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-2 border border-border hover:border-accent hover:shadow-lg transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black group-hover:scale-110 transition-transform">
                      {sv.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-black text-text-primary">{sv.name}</div>
                      <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{sv.company}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
       <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
       <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{label}</span>
    </div>
  )
}
