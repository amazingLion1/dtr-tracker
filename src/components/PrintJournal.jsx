import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Printer, ArrowLeft } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useJournalData } from '../hooks/useJournalData'
import { formatMonthYear, getWeekDateRange } from '../utils/dateUtils'
import { fetchMonthData, updateMonthData } from '../lib/api'
import SignatureCanvas from 'react-signature-canvas'
import { useToast } from './ui/Toast'

const TH = {
  border: '1px solid #555', padding: '6px 8px', textAlign: 'center',
  fontWeight: 'bold', fontSize: '9pt', backgroundColor: '#e5e7eb',
}
const TD_WEEK = {
  border: '1px solid #888', padding: '8px 6px', textAlign: 'center',
  fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'top', width: '8%',
}
const TD_CELL = {
  border: '1px solid #888', padding: '8px', verticalAlign: 'top',
  fontSize: '9pt', whiteSpace: 'pre-wrap', lineHeight: '1.5',
  height: '110px', maxHeight: '110px', overflow: 'hidden', wordBreak: 'break-all',
}



function WeekRow({ num, entry, dateRange }) {
  return (
    <tr>
      <td style={TD_WEEK}>
        {num}
        <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#555', marginTop: '4px' }}>
          {dateRange}
        </div>
      </td>
      <td style={{ ...TD_CELL, width: '46%' }}>{entry.task || ''}</td>
      <td style={{ ...TD_CELL, width: '46%' }}>
        {entry.docNote && <div style={{ marginBottom: entry.images?.length ? '6px' : 0 }}>{entry.docNote}</div>}
        {entry.images?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {entry.images.map((img, i) => (
              <img key={i} src={img.src} alt={img.name}
                style={{ width: '72px', height: '72px', objectFit: 'cover' }} />
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

export default function PrintJournal({ profile, userId, currentUserRole, onBack }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { getWeek: getWeekByKey } = useJournalData(userId)
  const sigCanvasRef1 = useRef(null)
  const sigCanvasRef2 = useRef(null)
  const toast = useToast()

  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const getWeek  = (num) => getWeekByKey(`${monthKey}-w${num}`)

  const isStudent = currentUserRole !== 'supervisor'
  const isSupervisor = currentUserRole === 'supervisor'

  // ── Load persisted signatures ───────────────────────────────────────────
  const [attachedSig1, setAttachedSig1] = useState(null)
  const [attachedSig2, setAttachedSig2] = useState(null)
  const [monthData, setMonthData] = useState({})

  const [studentProfile, setStudentProfile] = useState(null)

  useEffect(() => {
    if (userId === profile.id) {
      setStudentProfile(profile)
    } else {
      import('../lib/api').then(m => m.fetchProfile(userId)).then(setStudentProfile)
    }
  }, [userId, profile])

  useEffect(() => {
    fetchMonthData(userId, monthKey).then(data => {
      setMonthData(data || {})
      setAttachedSig1(data?.journal_intern_sig || null)
      setAttachedSig2(data?.journal_supervisor_sig || null)
    })
  }, [userId, monthKey])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const handleAttachSig = (e, setter, role) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setter(dataUrl)
      updateMonthData(userId, monthKey, { [`journal_${role}_sig`]: dataUrl, journal_status: role === 'intern' ? 'signed' : undefined })
      toast.success('Signature attached')
    }
    reader.readAsDataURL(file)
  }

  const handleDrawEnd = (canvasRef, role) => {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      const dataUrl = canvasRef.current.toDataURL()
      if (role === 'intern') setAttachedSig1(dataUrl)
      else setAttachedSig2(dataUrl)
      
      updateMonthData(userId, monthKey, { 
        [`journal_${role}_sig`]: dataUrl, 
        journal_status: role === 'intern' ? 'signed' : monthData.journal_status 
      })
    }
  }

  const handleReturnToStudent = async () => {
    await updateMonthData(userId, monthKey, { 
      journal_status: 'returned',
      supervisorName: profile.name
    })
    toast.success('Journal signed and returned to student')
    onBack()
  }

  const handleReject = async () => {
    await updateMonthData(userId, monthKey, { 
      journal_status: null,
      journal_intern_sig: null,
      journal_supervisor_sig: null,
      supervisorName: null
    })
    toast.success('Journal rejected and reset')
    onBack()
  }

  const handleFinalize = async () => {
    if (!attachedSig1 && (!sigCanvasRef1.current || sigCanvasRef1.current.isEmpty())) {
      toast.error('Please provide your signature first')
      return
    }
    // Safety check: ensure supervisor signature exists
    if (!monthData.journal_supervisor_sig) {
      toast.error('Supervisor signature is missing. Cannot finalize.')
      return
    }
    await updateMonthData(userId, monthKey, { journal_status: 'approved' })
    toast.success('Journal finalized and locked')
    onBack()
  }

  const handleClearSig = (canvasRef, setter, role) => {
    canvasRef.current?.clear()
    setter(null)
    updateMonthData(userId, monthKey, { [`journal_${role}_sig`]: null })
  }

  const w5 = getWeek(5)
  const hasWeek5 = !!(w5.task || w5.docNote || w5.images?.length)

  const FormPage = ({ weeks }) => (
    <div style={{
      background: '#fff', color: '#000',
      fontFamily: "'Courier New', Courier, monospace",
      padding: '24px 28px',
    }}>
      <img src="/header.png" alt="KCP Header" style={{ width: '100%', display: 'block', marginBottom: '12px' }} />

      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', letterSpacing: '2px', marginBottom: '16px', textDecoration: 'underline' }}>
        OJT WEEKLY JOURNAL
      </div>

      <div style={{ fontSize: '10pt', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '130px', fontWeight: 'bold' }}>Name:</span>
          <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{monthData.internName || studentProfile?.name || profile.name}</span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: '130px', fontWeight: 'bold' }}>Company/Agency:</span>
          <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{studentProfile?.company || profile.company}</span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: '15%' }}>Date<br/><span style={{fontWeight: 'normal', fontSize: '8pt'}}>(inclusive dates)</span></th>
            <th style={{ ...TH, width: '40%' }}>Tasks/ Activities</th>
            <th style={{ ...TH, width: '45%' }}>Documentation<br/><span style={{fontWeight: 'normal', fontSize: '8pt'}}>(insert picture of task)</span></th>
          </tr>
        </thead>
        <tbody>
          {weeks.map(({ num, entry, dateRange }) => (
            <WeekRow key={num} num={num} entry={entry} dateRange={dateRange} />
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: '9pt', fontStyle: 'italic', color: '#555', margin: '8px 0 30px' }}>
        Note: Insert Pictures for Documentation (Attach necessary additional documentations like pictures, accomplishment reports, pertinent documents)
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginBottom: '40px' }}>
        {/* Intern Signature */}
        <div style={{ width: '30%' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Prepared by:</span>
            {isStudent && (
              <div className="print:hidden flex items-center gap-2">
                <label className="text-[9px] text-accent hover:underline cursor-pointer">
                  Attach
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAttachSig(e, setAttachedSig1, 'intern')} />
                </label>
                <button onClick={() => handleClearSig(sigCanvasRef1, setAttachedSig1, 'intern')} className="text-[9px] text-red-500 hover:underline">Clear</button>
              </div>
            )}
          </div>
          <div style={{ position: 'relative', width: '100%', height: '40px', borderBottom: '1px solid #000', marginBottom: '4px' }}>
            {attachedSig1 ? (
              <img src={attachedSig1} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <SignatureCanvas 
                ref={sigCanvasRef1}
                penColor='black'
                onEnd={() => handleDrawEnd(sigCanvasRef1, 'intern')}
                canvasProps={{ 
                  className: `w-full h-full absolute inset-0 ${isStudent ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'}` 
                }} 
              />
            )}
          </div>
          {isStudent && monthData.journal_status === 'returned' && (
            <div className="no-print mb-4">
              <button 
                onClick={handleFinalize}
                className="w-full py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
              >
                Finalize & Lock
              </button>
            </div>
          )}
          <div style={{ fontWeight: 'bold', fontSize: '9pt', textTransform: 'uppercase', textAlign: 'center' }}>{monthData.internName || studentProfile?.name || profile.name}</div>
          <div style={{ fontSize: '9pt', textAlign: 'center' }}>(Student Name)</div>
        </div>

        {/* Supervisor Signature */}
        <div style={{ width: '30%' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Checked and Evaluated by:</span>
            {isSupervisor && (
              <div className="flex flex-col gap-2 no-print" style={{ width: '220px' }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleClearSig(sigCanvasRef2, setAttachedSig2, 'supervisor')} className="bg-gray-100 hover:bg-gray-200 px-2 py-1 text-[10px] w-full rounded">Clear</button>
                  <div className="relative w-full">
                    <button className="bg-gray-100 hover:bg-gray-200 px-2 py-1 text-[10px] w-full rounded">Attach</button>
                    <input type="file" onChange={(e) => handleAttachSig(e, setAttachedSig2, 'supervisor')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                </div>
                {monthData.journal_status === 'pending' && (
                  <div className="flex flex-col gap-2 no-print w-full">
                    <button 
                      onClick={handleReturnToStudent}
                      className="w-full py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    >
                      Sign & Return to Student
                    </button>
                    <button 
                      onClick={handleReject}
                      className="w-full py-2 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider border border-red-500/20"
                    >
                      Reject & Reset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ position: 'relative', width: '100%', height: '40px', borderBottom: '1px solid #000', marginBottom: '4px' }}>
            {attachedSig2 ? (
              <img src={attachedSig2} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <SignatureCanvas 
                ref={sigCanvasRef2}
                penColor='black'
                onEnd={() => handleDrawEnd(sigCanvasRef2, 'supervisor')}
                canvasProps={{ 
                  className: `w-full h-full absolute inset-0 ${isSupervisor ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'}` 
                }} 
              />
            )}
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '9pt', textAlign: 'center', textTransform: 'uppercase' }}>
            {monthData.supervisorName || '\u00A0'}
          </div>
          <div style={{ fontSize: '9pt', textAlign: 'center' }}>(On-site Supervisor)</div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <img src="/footer.png" alt="KCP Footer" style={{ width: '42%', display: 'block' }} />
        <div style={{ textAlign: 'right', fontSize: '9pt', fontFamily: 'Arial, sans-serif', color: '#000', lineHeight: '1.6' }}>
          <div>College of Information Technology</div>
          <div>OJT Weekly Journal |Page 1</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Controls — hidden on print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors" aria-label="Go back">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-text-primary text-xl font-bold">Print Weekly Journal</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-9 h-9 rounded-lg bg-surface border border-border hover:border-accent/50 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span className="text-text-primary font-semibold min-w-[140px] text-center">
            {formatMonthYear(year, month)}
          </span>
          <button onClick={nextMonth} className="w-9 h-9 rounded-lg bg-surface border border-border hover:border-accent/50 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-accent/20"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* Print area — visibility:visible on print */}
      <div id="journal-print-area">
        {/* Single Page: All Weeks */}
        <FormPage
          weeks={[1, 2, 3, 4, ...(hasWeek5 ? [5] : [])].map(n => ({ num: n, entry: getWeek(n), dateRange: getWeekDateRange(year, month, n) }))}
          showMonth={true}
        />
      </div>
    </div>
  )
}
