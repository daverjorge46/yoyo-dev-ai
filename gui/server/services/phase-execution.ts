/**
 * Phase Execution Service
 *
 * Manages Ralph phase execution lifecycle including:
 * - Starting/stopping phase execution
 * - Pause/resume functionality
 * - Real-time progress updates via WebSocket
 * - State persistence for resumption
 */

import { spawn, type ChildProcess, type SpawnOptionsWithoutStdio } from 'child_process';
import * as path from 'path';
import { wsManager } from './websocket.js';

// =============================================================================
// Types
// =============================================================================

export type PhaseExecutionStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';

export interface PhaseItem {
  title: string;
  specExists: boolean;
  specPath: string | null;
}

export interface SpecExecutionInfo {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  hasSpec: boolean;
  hasTasks: boolean;
  specPath: string | null;
}

export interface ExecutionProgress {
  overall: number;
  currentSpec: {
    id: string;
    title: string;
    progress: number;
    currentTask?: string;
  } | null;
}

export interface ExecutionMetrics {
  startedAt: string;
  elapsedSeconds: number;
  completedTasks: number;
  totalTasks: number;
  loopCount: number;
  apiCalls: number;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LastExecution {
  phaseId: string;
  status: PhaseExecutionStatus;
  completedAt: string;
}

export interface ExecutionState {
  executionId: string | null;
  status: PhaseExecutionStatus;
  phaseId: string | null;
  phaseTitle: string | null;
  progress: ExecutionProgress;
  specs: SpecExecutionInfo[];
  metrics: ExecutionMetrics | null;
  error: string | null;
  lastExecution?: LastExecution;
}

export interface StartExecutionParams {
  phaseId: string;
  phaseTitle: string;
  phaseGoal: string;
  items: PhaseItem[];
  selectedSpecs?: string[];
  options?: {
    continueOnError?: boolean;
    dryRun?: boolean;
  };
}

export interface StartExecutionResult {
  executionId: string;
  phaseId: string;
  status: PhaseExecutionStatus;
  specsToExecute: SpecExecutionInfo[];
  estimatedItems: number;
  startedAt: string;
}

export interface PauseResult {
  executionId: string;
  status: 'paused';
  pausedAt: string;
  currentSpec: string | null;
  currentTask: string | null;
  completedSpecs: number;
  totalSpecs: number;
}

export interface ResumeResult {
  executionId: string;
  status: 'running';
  resumedAt: string;
  currentSpec: string | null;
  currentTask: string | null;
}

export interface StopResult {
  executionId: string;
  status: 'stopped';
  stoppedAt: string;
  completedSpecs: number;
  totalSpecs: number;
  statePreserved: boolean;
  resumable: boolean;
  reason?: string;
}

type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => ChildProcess;

type PromptGeneratorFn = (
  projectRoot: string,
  phaseId: string,
  phaseTitle: string,
  phaseGoal: string,
  items: string
) => Promise<void>;

interface PhaseExecutionServiceOptions {
  spawn?: SpawnFn;
  generatePrompt?: PromptGeneratorFn;
  skipPromptGeneration?: boolean;
}

// =============================================================================
// PhaseExecutionService Class
// =============================================================================

export class PhaseExecutionService {
  private projectRoot: string;
  private spawn: SpawnFn;
  private generatePrompt: PromptGeneratorFn | null;
  private skipPromptGeneration: boolean;

  // Execution state
  private executionId: string | null = null;
  private status: PhaseExecutionStatus = 'idle';
  private phaseId: string | null = null;
  private phaseTitle: string | null = null;
  private phaseGoal: string | null = null;
  private specs: SpecExecutionInfo[] = [];
  private progress: ExecutionProgress = { overall: 0, currentSpec: null };
  private startTime: Date | null = null;
  private error: string | null = null;
  private lastExecution: LastExecution | null = null;

  // Metrics
  private completedTasks = 0;
  private totalTasks = 0;
  private loopCount = 0;
  private apiCalls = 0;

  // Process management
  private ralphProcess: ChildProcess | null = null;

  // Logging
  private logs: ExecutionLog[] = [];
  private maxLogs = 1000;

  // Debouncing
  private progressDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private progressDebounceMs = 500;
  private pendingProgressUpdate: ExecutionProgress | null = null;

  constructor(projectRoot: string, options: PhaseExecutionServiceOptions = {}) {
    this.projectRoot = projectRoot;
    this.spawn = options.spawn ?? spawn;
    this.generatePrompt = options.generatePrompt ?? null;
    this.skipPromptGeneration = options.skipPromptGeneration ?? false;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Start execution of a roadmap phase
   */
  async startExecution(params: StartExecutionParams): Promise<StartExecutionResult> {
    if (this.status === 'running' || this.status === 'paused') {
      throw new Error('Another phase execution is already in progress');
    }

    // Reset state
    this.executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.status = 'running';
    this.phaseId = params.phaseId;
    this.phaseTitle = params.phaseTitle;
    this.phaseGoal = params.phaseGoal;
    this.startTime = new Date();
    this.error = null;
    this.logs = [];
    this.completedTasks = 0;
    this.totalTasks = 0;
    this.loopCount = 0;
    this.apiCalls = 0;
    this.progress = { overall: 0, currentSpec: null };

    // Filter items if selectedSpecs provided
    const itemsToExecute = params.selectedSpecs
      ? params.items.filter((item) => params.selectedSpecs!.includes(item.title))
      : params.items;

    // Convert items to spec info
    this.specs = itemsToExecute.map((item, index) => ({
      id: `spec-${index}`,
      title: item.title,
      status: 'pending' as const,
      progress: 0,
      hasSpec: item.specExists,
      hasTasks: false, // Will be updated during execution
      specPath: item.specPath,
    }));

    // Estimate total tasks (rough estimate: 5 tasks per spec)
    this.totalTasks = this.specs.length * 5;

    // Broadcast start event
    this.broadcastStarted();

    // Generate PROMPT.md and start Ralph
    await this.generatePromptAndStartRalph(params);

    return {
      executionId: this.executionId,
      phaseId: params.phaseId,
      status: 'running',
      specsToExecute: this.specs,
      estimatedItems: this.totalTasks,
      startedAt: this.startTime.toISOString(),
    };
  }

  /**
   * Pause running execution
   */
  async pause(): Promise<PauseResult> {
    if (this.status === 'idle') {
      throw new Error('No execution running');
    }

    if (this.status !== 'running') {
      throw new Error('Execution is not running');
    }

    // Send SIGTSTP to pause the process
    if (this.ralphProcess && !this.ralphProcess.killed) {
      this.ralphProcess.kill('SIGTSTP');
    }

    this.status = 'paused';
    this.addLog('Execution paused', 'info');
    this.broadcastPaused();

    return {
      executionId: this.executionId!,
      status: 'paused',
      pausedAt: new Date().toISOString(),
      currentSpec: this.progress.currentSpec?.title || null,
      currentTask: this.progress.currentSpec?.currentTask || null,
      completedSpecs: this.getCompletedSpecsCount(),
      totalSpecs: this.specs.length,
    };
  }

  /**
   * Resume paused execution
   */
  async resume(): Promise<ResumeResult> {
    if (this.status !== 'paused') {
      throw new Error('Execution is not paused');
    }

    // Send SIGCONT to resume the process
    if (this.ralphProcess && !this.ralphProcess.killed) {
      this.ralphProcess.kill('SIGCONT');
    }

    this.status = 'running';
    this.addLog('Execution resumed', 'info');
    this.broadcastResumed();

    return {
      executionId: this.executionId!,
      status: 'running',
      resumedAt: new Date().toISOString(),
      currentSpec: this.progress.currentSpec?.title || null,
      currentTask: this.progress.currentSpec?.currentTask || null,
    };
  }

  /**
   * Stop execution gracefully
   */
  async stop(reason?: string): Promise<StopResult> {
    if (this.status !== 'running' && this.status !== 'paused') {
      throw new Error('No execution to stop');
    }

    // Send SIGTERM for graceful shutdown
    if (this.ralphProcess && !this.ralphProcess.killed) {
      this.ralphProcess.kill('SIGTERM');
    }

    const completedSpecs = this.getCompletedSpecsCount();

    // Save state for later resumption
    this.saveState();

    this.status = 'stopped';
    this.addLog(`Execution stopped: ${reason || 'User requested'}`, 'info');
    this.broadcastStopped(reason);

    // Update last execution
    this.lastExecution = {
      phaseId: this.phaseId!,
      status: 'stopped',
      completedAt: new Date().toISOString(),
    };

    const result: StopResult = {
      executionId: this.executionId!,
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
      completedSpecs,
      totalSpecs: this.specs.length,
      statePreserved: true,
      resumable: true,
      reason,
    };

    // Reset to idle after returning result
    this.resetToIdle();

    return result;
  }

  /**
   * Get current execution status
   */
  getStatus(): ExecutionState {
    return {
      executionId: this.executionId,
      status: this.status,
      phaseId: this.phaseId,
      phaseTitle: this.phaseTitle,
      progress: this.progress,
      specs: this.specs,
      metrics: this.status !== 'idle' && this.startTime ? this.getMetrics() : null,
      error: this.error,
      lastExecution: this.lastExecution || undefined,
    };
  }

  /**
   * Update progress (called by Ralph output parser)
   */
  updateProgress(progress: Partial<ExecutionProgress>): void {
    if (progress.overall !== undefined) {
      this.progress.overall = progress.overall;
    }
    if (progress.currentSpec !== undefined) {
      this.progress.currentSpec = progress.currentSpec;
    }

    // Debounce broadcasts
    this.pendingProgressUpdate = { ...this.progress };
    if (!this.progressDebounceTimer) {
      this.progressDebounceTimer = setTimeout(() => {
        if (this.pendingProgressUpdate) {
          this.broadcastProgress();
        }
        this.progressDebounceTimer = null;
        this.pendingProgressUpdate = null;
      }, this.progressDebounceMs);
    }
  }

  /**
   * Mark a spec as completed
   */
  markSpecCompleted(specTitle: string): void {
    const spec = this.specs.find((s) => s.title === specTitle);
    if (spec) {
      spec.status = 'completed';
      spec.progress = 100;
      this.broadcastSpecCompleted(spec);
    }
  }

  /**
   * Add a log entry
   */
  addLog(message: string, level: ExecutionLog['level'], metadata?: Record<string, unknown>): void {
    const log: ExecutionLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };

    this.logs.push(log);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.broadcastLog(log);
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(options?: { limit?: number; offset?: number; level?: ExecutionLog['level'] }): ExecutionLog[] {
    let logs = [...this.logs];

    if (options?.level) {
      logs = logs.filter((l) => l.level === options.level);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.ralphProcess && !this.ralphProcess.killed) {
      this.ralphProcess.kill('SIGTERM');
    }
    if (this.progressDebounceTimer) {
      clearTimeout(this.progressDebounceTimer);
    }
    this.resetToIdle();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async generatePromptAndStartRalph(params: StartExecutionParams): Promise<void> {
    // Build items string for the prompt
    const itemsStr = this.specs.map((s) => `- ${s.title}`).join('\n');

    // Skip prompt generation in test mode or if custom generator provided
    if (!this.skipPromptGeneration) {
      if (this.generatePrompt) {
        // Use injected prompt generator
        await this.generatePrompt(
          this.projectRoot,
          params.phaseId,
          params.phaseTitle,
          params.phaseGoal,
          itemsStr
        );
      } else {
        // Use shell script
        const promptGeneratorPath = path.join(this.projectRoot, 'setup', 'ralph-prompt-generator.sh');
        const promptGenProcess = this.spawn(
          promptGeneratorPath,
          [
            '--command', 'execute-phase',
            '--args', JSON.stringify({
              phaseId: params.phaseId,
              phaseTitle: params.phaseTitle,
              phaseGoal: params.phaseGoal,
              items: itemsStr,
            }),
          ],
          { cwd: this.projectRoot }
        );

        await new Promise<void>((resolve, reject) => {
          promptGenProcess.on('exit', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Prompt generation failed with code ${code}`));
            }
          });
          promptGenProcess.on('error', reject);
        });
      }
    }

    // Start Ralph
    this.startRalphProcess();
  }

  private startRalphProcess(): void {
    // Start ralph with the generated PROMPT.md
    this.ralphProcess = this.spawn(
      'ralph',
      ['--monitor'],
      {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          YOYO_PROJECT_ROOT: this.projectRoot,
        },
      }
    );

    // Handle stdout
    this.ralphProcess.stdout?.on('data', (data: Buffer) => {
      this.parseRalphOutput(data.toString());
    });

    // Handle stderr
    this.ralphProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        this.addLog(message, 'error');
      }
    });

    // Handle exit
    this.ralphProcess.on('exit', (code, signal) => {
      this.handleRalphExit(code, signal);
    });

    // Handle error
    this.ralphProcess.on('error', (err) => {
      this.error = err.message;
      this.status = 'failed';
      this.broadcastFailed(err.message);
    });

    this.addLog('Ralph process started', 'info');
  }

  private parseRalphOutput(output: string): void {
    const lines = output.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      // Parse task completion
      if (line.includes('[TASK_COMPLETE]')) {
        const match = line.match(/\[TASK_COMPLETE\]\s*(.+)/);
        if (match) {
          this.completedTasks++;
          this.addLog(`Task completed: ${match[1]}`, 'info');
        }
      }

      // Parse progress
      if (line.includes('[PROGRESS]')) {
        const match = line.match(/\[PROGRESS\]\s*(\d+)%/);
        if (match) {
          this.updateProgress({ overall: parseInt(match[1], 10) });
        }
      }

      // Parse phase completion
      if (line.includes('PHASE COMPLETE:')) {
        this.handlePhaseComplete();
      }

      // Increment loop count for each substantial output
      if (line.length > 10) {
        this.loopCount++;
      }
    }
  }

  private handleRalphExit(code: number | null, signal: string | null): void {
    if (this.status === 'stopped') {
      // Already handled by stop()
      return;
    }

    if (code === 0) {
      this.handlePhaseComplete();
    } else {
      this.status = 'failed';
      this.error = `Ralph exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;
      this.addLog(this.error, 'error');
      this.broadcastFailed(this.error);
      this.lastExecution = {
        phaseId: this.phaseId!,
        status: 'failed',
        completedAt: new Date().toISOString(),
      };
      this.resetToIdle();
    }
  }

  private handlePhaseComplete(): void {
    this.status = 'completed';
    this.progress.overall = 100;

    // Mark all specs as completed
    for (const spec of this.specs) {
      spec.status = 'completed';
      spec.progress = 100;
    }

    this.addLog(`Phase completed: ${this.phaseTitle}`, 'info');
    this.broadcastCompleted();

    this.lastExecution = {
      phaseId: this.phaseId!,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    this.resetToIdle();
  }

  private getCompletedSpecsCount(): number {
    return this.specs.filter((s) => s.status === 'completed').length;
  }

  private getMetrics(): ExecutionMetrics {
    const now = new Date();
    const elapsedMs = this.startTime ? now.getTime() - this.startTime.getTime() : 0;

    return {
      startedAt: this.startTime?.toISOString() ?? now.toISOString(),
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      completedTasks: this.completedTasks,
      totalTasks: this.totalTasks,
      loopCount: this.loopCount,
      apiCalls: this.apiCalls,
    };
  }

  private saveState(): void {
    // In a real implementation, this would persist to disk
    // For now, the state is preserved in memory
    // Could save to .yoyo-dev/ralph/execution-state.json
  }

  private resetToIdle(): void {
    this.executionId = null;
    this.status = 'idle';
    this.phaseId = null;
    this.phaseTitle = null;
    this.phaseGoal = null;
    this.specs = [];
    this.progress = { overall: 0, currentSpec: null };
    this.startTime = null;
    this.error = null;
    this.ralphProcess = null;
    this.completedTasks = 0;
    this.totalTasks = 0;
    this.loopCount = 0;
    this.apiCalls = 0;
  }

  // ===========================================================================
  // WebSocket Broadcasting
  // ===========================================================================

  private broadcastStarted(): void {
    wsManager.broadcast({
      type: 'phase:execution:started' as any,
      payload: {
        data: {
          executionId: this.executionId,
          phaseId: this.phaseId,
          phaseTitle: this.phaseTitle,
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastProgress(): void {
    wsManager.broadcast({
      type: 'phase:execution:progress' as any,
      payload: {
        data: {
          overall: this.progress.overall,
          currentSpec: this.progress.currentSpec,
          completedTasks: this.completedTasks,
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastPaused(): void {
    wsManager.broadcast({
      type: 'phase:execution:paused' as any,
      payload: {
        data: {
          executionId: this.executionId,
          pausedAt: new Date().toISOString(),
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastResumed(): void {
    wsManager.broadcast({
      type: 'phase:execution:resumed' as any,
      payload: {
        data: {
          executionId: this.executionId,
          resumedAt: new Date().toISOString(),
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastStopped(reason?: string): void {
    wsManager.broadcast({
      type: 'phase:execution:stopped' as any,
      payload: {
        data: {
          executionId: this.executionId,
          stoppedAt: new Date().toISOString(),
          reason,
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastCompleted(): void {
    wsManager.broadcast({
      type: 'phase:execution:completed' as any,
      payload: {
        data: {
          phaseId: this.phaseId,
          phaseTitle: this.phaseTitle,
          duration: this.getMetrics().elapsedSeconds,
          completedSpecs: this.specs.length,
          totalTasks: this.completedTasks,
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastFailed(error: string): void {
    wsManager.broadcast({
      type: 'phase:execution:failed' as any,
      payload: {
        data: {
          executionId: this.executionId,
          error,
          failedSpec: this.progress.currentSpec?.title,
        },
        timestamp: Date.now(),
      },
    });
  }

  private broadcastLog(log: ExecutionLog): void {
    wsManager.broadcast({
      type: 'phase:execution:log' as any,
      payload: {
        data: log,
        timestamp: Date.now(),
      },
    });
  }

  private broadcastSpecCompleted(spec: SpecExecutionInfo): void {
    wsManager.broadcast({
      type: 'phase:execution:spec:completed' as any,
      payload: {
        data: {
          specId: spec.id,
          specTitle: spec.title,
        },
        timestamp: Date.now(),
      },
    });
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let phaseExecutionServiceInstance: PhaseExecutionService | null = null;

export function getPhaseExecutionService(projectRoot: string): PhaseExecutionService {
  if (!phaseExecutionServiceInstance) {
    phaseExecutionServiceInstance = new PhaseExecutionService(projectRoot);
  }
  return phaseExecutionServiceInstance;
}

export function resetPhaseExecutionService(): void {
  if (phaseExecutionServiceInstance) {
    phaseExecutionServiceInstance.cleanup();
  }
  phaseExecutionServiceInstance = null;
}
