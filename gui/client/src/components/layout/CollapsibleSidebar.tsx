/**
 * CollapsibleSidebar Component
 *
 * Navigation sidebar with icon-only collapse mode.
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
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeColor?: string;
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
    activeColor: 'indigo',
  },
  {
    path: '/specs',
    label: 'Specs',
    icon: <FileText className="h-5 w-5" />,
    activeColor: 'indigo',
  },
  {
    path: '/fixes',
    label: 'Fixes',
    icon: <Wrench className="h-5 w-5" />,
    activeColor: 'orange',
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5" />,
    activeColor: 'indigo',
  },
  {
    path: '/roadmap',
    label: 'Roadmap',
    icon: <Map className="h-5 w-5" />,
    activeColor: 'purple',
  },
  {
    path: '/chat',
    label: 'Chat',
    icon: <MessageSquare className="h-5 w-5" />,
    activeColor: 'cyan',
  },
  {
    path: '/memory',
    label: 'Memory',
    icon: <Brain className="h-5 w-5" />,
    activeColor: 'indigo',
  },
  {
    path: '/skills',
    label: 'Skills',
    icon: <Zap className="h-5 w-5" />,
    activeColor: 'indigo',
  },
  {
    path: '/recaps',
    label: 'Recaps',
    icon: <History className="h-5 w-5" />,
    activeColor: 'purple',
  },
  {
    path: '/patterns',
    label: 'Patterns',
    icon: <Layers className="h-5 w-5" />,
    activeColor: 'teal',
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
  const { path, label, icon, activeColor = 'indigo' } = item;

  // Color classes based on active color
  const colorClasses: Record<string, { active: string; hover: string }> = {
    indigo: {
      active: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    },
    orange: {
      active: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    },
    purple: {
      active: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    },
    teal: {
      active: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    },
    cyan: {
      active: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  };

  const colors = colorClasses[activeColor] || colorClasses.indigo;

  return (
    <NavLink
      to={path}
      end={path === '/'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 px-3 py-2 rounded-lg
        text-sm font-medium transition-colors duration-150
        ${isActive ? colors.active : `text-gray-600 dark:text-gray-300 ${colors.hover}`}
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
            absolute left-full ml-2 px-2 py-1
            bg-gray-900 dark:bg-gray-100
            text-white dark:text-gray-900
            text-xs font-medium rounded
            opacity-0 group-hover:opacity-100
            pointer-events-none transition-opacity duration-150
            whitespace-nowrap z-50
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
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        ${className}
      `.trim()}
    >
      {/* Logo / Header */}
      <div
        className={`
        flex items-center gap-3 px-4 py-4
        border-b border-gray-200 dark:border-gray-700
        ${collapsed ? 'justify-center' : ''}
      `.trim()}
      >
        <img src="/yoyo.svg" alt="Yoyo" className="h-8 w-8 flex-shrink-0" />
        {!collapsed && (
          <span className="text-xl font-bold text-gray-900 dark:text-white truncate">
            Yoyo Dev
          </span>
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
      <div className="px-2 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onToggle}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg
            text-sm font-medium text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors duration-150
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
