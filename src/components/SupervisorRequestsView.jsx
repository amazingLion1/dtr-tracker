import { useState, useEffect } from 'react'
import { fetchAllSignatureRequests, updateMonthData, bulkUpdateMonthData } from '../lib/api'
import { useToast } from './ui/Toast'
import { CalendarDays, BookOpen, Clock, AlertTriangle, Trash2, Reply, ChevronRight, ShieldCheck, CheckCircle2, CheckSquare, Square, Zap } from 'lucide-react'
import ConfirmDialog from './ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export default function SupervisorRequestsView({ type, users, profile, onReview }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState([]) // Array of `${profile_id}-${month_key}`
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const toast = useToast()

  const isDtr = type === 'dtr'
  const title = isDtr ? 'DTR Signature Requests' : 'Weekly Journal Requests'
  const icon = isDtr ? <CalendarDays size={20} /> : <BookOpen size={20} />

  useEffect(() => {
    loadRequests()
  }, [type, profile.id])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const allReqs = await fetchAllSignatureRequests()
      setRequests(allReqs)
      setSelectedIds([])
    } catch (err) {
      console.error('Failed to load requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const pendingRequests = requests.filter(req => {
    const status = isDtr ? req.data.dtr_status : req.data.journal_status
    const assignedId = req.data.assigned_supervisor_id
    return status === 'pending' && (!assignedId || assignedId === profile.id)
  })

  const finalizedRequests = requests.filter(req => {
    const status = isDtr ? req.data.dtr_status : req.data.journal_status
    return status === 'approved'
  })

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingRequests.map(r => `${r.profile_id}-${r.month_key}`))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    setIsBulkApproving(true)
    try {
      const selectedReqs = pendingRequests.filter(r => selectedIds.includes(`${r.profile_id}-${r.month_key}`))
      const updates = selectedReqs.map(req => {
        const field = isDtr ? 'dtr_status' : 'journal_status'
        const newData = { 
          ...req.data, 
          [field]: 'approved',
          approved_at: new Date().toISOString(),
          supervisorName: profile.name
        }
        return {
          profile_id: req.profile_id,
          month_key: req.month_key,
          jsonStr: JSON.stringify(newData)
        }
      })
      await bulkUpdateMonthData(updates)
      toast.success(`Successfully approved ${selectedIds.length} ${isDtr ? 'DTRs' : 'Journals'}`)
      loadRequests()
    } catch (err) {
      toast.error('Bulk approval failed')
    } finally {
      setIsBulkApproving(false)
    }
  }

  const handleReturn = async (req) => {
    try {
      const field = isDtr ? 'dtr_status' : 'journal_status'
      await updateMonthData(req.profile_id, req.month_key, { [field]: 'returned' })
      toast.success(`${isDtr ? 'DTR' : 'Journal'} returned to student`)
      loadRequests()
    } catch (err) {
      toast.error('Failed to return document')
    }
  }

  const handleUnlock = async (req) => {
    try {
      const field = isDtr ? 'dtr_status' : 'journal_status'
      await updateMonthData(req.profile_id, req.month_key, { [field]: 'returned' })
      toast.success(`${isDtr ? 'DTR' : 'Journal'} unlocked and returned to student`)
      loadRequests()
    } catch (err) {
      toast.error('Failed to unlock document')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const field = isDtr ? 'dtr_status' : 'journal_status'
      await updateMonthData(deleteTarget.profile_id, deleteTarget.month_key, { 
        [field]: null,
        [isDtr ? 'dtr_intern_sig' : 'journal_intern_sig']: null,
        [isDtr ? 'dtr_supervisor_sig' : 'journal_supervisor_sig']: null
      })
      toast.success('Request deleted and reset')
      setDeleteTarget(null)
      loadRequests()
    } catch (err) {
      toast.error('Failed to delete request')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center text-white shadow-lg shadow-accent/20">
            {icon}
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-black tracking-tight">{title}</h1>
            <p className="text-text-secondary text-sm font-medium">Review and digitally authorize student records</p>
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleAll}
              className="px-4 py-2 rounded-xl border border-border text-[11px] font-bold uppercase tracking-wider text-text-secondary hover:bg-surface-2 transition-all flex items-center gap-2"
            >
              {selectedIds.length === pendingRequests.length ? <CheckSquare size={14} /> : <Square size={14} />}
              {selectedIds.length === pendingRequests.length ? 'Deselect All' : 'Select All'}
            </button>
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleBulkApprove}
                  disabled={isBulkApproving}
                  className="btn-primary px-6 py-2 h-10 flex items-center gap-2 text-xs"
                >
                  {isBulkApproving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Zap size={14} className="fill-current" />
                  )}
                  Approve {selectedIds.length} Selected
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pending Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Pending Your Review
          </h2>
          <span className="text-[10px] font-black text-white bg-yellow-500 px-3 py-1 rounded-full uppercase tracking-widest">
            {pendingRequests.length} Waiting
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {loading ? (
            <div className="bg-surface border border-border rounded-[2rem] py-16 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary text-xs font-black uppercase tracking-widest">Fetching Requests...</p>
            </div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map(req => {
              const student = users.find(u => u.id === req.profile_id)
              if (!student) return null
              const id = `${req.profile_id}-${req.month_key}`
              const isSelected = selectedIds.includes(id)
              
              return (
                <motion.div 
                  layout
                  key={id} 
                  className={`group relative flex items-center gap-4 px-6 py-5 rounded-[2rem] border transition-all duration-300
                    ${isSelected 
                      ? 'bg-accent/5 border-accent shadow-lg shadow-accent/5' 
                      : 'bg-surface border-border hover:border-accent/30 hover:shadow-xl hover:shadow-black/5'}`}
                >
                  <button 
                    onClick={() => toggleSelection(id)}
                    className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                      ${isSelected ? 'bg-accent border-accent text-white' : 'border-border text-transparent group-hover:border-accent/50'}`}
                  >
                    <CheckCircle2 size={14} strokeWidth={3} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-text-primary font-black text-lg tracking-tight truncate">{student.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-[10px] font-bold text-text-secondary uppercase tracking-widest">{req.month_key}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                         <Clock size={10} />
                         Review Required
                       </div>
                       <span className="text-[10px] text-text-secondary font-medium">• {student.company}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleReturn(req)}
                      className="p-3 rounded-2xl bg-bg border border-border text-text-secondary hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group/btn"
                      title="Quick return to student"
                    >
                      <Reply size={16} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => setDeleteTarget(req)}
                      className="p-3 rounded-2xl bg-bg border border-border text-text-secondary hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                      title="Delete / Reset request"
                    >
                      <Trash2 size={16} />
                    </button>

                    <button
                      onClick={() => onReview(student.id)}
                      className="ml-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                      Review
                      <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="bg-surface border border-border rounded-[2rem] py-20 text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-surface-2 flex items-center justify-center mx-auto mb-6 text-text-secondary/20">
                {icon}
              </div>
              <p className="text-text-secondary font-black uppercase tracking-[0.2em] text-xs">Inbox Zero</p>
              <p className="text-text-secondary/60 text-[10px] font-medium mt-1">No pending signature requests for now</p>
            </div>
          )}
        </div>
      </section>

      {/* Finalized Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Verified Documents
          </h2>
          <span className="text-[10px] font-black text-white bg-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest">
            {finalizedRequests.length} Secured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {finalizedRequests.length > 0 ? (
            finalizedRequests.map(req => {
              const student = users.find(u => u.id === req.profile_id)
              if (!student) return null
              
              return (
                <div key={`${req.profile_id}-${req.month_key}`} className="group flex items-center gap-4 px-5 py-4 bg-surface/40 border border-border rounded-3xl hover:bg-surface hover:shadow-xl hover:shadow-black/5 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-text-primary font-bold text-sm truncate">{student.name}</span>
                      <span className="text-[10px] font-bold text-text-secondary">{req.month_key}</span>
                    </div>
                    <div className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <ShieldCheck size={10} />
                      Digitally Verified
                    </div>
                  </div>

                  <button
                    onClick={() => handleUnlock(req)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-[9px] font-black text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all uppercase tracking-widest"
                  >
                    Unlock
                  </button>
                </div>
              )
            })
          ) : (
            <div className="col-span-full bg-surface/20 border border-dashed border-border rounded-[2rem] py-10 text-center">
              <p className="text-text-secondary/40 text-[10px] font-black uppercase tracking-[0.2em]">No finalized documents</p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Request?"
        message="This will remove the submission request and clear any signatures attached to it. The student will be able to edit and resubmit."
        confirmLabel="Delete & Reset"
        variant="danger"
      />
    </div>
  )
}
