/**
 * TaskContextMenu Component
 *
 * Right-click context menu for Kanban tasks with options:
 * - Send to Terminal (with agent selection)
 * - View in Terminal (if already running)
 * - Move to Column
 * - View Spec
 * - Mark for QA
 */

import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  ArrowRight,
  FileText,
  CheckSquare,
  ChevronRight,
} from 'lucide-react';
import type { KanbanTask, ColumnId } from '../../hooks/useKanban';
import type { AgentType } from '../../types/terminal';
import { AGENT_TYPE_LABELS } from '../../types/terminal';

// =============================================================================
// Types
// =============================================================================

export interface TaskContextMenuProps {
  task: KanbanTask;
  x: number;
  y: number;
  onClose: () => void;
  onSendToTerminal: (task: KanbanTask, agentType: AgentType) => void;
  onViewInTerminal?: (task: KanbanTask) => void;
  onMoveToColumn: (task: KanbanTask, column: ColumnId) => void;
  onViewSpec: (task: KanbanTask) => void;
  onMarkForQA?: (task: KanbanTask) => void;
  boundTerminalId?: string;
}

// =============================================================================
// Component
// =============================================================================

export function TaskContextMenu({
  task,
  x,
  y,
  onClose,
  onSendToTerminal,
  onViewInTerminal,
  onMoveToColumn,
  onViewSpec,
  onMarkForQA,
  boundTerminalId,
}: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'terminal' | 'move' | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay on screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
  }, []);

  const agents: AgentType[] = [
    'yoyo-ai',
    'dave-engineer',
    'implementer',
    'qa-reviewer',
    'qa-fixer',
  ];

  const columns: { id: ColumnId; label: string }[] = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-terminal-card rounded-lg shadow-xl border border-gray-200 dark:border-terminal-border py-1 min-w-48"
      style={{ left: x, top: y }}
    >
      {/* Send to Terminal */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('terminal')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-terminal-text hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
        >
          <span className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Send to Terminal
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>

        {/* Terminal Submenu */}
        {activeSubmenu === 'terminal' && (
          <div className="absolute left-full top-0 ml-1 bg-white dark:bg-terminal-card rounded-lg shadow-xl border border-gray-200 dark:border-terminal-border py-1 min-w-40">
            {agents.map((agent) => (
              <button
                key={agent}
                onClick={() => {
                  onSendToTerminal(task, agent);
                  onClose();
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-terminal-text hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
              >
                {AGENT_TYPE_LABELS[agent]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View in Terminal (if bound) */}
      {boundTerminalId && onViewInTerminal && (
        <button
          onClick={() => {
            onViewInTerminal(task);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-terminal-cyan hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
        >
          <Terminal className="h-4 w-4" />
          View in Terminal
        </button>
      )}

      <div className="my-1 border-t border-gray-200 dark:border-terminal-border" />

      {/* Move to Column */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('move')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-terminal-text hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
        >
          <span className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Move to Column
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>

        {/* Move Submenu */}
        {activeSubmenu === 'move' && (
          <div className="absolute left-full top-0 ml-1 bg-white dark:bg-terminal-card rounded-lg shadow-xl border border-gray-200 dark:border-terminal-border py-1 min-w-32">
            {columns
              .filter((col) => col.id !== task.column)
              .map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    onMoveToColumn(task, col.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-terminal-text hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
                >
                  {col.label}
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="my-1 border-t border-gray-200 dark:border-terminal-border" />

      {/* View Spec */}
      <button
        onClick={() => {
          onViewSpec(task);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-terminal-text hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
      >
        <FileText className="h-4 w-4" />
        View Specification
      </button>

      {/* Mark for QA */}
      {onMarkForQA && task.status !== 'completed' && (
        <button
          onClick={() => {
            onMarkForQA(task);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-terminal-text hover:bg-gray-100 dark:hover:bg-terminal-bg-hover"
        >
          <CheckSquare className="h-4 w-4" />
          Mark for QA Review
        </button>
      )}
    </div>
  );
}
