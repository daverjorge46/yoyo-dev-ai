/**
 * KanbanTaskCard Component
 *
 * Draggable task card for the Kanban board.
 * Displays task title, spec name, subtask count, and progress.
 *
 * Accessibility:
 * - Keyboard navigable (Tab, Enter, Space)
 * - ARIA attributes for drag operations
 * - Focus visible indicator
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanTask } from '../../hooks/useKanban';
import { CheckCircle2, Circle, ListTodo } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface KanbanTaskCardProps {
  /** Task data to display */
  task: KanbanTask;
  /** Click handler for opening task details */
  onClick: (task: KanbanTask) => void;
  /** Right-click context menu handler */
  onContextMenu?: (task: KanbanTask, x: number, y: number) => void;
  /** Whether this card is currently focused via keyboard */
  isFocused?: boolean;
  /** Whether drag is disabled */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function KanbanTaskCard({
  task,
  onClick,
  onContextMenu,
  isFocused = false,
  disabled = false,
}: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Status-based styling
  const getStatusStyles = () => {
    switch (task.column) {
      case 'completed':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'in_progress':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      case 'review':
        return 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (task.column) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Circle className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleClick = () => {
    onClick(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(task);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(task, e.clientX, e.clientY);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid="kanban-task-card"
      className={`
        relative p-3 rounded-lg border-2 cursor-pointer
        transition-all duration-150 ease-in-out
        hover:shadow-md hover:-translate-y-0.5
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${getStatusStyles()}
        ${isFocused ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
        ${isDragging ? 'shadow-lg rotate-2' : ''}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      tabIndex={0}
      role="button"
      aria-label={`Task: ${task.title}. ${task.specName}. ${task.subtaskCount} subtasks. ${task.progress}% complete`}
      aria-describedby={`task-details-${task.id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      {/* Drag handle indicator */}
      <div
        className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      />

      {/* Status and title row */}
      <div className="flex items-start gap-2 mb-2">
        <span className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </span>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
          {task.title}
        </h3>
      </div>

      {/* Spec name */}
      <div className="mb-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 truncate max-w-full">
          {task.specName}
        </span>
      </div>

      {/* Subtask count and progress */}
      <div
        id={`task-details-${task.id}`}
        className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
      >
        <span className="flex items-center gap-1">
          <ListTodo className="h-3 w-3" />
          {task.subtaskCount} subtasks
        </span>

        {task.progress > 0 && (
          <span className="font-medium">
            {task.progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.progress > 0 && (
        <div
          className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={task.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Task progress: ${task.progress}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              task.progress === 100
                ? 'bg-green-500'
                : task.progress >= 50
                ? 'bg-blue-500'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {/* Completed badge */}
      {task.column === 'completed' && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
            <svg
              className="h-2.5 w-2.5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}
