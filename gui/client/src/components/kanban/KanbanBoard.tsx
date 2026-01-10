/**
 * KanbanBoard Component
 *
 * Main Kanban board with DndContext for drag-and-drop functionality.
 * Renders columns and handles task movement between columns.
 *
 * Features:
 * - Drag and drop with @dnd-kit
 * - Keyboard navigation support
 * - Collision detection with closestCorners
 * - ARIA announcements for accessibility
 *
 * Accessibility:
 * - Application role for the board
 * - Live region for drag announcements
 * - Keyboard shortcuts for navigation
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import type { KanbanColumn as KanbanColumnType, KanbanTask, ColumnId } from '../../hooks/useKanban';
import { Loader2, LayoutGrid } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface KanbanBoardProps {
  /** Columns with their tasks */
  columns: KanbanColumnType[];
  /** Handler when a task card is clicked */
  onTaskClick: (task: KanbanTask) => void;
  /** Handler when a task is moved to a new column */
  onTaskMove: (taskId: string, newColumn: ColumnId) => void;
  /** Handler when a task card is right-clicked */
  onTaskContextMenu?: (task: KanbanTask, x: number, y: number) => void;
  /** Loading state */
  isLoading?: boolean;
  /** ID of the currently keyboard-focused task */
  focusedTaskId?: string | null;
  /** Whether interactions are disabled */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function KanbanBoard({
  columns,
  onTaskClick,
  onTaskMove,
  onTaskContextMenu,
  isLoading = false,
  focusedTaskId,
  disabled = false,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // Configure sensors for drag and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find task by ID across all columns
  const findTask = useCallback(
    (taskId: string): KanbanTask | null => {
      for (const column of columns) {
        const task = column.tasks.find(t => t.id === taskId);
        if (task) return task;
      }
      return null;
    },
    [columns]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const task = findTask(active.id as string);

      if (task) {
        setActiveTask(task);
        setAnnouncement(`Picked up task: ${task.title}`);
      }
    },
    [findTask]
  );

  // Handle drag over (for preview)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over) return;

      // Check if we're over a column
      const overColumnId = over.id as ColumnId;
      const isOverColumn = columns.some(col => col.id === overColumnId);

      if (isOverColumn && activeTask) {
        const fromColumn = columns.find(col =>
          col.tasks.some(t => t.id === active.id)
        );
        const toColumn = columns.find(col => col.id === overColumnId);

        if (fromColumn && toColumn && fromColumn.id !== toColumn.id) {
          setAnnouncement(`Over ${toColumn.title} column`);
        }
      }
    },
    [columns, activeTask]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveTask(null);

      if (!over) {
        setAnnouncement('Drag cancelled');
        return;
      }

      const taskId = active.id as string;

      // Determine the target column
      let targetColumnId: ColumnId | null = null;

      // Check if dropped on a column directly
      if (columns.some(col => col.id === over.id)) {
        targetColumnId = over.id as ColumnId;
      } else {
        // Dropped on a task - find its column
        for (const column of columns) {
          if (column.tasks.some(t => t.id === over.id)) {
            targetColumnId = column.id;
            break;
          }
        }
      }

      if (targetColumnId) {
        const task = findTask(taskId);
        const targetColumn = columns.find(col => col.id === targetColumnId);

        if (task && targetColumn && task.column !== targetColumnId) {
          onTaskMove(taskId, targetColumnId);
          setAnnouncement(`Moved ${task.title} to ${targetColumn.title}`);
        } else {
          setAnnouncement('Drag cancelled - no change');
        }
      }
    },
    [columns, findTask, onTaskMove]
  );

  // Check if all columns are empty
  const allEmpty = columns.every(col => col.tasks.length === 0);

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="kanban-loading"
        className="flex flex-col items-center justify-center h-64"
      >
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="mt-2 text-gray-500 dark:text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  // Empty state
  if (columns.length === 0 || allEmpty) {
    return (
      <div
        data-testid="kanban-board"
        className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        role="application"
        aria-label="Kanban board with 0 columns"
      >
        <LayoutGrid className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks found</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Create a specification with tasks to populate the board
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Board container */}
      <div
        data-testid="kanban-board"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]"
        role="application"
        aria-label={`Kanban board with ${columns.length} columns`}
        aria-describedby="kanban-instructions"
      >
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            onTaskClick={onTaskClick}
            onTaskContextMenu={onTaskContextMenu}
            focusedTaskId={focusedTaskId}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Keyboard instructions */}
      <div id="kanban-instructions" className="sr-only">
        Use arrow keys to navigate between tasks.
        Press Enter or Space to view task details.
        Drag tasks to move them between columns.
      </div>

      {/* Drag overlay - shows the task being dragged */}
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 shadow-2xl rotate-3">
            <KanbanTaskCard
              task={activeTask}
              onClick={() => {}}
              disabled
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
