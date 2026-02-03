import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export function useTheme() {
  const { theme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [theme])

  return theme
}
