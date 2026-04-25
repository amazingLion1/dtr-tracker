import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Printer, ArrowLeft } from 'lucide-react'
import { useDtrData } from '../hooks/useDtrData'
import { calcHours, getDaysInMonth, formatMonthYear } from '../utils/dateUtils'
import { fetchMonthData, updateMonthData } from '../lib/api'
import SignatureCanvas from 'react-signature-canvas'
import { useToast } from './ui/Toast'

const TH = {
  border: '1px solid #555', padding: '3px 5px', textAlign: 'center',
  fontWeight: 'bold', fontSize: '8.5pt', lineHeight: '1.2', backgroundColor: '#e5e7eb',
}
const TD = {
  border: '1px solid #888', padding: '1px 3px', textAlign: 'center',
  fontSize: '8.5pt', height: '15px',
}



export default function PrintDTR({ profile, userId, currentUserRole, onBack }) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { dtrData } = useDtrData(userId)
  const sigCanvasRef = useRef(null)
  const supervisorSigCanvasRef = useRef(null)
  const toast = useToast()

  const isStudent = currentUserRole !== 'supervisor'
  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  const [attachedSig, setAttachedSig] = useState(null)
  const [supervisorSig, setSupervisorSig] = useState(null)
  const [approvedBy, setApprovedBy] = useState(null)
  const [monthData, setMonthData] = useState({})

  const [studentProfile, setStudentProfile] = useState(null)

  useEffect(() => {
    if (userId === profile.id) {
      setStudentProfile(profile)
    } else {
      // Fetch intern profile if viewing as supervisor
      import('../lib/api').then(m => m.fetchProfile(userId)).then(setStudentProfile)
    }
  }, [userId, profile])

  useEffect(() => {
    fetchMonthData(userId, monthKey).then(data => {
      setMonthData(data || {})
      setApprovedBy(data?.supervisorName || null)
      setAttachedSig(data?.dtr_intern_sig || null)
      setSupervisorSig(data?.dtr_supervisor_sig || null)
    })
  }, [userId, monthKey])

  const handleAttachSig = (e, role) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      if (role === 'intern') {
        setAttachedSig(dataUrl)
        updateMonthData(userId, monthKey, { dtr_intern_sig: dataUrl })
      } else {
        setSupervisorSig(dataUrl)
        updateMonthData(userId, monthKey, { dtr_supervisor_sig: dataUrl })
      }
      toast.success('Signature attached')
    }
    reader.readAsDataURL(file)
  }

  const handleClearSig = (role) => {
    if (role === 'intern') {
      setAttachedSig(null)
      updateMonthData(userId, monthKey, { dtr_intern_sig: null })
    } else {
      setSupervisorSig(null)
      updateMonthData(userId, monthKey, { dtr_supervisor_sig: null })
    }
  }

  const handleDrawEnd = (role, canvasRef) => {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      const dataUrl = canvasRef.current.toDataURL()
      if (role === 'intern') {
        setAttachedSig(dataUrl)
        updateMonthData(userId, monthKey, { dtr_intern_sig: dataUrl })
      } else {
        setSupervisorSig(dataUrl)
        updateMonthData(userId, monthKey, { dtr_supervisor_sig: dataUrl })
      }
    }
  }

  const handleReturnToStudent = async () => {
    await updateMonthData(userId, monthKey, { 
      dtr_status: 'returned',
      supervisorName: profile.name // Persist supervisor name too
    })
    toast.success('DTR signed and returned to student')
    onBack()
  }

  const handleReject = async () => {
    await updateMonthData(userId, monthKey, { 
      dtr_status: null,
      dtr_intern_sig: null,
      dtr_supervisor_sig: null,
      supervisorName: null
    })
    toast.success('DTR rejected and reset')
    onBack()
  }

  const handleFinalize = async () => {
    if (!attachedSig && (!sigCanvasRef.current || sigCanvasRef.current.isEmpty())) {
      toast.error('Please provide your signature first')
      return
    }
    // Safety check: ensure supervisor signature exists
    if (!monthData.dtr_supervisor_sig) {
      toast.error('Supervisor signature is missing. Cannot finalize.')
      return
    }
    await updateMonthData(userId, monthKey, { dtr_status: 'approved' })
    toast.success('DTR finalized and locked')
    onBack()
  }

  const daysInMonth = getDaysInMonth(year, month)

  const getEntry = (day) => {
    const key = `${monthKey}-${String(day).padStart(2, '0')}`
    return dtrData[key] || {}
  }

  const totalRendered = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .reduce((sum, day) => {
      const e = getEntry(day)
      return sum + calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM)
    }, 0)

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const uline = (content, minW = 180) => (
    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: minW, paddingBottom: '1px', fontWeight: 'bold' }}>
      {content}
    </span>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Controls — hidden on print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors" aria-label="Go back">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-text-primary text-xl font-bold">Print DTR</h1>
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

      {/* ── KCP DTR Form ── */}
      <div id="dtr-print-area" style={{
        background: '#fff', color: '#000',
        fontFamily: "'Courier New', Courier, monospace",
        padding: '24px 28px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        borderRadius: '12px',
      }}>

        {/* Header */}
        <img src="/header.png" alt="KCP Header" style={{ width: '100%', display: 'block', marginBottom: '10px' }} />

        {/* Intern info */}
        <div style={{ fontSize: '10pt', marginBottom: '3px' }}>
          Intern Name: {uline(monthData.internName || studentProfile?.name || profile.name, 220)}
        </div>
        <div style={{ fontSize: '10pt', marginBottom: '8px' }}>
          Company: {uline(studentProfile?.company || profile.company, 240)}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', letterSpacing: '3px', marginBottom: '1px' }}>
          DAILY TIME RECORD
        </div>
        <div style={{ textAlign: 'center', fontSize: '10.5pt', letterSpacing: '2px', marginBottom: '7px' }}>
          MONTH OF&nbsp; {uline(formatMonthYear(year, month).toUpperCase(), 140)}
        </div>

        {/* DTR Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '8%' }}>DATE</th>
              <th style={{ ...TH, width: '18%' }}>TIME IN<br />AM</th>
              <th style={{ ...TH, width: '18%' }}>TIME OUT<br />AM</th>
              <th style={{ ...TH, width: '18%' }}>TIME IN<br />PM</th>
              <th style={{ ...TH, width: '18%' }}>TIME OUT<br />PM</th>
              <th style={{ ...TH, width: '20%' }}>TOTAL<br />HOURS</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const e   = getEntry(day)
              const hrs = calcHours(e.timeInAM, e.timeOutAM, e.timeInPM, e.timeOutPM)
              const isLeave = e.statusTag === 'leave'
              const isHoliday = e.statusTag === 'holiday'

              return (
                <tr key={day}>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{day}</td>
                  {(isLeave || isHoliday) ? (
                    <td colSpan={4} style={{ ...TD, letterSpacing: '4px', fontStyle: 'italic', fontWeight: 'bold' }}>
                      *** {isLeave ? 'ON LEAVE' : 'HOLIDAY'} ***
                    </td>
                  ) : (
                    <>
                      <td style={TD}>{e.timeInAM  || ''}</td>
                      <td style={TD}>{e.timeOutAM || ''}</td>
                      <td style={TD}>{e.timeInPM  || ''}</td>
                      <td style={TD}>{e.timeOutPM || ''}</td>
                    </>
                  )}
                  <td style={TD}>{hrs > 0 ? hrs.toFixed(2) : ''}</td>
                </tr>
              )
            })}
            <tr>
              <td colSpan={5} style={{ ...TD, textAlign: 'right', fontWeight: 'bold', letterSpacing: '1.5px', backgroundColor: '#e5e7eb', paddingRight: '10px' }}>
                TOTAL RENDERED HOURS
              </td>
              <td style={{ ...TD, fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
                {totalRendered.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '8px', fontSize: '9.5pt' }}>
          <div style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '220px' }}>
            <span>Intern Signature:</span>
            {isStudent && (
              <div className="flex flex-col gap-2 no-print w-full max-w-[200px]">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleClearSig('intern')} className="text-[9px] text-red-500 hover:underline">Clear</button>
                  <label className="text-[9px] text-accent hover:underline cursor-pointer">
                    Attach
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAttachSig(e, 'intern')} />
                  </label>
                </div>
                {monthData.dtr_status === 'returned' && (
                  <button 
                    onClick={handleFinalize}
                    className="w-full py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    Finalize & Lock
                  </button>
                )}
              </div>
            )}
            {!isStudent && monthData.dtr_status === 'pending' && (
              <div className="flex flex-col gap-2 no-print w-full max-w-[200px]">
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
          <div style={{ position: 'relative', width: '220px', height: '40px', borderBottom: '1px solid #000', marginBottom: '14px' }}>
            {attachedSig ? (
              <img src={attachedSig} alt="Intern Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <SignatureCanvas 
                ref={sigCanvasRef}
                penColor='black'
                onEnd={() => handleDrawEnd('intern', sigCanvasRef)}
                canvasProps={{ 
                  className: `w-full h-full absolute inset-0 ${isStudent ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'}` 
                }} 
              />
            )}
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '9pt', textTransform: 'uppercase', textAlign: 'center' }}>{monthData.internName || studentProfile?.name || profile.name}</div>
          <div style={{ fontSize: '9pt', textAlign: 'center' }}>(Intern Name)</div>

          <div style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '220px' }}>
            <span>Supervisor Signature:</span>
            {!isStudent && (
              <div className="flex flex-col gap-2 no-print">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleClearSig('supervisor')} className="text-[9px] text-red-500 hover:underline">Clear</button>
                  <label className="text-[9px] text-accent hover:underline cursor-pointer">
                    Attach
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAttachSig(e, 'supervisor')} />
                  </label>
                </div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative', width: '220px', height: '40px', borderBottom: '1px solid #000', marginBottom: '4px' }}>
            {supervisorSig ? (
              <img src={supervisorSig} alt="Supervisor Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <SignatureCanvas 
                ref={supervisorSigCanvasRef}
                penColor='black'
                onEnd={() => handleDrawEnd('supervisor', supervisorSigCanvasRef)}
                canvasProps={{ 
                  className: `w-full h-full absolute inset-0 ${!isStudent ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'}` 
                }} 
              />
            )}
          </div>
          <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '9pt', textAlign: 'center', textTransform: 'uppercase' }}>
            {monthData.supervisorName || '\u00A0'}
          </div>
          <div style={{ fontSize: '9pt', textAlign: 'center' }}>(On-site Supervisor)</div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <img src="/footer.png" alt="KCP Footer" style={{ width: '42%', display: 'block' }} />
          <div style={{ textAlign: 'right', fontSize: '9pt', fontFamily: 'Arial, sans-serif', color: '#000', lineHeight: '1.6' }}>
            <div>College of Information Technology</div>
            <div>OJT Daily Time Record |Page 1</div>
          </div>
        </div>
      </div>
    </div>
  )
}
