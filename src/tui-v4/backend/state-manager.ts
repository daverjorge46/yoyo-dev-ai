/**
 * Centralized State Manager
 *
 * Zustand store with slices for:
 * - Tasks: Task tree, status, metadata
 * - Specs: Active spec, metadata
 * - Git: Branch, status
 * - MCP: Server connections
 * - Memory: Block count
 *
 * Provides pub/sub events for state changes.
 */

import { create } from 'zustand';
import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface Task {
  id: string;
  number: string;  // e.g., "1.1", "2.3"
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  parallelSafe: boolean;
  parent?: string;  // Parent task number
  children: Task[];
}

export interface Spec {
  path: string;
  name: string;
  created: string;
  phase: string;
  tasksCreated: string | null;
}

export interface GitStatus {
  branch: string | null;
  modified: number;
  added: number;
  deleted: number;
  ahead: number;
  behind: number;
}

export interface McpStatus {
  serverCount: number;
  connected: boolean;
}

export interface MemoryStatus {
  blockCount: number;
  lastUpdated: string | null;
}

// =============================================================================
// State Interface
// =============================================================================

interface AppState {
  // Task state
  tasks: Task[];
  activeTask: string | null;
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setActiveTask: (taskId: string | null) => void;

  // Spec state
  activeSpec: Spec | null;
  specs: Spec[];
  setActiveSpec: (spec: Spec | null) => void;
  setSpecs: (specs: Spec[]) => void;

  // Git state
  git: GitStatus;
  setGitStatus: (status: GitStatus) => void;

  // MCP state
  mcp: McpStatus;
  setMcpStatus: (status: McpStatus) => void;

  // Memory state
  memory: MemoryStatus;
  setMemoryStatus: (status: MemoryStatus) => void;
}

// =============================================================================
// Event Emitter
// =============================================================================

export const stateEvents = new EventEmitter();

// Event types
export type StateEvent =
  | 'task_updated'
  | 'spec_changed'
  | 'git_status'
  | 'mcp_status'
  | 'memory_status';

// =============================================================================
// Zustand Store
// =============================================================================

export const useAppStore = create<AppState>((set, get) => ({
  // Task state
  tasks: [],
  activeTask: null,

  setTasks: (tasks) => {
    set({ tasks });
    stateEvents.emit('task_updated', { tasks });
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    }));
    stateEvents.emit('task_updated', { taskId, updates });
  },

  setActiveTask: (taskId) => {
    set({ activeTask: taskId });
  },

  // Spec state
  activeSpec: null,
  specs: [],

  setActiveSpec: (spec) => {
    set({ activeSpec: spec });
    stateEvents.emit('spec_changed', { spec });
  },

  setSpecs: (specs) => {
    set({ specs });
  },

  // Git state
  git: {
    branch: null,
    modified: 0,
    added: 0,
    deleted: 0,
    ahead: 0,
    behind: 0,
  },

  setGitStatus: (status) => {
    set({ git: status });
    stateEvents.emit('git_status', { status });
  },

  // MCP state
  mcp: {
    serverCount: 0,
    connected: false,
  },

  setMcpStatus: (status) => {
    set({ mcp: status });
    stateEvents.emit('mcp_status', { status });
  },

  // Memory state
  memory: {
    blockCount: 0,
    lastUpdated: null,
  },

  setMemoryStatus: (status) => {
    set({ memory: status });
    stateEvents.emit('memory_status', { status });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectTasks = (state: AppState) => state.tasks;
export const selectActiveTask = (state: AppState) => state.activeTask;
export const selectActiveSpec = (state: AppState) => state.activeSpec;
export const selectGitStatus = (state: AppState) => state.git;
export const selectMcpStatus = (state: AppState) => state.mcp;
export const selectMemoryStatus = (state: AppState) => state.memory;
