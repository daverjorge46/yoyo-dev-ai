/**
 * Phase Execution Store
 *
 * Zustand store for managing phase execution state.
 * Handles execution lifecycle, progress tracking, and logs.
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'failed';

export interface SpecProgress {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  currentTask?: string;
  error?: string;
}

export interface CurrentSpec {
  id: string;
  title: string;
  progress: number;
  currentTask?: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  specId?: string;
  taskId?: string;
}

export interface ExecutionMetrics {
  startedAt: string;
  completedAt?: string;
  stoppedAt?: string;
  elapsedSeconds: number;
  completedSpecs: number;
  totalSpecs: number;
  completedTasks: number;
  totalTasks: number;
  stopReason?: string;
  failedSpec?: string;
  failedTask?: string;
}

// =============================================================================
// Store State
// =============================================================================

interface PhaseExecutionState {
  // Execution identity
  executionId: string | null;
  phaseId: string | null;
  phaseTitle: string | null;
  phaseGoal: string | null;

  // Status
  status: ExecutionStatus;
  error: string | null;

  // Progress
  overallProgress: number;
  currentSpec: CurrentSpec | null;
  specs: SpecProgress[];

  // Logs
  logs: ExecutionLog[];

  // Metrics
  metrics: ExecutionMetrics | null;
}

// =============================================================================
// Store Actions
// =============================================================================

interface PhaseExecutionActions {
  // State setters
  setStarted: (data: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    phaseGoal?: string;
    specs: SpecProgress[];
  }) => void;

  updateProgress: (data: {
    overallProgress: number;
    currentSpec?: CurrentSpec;
    completedSpecs?: number;
    totalSpecs?: number;
    completedTasks?: number;
    totalTasks?: number;
    elapsedSeconds?: number;
  }) => void;

  updateSpecStatus: (
    specId: string,
    status: SpecProgress['status'],
    progress?: number,
    error?: string
  ) => void;

  setPaused: () => void;
  setResumed: () => void;
  setStopped: (reason?: string) => void;
  setCompleted: () => void;
  setFailed: (error: string, failedSpec?: string, failedTask?: string) => void;

  addLog: (log: ExecutionLog) => void;
  clearLogs: () => void;

  reset: () => void;

  // Computed getters
  isRunning: () => boolean;
  isPaused: () => boolean;
  isActive: () => boolean;
  canPause: () => boolean;
  canResume: () => boolean;
  canStop: () => boolean;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: PhaseExecutionState = {
  executionId: null,
  phaseId: null,
  phaseTitle: null,
  phaseGoal: null,
  status: 'idle',
  error: null,
  overallProgress: 0,
  currentSpec: null,
  specs: [],
  logs: [],
  metrics: null,
};

// =============================================================================
// Store Implementation
// =============================================================================

const MAX_LOGS = 500;

export const usePhaseExecutionStore = create<PhaseExecutionState & PhaseExecutionActions>(
  (set, get) => ({
    ...initialState,

    // =========================================================================
    // State Setters
    // =========================================================================

    setStarted: (data) => {
      set({
        executionId: data.executionId,
        phaseId: data.phaseId,
        phaseTitle: data.phaseTitle,
        phaseGoal: data.phaseGoal ?? null,
        status: 'running',
        error: null,
        overallProgress: 0,
        currentSpec: null,
        specs: data.specs,
        logs: [],
        metrics: {
          startedAt: new Date().toISOString(),
          elapsedSeconds: 0,
          completedSpecs: 0,
          totalSpecs: data.specs.length,
          completedTasks: 0,
          totalTasks: 0,
        },
      });
    },

    updateProgress: (data) => {
      set((state) => ({
        overallProgress: data.overallProgress,
        currentSpec: data.currentSpec ?? state.currentSpec,
        metrics: state.metrics
          ? {
              ...state.metrics,
              completedSpecs: data.completedSpecs ?? state.metrics.completedSpecs,
              totalSpecs: data.totalSpecs ?? state.metrics.totalSpecs,
              completedTasks: data.completedTasks ?? state.metrics.completedTasks,
              totalTasks: data.totalTasks ?? state.metrics.totalTasks,
              elapsedSeconds: data.elapsedSeconds ?? state.metrics.elapsedSeconds,
            }
          : null,
      }));
    },

    updateSpecStatus: (specId, status, progress, error) => {
      set((state) => ({
        specs: state.specs.map((spec) =>
          spec.id === specId
            ? {
                ...spec,
                status,
                progress: progress ?? spec.progress,
                error,
              }
            : spec
        ),
      }));
    },

    setPaused: () => {
      set({ status: 'paused' });
    },

    setResumed: () => {
      set({ status: 'running' });
    },

    setStopped: (reason) => {
      set((state) => ({
        status: 'stopped',
        metrics: state.metrics
          ? {
              ...state.metrics,
              stoppedAt: new Date().toISOString(),
              stopReason: reason,
            }
          : null,
      }));
    },

    setCompleted: () => {
      set((state) => ({
        status: 'completed',
        overallProgress: 100,
        currentSpec: null,
        specs: state.specs.map((spec) => ({
          ...spec,
          status: 'completed' as const,
          progress: 100,
        })),
        metrics: state.metrics
          ? {
              ...state.metrics,
              completedAt: new Date().toISOString(),
              completedSpecs: state.specs.length,
            }
          : null,
      }));
    },

    setFailed: (error, failedSpec, failedTask) => {
      set((state) => ({
        status: 'failed',
        error,
        metrics: state.metrics
          ? {
              ...state.metrics,
              stoppedAt: new Date().toISOString(),
              failedSpec,
              failedTask,
            }
          : null,
      }));
    },

    addLog: (log) => {
      set((state) => {
        const newLogs = [...state.logs, log];
        // Trim if exceeds max
        if (newLogs.length > MAX_LOGS) {
          return { logs: newLogs.slice(-MAX_LOGS) };
        }
        return { logs: newLogs };
      });
    },

    clearLogs: () => {
      set({ logs: [] });
    },

    reset: () => {
      set(initialState);
    },

    // =========================================================================
    // Computed Getters
    // =========================================================================

    isRunning: () => get().status === 'running',
    isPaused: () => get().status === 'paused',
    isActive: () => ['running', 'paused'].includes(get().status),
    canPause: () => get().status === 'running',
    canResume: () => get().status === 'paused',
    canStop: () => ['running', 'paused'].includes(get().status),
  })
);
