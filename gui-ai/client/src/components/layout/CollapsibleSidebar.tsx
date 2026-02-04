/**
 * CollapsibleSidebar Component for Yoyo AI
 *
 * Terminal-styled navigation sidebar with icon-only collapse mode.
 * Includes mobile responsiveness with overlay mode.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Radio,
  Server,
  History,
  Clock,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface CollapsibleSidebarProps {
  /** Whether the sidebar is collapsed to icon-only mode (desktop) */
  collapsed: boolean;
  /** Toggle collapse state */
  onToggle: () => void;
  /** Whether the mobile menu is open */
  mobileOpen: boolean;
  /** Close mobile menu */
  onMobileClose: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Navigation Items
// =============================================================================

const navItems: NavItem[] = [
  { path: '/', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
  { path: '/channels', label: 'Channels', icon: <Radio className="h-5 w-5" /> },
  { path: '/instances', label: 'Instances', icon: <Server className="h-5 w-5" /> },
  { path: '/sessions', label: 'Sessions', icon: <History className="h-5 w-5" /> },
  { path: '/cron', label: 'Cron Jobs', icon: <Clock className="h-5 w-5" /> },
  { path: '/chat', label: 'Chat', icon: <MessageSquare className="h-5 w-5" /> },
];

// =============================================================================
// Helper Components
// =============================================================================

interface NavItemLinkProps {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItemLink({ item, collapsed, onClick }: NavItemLinkProps) {
  const { path, label, icon } = item;

  return (
    <NavLink
      to={path}
      end={path === '/'}
      title={collapsed ? label : undefined}
      aria-label={label}
      onClick={onClick}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 px-3 py-2.5 rounded-md
        text-sm font-medium transition-all duration-150
        ${
          isActive
            ? 'bg-gradient-to-r from-primary/15 to-accent/10 text-primary dark:text-terminal-orange border-l-3 border-primary dark:border-terminal-orange -ml-0.5 pl-3.5 shadow-sm'
            : 'text-gray-600 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated hover:text-primary dark:hover:text-terminal-orange'
        }
        ${collapsed ? 'justify-center' : ''}
      `.trim()
      }
    >
      {/* Icon */}
      <span className="flex-shrink-0">{icon}</span>

      {/* Label - hidden when collapsed */}
      {!collapsed && <span className="truncate">{label}</span>}

      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <span
          className="
            absolute left-full ml-3 px-2 py-1
            bg-terminal-card dark:bg-terminal-elevated
            text-terminal-text
            text-xs font-medium rounded-md
            opacity-0 group-hover:opacity-100
            pointer-events-none transition-opacity duration-150
            whitespace-nowrap z-50
            shadow-lg border border-terminal-border
          "
          role="tooltip"
        >
          {label}
        </span>
      )}
    </NavLink>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CollapsibleSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  className = '',
}: CollapsibleSidebarProps) {
  // Check OpenClaw connection status
  const { data: statusData } = useQuery({
    queryKey: ['openclaw-status'],
    queryFn: async () => {
      const res = await fetch('/api/status/openclaw');
      if (!res.ok) return { connected: false };
      return res.json();
    },
    refetchInterval: 10000,
  });

  const openclawConnected = statusData?.connected ?? false;

  const sidebarContent = (
    <div
      className={`
        h-full flex flex-col
        bg-white dark:bg-terminal-card
        ${className}
      `.trim()}
    >
      {/* Logo / Header */}
      <div
        className={`
        flex items-center gap-3 px-4 py-4
        border-b border-gray-200 dark:border-terminal-border
        bg-gradient-to-r from-transparent via-primary/5 to-transparent
        dark:from-transparent dark:via-terminal-orange/5 dark:to-transparent
        ${collapsed ? 'justify-center' : 'justify-between'}
      `.trim()}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {/* Logo with subtle glow in dark mode */}
          <div className="flex-shrink-0 relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-terminal-text truncate block">
                Yoyo{' '}
                <span className="text-primary dark:text-terminal-orange">AI</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-terminal-text-muted">
                Assistant
              </span>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-md text-gray-500 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-4"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItemLink
              key={item.path}
              item={item}
              collapsed={collapsed && !mobileOpen}
              onClick={mobileOpen ? onMobileClose : undefined}
            />
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-gray-200 dark:border-terminal-border space-y-2">
        {/* OpenClaw connection status */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-50 dark:bg-terminal-elevated/50 rounded-md">
            <div
              className={`w-2 h-2 rounded-full ${
                openclawConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-gray-500 dark:text-terminal-text-muted">
              OpenClaw {openclawConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        )}

        {/* Settings link */}
        <NavItemLink
          item={{ path: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }}
          collapsed={collapsed && !mobileOpen}
          onClick={mobileOpen ? onMobileClose : undefined}
        />

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={onToggle}
          className={`
            hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-md
            text-sm font-medium text-gray-600 dark:text-terminal-text-secondary
            hover:bg-gray-100 dark:hover:bg-terminal-elevated
            hover:text-gray-900 dark:hover:text-terminal-text
            transition-all duration-150
            ${collapsed ? 'justify-center' : ''}
          `.trim()}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar - slides in from left */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div
        className={`
          hidden lg:flex flex-col flex-shrink-0
          border-r border-gray-200 dark:border-terminal-border
          transition-all duration-200
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {sidebarContent}
      </div>
    </>
  );
}
