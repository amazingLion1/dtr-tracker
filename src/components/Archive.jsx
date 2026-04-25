import { useState, useEffect } from 'react'
import { Archive as ArchiveIcon, Calendar, BookOpen, Clock, ChevronRight, Eye, Trash2, History, ShieldCheck, Scale, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { fetchArchivedDocuments, fetchMonthData } from '../lib/api'
import { useToast } from './ui/Toast'
import { formatMonthYear, getMonthName } from '../utils/dateUtils'
import { useStore } from '../lib/store'
import { Skeleton } from './ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'

export default function Archive({ userId }) {
  const { profile } = useStore()
  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArchive, setSelectedArchive] = useState(null)
  const [liveData, setLiveData] = useState(null)
  const [comparing, setComparing] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadArchives()
  }, [userId])

  const loadArchives = async () => {
    setLoading(true)
    try {
      const data = await fetchArchivedDocuments(userId)
      setArchives(data)
    } catch (err) {
      toast.error('Failed to load vault archives')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenArchive = async (record) => {
    setSelectedArchive(record)
    setComparing(true)
    try {
      const live = await fetchMonthData(userId, record.month_key)
      setLiveData(live || {})
    } catch (err) {
      toast.error('Could not load current live version for comparison')
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Hero Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-text-primary text-3xl font-bold tracking-tight">Archives</h1>
           <p className="text-text-secondary text-sm">Review your historical snapshots and records.</p>
        </div>
        <div className="px-4 py-2 bg-surface border border-border rounded-xl flex items-center gap-2">
           <span className="text-xs font-bold text-text-primary">{archives.length} Records</span>
        </div>
      </header>

      {/* Archive Grid/List */}
      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="p-12 space-y-4">
               {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : archives.length > 0 ? archives.map(record => (
            <motion.div 
              key={record.id} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="group flex flex-col sm:flex-row sm:items-center gap-6 px-10 py-8 hover:bg-surface-2/30 transition-all cursor-pointer"
              onClick={() => handleOpenArchive(record)}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg
                ${record.type === 'dtr' ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                {record.type === 'dtr' ? <Calendar size={24} strokeWidth={2.5} /> : <BookOpen size={24} strokeWidth={2.5} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h3 className="text-text-primary font-black text-xl tracking-tight">{record.type === 'dtr' ? 'Time Record' : 'Weekly Journal'}</h3>
                  <div className="px-3 py-1 bg-surface-2 border border-border rounded-full text-[10px] font-black text-text-secondary uppercase tracking-widest">
                    {record.month_key}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-text-secondary text-[11px] flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Clock size={12} className="text-accent" /> Archived {new Date(record.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-emerald-500 text-[11px] flex items-center gap-2 font-black uppercase tracking-widest">
                    <ShieldCheck size={12} /> Read Only
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <button className="w-12 h-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-text-secondary group-hover:text-accent group-hover:border-accent/30 transition-all shadow-sm">
                    <Scale size={20} />
                 </button>
                 <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-text-secondary group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={20} />
                 </div>
              </div>
            </motion.div>
          )) : (
            <div className="py-32 text-center">
              <div className="w-24 h-24 rounded-3xl bg-surface-2 flex items-center justify-center mx-auto mb-6 text-text-secondary/10 rotate-12">
                <ArchiveIcon size={48} />
              </div>
              <h3 className="text-text-primary text-xl font-black tracking-tight">The Vault is Empty</h3>
              <p className="text-text-secondary text-sm font-medium mt-2 max-w-sm mx-auto">
                Snapshots are automatically created when you refresh a finalized document or initiate a reset.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      <AnimatePresence>
        {selectedArchive && (
          <div className="fixed inset-0 z-[200] bg-bg/80 backdrop-blur-2xl overflow-y-auto pt-20 pb-20 px-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between sticky top-0 z-10 bg-bg/50 backdrop-blur-md py-4 border-b border-border/50">
                 <div className="flex items-center gap-6">
                    <button 
                      onClick={() => { setSelectedArchive(null); setLiveData(null); }}
                      className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:shadow-xl transition-all"
                    >
                      <ChevronRight size={24} className="rotate-180" strokeWidth={3} />
                    </button>
                    <div>
                       <div className="flex items-center gap-2 mb-0.5">
                          <Scale size={14} className="text-accent" />
                          <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">Version Comparison</span>
                       </div>
                       <h2 className="text-2xl font-black text-text-primary tracking-tight">Archive vs. Live Data</h2>
                    </div>
                 </div>
                 <div className="hidden sm:flex items-center gap-8">
                    <div className="text-right">
                       <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Snapshot Date</p>
                       <p className="text-sm font-bold text-text-primary">{new Date(selectedArchive.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-right">
                       <p className="text-[10px] text-accent font-black uppercase tracking-widest">Status</p>
                       <p className="text-sm font-bold text-text-primary uppercase tracking-tighter">Read Only Snapshot</p>
                    </div>
                 </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Archived Snapshot */}
                <ComparisonCard 
                   title="Archived Version" 
                   icon={<History size={18} />} 
                   subtitle={`Snapshot from ${new Date(selectedArchive.created_at).toLocaleDateString()}`}
                   data={selectedArchive.data}
                   type={selectedArchive.type}
                   variant="archive"
                />

                {/* Live Data */}
                <ComparisonCard 
                   title="Current Live Data" 
                   icon={<Clock size={18} />} 
                   subtitle="Latest version in production database"
                   data={liveData}
                   type={selectedArchive.type}
                   loading={comparing}
                   variant="live"
                />
              </div>

              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => { setSelectedArchive(null); setLiveData(null); }}
                  className="px-12 py-4 rounded-2xl bg-surface-2 border border-border text-text-primary font-black text-[11px] uppercase tracking-[0.2em] hover:bg-surface hover:shadow-2xl transition-all active:scale-95"
                >
                  Terminate Comparison
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComparisonCard({ title, icon, subtitle, data, type, loading, variant }) {
  const isArchive = variant === 'archive'
  
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[3rem] p-10 space-y-6">
         <Skeleton className="h-8 w-1/2" />
         <Skeleton className="h-40 w-full rounded-2xl" />
         <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className={`bg-surface border-2 rounded-[3rem] p-10 space-y-8 shadow-2xl transition-all duration-500
      ${isArchive ? 'border-border/50 bg-surface/50' : 'border-accent/10 shadow-accent/5'}`}>
       
       <header className="flex items-center justify-between">
          <div>
             <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-xl ${isArchive ? 'bg-surface-2 text-text-secondary' : 'bg-accent/10 text-accent'}`}>
                   {icon}
                </div>
                <h3 className={`text-xl font-black tracking-tight ${isArchive ? 'text-text-secondary' : 'text-text-primary'}`}>{title}</h3>
             </div>
             <p className="text-xs font-medium text-text-secondary opacity-60">{subtitle}</p>
          </div>
          {isArchive && <div className="px-3 py-1 bg-surface-2 rounded-full text-[9px] font-black uppercase tracking-widest text-text-secondary">Immutable</div>}
       </header>

       <div className="space-y-6">
          {/* Identity Section */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-5 rounded-[1.5rem] bg-bg border border-border/50">
                <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Intern</p>
                <p className="text-sm font-black text-text-primary truncate">{data?.internName || '---'}</p>
             </div>
             <div className="p-5 rounded-[1.5rem] bg-bg border border-border/50">
                <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Supervisor</p>
                <p className="text-sm font-black text-text-primary truncate">{data?.supervisorName || '---'}</p>
             </div>
          </div>

          {/* Status Section */}
          <div className={`p-6 rounded-[1.5rem] flex items-center justify-between border
            ${(data?.dtr_status === 'approved' || data?.journal_status === 'approved') 
               ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' 
               : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500'}`}>
             <div className="flex items-center gap-3">
                {(data?.dtr_status === 'approved' || data?.journal_status === 'approved') ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Status at time of snapshot</p>
                   <p className="text-sm font-black uppercase tracking-widest">{data?.dtr_status || data?.journal_status || 'Draft'}</p>
                </div>
             </div>
          </div>

          {/* Signature Summary */}
          <div className="space-y-4">
             <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Verification History</p>
             <div className="grid grid-cols-1 gap-3">
                <VerificationRow label="Intern Digital Sig" verified={!!(data?.dtr_intern_sig || data?.journal_intern_sig)} />
                <VerificationRow label="Supervisor Approval" verified={!!(data?.dtr_supervisor_sig || data?.journal_supervisor_sig)} />
             </div>
          </div>
       </div>

       <div className="pt-6 border-t border-border/50 flex items-center gap-2 opacity-30 grayscale">
          <ArrowRight size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Extended logs restricted in vault view</span>
       </div>
    </div>
  )
}

function VerificationRow({ label, verified }) {
   return (
      <div className="flex items-center justify-between px-5 py-4 bg-bg border border-border/50 rounded-2xl">
         <span className="text-xs font-bold text-text-secondary">{label}</span>
         {verified ? (
            <div className="flex items-center gap-1.5 text-emerald-500">
               <CheckCircle2 size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest">Captured</span>
            </div>
         ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Pending</span>
         )}
      </div>
   )
}
