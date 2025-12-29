/**
 * TaskDetailPanel Component
 *
 * Right panel for displaying task details when a task is selected.
 * Shows full task information, subtasks, and actions.
 *
 * Accessibility:
 * - Dialog-like pattern with Escape to close
 * - Focus management
 * - Clear headings structure
 */

import { useEffect, useRef } from 'react';
import type { KanbanTask, ColumnId } from '../../hooks/useKanban';
import {
  X,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  ChevronRight,
  ExternalLink,
  FolderOpen,
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
// Column Options
// =============================================================================

const COLUMN_OPTIONS: Array<{
  id: ColumnId;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: 'backlog',
    label: 'Backlog',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-gray-500',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  {
    id: 'review',
    label: 'Review',
    icon: <ListTodo className="h-4 w-4" />,
    color: 'text-purple-500',
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-500',
  },
];

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
      <div className="flex flex-col items-center justify-center h-full p-6 text-gray-400 dark:text-gray-500">
        <FolderOpen className="h-12 w-12 mb-3" />
        <p className="text-center">Select a task to view details</p>
        <p className="text-sm mt-1 text-gray-300 dark:text-gray-600">
          Click on any task card or use keyboard navigation
        </p>
      </div>
    );
  }

  const currentColumn = COLUMN_OPTIONS.find(col => col.id === task.column);

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-white dark:bg-gray-800"
      role="complementary"
      aria-label={`Task details: ${task.title}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          Task Details
        </h2>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="
            p-1 rounded-md
            text-gray-400 hover:text-gray-600
            dark:text-gray-500 dark:hover:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          "
          aria-label="Close task details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Task Title */}
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {task.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Task {task.groupId}.{task.taskIndex}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {task.specName}
            </span>
          </div>
        </div>

        {/* Current Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex items-center gap-2">
            <span className={currentColumn?.color}>
              {currentColumn?.icon}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currentColumn?.label}
            </span>
          </div>
        </div>

        {/* Move to Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Move to
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COLUMN_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => onMoveToColumn(option.id)}
                disabled={option.id === task.column}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                  border transition-colors
                  ${
                    option.id === task.column
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                <span className={option.color}>{option.icon}</span>
                <span>{option.label}</span>
                {option.id === task.column && (
                  <CheckCircle2 className="h-4 w-4 ml-auto text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Progress */}
        {task.progress > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Progress
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    task.progress === 100 ? 'bg-green-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {task.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subtasks ({task.completedSubtasks}/{task.subtaskCount})
            </label>
            <ul className="space-y-2">
              {task.subtasks.map((subtask, index) => (
                <li
                  key={index}
                  className="
                    flex items-start gap-2 px-3 py-2 rounded-lg
                    bg-gray-50 dark:bg-gray-700/50
                    text-sm text-gray-700 dark:text-gray-300
                  "
                >
                  <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>{subtask}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Actions
          </label>
          <div className="space-y-2">
            <a
              href={`/specs`}
              className="
                flex items-center gap-2 px-3 py-2 rounded-lg
                text-sm text-indigo-600 dark:text-indigo-400
                hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                transition-colors
              "
            >
              <ExternalLink className="h-4 w-4" />
              View Specification
            </a>
            <a
              href={`/tasks`}
              className="
                flex items-center gap-2 px-3 py-2 rounded-lg
                text-sm text-indigo-600 dark:text-indigo-400
                hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                transition-colors
              "
            >
              <ListTodo className="h-4 w-4" />
              View in Task List
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Spec: {task.specId}
        </p>
      </div>
    </div>
  );
}
