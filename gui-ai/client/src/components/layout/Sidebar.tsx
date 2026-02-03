import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Wand2,
  FileText,
  Inbox,
  Plug,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useWebSocket } from '../../contexts/WebSocketContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/automation', icon: Wand2, label: 'Automation' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/messages', icon: Inbox, label: 'Messages' },
  { to: '/connections', icon: Plug, label: 'Connections' },
];

export function Sidebar() {
  const { status } = useWebSocket();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-terminal-text">YoYo AI</h1>
            <p className="text-xs text-terminal-text-secondary">Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-fast ${
                isActive
                  ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500 -ml-[2px] pl-[14px]'
                  : 'text-terminal-text-secondary hover:bg-terminal-elevated hover:text-terminal-text'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-terminal-border space-y-2">
        {/* Connection status */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-success animate-pulse-subtle'
                : status === 'connecting' || status === 'reconnecting'
                ? 'bg-warning animate-pulse'
                : 'bg-error'
            }`}
          />
          <span className="text-terminal-text-muted capitalize">{status}</span>
        </div>

        {/* Settings link */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-fast ${
              isActive
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-terminal-text-secondary hover:bg-terminal-elevated hover:text-terminal-text'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </NavLink>
      </div>
    </div>
  );
}
