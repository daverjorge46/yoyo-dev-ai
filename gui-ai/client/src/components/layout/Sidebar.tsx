import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Radio,
  Server,
  History,
  Clock,
  Bot,
  Cpu,
  Wand2,
  Terminal,
  Settings,
} from 'lucide-react';
import { useGatewayStatus } from '../../hooks/useGatewayStatus';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/sessions', icon: History, label: 'Sessions' },
  { to: '/channels', icon: Radio, label: 'Channels' },
  { to: '/models', icon: Cpu, label: 'Models' },
  { to: '/skills', icon: Wand2, label: 'Skills' },
  { to: '/cron', icon: Clock, label: 'Cron Jobs' },
  { to: '/gateway', icon: Server, label: 'Gateway' },
  { to: '/commands', icon: Terminal, label: 'Commands' },
  { to: '/instances', icon: Server, label: 'Instances' },
];

export function Sidebar() {
  // Use WebSocket-based gateway status instead of removed HTTP endpoint
  const { isConnected: openclawConnected } = useGatewayStatus();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <img src="/yoyo.svg" alt="Yoyo AI" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="font-semibold text-terminal-text">Yoyo AI</h1>
            <p className="text-xs text-terminal-text-secondary">Assistant</p>
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
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500 -ml-[2px] pl-[14px]'
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
        {/* YoyoClaw connection status */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs bg-terminal-elevated/50 rounded-md">
          <div
            className={`w-2 h-2 rounded-full ${
              openclawConnected
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-terminal-text-muted">
            YoyoClaw {openclawConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Settings link */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 ${
              isActive
                ? 'bg-cyan-500/10 text-cyan-400'
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
