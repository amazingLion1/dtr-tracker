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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-accent overflow-hidden"
          >
            <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-white">
                <ShieldCheck size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider">Supervision Mode</span>
                <span className="text-[11px] opacity-80">— Viewing records for {viewingUser.name}</span>
              </div>
              <button 
                onClick={onExitView}
                className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-colors border border-white/20 flex items-center gap-1.5"
              >
                <ArrowLeft size={12} />
                Keep Records & Exit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Navbar ── */}
      <header className="no-print sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 shrink-0 cursor-pointer"
            onClick={() => setPage('dashboard')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
              <CalendarDays size={16} className="text-white" />
            </div>
            <span className="text-text-primary font-black text-lg tracking-tight hidden sm:block">
              {profile?.role === 'superadmin' ? 'SuperAdmin' : 'DTR Tracker'}
            </span>
          </motion.div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-2/50 p-1 rounded-2xl border border-border/50">
            {profile?.role === 'superadmin' ? (
              <NavLink item={{ id: 'dashboard', label: 'Users', icon: ShieldCheck }} />
            ) : (
              navItems.map(item => <NavLink key={item.id} item={item} />)
            )}

            {profile?.role !== 'superadmin' && (
              <div className="relative">
              <button
                onClick={() => setPrintOpen(p => !p)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                  ${printItems.some(i => i.id === page)
                    ? 'text-accent bg-accent/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
              >
                <Printer size={16} />
                Export
                <ChevronDown size={14} className={`transition-transform duration-200 ${printOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {printOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPrintOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-20 py-2 min-w-[200px] overflow-hidden"
                    >
                      {printItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setPage(item.id); setPrintOpen(false) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                            ${page === item.id ? 'text-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'}`}
                        >
                          <item.icon size={15} />
                          {item.label}
                        </button>
                      ))}
                      <div className="h-px bg-border my-1.5 mx-3" />
                      <button
                        onClick={handleCsvExport}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                      >
                        <Download size={15} />
                        Export CSV
                      </button>
                      <button
                        onClick={handleBackupExport}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                      >
                        <Download size={15} />
                        Cloud Backup
                      </button>
                      <label className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer">
                        <Download size={15} className="rotate-180" />
                        Restore Snapshot
                        <input type="file" accept=".json" onChange={handleBackupImport} className="hidden" />
                      </label>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ConnectionStatus />

            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-text-secondary hover:text-accent hover:bg-accent/5 transition-all border border-transparent hover:border-accent/10"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <button
              onClick={() => setPage('settings')}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-transparent hover:border-border
                ${page === 'settings' ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'}`}
            >
              <Settings size={18} />
            </button>

            <button
              onClick={logout}
              className="hidden md:flex items-center gap-3 pl-2 pr-4 py-2 rounded-xl hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 group"
            >
              <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-accent text-[11px] font-bold">{profile?.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-text-primary text-xs font-bold truncate max-w-[100px]">
                  {profile?.name?.split(' ')[0]}
                </span>
                <span className="text-[9px] text-text-secondary uppercase tracking-widest font-black opacity-50">Logout</span>
              </div>
              <LogOut size={13} className="text-text-secondary/50 group-hover:text-red-400 transition-colors ml-1" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors rounded-xl bg-surface-2"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border bg-bg overflow-hidden"
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
                  onClick={() => { logout(); setSidebarOpen(false) }}
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
