/**
 * TaskDetailPanel Component
 *
 * Terminal-styled right panel for displaying task details when a task is selected.
 * Shows full task information, subtasks, and status controls.
 *
 * Accessibility:
 * - Dialog-like pattern with Escape to close
 * - Focus management
 * - Clear headings structure
 */

import { useEffect, useRef, useState } from 'react';
import type { KanbanTask, ColumnId } from '../../hooks/useKanban';
import {
  X,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Terminal,
  ChevronDown,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface TaskDetailPanelProps {
  /** Selected task to display */
  task: KanbanTask | null;
  /** Close the panel */
  onClose: () => void;
  /** Move task to a new column */
  onMoveToColumn: (column: ColumnId) => void;
}

// =============================================================================
// Column Options with terminal styling
// =============================================================================

const COLUMN_OPTIONS: Array<{
  id: ColumnId;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}> = [
  {
    id: 'backlog',
    label: 'Backlog',
    icon: <Circle className="h-4 w-4" />,
    colorClass: 'text-gray-500 dark:text-terminal-text-muted',
    bgClass: 'bg-gray-100 dark:bg-terminal-elevated',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: <Clock className="h-4 w-4" />,
    colorClass: 'text-info dark:text-terminal-blue',
    bgClass: 'bg-info/10 dark:bg-terminal-blue/10',
  },
  {
    id: 'review',
    label: 'Review',
    icon: <Eye className="h-4 w-4" />,
    colorClass: 'text-purple-500 dark:text-terminal-magenta',
    bgClass: 'bg-purple-100 dark:bg-terminal-magenta/10',
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    colorClass: 'text-success dark:text-terminal-green',
    bgClass: 'bg-success/10 dark:bg-terminal-green/10',
  },
];

// =============================================================================
// StatusDropdown Component
// =============================================================================

function StatusDropdown({
  currentColumn,
  onSelect,
}: {
  currentColumn: ColumnId;
  onSelect: (column: ColumnId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = COLUMN_OPTIONS.find((col) => col.id === currentColumn);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded
          terminal-card-hover border-2
          ${current?.bgClass} ${current?.colorClass}
          transition-all
        `}
      >
        <div className="flex items-center gap-2">
          {current?.icon}
          <span className="font-medium">{current?.label}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 terminal-card shadow-lg overflow-hidden animate-slide-down">
          {COLUMN_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left
                transition-colors
                ${
                  option.id === currentColumn
                    ? `${option.bgClass} ${option.colorClass}`
                    : 'hover:bg-gray-50 dark:hover:bg-terminal-elevated text-gray-700 dark:text-terminal-text-secondary'
                }
              `}
            >
              <span className={option.colorClass}>{option.icon}</span>
              <span className="flex-1">{option.label}</span>
              {option.id === currentColumn && (
                <CheckCircle2 className="h-4 w-4 text-brand dark:text-terminal-yellow" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function TaskDetailPanel({
  task,
  onClose,
  onMoveToColumn,
}: TaskDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when panel opens
  useEffect(() => {
    if (task) {
      closeButtonRef.current?.focus();
    }
  }, [task]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && task) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-gray-400 dark:text-terminal-text-muted">
        <Terminal className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-center font-medium">No task selected</p>
        <p className="text-sm mt-1 text-gray-300 dark:text-terminal-border">
          Click on a task card to view details
        </p>
      </div>
    );
  }

  const currentColumn = COLUMN_OPTIONS.find((col) => col.id === task.column);

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-white dark:bg-terminal-card"
      role="complementary"
      aria-label={`Task details: ${task.title}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-terminal-border">
        <div className="terminal-header mb-0">Task Details</div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="terminal-btn-ghost p-1.5"
          aria-label="Close task details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Task Title */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-terminal-text mb-2">
            {task.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-terminal-text-muted">
            <span className="terminal-code">
              {task.groupId}.{task.taskIndex}
            </span>
            <span className="text-gray-300 dark:text-terminal-border">|</span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {task.specName}
            </span>
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted mb-2">
            Status
          </label>
          <StatusDropdown
            currentColumn={task.column}
            onSelect={onMoveToColumn}
          />
        </div>

        {/* Progress */}
        {task.subtaskCount > 0 && (
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted mb-2">
              Progress
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 terminal-progress">
                <div
                  className={`terminal-progress-bar ${
                    task.progress === 100
                      ? 'bg-terminal-green'
                      : 'bg-terminal-yellow'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-terminal-text-secondary">
                {task.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted mb-2">
              Subtasks ({task.completedSubtasks}/{task.subtaskCount})
            </label>
            <ul className="space-y-1.5">
              {task.subtasks.map((subtask, index) => (
                <li
                  key={index}
                  className="
                    flex items-start gap-2 px-3 py-2 rounded
                    bg-gray-50 dark:bg-terminal-elevated
                    text-sm text-gray-700 dark:text-terminal-text-secondary
                    border border-gray-100 dark:border-terminal-border-subtle
                  "
                >
                  <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand dark:text-terminal-yellow" />
                  <span>{subtask}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-terminal-text-muted mb-2">
            Actions
          </label>
          <div className="space-y-1.5">
            <a
              href="/specs"
              className="
                flex items-center gap-2 px-3 py-2 rounded
                text-sm terminal-link
                hover:bg-brand/5 dark:hover:bg-terminal-yellow/5
                transition-colors
              "
            >
              <ExternalLink className="h-4 w-4" />
              View Specification
            </a>
            <a
              href="/tasks"
              className="
                flex items-center gap-2 px-3 py-2 rounded
                text-sm terminal-link
                hover:bg-brand/5 dark:hover:bg-terminal-yellow/5
                transition-colors
              "
            >
              <FolderOpen className="h-4 w-4" />
              View in Task List
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-terminal-border">
        <p className="text-xs text-gray-400 dark:text-terminal-text-muted font-mono truncate">
          spec:{task.specId}
        </p>
      </div>
    </div>
  );
}
