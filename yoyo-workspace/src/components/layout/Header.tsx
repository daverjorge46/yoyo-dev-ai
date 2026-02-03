import { Menu, Moon, Sun, Settings } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export default function Header() {
  const { theme, setTheme } = useAppStore()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-white/10 rounded-lg lg:hidden">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
            ✨
          </div>
          <span className="font-semibold text-lg hidden sm:block">YoYoAI Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}
