/**
 * Kanban State Management
 *
 * Handles persistence of task column positions in kanban-state.json files.
 * This allows tasks to maintain their position in intermediate columns
 * (in_progress, review) across page refreshes.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export type ColumnId = 'backlog' | 'in_progress' | 'review' | 'completed';

export interface KanbanState {
  /** Map of taskId (e.g., "1.1") to column */
  columns: Record<string, ColumnId>;
  /** ISO timestamp of last update */
  updatedAt?: string;
}

// =============================================================================
// Constants
// =============================================================================

const KANBAN_STATE_FILE = 'kanban-state.json';

// =============================================================================
// Functions
// =============================================================================

/**
 * Read kanban state from a spec directory.
 * Returns empty state if file doesn't exist or is invalid.
 */
export function readKanbanState(specDir: string): KanbanState {
  const filePath = join(specDir, KANBAN_STATE_FILE);

  if (!existsSync(filePath)) {
    return { columns: {} };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const state = JSON.parse(content) as KanbanState;

    // Validate structure
    if (!state.columns || typeof state.columns !== 'object') {
      return { columns: {} };
    }

    return state;
  } catch {
    // Invalid JSON or read error
    return { columns: {} };
  }
}

/**
 * Write kanban state to a spec directory.
 * Creates the file if it doesn't exist.
 */
export function writeKanbanState(
  specDir: string,
  columns: Record<string, ColumnId>
): void {
  const filePath = join(specDir, KANBAN_STATE_FILE);

  const state: KanbanState = {
    columns,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Update a single task's column in the kanban state.
 * Preserves other task columns.
 */
export function updateTaskColumn(
  specDir: string,
  taskId: string,
  column: ColumnId
): void {
  const currentState = readKanbanState(specDir);
  const updatedColumns = { ...currentState.columns, [taskId]: column };
  writeKanbanState(specDir, updatedColumns);
}

/**
 * Get the column for a task, with fallback based on task status.
 *
 * Priority:
 * 1. Explicit column from kanban state
 * 2. 'completed' if task status is completed
 * 3. 'backlog' for pending tasks
 */
export function getTaskColumn(
  state: KanbanState,
  taskId: string,
  taskStatus: 'pending' | 'in_progress' | 'completed'
): ColumnId {
  // Check if task has explicit column in state
  if (state.columns[taskId]) {
    return state.columns[taskId];
  }

  // Fall back to status-based column
  if (taskStatus === 'completed') {
    return 'completed';
  }

  return 'backlog';
}
