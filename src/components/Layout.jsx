import {
  LayoutDashboard, CalendarDays, BookOpen,
  Printer, LogOut, Menu, X, ChevronDown, Sun, Moon, Bell, BellOff, Download, Settings, History
} from 'lucide-react'
import { useState, useRef } from 'react'
import { exportDtrToCsv } from '../utils/exportUtils'
import { exportBackup, importBackup } from '../utils/backupUtils'
import { useDtrData } from '../hooks/useDtrData'
import { formatMonthYear } from '../utils/dateUtils'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import ConnectionStatus from './ui/ConnectionStatus'
import { useToast } from './ui/Toast'

const navItems = [
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'dtr',       label: 'Daily Time Record', icon: CalendarDays },
  { id: 'journal',   label: 'Weekly Journal',    icon: BookOpen },
  { id: 'archive',   label: 'Archive',           icon: History },
]
const printItems = [
  { id: 'print-dtr',     label: 'Print DTR',     icon: Printer },
  { id: 'print-journal', label: 'Print Journal', icon: Printer },
]
const allItems = [...navItems, ...printItems]

import { useStore } from '../lib/store'
import { motion, AnimatePresence } from 'framer-motion'

export default function Layout({ 
  children, viewingUser, onExitView 
}) {
  const { 
    page, setPage, 
    profile, 
    theme, toggleTheme,
    sidebarOpen, setSidebarOpen,
    logout
  } = useStore()
  
  const [printOpen, setPrintOpen] = useState(false)
  const toast = useToast()
  
  const { dtrData } = useDtrData(profile?.id)
  const isDark = theme === 'dark'
  
  const handleCsvExport = () => {
    if (!profile) return
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    exportDtrToCsv(dtrData, y, m, profile.name, formatMonthYear(y, m))
    toast.success('CSV exported successfully')
    setPrintOpen(false)
    setSidebarOpen(false)
  }

  const handleBackupExport = async () => {
    try {
      await exportBackup(profile.id)
      toast.success('Backup downloaded successfully')
    } catch (err) {
      toast.error('Failed to export backup')
    }
    setPrintOpen(false)
    setSidebarOpen(false)
  }

  const handleBackupImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    importBackup(profile.id, file, () => {
      toast.success('Backup restored successfully! Reloading…')
      setTimeout(() => window.location.reload(), 1500)
    })
    setPrintOpen(false)
    setSidebarOpen(false)
  }

  const NavLink = ({ item, onClick }) => (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { setPage(item.id); setSidebarOpen(false); setPrintOpen(false); onClick?.() }}
      className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group
        ${page === item.id
          ? 'text-accent bg-accent/10 shadow-sm shadow-accent/5'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
        }`}
    >
      <item.icon size={16} className={`transition-colors ${page === item.id ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`} />
      {item.label}
      {page === item.id && (
        <motion.div 
          layoutId="nav-active" 
          className="absolute left-0 w-1 h-5 bg-accent rounded-r-full"
        />
      )}
    </motion.button>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col selection:bg-accent/20 selection:text-accent">
      {/* Supervision Banner */}
      <AnimatePresence>
        {viewingUser && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-accent text-white"
          >
            <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck size={16} />
                <span>Viewing records for {viewingUser.name}</span>
              </div>
              <button 
                onClick={onExitView}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors"
              >
                Exit View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>      {/* ── Top Navbar ── */}
      <header className="no-print sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setPage('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
              <CalendarDays size={18} />
            </div>
            <span className="text-text-primary font-bold text-lg tracking-tight hidden sm:block">DTR Tracker</span>
          </div>

          {/* Main Nav (Desktop) */}
          <nav className="hidden md:flex flex-1 items-center justify-center px-2">
            <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-border shadow-inner max-w-full overflow-x-auto no-scrollbar">
              <NavItem 
                active={page === 'dashboard'} 
                onClick={() => setPage('dashboard')} 
                icon={LayoutDashboard} 
                label="Dashboard" 
              />
              <NavItem 
                active={page === 'dtr'} 
                onClick={() => setPage('dtr')} 
                icon={CalendarDays} 
                label="DTR" 
              />
              <NavItem 
                active={page === 'journal'} 
                onClick={() => setPage('journal')} 
                icon={BookOpen} 
                label="Journal" 
              />
              <NavItem 
                active={page === 'archive'} 
                onClick={() => setPage('archive')} 
                icon={History} 
                label="Archive" 
              />
              
              {/* Export Dropdown */}
              <div className="relative group ml-1">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary transition-all">
                  <Printer size={16} />
                  <span>Export</span>
                  <ChevronDown size={14} className="opacity-50" />
                </button>
                <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button onClick={() => setPage('print-dtr')} className="w-full text-left px-4 py-2 text-xs font-bold text-text-secondary hover:text-accent hover:bg-accent/5">Print DTR</button>
                  <button onClick={() => setPage('print-journal')} className="w-full text-left px-4 py-2 text-xs font-bold text-text-secondary hover:text-accent hover:bg-accent/5">Print Journal</button>
                  <div className="h-px bg-border my-1 mx-2" />
                  <button onClick={handleCsvExport} className="w-full text-left px-4 py-2 text-xs font-bold text-text-secondary hover:text-accent hover:bg-accent/5">Export CSV</button>
                </div>
              </div>
            </div>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all border border-transparent hover:border-border">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => setPage('settings')} 
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${page === 'settings' ? 'bg-accent/10 text-accent border-accent/20' : 'text-text-secondary border-transparent hover:border-border'}`}
            >
              <Settings size={18} />
            </button>
            
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-xs font-bold text-text-primary leading-none truncate max-w-[120px]">{profile?.name}</span>
                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mt-1 opacity-60">{profile?.role}</span>
              </div>
              <button onClick={onLogout} className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary bg-surface-2 border border-border"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border bg-surface overflow-hidden shadow-2xl"
            >
              <div className="p-4 space-y-1">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setPage(item.id); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all
                      ${page === item.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-surface-2'}`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
                <div className="h-px bg-border my-2" />
                <button
                  onClick={() => { onLogout(); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 mb-20 sm:mb-0">
        {children}
      </main>

      {/* Mobile Bottom Navbar (Students) */}
      {profile?.role !== 'superadmin' && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-2xl border-t border-border flex items-center justify-around px-4 pb-6 pt-2 z-50">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all ${page === item.id ? 'text-accent scale-110' : 'text-text-secondary'}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${page === item.id ? 'bg-accent/15' : 'bg-transparent'}`}>
                <item.icon size={20} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.label.split(' ')[0]}</span>
              {page === item.id && (
                <motion.div layoutId="bottom-nav-dot" className="w-1 h-1 bg-accent rounded-full absolute -bottom-1" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
