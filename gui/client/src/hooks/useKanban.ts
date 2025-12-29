/**
 * useKanban Hook
 *
 * State management for the Kanban board including task movement,
 * filtering, and real-time updates via WebSocket.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type ColumnId = 'backlog' | 'in_progress' | 'review' | 'completed';

export interface KanbanTask {
  /** Unique task identifier: specId-groupId-taskIndex */
  id: string;
  /** Parent group ID */
  groupId: string;
  /** Task index within group */
  taskIndex: number;
  /** Spec ID this task belongs to */
  specId: string;
  /** Human-readable spec name */
  specName: string;
  /** Task title */
  title: string;
  /** Current task status */
  status: 'pending' | 'in_progress' | 'completed';
  /** Current column the task is in */
  column: ColumnId;
  /** Subtask titles */
  subtasks: string[];
  /** Total number of subtasks */
  subtaskCount: number;
  /** Number of completed subtasks */
  completedSubtasks: number;
  /** Progress percentage (0-100) */
  progress: number;
}

export interface KanbanColumn {
  id: ColumnId;
  title: string;
  tasks: KanbanTask[];
  color: 'gray' | 'blue' | 'purple' | 'green';
}

interface TaskGroup {
  id: string;
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
    subtasks?: string[];
    column?: ColumnId;
  }>;
  completed: boolean;
}

interface ParsedTasks {
  specId: string;
  specName: string;
  groups: TaskGroup[];
  totalTasks: number;
  completedTasks: number;
}

interface TasksResponse {
  specs: ParsedTasks[];
  summary: {
    totalSpecs: number;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
}

interface UseKanbanOptions {
  /** Filter tasks by spec ID */
  specFilter?: string;
}

interface UseKanbanReturn {
  /** Columns with their tasks */
  columns: KanbanColumn[];
  /** All available specs for filtering */
  specs: Array<{ id: string; name: string }>;
  /** Current spec filter */
  specFilter: string;
  /** Set spec filter */
  setSpecFilter: (specId: string) => void;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Move task to a different column */
  moveTask: (taskId: string, newColumn: ColumnId) => Promise<void>;
  /** Selected task for detail panel */
  selectedTask: KanbanTask | null;
  /** Set selected task */
  setSelectedTask: (task: KanbanTask | null) => void;
  /** Keyboard-focused task ID */
  focusedTaskId: string | null;
  /** Set keyboard focus */
  setFocusedTaskId: (taskId: string | null) => void;
  /** Navigate to next task with keyboard */
  navigateNext: () => void;
  /** Navigate to previous task with keyboard */
  navigatePrev: () => void;
  /** Navigate to next column */
  navigateNextColumn: () => void;
  /** Navigate to previous column */
  navigatePrevColumn: () => void;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchTasks(): Promise<TasksResponse> {
  const res = await fetch('/api/tasks');
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

async function updateTaskColumn(
  specId: string,
  groupId: string,
  taskId: string,
  column: ColumnId
): Promise<void> {
  const res = await fetch(`/api/tasks/${specId}/${groupId}/${taskId}/column`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column }),
  });
  if (!res.ok) throw new Error('Failed to update task column');
}

// =============================================================================
// Column Definitions
// =============================================================================

const COLUMN_DEFINITIONS: Array<{ id: ColumnId; title: string; color: KanbanColumn['color'] }> = [
  { id: 'backlog', title: 'Backlog', color: 'gray' },
  { id: 'in_progress', title: 'In Progress', color: 'blue' },
  { id: 'review', title: 'Review', color: 'purple' },
  { id: 'completed', title: 'Completed', color: 'green' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map task status to Kanban column.
 * Tasks without explicit column assignment are mapped based on status.
 */
function statusToColumn(status: string, explicitColumn?: ColumnId): ColumnId {
  if (explicitColumn) return explicitColumn;

  switch (status) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'in_progress';
    default:
      return 'backlog';
  }
}

/**
 * Transform API tasks into Kanban tasks organized by column.
 */
function transformToKanbanTasks(
  specs: ParsedTasks[],
  specFilter: string
): KanbanTask[] {
  const tasks: KanbanTask[] = [];

  for (const spec of specs) {
    // Apply spec filter
    if (specFilter && spec.specId !== specFilter) continue;

    for (const group of spec.groups) {
      for (let i = 0; i < group.tasks.length; i++) {
        const task = group.tasks[i];
        const subtasks = task.subtasks || [];
        const completedSubtasks = 0; // Would need to track subtask completion

        tasks.push({
          id: `${spec.specId}-${group.id}-${i + 1}`,
          groupId: group.id,
          taskIndex: i + 1,
          specId: spec.specId,
          specName: spec.specName,
          title: task.title,
          status: task.status,
          column: statusToColumn(task.status, task.column),
          subtasks,
          subtaskCount: subtasks.length,
          completedSubtasks,
          progress: task.status === 'completed' ? 100 : 0,
        });
      }
    }
  }

  return tasks;
}

/**
 * Organize tasks into columns.
 */
function organizeTasksIntoColumns(tasks: KanbanTask[]): KanbanColumn[] {
  return COLUMN_DEFINITIONS.map(def => ({
    ...def,
    tasks: tasks.filter(t => t.column === def.id),
  }));
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useKanban(options: UseKanbanOptions = {}): UseKanbanReturn {
  const { specFilter: initialSpecFilter = '' } = options;
  const queryClient = useQueryClient();

  // Local state
  const [specFilter, setSpecFilter] = useState(initialSpecFilter);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // Fetch tasks
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 3000,
  });

  // Transform data into columns
  const columns = useMemo(() => {
    if (!data?.specs) {
      return COLUMN_DEFINITIONS.map(def => ({ ...def, tasks: [] }));
    }
    const tasks = transformToKanbanTasks(data.specs, specFilter);
    return organizeTasksIntoColumns(tasks);
  }, [data?.specs, specFilter]);

  // Available specs for filter dropdown
  const specs = useMemo(() => {
    if (!data?.specs) return [];
    return data.specs.map(spec => ({
      id: spec.specId,
      name: spec.specName,
    }));
  }, [data?.specs]);

  // All tasks flattened for navigation
  const allTasks = useMemo(() => {
    return columns.flatMap(col => col.tasks);
  }, [columns]);

  // Move task mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      task,
      newColumn,
    }: {
      task: KanbanTask;
      newColumn: ColumnId;
    }) => {
      await updateTaskColumn(
        task.specId,
        task.groupId,
        String(task.taskIndex),
        newColumn
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Move task handler
  const moveTask = useCallback(
    async (taskId: string, newColumn: ColumnId) => {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      await moveMutation.mutateAsync({ task, newColumn });
    },
    [allTasks, moveMutation]
  );

  // Keyboard navigation handlers
  const navigateNext = useCallback(() => {
    if (allTasks.length === 0) return;

    const currentIndex = focusedTaskId
      ? allTasks.findIndex(t => t.id === focusedTaskId)
      : -1;

    const nextIndex = currentIndex < allTasks.length - 1 ? currentIndex + 1 : 0;
    setFocusedTaskId(allTasks[nextIndex].id);
  }, [allTasks, focusedTaskId]);

  const navigatePrev = useCallback(() => {
    if (allTasks.length === 0) return;

    const currentIndex = focusedTaskId
      ? allTasks.findIndex(t => t.id === focusedTaskId)
      : allTasks.length;

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : allTasks.length - 1;
    setFocusedTaskId(allTasks[prevIndex].id);
  }, [allTasks, focusedTaskId]);

  const navigateNextColumn = useCallback(() => {
    if (!focusedTaskId) {
      // Focus first task in first non-empty column
      const firstColumn = columns.find(col => col.tasks.length > 0);
      if (firstColumn?.tasks[0]) {
        setFocusedTaskId(firstColumn.tasks[0].id);
      }
      return;
    }

    const currentTask = allTasks.find(t => t.id === focusedTaskId);
    if (!currentTask) return;

    const currentColIndex = columns.findIndex(col => col.id === currentTask.column);
    if (currentColIndex < 0) return;

    // Find next column with tasks
    for (let i = currentColIndex + 1; i < columns.length; i++) {
      if (columns[i].tasks.length > 0) {
        setFocusedTaskId(columns[i].tasks[0].id);
        return;
      }
    }

    // Wrap to first column with tasks
    for (let i = 0; i < currentColIndex; i++) {
      if (columns[i].tasks.length > 0) {
        setFocusedTaskId(columns[i].tasks[0].id);
        return;
      }
    }
  }, [focusedTaskId, allTasks, columns]);

  const navigatePrevColumn = useCallback(() => {
    if (!focusedTaskId) {
      // Focus first task in last non-empty column
      const lastColumn = [...columns].reverse().find(col => col.tasks.length > 0);
      if (lastColumn?.tasks[0]) {
        setFocusedTaskId(lastColumn.tasks[0].id);
      }
      return;
    }

    const currentTask = allTasks.find(t => t.id === focusedTaskId);
    if (!currentTask) return;

    const currentColIndex = columns.findIndex(col => col.id === currentTask.column);
    if (currentColIndex < 0) return;

    // Find previous column with tasks
    for (let i = currentColIndex - 1; i >= 0; i--) {
      if (columns[i].tasks.length > 0) {
        setFocusedTaskId(columns[i].tasks[0].id);
        return;
      }
    }

    // Wrap to last column with tasks
    for (let i = columns.length - 1; i > currentColIndex; i--) {
      if (columns[i].tasks.length > 0) {
        setFocusedTaskId(columns[i].tasks[0].id);
        return;
      }
    }
  }, [focusedTaskId, allTasks, columns]);

  return {
    columns,
    specs,
    specFilter,
    setSpecFilter,
    isLoading,
    error: error as Error | null,
    moveTask,
    selectedTask,
    setSelectedTask,
    focusedTaskId,
    setFocusedTaskId,
    navigateNext,
    navigatePrev,
    navigateNextColumn,
    navigatePrevColumn,
  };
}
