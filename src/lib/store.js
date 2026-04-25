import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      // Auth & Profile
      user: null,
      profile: null,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      
      // UI State
      page: 'dashboard',
      setPage: (page) => set({ page }),
      
      theme: 'light',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      
      // Sidebar State
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      // Notifications
      notifications: [],
      addNotification: (note) => set((state) => ({ 
        notifications: [...state.notifications, { id: Date.now(), ...note }] 
      })),
      removeNotification: (id) => set((state) => ({ 
        notifications: state.notifications.filter(n => n.id !== id) 
      })),
      
      // Logout
      logout: () => set({ user: null, profile: null, page: 'dashboard' }),
    }),
    {
      name: 'dtr-tracker-storage',
      partialize: (state) => ({ theme: state.theme }), // Only persist theme across reloads
    }
  )
)
