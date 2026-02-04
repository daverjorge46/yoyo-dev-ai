/**
 * MobileIconStrip Component
 *
 * Vertical strip of navigation icons visible on mobile when sidebar is closed.
 * Provides quick access to all navigation sections without opening full sidebar.
 *
 * Accessibility:
 * - Each icon has aria-label
 * - Tooltips with role="tooltip"
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
  Terminal,
  Bot,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';
import { useChatPanel } from '../../contexts/ChatPanelContext';

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileIconStripProps {
  /** Whether the strip is visible */
  visible: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Navigation Items (flattened from groups)
// =============================================================================

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { path: '/roadmap', label: 'Roadmap', icon: <Map className="h-5 w-5" /> },
  { path: '/specs', label: 'Specs', icon: <FileText className="h-5 w-5" /> },
  { path: '/fixes', label: 'Fixes', icon: <Wrench className="h-5 w-5" /> },
  { path: '/tasks', label: 'Tasks', icon: <LayoutGrid className="h-5 w-5" /> },
  { path: '/terminals', label: 'Terminals', icon: <Terminal className="h-5 w-5" /> },
  { path: '/chat', label: 'Chat', icon: <MessageSquare className="h-5 w-5" /> },
  { path: '/memory', label: 'Memory', icon: <Brain className="h-5 w-5" /> },
  { path: '/skills', label: 'Skills', icon: <Zap className="h-5 w-5" /> },
  { path: '/patterns', label: 'Patterns', icon: <Layers className="h-5 w-5" /> },
  { path: '/agents', label: 'Agents', icon: <Bot className="h-5 w-5" /> },
  { path: '/qa', label: 'QA Reviews', icon: <ClipboardList className="h-5 w-5" /> },
  { path: '/recaps', label: 'Recaps', icon: <History className="h-5 w-5" /> },
  { path: '/help', label: 'Help', icon: <HelpCircle className="h-5 w-5" /> },
];

// =============================================================================
// Icon Button Component
// =============================================================================

interface IconButtonProps {
  item: NavItem;
}

function IconButton({ item }: IconButtonProps) {
  const { path, label, icon } = item;
  const { isChatOpen, toggleChat } = useChatPanel();

  // Special handling for Chat - render as toggle button
  if (path === '/chat') {
    return (
      <button
        onClick={toggleChat}
        aria-label={label}
        aria-expanded={isChatOpen}
        className={`
          group relative flex items-center justify-center w-10 h-10 rounded-md
          transition-all duration-150
          ${
            isChatOpen
              ? 'bg-primary/15 text-primary dark:text-terminal-orange'
              : 'text-gray-500 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated hover:text-primary dark:hover:text-terminal-orange'
          }
        `.trim()}
      >
        {icon}
        {/* Tooltip */}
        <span
          className="
            absolute left-full ml-2 px-2 py-1
            bg-gray-900 dark:bg-terminal-elevated
            text-white dark:text-terminal-text
            text-xs font-medium rounded-md
            opacity-0 group-hover:opacity-100
            pointer-events-none transition-opacity duration-150
            whitespace-nowrap z-[60]
            shadow-lg
          "
          role="tooltip"
        >
          {label}
        </span>
      </button>
    );
  }

  return (
    <NavLink
      to={path}
      end={path === '/'}
      aria-label={label}
      className={({ isActive }) =>
        `
        group relative flex items-center justify-center w-10 h-10 rounded-md
        transition-all duration-150
        ${
          isActive
            ? 'bg-primary/15 text-primary dark:text-terminal-orange'
            : 'text-gray-500 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated hover:text-primary dark:hover:text-terminal-orange'
        }
      `.trim()
      }
    >
      {icon}
      {/* Tooltip */}
      <span
        className="
          absolute left-full ml-2 px-2 py-1
          bg-gray-900 dark:bg-terminal-elevated
          text-white dark:text-terminal-text
          text-xs font-medium rounded-md
          opacity-0 group-hover:opacity-100
          pointer-events-none transition-opacity duration-150
          whitespace-nowrap z-[60]
          shadow-lg
        "
        role="tooltip"
      >
        {label}
      </span>
    </NavLink>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MobileIconStrip({ visible, className = '' }: MobileIconStripProps) {
  if (!visible) return null;

  return (
    <div
      className={`
        fixed left-0 top-14 bottom-0 w-16
        lg:hidden
        bg-white dark:bg-terminal-card
        border-r border-gray-200 dark:border-terminal-border
        flex flex-col items-center py-3 gap-1
        z-30
        overflow-y-auto
        ${className}
      `.trim()}
      role="navigation"
      aria-label="Quick navigation"
    >
      {navItems.map((item) => (
        <IconButton key={item.path} item={item} />
      ))}
    </div>
  );
}
