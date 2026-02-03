import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Session {
  id: string
  name: string
  createdAt: string
}

interface AppState {
  currentSession: Session | null
  theme: 'dark' | 'light'
  gatewayUrl: string
  gatewayToken: string
  setCurrentSession: (session: Session | null) => void
  setTheme: (theme: 'dark' | 'light') => void
  setGatewayConfig: (url: string, token: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentSession: null,
      theme: 'dark',
      gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'http://localhost:18789',
      gatewayToken: import.meta.env.VITE_GATEWAY_TOKEN || '',
      setCurrentSession: (session) => set({ currentSession: session }),
      setTheme: (theme) => set({ theme }),
      setGatewayConfig: (url, token) => set({ gatewayUrl: url, gatewayToken: token }),
    }),
    {
      name: 'yoyo-workspace-storage',
    }
  )
)
