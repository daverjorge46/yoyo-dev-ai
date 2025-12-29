/**
 * TasksKanban Page
 *
 * Kanban board view for tasks with drag-and-drop, filtering,
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
import { Filter, LayoutGrid, HelpCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
        case '?':
          e.preventDefault();
          // Could open help modal here
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
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 dark:text-red-400 mb-2">
          Failed to load tasks
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/tasks"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Back to Task List"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="h-6 w-6" />
              Task Board
            </h1>
          </div>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Drag tasks between columns to update their status
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Spec Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="
                pl-9 pr-4 py-2 rounded-lg
                border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800
                text-sm text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                appearance-none cursor-pointer
                min-w-[180px]
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
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
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

          {/* Keyboard Shortcuts Help */}
          <button
            className="
              p-2 rounded-lg
              text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
            title="Keyboard shortcuts: Arrow keys to navigate, Enter to select, Escape to deselect"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts legend */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
            Arrow
          </kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
            Enter
          </kbd>
          Select
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">
            Esc
          </kbd>
          Deselect
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-400">Drag</span>
          to move tasks
        </span>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        columns={columns}
        onTaskClick={handleTaskClick}
        onTaskMove={handleTaskMove}
        isLoading={isLoading}
        focusedTaskId={focusedTaskId}
      />

      {/* Summary */}
      {!isLoading && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>
            {columns.reduce((sum, col) => sum + col.tasks.length, 0)} total tasks
          </span>
          <span>
            {columns.find(c => c.id === 'completed')?.tasks.length || 0} completed
          </span>
        </div>
      )}
    </div>
  );
}
