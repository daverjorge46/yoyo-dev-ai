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
  LayoutGrid,
  Map,
  Brain,
  Zap,
  History,
  Layers,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Bot,
  HelpCircle,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface NavGroup {
  name: string;
  items: NavItem[];
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
// Navigation Groups (Workflow Order)
// =============================================================================

const navGroups: NavGroup[] = [
  {
    name: 'Overview',
    items: [
      {
        path: '/',
        label: 'Dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        path: '/roadmap',
        label: 'Roadmap',
        icon: <Map className="h-5 w-5" />,
      },
    ],
  },
  {
    name: 'Planning',
    items: [
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
    ],
  },
  {
    name: 'Execution',
    items: [
      {
        path: '/tasks',
        label: 'Tasks',
        icon: <LayoutGrid className="h-5 w-5" />,
      },
      {
        path: '/chat',
        label: 'Chat',
        icon: <MessageSquare className="h-5 w-5" />,
      },
    ],
  },
  {
    name: 'AI Tools',
    items: [
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
        path: '/patterns',
        label: 'Patterns',
        icon: <Layers className="h-5 w-5" />,
      },
      {
        path: '/agents',
        label: 'Agents',
        icon: <Bot className="h-5 w-5" />,
      },
    ],
  },
  {
    name: 'Review',
    items: [
      {
        path: '/recaps',
        label: 'Recaps',
        icon: <History className="h-5 w-5" />,
      },
    ],
  },
  {
    name: 'Support',
    items: [
      {
        path: '/help',
        label: 'Help',
        icon: <HelpCircle className="h-5 w-5" />,
      },
    ],
  },
];

// =============================================================================
// Helper Components
// =============================================================================

interface NavItemLinkProps {
  item: NavItem;
  collapsed: boolean;
  groupName: string;
}

function NavItemLink({ item, collapsed, groupName }: NavItemLinkProps) {
  const { path, label, icon } = item;
  const tooltipText = `[${groupName}] ${label}`;

  return (
    <NavLink
      to={path}
      end={path === '/'}
      title={collapsed ? tooltipText : undefined}
      aria-label={`${label} - ${groupName}`}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 px-3 py-2 rounded-md
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
          <span className="text-gray-400 dark:text-terminal-text-muted font-normal">[{groupName}]</span>{' '}
          {label}
        </span>
      )}
    </NavLink>
  );
}

interface NavSeparatorProps {
  collapsed: boolean;
}

function NavSeparator({ collapsed }: NavSeparatorProps) {
  if (collapsed) return null;
  return (
    <div className="my-2 mx-3">
      <div className="w-1/2 mx-auto border-t border-gray-200 dark:border-gray-700" />
    </div>
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
      {/* Logo / Header - Elegant branding */}
      <div
        className={`
        flex items-center gap-3 px-4 py-4
        border-b border-gray-200 dark:border-terminal-border
        bg-gradient-to-r from-transparent via-primary/5 to-transparent
        dark:from-transparent dark:via-terminal-orange/5 dark:to-transparent
        ${collapsed ? 'justify-center' : ''}
      `.trim()}
      >
        {/* Logo with subtle glow in dark mode */}
        <div className="flex-shrink-0 relative">
          <img
            src="/yoyo.svg"
            alt="Yoyo"
            className="h-8 w-8 dark:hidden"
          />
          <div className="hidden dark:block relative">
            <Terminal className="h-8 w-8 text-terminal-orange relative z-10" />
            <div className="absolute inset-0 bg-terminal-orange/20 blur-lg rounded-full" />
          </div>
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-terminal-text truncate block">
              Yoyo{' '}
              <span className="text-primary dark:text-terminal-orange">Dev</span>
            </span>
            <span className="text-xs text-gray-500 dark:text-terminal-text-muted font-mono">
              v6.2
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-4"
        role="navigation"
        aria-label="Main navigation"
      >
        {navGroups.map((group, groupIndex) => (
          <div key={group.name}>
            {groupIndex > 0 && <NavSeparator collapsed={collapsed} />}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItemLink
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  groupName={group.name}
                />
              ))}
            </div>
          </div>
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
