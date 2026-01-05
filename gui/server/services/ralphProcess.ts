/**
 * Ralph Process Manager
 *
 * Manages Ralph process lifecycle with:
 * - Lock file for single-execution enforcement
 * - PID file for process tracking
 * - Stale lock detection
 * - Orphan process cleanup
 */

import { spawn, type ChildProcess, type SpawnOptionsWithoutStdio } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface LockFileContent {
  pid: number;
  startedAt: string;
  phaseId: string;
  projectPath: string;
  executionId: string;
}

export interface RalphProcessOptions {
  projectRoot: string;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onExit?: (code: number | null, signal: string | null) => void;
  onError?: (error: Error) => void;
}

export interface StartOptions {
  phaseId: string;
  executionId: string;
  monitor?: boolean;
  force?: boolean;
}

export type RalphProcessStatus = 'idle' | 'running' | 'stopping';

// =============================================================================
// RalphProcess Class
// =============================================================================

export class RalphProcess {
  private projectRoot: string;
  private process: ChildProcess | null = null;
  private status: RalphProcessStatus = 'idle';
  private currentExecutionId: string | null = null;
  private currentPhaseId: string | null = null;

  // Callbacks
  private onStdout?: (data: string) => void;
  private onStderr?: (data: string) => void;
  private onExit?: (code: number | null, signal: string | null) => void;
  private onError?: (error: Error) => void;

  constructor(options: RalphProcessOptions) {
    this.projectRoot = options.projectRoot;
    this.onStdout = options.onStdout;
    this.onStderr = options.onStderr;
    this.onExit = options.onExit;
    this.onError = options.onError;
  }

  // ===========================================================================
  // Path Helpers
  // ===========================================================================

  /**
   * Generate a unique hash for the project path
   */
  private getProjectHash(): string {
    return createHash('md5').update(this.projectRoot).digest('hex').substring(0, 12);
  }

  /**
   * Get lock file path
   */
  getLockFilePath(): string {
    return `/tmp/yoyo-ralph-${this.getProjectHash()}.lock`;
  }

  /**
   * Get PID file path
   */
  getPidFilePath(): string {
    return `/tmp/yoyo-ralph-${this.getProjectHash()}.pid`;
  }

  /**
   * Get state file path for persistence
   */
  getStateFilePath(): string {
    return join(this.projectRoot, '.yoyo-dev', 'ralph', 'execution-state.json');
  }

  // ===========================================================================
  // Lock File Management
  // ===========================================================================

  /**
   * Check if lock file exists and is valid
   */
  isLocked(): boolean {
    const lockPath = this.getLockFilePath();
    if (!existsSync(lockPath)) {
      return false;
    }

    try {
      const content = this.readLockFile();
      if (!content) {
        return false;
      }

      // Check if process is still running
      if (!this.isProcessRunning(content.pid)) {
        // Stale lock - clean up
        this.cleanupLockFiles();
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read lock file content
   */
  readLockFile(): LockFileContent | null {
    const lockPath = this.getLockFilePath();
    if (!existsSync(lockPath)) {
      return null;
    }

    try {
      const content = readFileSync(lockPath, 'utf-8');
      return JSON.parse(content) as LockFileContent;
    } catch {
      return null;
    }
  }

  /**
   * Create lock file
   */
  private createLockFile(options: StartOptions): void {
    const lockPath = this.getLockFilePath();
    const content: LockFileContent = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      phaseId: options.phaseId,
      projectPath: this.projectRoot,
      executionId: options.executionId,
    };

    writeFileSync(lockPath, JSON.stringify(content, null, 2));
  }

  /**
   * Create PID file
   */
  private createPidFile(pid: number): void {
    const pidPath = this.getPidFilePath();
    writeFileSync(pidPath, String(pid));
  }

  /**
   * Update PID file with actual Ralph process PID
   */
  private updatePidFile(pid: number): void {
    const pidPath = this.getPidFilePath();
    writeFileSync(pidPath, String(pid));
  }

  /**
   * Clean up lock and PID files
   */
  cleanupLockFiles(): void {
    const lockPath = this.getLockFilePath();
    const pidPath = this.getPidFilePath();

    try {
      if (existsSync(lockPath)) {
        unlinkSync(lockPath);
      }
    } catch {
      // Ignore errors
    }

    try {
      if (existsSync(pidPath)) {
        unlinkSync(pidPath);
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if a process with given PID is running
   */
  isProcessRunning(pid: number): boolean {
    try {
      // kill(pid, 0) doesn't kill the process, just checks if it exists
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Orphan Detection and Cleanup
  // ===========================================================================

  /**
   * Check for and clean up orphaned processes
   * Call this on server startup
   */
  cleanupOrphanedProcesses(): { wasOrphaned: boolean; previousState: LockFileContent | null } {
    const lockContent = this.readLockFile();

    if (!lockContent) {
      return { wasOrphaned: false, previousState: null };
    }

    const pidPath = this.getPidFilePath();
    let ralphPid: number | null = null;

    if (existsSync(pidPath)) {
      try {
        ralphPid = parseInt(readFileSync(pidPath, 'utf-8'), 10);
      } catch {
        // Ignore
      }
    }

    // Check if the Ralph process is still running
    const processRunning = ralphPid ? this.isProcessRunning(ralphPid) : false;

    if (processRunning) {
      // Process still running - not orphaned, just reconnecting
      return { wasOrphaned: false, previousState: lockContent };
    }

    // Orphaned lock file - process is dead but lock exists
    this.cleanupLockFiles();
    return { wasOrphaned: true, previousState: lockContent };
  }

  // ===========================================================================
  // Process Lifecycle
  // ===========================================================================

  /**
   * Start Ralph process
   */
  async start(options: StartOptions): Promise<{ pid: number }> {
    // Check for existing lock
    if (this.isLocked() && !options.force) {
      const lockContent = this.readLockFile();
      throw new Error(
        `Another Ralph execution is already running for phase ${lockContent?.phaseId}. ` +
        `Use force=true to override.`
      );
    }

    // Clean up any stale locks
    if (options.force) {
      this.cleanupLockFiles();
    }

    // Create lock file first (with our PID temporarily)
    this.createLockFile(options);
    this.createPidFile(process.pid);

    try {
      // Spawn Ralph process
      const args = options.monitor ? ['--monitor'] : [];

      this.process = spawn('ralph', args, {
        cwd: this.projectRoot,
        env: {
          ...process.env,
          YOYO_PROJECT_ROOT: this.projectRoot,
        },
      });

      if (!this.process.pid) {
        throw new Error('Failed to start Ralph process - no PID assigned');
      }

      // Update PID file with actual Ralph PID
      this.updatePidFile(this.process.pid);

      // Update lock file with actual Ralph PID
      const lockPath = this.getLockFilePath();
      const lockContent = this.readLockFile();
      if (lockContent) {
        lockContent.pid = this.process.pid;
        writeFileSync(lockPath, JSON.stringify(lockContent, null, 2));
      }

      // Set up event handlers
      this.status = 'running';
      this.currentExecutionId = options.executionId;
      this.currentPhaseId = options.phaseId;

      this.process.stdout?.on('data', (data: Buffer) => {
        this.onStdout?.(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.onStderr?.(data.toString());
      });

      this.process.on('exit', (code, signal) => {
        this.handleExit(code, signal);
      });

      this.process.on('error', (error) => {
        this.handleError(error);
      });

      return { pid: this.process.pid };
    } catch (error) {
      // Clean up on failure
      this.cleanupLockFiles();
      this.status = 'idle';
      throw error;
    }
  }

  /**
   * Pause Ralph process (SIGTSTP)
   */
  pause(): boolean {
    if (!this.process || this.status !== 'running') {
      return false;
    }

    try {
      this.process.kill('SIGTSTP');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resume Ralph process (SIGCONT)
   */
  resume(): boolean {
    if (!this.process) {
      return false;
    }

    try {
      this.process.kill('SIGCONT');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop Ralph process gracefully (SIGTERM)
   */
  stop(): boolean {
    if (!this.process) {
      return false;
    }

    try {
      this.status = 'stopping';
      this.process.kill('SIGTERM');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Force kill Ralph process (SIGKILL)
   */
  forceKill(): boolean {
    if (!this.process) {
      return false;
    }

    try {
      this.process.kill('SIGKILL');
      this.cleanupLockFiles();
      this.status = 'idle';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle process exit
   */
  private handleExit(code: number | null, signal: string | null): void {
    this.cleanupLockFiles();
    this.status = 'idle';
    this.process = null;
    this.onExit?.(code, signal);
  }

  /**
   * Handle process error
   */
  private handleError(error: Error): void {
    this.cleanupLockFiles();
    this.status = 'idle';
    this.process = null;
    this.onError?.(error);
  }

  // ===========================================================================
  // Status Getters
  // ===========================================================================

  getStatus(): RalphProcessStatus {
    return this.status;
  }

  getPid(): number | null {
    return this.process?.pid ?? null;
  }

  getCurrentExecutionId(): string | null {
    return this.currentExecutionId;
  }

  getCurrentPhaseId(): string | null {
    return this.currentPhaseId;
  }

  isRunning(): boolean {
    return this.status === 'running' && this.process !== null;
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let ralphProcessInstance: RalphProcess | null = null;

export function getRalphProcess(options: RalphProcessOptions): RalphProcess {
  if (!ralphProcessInstance) {
    ralphProcessInstance = new RalphProcess(options);
  }
  return ralphProcessInstance;
}

export function resetRalphProcess(): void {
  if (ralphProcessInstance) {
    ralphProcessInstance.forceKill();
  }
  ralphProcessInstance = null;
}
