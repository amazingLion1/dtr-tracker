import { useState, useEffect } from 'react'
import { LayoutDashboard, CalendarDays, Printer, BookOpen, Target, Settings, X, ChevronRight } from 'lucide-react'

const STEPS = [
  {
    title: 'Welcome to DTR Tracker! 👋',
    description: 'This app helps you seamlessly track your internship hours and generate official KCP DTR forms. Let\'s take a quick look around.',
    icon: LayoutDashboard,
  },
  {
    title: 'Your Dashboard',
    description: 'The dashboard is your daily hub. Click the "Time In" and "Time Out" buttons in sequence to log your hours. Track your OJT progress with the cumulative hours bar.',
    icon: CalendarDays,
  },
  {
    title: 'Weekly Journal',
    description: 'Document your weekly tasks and attach photos for documentation. Everything auto-saves to the cloud — images are stored locally in your browser.',
    icon: BookOpen,
  },
  {
    title: 'OJT Progress Tracker',
    description: 'Set your required OJT hours in Settings and watch your progress grow. The dashboard shows your cumulative hours across all months.',
    icon: Target,
  },
  {
    title: 'Ready for Printing',
    description: 'Go to Export → Print DTR or Print Journal to generate pixel-perfect, printer-ready KCP forms. You can draw or attach your digital signature!',
    icon: Printer,
  },
  {
    title: 'Personalize Your Experience',
    description: 'Visit Settings to update your profile, change your password, and configure your OJT hours target. Use keyboard shortcuts: D for Dashboard, T for DTR, J for Journal.',
    icon: Settings,
  },
]

export default function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const hasSeen = localStorage.getItem('dtr-tour-seen-v2')
    // Small delay to let the app load behind it
    if (!hasSeen) {
      setTimeout(() => setIsOpen(true), 500)
    }
  }, [])

  if (!isOpen) return null

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    localStorage.setItem('dtr-tour-seen-v2', 'true')
    setIsOpen(false)
  }

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface border border-border shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-5">
            <Icon size={24} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2 tracking-tight">{current.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{current.description}</p>
        </div>
        
        <div className="bg-surface-2 px-6 py-4 flex items-center justify-between border-t border-border">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-4 bg-accent' : i < step ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-border-bright'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleComplete}
              className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Skip
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center gap-1 bg-text-primary text-surface px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95"
            >
              {step === STEPS.length - 1 ? 'Get Started' : 'Next'}
              {step !== STEPS.length - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
