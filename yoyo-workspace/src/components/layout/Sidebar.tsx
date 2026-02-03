import { NavLink } from 'react-router-dom'
import { Home, MessageSquare, History, Settings, Plus } from 'lucide-react'

export default function Sidebar() {
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/sessions', icon: History, label: 'Sessions' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside className="w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-sm hidden lg:flex flex-col">
      <div className="p-4">
        <button className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
          <Plus size={18} />
          New Chat
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-sm">
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Dave</p>
            <p className="text-xs text-slate-500">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
