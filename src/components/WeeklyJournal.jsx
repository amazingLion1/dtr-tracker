import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ImagePlus, X, Plus, User, UserCheck, RefreshCcw, BookOpen, Camera, CheckCircle2 } from 'lucide-react'
import { useJournalData } from '../hooks/useJournalData'
import { fetchMonthData, updateMonthData, fetchSupervisors, archiveDocument } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { getWeekDateRange, formatMonthYear, getMonthName } from '../utils/dateUtils'
import { useSwipeable } from 'react-swipeable'
import ImageLightbox from './ui/ImageLightbox'
import ConfirmDialog from './ui/ConfirmDialog'
import { useStore } from '../lib/store'
import { Skeleton } from './ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

const WEEKS = [1, 2, 3, 4, 5]

export default function WeeklyJournal({ userId }) {
  const { profile, setPage } = useStore()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { getWeek: getWeekByKey, setField: setWeekField, isLoading, journalData } = useJournalData(userId)
  const [expanded, setExpanded] = useState({ 1: true })

  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const [monthData, setMonthData] = useState({})
  const [supervisors, setSupervisors] = useState([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showRefreshDialog, setShowRefreshDialog] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const toast = useToast()

  const isStudent = profile?.role !== 'supervisor'

  useEffect(() => {
    fetchMonthData(userId, monthKey).then(data => {
      setMonthData(data || {})
    })
  }, [userId, monthKey])
  
  useEffect(() => {
    if (isStudent) {
      fetchSupervisors().then(setSupervisors).catch(() => setSupervisors([]))
    }
  }, [isStudent])

  const handleSubmitJournal = async (supervisorId) => {
    try {
      await updateMonthData(userId, monthKey, { 
        journal_status: 'pending',
        assigned_supervisor_id: supervisorId
      })
      setMonthData(prev => ({ 
        ...prev, 
        journal_status: 'pending',
        assigned_supervisor_id: supervisorId
      }))
      setShowSubmitModal(false)
      toast.success('Journal submitted for signature!')
    } catch (err) {
      toast.error('Submission failed: ' + err.message)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await archiveDocument(userId, monthKey, 'journal', monthData)
      const resetFields = {
        journal_status: null,
        journal_intern_sig: null,
        journal_supervisor_sig: null,
        assigned_supervisor_id: null
      }
      await updateMonthData(userId, monthKey, resetFields)
      setMonthData(prev => ({ ...prev, ...resetFields }))
      setShowRefreshDialog(false)
      toast.success('Journal refreshed and archived.')
    } catch (err) {
      toast.error('Refresh failed: ' + err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const getWeek = (num) => getWeekByKey(`${monthKey}-w${num}`)

  const setField = (weekNum, field, value) => {
    setWeekField(`${monthKey}-w${weekNum}`, field, value)
  }

  const toggle = (num) => setExpanded(prev => ({ ...prev, [num]: !prev[num] }))

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

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
        <div className="space-y-4">
           {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />)}
        </div>
      </div>
    )
  }

  return (
    <div {...handlers} className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex-1 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-text-primary text-3xl font-black tracking-tight">Weekly Journals</h1>
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

        {/* Identity Form */}
        <section className="bg-surface border border-border rounded-[2rem] p-6 shadow-xl shadow-black/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">Journal Owner</label>
              <input 
                type="text"
                value={monthData.internName || profile.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthData(prev => ({ ...prev, internName: val }));
                  updateMonthData(userId, monthKey, { internName: val });
                }}
                disabled={monthData.journal_status === 'approved'}
                placeholder="Full Name"
                className="w-full bg-surface-2 border border-border rounded-2xl px-5 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-all shadow-inner disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] px-1">Supervisor Verification</label>
              <select 
                value={monthData.supervisorName || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthData(prev => ({ ...prev, supervisorName: val }));
                  updateMonthData(userId, monthKey, { supervisorName: val });
                }}
                disabled={monthData.journal_status === 'approved'}
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

        {/* Weeks Accordion */}
        <div className="space-y-4">
          {WEEKS.map(num => {
            const entry   = getWeek(num)
            const isOpen  = !!expanded[num]
            const hasData = !!(entry.task || entry.docNote || entry.images?.length)

            return (
              <motion.div layout key={num} className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-300">
                <button
                  onClick={() => toggle(num)}
                  className={`w-full flex items-center justify-between gap-4 px-8 py-5 transition-all
                    ${isOpen ? 'bg-surface-2/30' : 'hover:bg-surface-2/60'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-sm
                      ${hasData ? 'bg-accent text-white shadow-accent/20 scale-105' : 'bg-bg border border-border text-text-secondary opacity-50'}`}>
                      {num}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-text-primary text-lg font-black tracking-tight">Week {num}</span>
                      <span className="text-[10px] font-black text-text-secondary/60 uppercase tracking-[0.15em]">{getWeekDateRange(year, month, num)}</span>
                    </div>
                    {hasData && (
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-accent/5 border border-accent/10 rounded-full">
                         <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                         <span className="text-[9px] font-black text-accent uppercase tracking-widest">Entry Logged</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent border-accent/30 shadow-lg shadow-accent/5' : ''}`}>
                    <ChevronDown size={18} strokeWidth={3} />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                        <div className="p-8 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                             <BookOpen size={14} className="text-accent" />
                             <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Activity Log</label>
                          </div>
                          <textarea
                            value={entry.task || ''}
                            onChange={e => setField(num, 'task', e.target.value)}
                            placeholder="Detail your accomplishments, challenges, and learnings for this week..."
                            rows={8}
                            className="w-full bg-bg border border-border rounded-2xl px-6 py-5 text-text-primary text-sm placeholder:text-text-secondary/30 focus:outline-none focus:border-accent transition-all shadow-inner resize-none leading-relaxed"
                          />
                        </div>

                        <div className="p-8 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                             <Camera size={14} className="text-accent" />
                             <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Documentation</label>
                          </div>
                          <DocumentationUpload
                            images={entry.images || []}
                            note={entry.docNote || ''}
                            onImagesChange={imgs => setField(num, 'images', imgs)}
                            onNoteChange={note => setField(num, 'docNote', note)}
                            weekNum={num}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
           <div className="flex items-center gap-2 text-text-secondary/40">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest italic">Synchronizing live snapshots</span>
           </div>

           <div className="flex items-center gap-3">
              <AnimatePresence>
                 {monthData.journal_status === 'approved' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4">
                       <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={14} /> Finalized
                       </div>
                       <button onClick={() => setPage('print-journal')} className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95">
                          Download Journal
                       </button>
                    </motion.div>
                 ) : isStudent ? (
                    <div className="flex items-center gap-3">
                       <button onClick={() => setShowRefreshDialog(true)} className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-accent transition-all">
                          <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                       </button>
                       <button 
                         onClick={() => setShowSubmitModal(true)}
                         disabled={!!monthData.journal_status}
                         className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
                       >
                         {monthData.journal_status === 'pending' ? 'Verification Pending' : 'Submit Weekly Log'}
                       </button>
                    </div>
                 ) : null}
              </AnimatePresence>
           </div>
        </footer>
      </div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-border w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
              <h3 className="text-2xl font-black text-text-primary mb-2">Select Supervisor</h3>
              <p className="text-text-secondary text-sm font-medium mb-8">Choose who will review and verify your weekly journal entries.</p>
              
              <div className="space-y-3 mb-8 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {supervisors.map(sv => (
                  <button key={sv.id} onClick={() => handleSubmitJournal(sv.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-2 border border-border hover:border-accent hover:shadow-lg transition-all text-left group">
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
              <button onClick={() => setShowSubmitModal(false)} className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel Request</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog open={showRefreshDialog} onClose={() => setShowRefreshDialog(false)} onConfirm={handleRefresh} title="Reset Journal?" message="This will clear signatures and archive the current log." confirmLabel="Confirm Reset" variant="warning" />
    </div>
  )
}

function DocumentationUpload({ images, note, onImagesChange, onNoteChange, weekNum }) {
  const fileRef = useRef()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => onImagesChange([...images, { src: ev.target.result, name: file.name }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const openLightbox = (index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <div className="space-y-4">
      <textarea
        value={note}
        onChange={e => onNoteChange(e.target.value)}
        placeholder="Add context to your photos..."
        rows={3}
        className="w-full bg-bg border border-border rounded-2xl px-6 py-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent transition-all shadow-inner resize-none"
      />

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <motion.div layout key={i} className="relative group">
              <button
                onClick={() => openLightbox(i)}
                className="block w-20 h-20 rounded-2xl overflow-hidden border-2 border-border hover:border-accent transition-all shadow-sm focus:outline-none"
              >
                <img src={img.src} alt={img.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              </button>
              <button
                onClick={() => onImagesChange(images.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-500"
              >
                <X size={12} className="text-text-secondary" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <button
        onClick={() => fileRef.current.click()}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-bg border border-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all w-full justify-center"
      >
        <ImagePlus size={16} />
        Attach Visual Documentation
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFile} className="hidden" />

      {lightboxOpen && images.length > 0 && (
        <ImageLightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}

