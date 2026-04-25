import React from 'react'
import { FileText, User, Building, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LivePreview({ type, data, profile, monthName }) {
  const isDtr = type === 'dtr'
  
  return (
    <div className="sticky top-24 hidden xl:block w-[320px] shrink-0">
      <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
        <div className="p-6 border-b border-border bg-surface-2/30">
           <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-accent" />
              <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Live Draft</h3>
           </div>
           <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest">Real-time Form Visualization</p>
        </div>

        <div className="p-6 space-y-6">
           {/* Header Simulation */}
           <div className="space-y-3">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-text-secondary">
                    <User size={14} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Student</p>
                    <p className="text-xs font-bold text-text-primary truncate">{profile?.name || '---'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-text-secondary">
                    <Building size={14} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Company</p>
                    <p className="text-xs font-bold text-text-primary truncate">{profile?.company || '---'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-text-secondary">
                    <Calendar size={14} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Period</p>
                    <p className="text-xs font-bold text-text-primary truncate">{monthName || '---'}</p>
                 </div>
              </div>
           </div>

           {/* Data Visualization */}
           <div className="bg-bg rounded-2xl border border-border p-4 space-y-4">
              {isDtr ? (
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Total Logged</span>
                       <span className="text-xs font-black text-accent">{Object.values(data || {}).length} Days</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                       <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '65%' }}
                          className="h-full bg-accent rounded-full"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-2 rounded-xl bg-surface-2/50 border border-border">
                          <p className="text-[7px] font-black text-text-secondary uppercase">Morning</p>
                          <p className="text-[10px] font-bold text-text-primary">Verified</p>
                       </div>
                       <div className="p-2 rounded-xl bg-surface-2/50 border border-border">
                          <p className="text-[7px] font-black text-text-secondary uppercase">Afternoon</p>
                          <p className="text-[10px] font-bold text-text-primary">Verified</p>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Journal Status</span>
                       <span className="text-xs font-black text-emerald-500 uppercase">Drafting</span>
                    </div>
                    <div className="space-y-2">
                       <div className="h-2 w-full bg-surface-2 rounded-full" />
                       <div className="h-2 w-4/5 bg-surface-2 rounded-full" />
                       <div className="h-2 w-3/5 bg-surface-2 rounded-full" />
                    </div>
                 </div>
              )}
           </div>

           {/* Signatures Simulation */}
           <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-6">
                 <div className="text-center space-y-2">
                    <div className="h-8 flex items-center justify-center">
                       {data?.dtr_intern_sig || data?.journal_intern_sig ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                       ) : (
                          <div className="w-full h-px bg-border mt-4" />
                       )}
                    </div>
                    <p className="text-[7px] font-black text-text-secondary uppercase tracking-[0.2em]">Intern Sig</p>
                 </div>
                 <div className="text-center space-y-2">
                    <div className="h-8 flex items-center justify-center">
                       <div className="w-full h-px bg-border mt-4" />
                    </div>
                    <p className="text-[7px] font-black text-text-secondary uppercase tracking-[0.2em]">Supervisor Sig</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-4 bg-accent/5 flex items-center justify-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
           <span className="text-[8px] font-black text-accent uppercase tracking-widest">Auto-saving Snapshot</span>
        </div>
      </div>
    </div>
  )
}
