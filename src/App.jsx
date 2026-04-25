import { useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import DTR from './components/DTR'
import WeeklyJournal from './components/WeeklyJournal'
import PrintDTR from './components/PrintDTR'
import PrintJournal from './components/PrintJournal'
import Login from './components/Login'
import Onboarding from './components/Onboarding'
import SupervisorDashboard from './components/SupervisorDashboard'
import SupervisorRequestsView from './components/SupervisorRequestsView'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import CreateStudent from './components/CreateStudent'
import Archive from './components/Archive'
import Settings from './components/Settings'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import PwaInstallPrompt from './components/ui/PwaInstallPrompt'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useReminders } from './hooks/useReminders'
import { fetchMyProfile, fetchProfiles, signOut, onAuthStateChange, adminDeleteUser } from './lib/api'

import { useStore } from './lib/store'
import { motion, AnimatePresence } from 'framer-motion'

function AppContent() {
  const { 
    page, setPage, 
    user, setUser, 
    profile, setProfile, 
    theme, toggleTheme,
    logout: storeLogout 
  } = useStore()
  
  const [session, setSession] = useState(undefined)
  const [users, setUsers] = useState([])
  const [viewingUserId, setViewingUserId] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const { remindersEnabled, toggleReminders } = useReminders(profile?.id)

  // ── Sync html class for theme ──────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') html.classList.add('dark')
    else html.classList.remove('dark')
  }, [theme])

  // ── Listen for auth state changes ──────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, sess) => {
      setSession(sess)
      setUser(sess?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── When session changes, load the user's profile ──────────────────────────
  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setProfile(null)
      setUsers([])
      setIsLoadingProfile(false)
      return
    }

    setIsLoadingProfile(true)
    const authId = session.user.id

    fetchMyProfile(authId)
      .then(p => {
        setProfile(p)
        if (p.role === 'supervisor' || p.role === 'superadmin') {
          return fetchProfiles().then(all => setUsers(all))
        } else {
          setUsers([p])
        }
      })
      .catch(err => {
        console.error('[fetchProfile]', err)
        setProfile(null)
      })
      .finally(() => setIsLoadingProfile(false))
  }, [session])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session || !profile) return

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'd': setPage('dashboard'); break
        case 't': setPage('dtr'); break
        case 'j': setPage('journal'); break
        case 'a': setPage('archive'); break
        case 's': setPage('settings'); break
        default: break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, profile])

  const viewingUser = users.find(u => u.id === viewingUserId) || profile

  const handleLogout = async () => {
    try { await signOut() } catch (err) { console.error('[signOut]', err) }
    setSession(null)
    storeLogout()
    setUsers([])
    setViewingUserId(null)
  }

  const handleDeleteUser = async (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    try { await adminDeleteUser(userId) } catch (err) { console.error('[deleteUser]', err) }
  }

  const handleStudentCreated = (newProfile) => {
    setUsers(prev => [...prev, newProfile])
  }

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile)
    setUsers(prev => prev.map(u => u.id === updatedProfile.id ? updatedProfile : u))
  }

  if (session === undefined || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center animate-pulse">
            <CalendarDays size={22} className="text-accent" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-text-secondary text-sm font-medium">Synchronizing...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login isDark={theme === 'dark'} toggleTheme={toggleTheme} />
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <CalendarDays size={30} className="text-red-400" />
          </div>
          <h2 className="text-text-primary text-lg font-bold mb-2">Account Not Found</h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Your login was successful, but no profile is linked to this account. 
          </p>
          <button onClick={handleLogout} className="btn-primary px-8">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }

  const renderMain = () => {
    if (page === 'settings') {
      return <Settings profile={profile} onBack={() => setPage('dashboard')} onProfileUpdated={handleProfileUpdated} />
    }

    if (profile.role === 'superadmin') {
      return <SuperAdminDashboard />
    }

    if (profile.role === 'supervisor' && !viewingUserId) {
      if (page === 'create-student') {
        return <CreateStudent onBack={() => setPage('dashboard')} onCreated={handleStudentCreated} />
      }
      if (page === 'dtr' || page === 'journal') {
        return (
          <SupervisorRequestsView 
            type={page} 
            users={users} 
            profile={profile} 
            onReview={(uid) => {
              setViewingUserId(uid)
              setPage(page === 'dtr' ? 'print-dtr' : 'print-journal')
            }} 
          />
        )
      }
      return (
        <SupervisorDashboard 
          users={users} 
          profile={profile}
          onSelectUser={setViewingUserId}
          onCreateStudent={() => setPage('create-student')}
          onDeleteUser={handleDeleteUser}
        />
      )
    }

    const currentId = viewingUserId || profile.id

    switch (page) {
      case 'dashboard':     return <Dashboard profile={viewingUser} userId={currentId} />
      case 'dtr':           return <DTR profile={viewingUser} userId={currentId} currentUserRole={profile.role} setPage={setPage} />
      case 'journal':       return <WeeklyJournal profile={viewingUser} userId={currentId} setPage={setPage} />
      case 'archive':       return <Archive profile={viewingUser} userId={currentId} />
      default:              return <Dashboard profile={viewingUser} userId={currentId} />
    }
  }

  return (
    <Layout 
      page={page} setPage={setPage} 
      profile={profile} onLogout={handleLogout} 
      isDark={theme === 'dark'} toggleTheme={toggleTheme}
      remindersEnabled={remindersEnabled} toggleReminders={toggleReminders}
      viewingUser={viewingUserId ? viewingUser : null}
      onExitView={() => { setViewingUserId(null); setPage('dashboard') }}
    >
      <Onboarding />
      <PwaInstallPrompt />
      <AnimatePresence mode="wait">
        <motion.div
          key={page + (viewingUserId || '')}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          {renderMain()}
        </motion.div>
      </AnimatePresence>

      {page === 'print-dtr' && (
        <div className="fixed inset-0 z-[200] bg-bg overflow-y-auto w-full h-full animate-in slide-in-from-bottom-4 duration-300">
          <div className="py-8 px-4 w-full min-h-full">
            <PrintDTR 
              profile={viewingUser} 
              userId={viewingUserId || profile.id} 
              currentUserRole={profile.role}
              onBack={() => setPage('dtr')} 
            />
          </div>
        </div>
      )}
      
      {page === 'print-journal' && (
        <div className="fixed inset-0 z-[200] bg-bg overflow-y-auto w-full h-full animate-in slide-in-from-bottom-4 duration-300">
          <div className="py-8 px-4 w-full min-h-full">
            <PrintJournal 
              profile={viewingUser} 
              userId={viewingUserId || profile.id} 
              currentUserRole={profile.role}
              onBack={() => setPage('journal')} 
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  )
}
