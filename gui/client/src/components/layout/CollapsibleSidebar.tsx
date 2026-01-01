/**
 * CollapsibleSidebar Component
 *
 * Terminal-styled navigation sidebar with icon-only collapse mode.
 * Displays navigation items with icons and labels.
 * When collapsed, shows only icons with tooltips.
 *
 * Accessibility:
 * - Navigation role with aria-label
 * - Tooltips on collapsed icons
 * - Keyboard navigation support
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Wrench,
  CheckSquare,
  Map,
  Brain,
  Zap,
  History,
  Layers,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface CollapsibleSidebarProps {
  /** Whether the sidebar is collapsed to icon-only mode */
  collapsed: boolean;
  /** Toggle collapse state */
  onToggle: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Navigation Items
// =============================================================================

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    path: '/specs',
    label: 'Specs',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    path: '/fixes',
    label: 'Fixes',
    icon: <Wrench className="h-5 w-5" />,
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5" />,
  },
  {
    path: '/roadmap',
    label: 'Roadmap',
    icon: <Map className="h-5 w-5" />,
  },
  {
    path: '/chat',
    label: 'Chat',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    path: '/memory',
    label: 'Memory',
    icon: <Brain className="h-5 w-5" />,
  },
  {
    path: '/skills',
    label: 'Skills',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    path: '/recaps',
    label: 'Recaps',
    icon: <History className="h-5 w-5" />,
  },
  {
    path: '/patterns',
    label: 'Patterns',
    icon: <Layers className="h-5 w-5" />,
  },
];

// =============================================================================
// Helper Components
// =============================================================================

interface NavItemLinkProps {
  item: NavItem;
  collapsed: boolean;
}

function NavItemLink({ item, collapsed }: NavItemLinkProps) {
  const { path, label, icon } = item;

  return (
    <NavLink
      to={path}
      end={path === '/'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 px-3 py-2 rounded-md
        text-sm font-medium transition-all duration-150
        ${
          isActive
            ? 'bg-brand/10 text-brand dark:bg-terminal-orange/15 dark:text-terminal-orange border-l-2 border-brand dark:border-terminal-orange -ml-0.5 pl-3.5'
            : 'text-gray-600 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated hover:text-gray-900 dark:hover:text-terminal-text'
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
  className = '',
}: CollapsibleSidebarProps) {
  return (
    <div
      className={`
        h-full flex flex-col
        bg-white dark:bg-terminal-card
        border-r border-gray-200 dark:border-terminal-border
        ${className}
      `.trim()}
    >
      {/* Logo / Header */}
      <div
        className={`
        flex items-center gap-3 px-4 py-4
        border-b border-gray-200 dark:border-terminal-border
        ${collapsed ? 'justify-center' : ''}
      `.trim()}
      >
        {/* Terminal icon as logo in dark mode */}
        <div className="flex-shrink-0 relative">
          <img
            src="/yoyo.svg"
            alt="Yoyo"
            className="h-8 w-8 dark:hidden"
          />
          <Terminal className="h-8 w-8 text-terminal-orange hidden dark:block" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-terminal-text truncate block">
              Yoyo Dev
            </span>
            <span className="text-xs text-gray-500 dark:text-terminal-text-muted font-mono">
              v6.0
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-4 space-y-1"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <NavItemLink key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 py-4 border-t border-gray-200 dark:border-terminal-border">
        <button
          onClick={onToggle}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-md
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
}
