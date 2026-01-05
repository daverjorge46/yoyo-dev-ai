/**
 * Execution State Persistence
 *
 * Persists execution state to disk for:
 * - Resume after pause/stop
 * - Recovery after crash
 * - State inspection across server restarts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface SpecProgress {
  specId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  tasksCompleted: number;
  tasksTotal: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ExecutionState {
  /** Unique execution ID */
  executionId: string;

  /** Phase being executed */
  phaseId: string;
  phaseTitle: string;

  /** Current status */
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'failed';

  /** When execution started */
  startedAt: string;

  /** When state was last updated */
  updatedAt: string;

  /** When execution ended (if completed/failed/stopped) */
  endedAt?: string;

  /** Overall progress */
  progress: {
    current: number;
    total: number;
    percentage: number;
  };

  /** Per-spec progress tracking */
  specs: SpecProgress[];

  /** Currently executing spec/task */
  currentSpec?: {
    specId: string;
    taskIndex: number;
    taskDescription?: string;
  };

  /** Error information (if failed) */
  error?: {
    message: string;
    code?: number;
    timestamp: string;
  };

  /** Resume context for fresh process resume */
  resumeContext?: {
    lastCompletedTask?: string;
    pendingSpecs: string[];
    notes?: string;
  };
}

export interface ExecutionStateOptions {
  projectRoot: string;
}

// =============================================================================
// ExecutionStateManager Class
// =============================================================================

export class ExecutionStateManager {
  private projectRoot: string;
  private state: ExecutionState | null = null;

  constructor(options: ExecutionStateOptions) {
    this.projectRoot = options.projectRoot;
  }

  // ===========================================================================
  // Path Helpers
  // ===========================================================================

  /**
   * Get state file path
   */
  getStateFilePath(): string {
    return join(this.projectRoot, '.yoyo-dev', 'ralph', 'execution-state.json');
  }

  /**
   * Get state directory path
   */
  private getStateDir(): string {
    return dirname(this.getStateFilePath());
  }

  // ===========================================================================
  // State Initialization
  // ===========================================================================

  /**
   * Create a new execution state
   */
  createState(options: {
    executionId: string;
    phaseId: string;
    phaseTitle: string;
    specs: Array<{ specId: string; tasksTotal: number }>;
  }): ExecutionState {
    const now = new Date().toISOString();
    const totalTasks = options.specs.reduce((sum, s) => sum + s.tasksTotal, 0);

    this.state = {
      executionId: options.executionId,
      phaseId: options.phaseId,
      phaseTitle: options.phaseTitle,
      status: 'running',
      startedAt: now,
      updatedAt: now,
      progress: {
        current: 0,
        total: totalTasks,
        percentage: 0,
      },
      specs: options.specs.map(s => ({
        specId: s.specId,
        status: 'pending',
        tasksCompleted: 0,
        tasksTotal: s.tasksTotal,
      })),
    };

    this.save();
    return this.state;
  }

  // ===========================================================================
  // State Updates
  // ===========================================================================

  /**
   * Update progress for a spec
   */
  updateSpecProgress(specId: string, update: Partial<SpecProgress>): void {
    if (!this.state) return;

    const spec = this.state.specs.find(s => s.specId === specId);
    if (spec) {
      Object.assign(spec, update);

      // Recalculate overall progress
      const completed = this.state.specs.reduce((sum, s) => sum + s.tasksCompleted, 0);
      this.state.progress.current = completed;
      this.state.progress.percentage = this.state.progress.total > 0
        ? Math.round((completed / this.state.progress.total) * 100)
        : 0;
    }

    this.state.updatedAt = new Date().toISOString();
    this.save();
  }

  /**
   * Set current spec/task being executed
   */
  setCurrentTask(specId: string, taskIndex: number, taskDescription?: string): void {
    if (!this.state) return;

    this.state.currentSpec = {
      specId,
      taskIndex,
      taskDescription,
    };

    // Mark spec as running
    const spec = this.state.specs.find(s => s.specId === specId);
    if (spec && spec.status === 'pending') {
      spec.status = 'running';
      spec.startedAt = new Date().toISOString();
    }

    this.state.updatedAt = new Date().toISOString();
    this.save();
  }

  /**
   * Mark a task as completed
   */
  completeTask(specId: string): void {
    if (!this.state) return;

    const spec = this.state.specs.find(s => s.specId === specId);
    if (spec) {
      spec.tasksCompleted++;

      // Check if spec is fully completed
      if (spec.tasksCompleted >= spec.tasksTotal) {
        spec.status = 'completed';
        spec.completedAt = new Date().toISOString();
      }
    }

    // Recalculate overall progress
    const completed = this.state.specs.reduce((sum, s) => sum + s.tasksCompleted, 0);
    this.state.progress.current = completed;
    this.state.progress.percentage = this.state.progress.total > 0
      ? Math.round((completed / this.state.progress.total) * 100)
      : 0;

    this.state.updatedAt = new Date().toISOString();
    this.save();
  }

  /**
   * Update execution status
   */
  setStatus(status: ExecutionState['status'], error?: { message: string; code?: number }): void {
    if (!this.state) return;

    this.state.status = status;
    this.state.updatedAt = new Date().toISOString();

    if (status === 'completed' || status === 'failed' || status === 'stopped') {
      this.state.endedAt = new Date().toISOString();
    }

    if (error) {
      this.state.error = {
        ...error,
        timestamp: new Date().toISOString(),
      };
    }

    // Set resume context for paused/stopped states
    if (status === 'paused' || status === 'stopped') {
      const pendingSpecs = this.state.specs
        .filter(s => s.status === 'pending' || s.status === 'running')
        .map(s => s.specId);

      this.state.resumeContext = {
        lastCompletedTask: this.state.currentSpec?.taskDescription,
        pendingSpecs,
      };
    }

    this.save();
  }

  // ===========================================================================
  // State Persistence
  // ===========================================================================

  /**
   * Save state to disk
   */
  save(): void {
    if (!this.state) return;

    const stateDir = this.getStateDir();
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const statePath = this.getStateFilePath();
    writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Load state from disk
   */
  load(): ExecutionState | null {
    const statePath = this.getStateFilePath();

    if (!existsSync(statePath)) {
      return null;
    }

    try {
      const content = readFileSync(statePath, 'utf-8');
      this.state = JSON.parse(content) as ExecutionState;
      return this.state;
    } catch {
      return null;
    }
  }

  /**
   * Check if there is a resumable state
   */
  hasResumableState(): boolean {
    const state = this.load();
    if (!state) return false;

    return state.status === 'paused' || state.status === 'stopped';
  }

  /**
   * Get current state (in memory or loaded from disk)
   */
  getState(): ExecutionState | null {
    if (this.state) return this.state;
    return this.load();
  }

  /**
   * Clear state (delete file)
   */
  clear(): void {
    const statePath = this.getStateFilePath();
    if (existsSync(statePath)) {
      try {
        unlinkSync(statePath);
      } catch {
        // Ignore errors
      }
    }
    this.state = null;
  }

  /**
   * Reset in-memory state (without deleting file)
   */
  reset(): void {
    this.state = null;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an execution state manager for a project
 */
export function createExecutionStateManager(projectRoot: string): ExecutionStateManager {
  return new ExecutionStateManager({ projectRoot });
}

/**
 * Check if a project has resumable state
 */
export function hasResumableExecution(projectRoot: string): boolean {
  const manager = createExecutionStateManager(projectRoot);
  return manager.hasResumableState();
}

/**
 * Get resumable state for a project
 */
export function getResumableState(projectRoot: string): ExecutionState | null {
  const manager = createExecutionStateManager(projectRoot);
  const state = manager.load();

  if (!state) return null;
  if (state.status !== 'paused' && state.status !== 'stopped') return null;

  return state;
}
