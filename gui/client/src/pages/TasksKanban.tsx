/**
 * TasksKanban Page
 *
 * Terminal-styled Kanban board view for tasks with drag-and-drop, filtering,
 * and keyboard navigation.
 *
 * Features:
 * - Drag and drop tasks between columns
 * - Filter by spec
 * - Keyboard navigation (arrow keys, Enter)
 * - Real-time updates via WebSocket
 * - Detail panel for selected task
 */

import { useEffect, useCallback } from 'react';
import { KanbanBoard, TaskDetailPanel } from '../components/kanban';
import { useKanban, type ColumnId } from '../hooks/useKanban';
import { usePanelLayoutContext } from '../components/layout';
import { Filter, LayoutGrid, Keyboard, Terminal, Loader2, ChevronDown } from 'lucide-react';

// =============================================================================
// Component
// =============================================================================

export default function TasksKanban() {
  const {
    columns,
    specs,
    specFilter,
    setSpecFilter,
    isLoading,
    isLoadingMore,
    hasMore,
    totalSpecs,
    loadMore,
    error,
    moveTask,
    selectedTask,
    setSelectedTask,
    focusedTaskId,
    setFocusedTaskId,
    navigateNext,
    navigatePrev,
    navigateNextColumn,
    navigatePrevColumn,
  } = useKanban();

  const { setDetailContent, setDetailOpen } = usePanelLayoutContext();

  // Update detail panel when task is selected
  useEffect(() => {
    if (selectedTask) {
      setDetailContent(
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setDetailOpen(false);
          }}
          onMoveToColumn={(column: ColumnId) => {
            if (selectedTask) {
              moveTask(selectedTask.id, column);
            }
          }}
        />
      );
      setDetailOpen(true);
    } else {
      setDetailContent(null);
      setDetailOpen(false);
    }
  }, [selectedTask, setDetailContent, setDetailOpen, setSelectedTask, moveTask]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          navigateNext();
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          navigatePrev();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          navigateNextColumn();
          break;
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          navigatePrevColumn();
          break;
        case 'Enter':
        case ' ':
          if (focusedTaskId) {
            e.preventDefault();
            const task = columns
              .flatMap(col => col.tasks)
              .find(t => t.id === focusedTaskId);
            if (task) {
              setSelectedTask(task);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedTask(null);
          setFocusedTaskId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    columns,
    focusedTaskId,
    navigateNext,
    navigatePrev,
    navigateNextColumn,
    navigatePrevColumn,
    setFocusedTaskId,
    setSelectedTask,
  ]);

  // Handle task click
  const handleTaskClick = useCallback(
    (task: typeof selectedTask) => {
      setSelectedTask(task);
      if (task) {
        setFocusedTaskId(task.id);
      }
    },
    [setSelectedTask, setFocusedTaskId]
  );

  // Handle task move
  const handleTaskMove = useCallback(
    async (taskId: string, newColumn: ColumnId) => {
      await moveTask(taskId, newColumn);
    },
    [moveTask]
  );

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 terminal-card p-8">
        <Terminal className="h-10 w-10 text-error dark:text-terminal-red mb-3" />
        <p className="text-error dark:text-terminal-red font-medium mb-1">
          Failed to load tasks
        </p>
        <p className="text-sm text-gray-500 dark:text-terminal-text-muted">
          {error.message}
        </p>
      </div>
    );
  }

  const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);
  const completedTasks = columns.find(c => c.id === 'completed')?.tasks.length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-terminal-text flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-brand dark:text-terminal-orange" />
            Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-terminal-text-muted">
            Drag tasks between columns • Click to view details
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Spec Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-terminal-text-muted" />
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="
                terminal-input pl-9 pr-8 py-2 min-w-[180px]
                appearance-none cursor-pointer
              "
              aria-label="Filter by specification"
            >
              <option value="">All Specifications</option>
              {specs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-terminal-text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts legend */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-terminal-text-muted">
        <Keyboard className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5">
          <kbd className="terminal-code px-1.5">h/j/k/l</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="terminal-code px-1.5">Enter</kbd>
          Select
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="terminal-code px-1.5">Esc</kbd>
          Deselect
        </span>
        <span className="text-gray-300 dark:text-terminal-border">|</span>
        <span>Drag to move</span>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        columns={columns}
        onTaskClick={handleTaskClick}
        onTaskMove={handleTaskMove}
        isLoading={isLoading}
        focusedTaskId={focusedTaskId}
      />

      {/* Load More Button */}
      {!isLoading && hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="
              inline-flex items-center gap-2 px-4 py-2
              text-sm font-medium
              text-gray-700 dark:text-terminal-text
              bg-white dark:bg-terminal-bg-secondary
              border border-gray-300 dark:border-terminal-border
              rounded-md
              hover:bg-gray-50 dark:hover:bg-terminal-bg-hover
              focus:outline-none focus:ring-2 focus:ring-brand dark:focus:ring-terminal-orange
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
            aria-label={isLoadingMore ? 'Loading more specs' : 'Load more specs'}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" data-testid="load-more-spinner" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Load More
              </>
            )}
          </button>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && (
        <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-200 dark:border-terminal-border" data-testid="kanban-footer">
          <span className="text-gray-500 dark:text-terminal-text-muted" data-testid="spec-count">
            {hasMore ? (
              <>
                Showing <span className="font-medium text-gray-700 dark:text-terminal-text">{specs.length}</span> of{' '}
                <span className="font-medium text-gray-700 dark:text-terminal-text">{totalSpecs}</span> specs
              </>
            ) : (
              <>
                <span className="font-medium text-gray-700 dark:text-terminal-text">{specs.length}</span> specs
              </>
            )}
          </span>
          <span className="text-gray-500 dark:text-terminal-text-muted">
            <span className="font-medium text-gray-700 dark:text-terminal-text">{totalTasks}</span> tasks •{' '}
            <span className="font-medium text-terminal-green">{completedTasks}</span> completed
          </span>
        </div>
      )}
    </div>
  );
}
