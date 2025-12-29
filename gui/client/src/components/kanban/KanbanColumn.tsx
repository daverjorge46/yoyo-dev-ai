/**
 * KanbanColumn Component
 *
 * Droppable column for the Kanban board.
 * Contains a header with title and count, and a list of task cards.
 *
 * Accessibility:
 * - ARIA region role with descriptive label
 * - Visual drop indicators
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTaskCard } from './KanbanTaskCard';
import type { KanbanColumn as KanbanColumnType, KanbanTask } from '../../hooks/useKanban';
import { Inbox } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface KanbanColumnProps {
  /** Column data including tasks */
  column: KanbanColumnType;
  /** Handler when a task card is clicked */
  onTaskClick: (task: KanbanTask) => void;
  /** ID of the currently keyboard-focused task */
  focusedTaskId?: string | null;
  /** Whether task interactions are disabled */
  disabled?: boolean;
}

// =============================================================================
// Color Mapping
// =============================================================================

const COLUMN_COLORS: Record<
  KanbanColumnType['color'],
  {
    header: string;
    border: string;
    badge: string;
    dropZone: string;
  }
> = {
  gray: {
    header: 'bg-gray-100 dark:bg-gray-700',
    border: 'border-gray-200 dark:border-gray-600',
    badge: 'bg-gray-500 text-white',
    dropZone: 'bg-gray-50 dark:bg-gray-800/50',
  },
  blue: {
    header: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-500 text-white',
    dropZone: 'bg-blue-50 dark:bg-blue-900/20',
  },
  purple: {
    header: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-500 text-white',
    dropZone: 'bg-purple-50 dark:bg-purple-900/20',
  },
  green: {
    header: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-500 text-white',
    dropZone: 'bg-green-50 dark:bg-green-900/20',
  },
};

// =============================================================================
// Component
// =============================================================================

export function KanbanColumn({
  column,
  onTaskClick,
  focusedTaskId,
  disabled = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = COLUMN_COLORS[column.color];
  const taskIds = column.tasks.map(t => t.id);

  return (
    <div
      data-testid="kanban-column"
      ref={setNodeRef}
      className={`
        flex flex-col h-full min-h-[200px]
        rounded-lg border-2
        ${colors.border}
        ${isOver ? colors.dropZone : 'bg-white dark:bg-gray-800'}
        transition-colors duration-150
      `}
      role="region"
      aria-label={`${column.title} column with ${column.tasks.length} tasks`}
    >
      {/* Column Header */}
      <div
        data-testid="kanban-column-header"
        className={`
          flex items-center justify-between
          px-3 py-2 rounded-t-md
          ${colors.header}
        `}
      >
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
          {column.title}
        </h2>
        <span
          className={`
            flex items-center justify-center
            min-w-[24px] h-6 px-2 rounded-full
            text-xs font-bold
            ${colors.badge}
          `}
          aria-label={`${column.tasks.length} tasks`}
        >
          {column.tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div
        className={`
          flex-1 overflow-y-auto p-2 space-y-2
          ${isOver ? 'ring-2 ring-indigo-400 ring-inset' : ''}
        `}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.length > 0 ? (
            column.tasks.map(task => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                isFocused={focusedTaskId === task.id}
                disabled={disabled}
              />
            ))
          ) : (
            <EmptyColumnState columnTitle={column.title} />
          )}
        </SortableContext>

        {/* Drop indicator when empty and hovering */}
        {isOver && column.tasks.length === 0 && (
          <div
            className="
              h-16 rounded-lg border-2 border-dashed
              border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20
              flex items-center justify-center
            "
            aria-hidden="true"
          >
            <span className="text-sm text-indigo-600 dark:text-indigo-400">
              Drop here
            </span>
          </div>
        )}
      </div>

      {/* Column Footer - optional count summary */}
      {column.tasks.length > 5 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Showing {column.tasks.length} tasks
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

function EmptyColumnState({ columnTitle }: { columnTitle: string }) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        h-24 rounded-lg
        border-2 border-dashed border-gray-200 dark:border-gray-700
        text-gray-400 dark:text-gray-500
      "
    >
      <Inbox className="h-6 w-6 mb-1" />
      <span className="text-xs">No tasks in {columnTitle}</span>
    </div>
  );
}
