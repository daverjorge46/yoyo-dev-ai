/**
 * Crash Recovery Service
 *
 * Handles detection and recovery from Ralph process crashes:
 * - Exit handler for crash detection (non-zero exit codes)
 * - State persistence on crash
 * - WebSocket event emission
 * - Resume context preservation
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { ExecutionStateManager, type ExecutionState } from '../lib/executionState.js';
import { LogWriter, createLogWriter } from '../lib/logWriter.js';
import { wsManager } from './websocket.js';

// =============================================================================
// Types
// =============================================================================

export interface CrashInfo {
  exitCode: number | null;
  signal: string | null;
  timestamp: string;
  lastTask?: string;
  pendingSpecs: string[];
  errorMessage?: string;
}

export interface CrashRecoveryOptions {
  projectRoot: string;
  onCrash?: (info: CrashInfo) => void;
}

export interface RecoveryState {
  hasCrashState: boolean;
  crashInfo: CrashInfo | null;
  executionState: ExecutionState | null;
  canResume: boolean;
}

// =============================================================================
// CrashRecoveryService Class
// =============================================================================

export class CrashRecoveryService {
  private projectRoot: string;
  private stateManager: ExecutionStateManager;
  private onCrash?: (info: CrashInfo) => void;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: Date | null = null;

  constructor(options: CrashRecoveryOptions) {
    this.projectRoot = options.projectRoot;
    this.stateManager = new ExecutionStateManager({ projectRoot: options.projectRoot });
    this.onCrash = options.onCrash;
  }

  // ===========================================================================
  // Crash Detection
  // ===========================================================================

  /**
   * Handle process exit and detect crashes
   */
  handleProcessExit(exitCode: number | null, signal: string | null): CrashInfo | null {
    // Normal exit (code 0) is not a crash
    if (exitCode === 0) {
      return null;
    }

    // Get current state
    const state = this.stateManager.getState();
    if (!state) {
      return null;
    }

    // Create crash info
    const crashInfo: CrashInfo = {
      exitCode,
      signal,
      timestamp: new Date().toISOString(),
      lastTask: state.currentSpec?.taskDescription,
      pendingSpecs: state.specs
        .filter(s => s.status === 'pending' || s.status === 'running')
        .map(s => s.specId),
      errorMessage: this.getErrorMessage(exitCode, signal),
    };

    // Persist crash state
    this.persistCrashState(crashInfo);

    // Emit crash event
    this.emitCrashEvent(crashInfo);

    // Call crash callback if provided
    this.onCrash?.(crashInfo);

    return crashInfo;
  }

  /**
   * Get human-readable error message for exit code
   */
  private getErrorMessage(exitCode: number | null, signal: string | null): string {
    if (signal) {
      const signalMessages: Record<string, string> = {
        'SIGTERM': 'Process was terminated',
        'SIGKILL': 'Process was killed',
        'SIGINT': 'Process was interrupted',
        'SIGSEGV': 'Segmentation fault',
        'SIGABRT': 'Process aborted',
      };
      return signalMessages[signal] || `Process terminated by signal: ${signal}`;
    }

    if (exitCode !== null) {
      const codeMessages: Record<number, string> = {
        1: 'General error',
        2: 'Misuse of shell command',
        126: 'Command not executable',
        127: 'Command not found',
        128: 'Invalid exit argument',
        130: 'Script terminated by Ctrl+C',
        137: 'Process killed (SIGKILL)',
        143: 'Process terminated (SIGTERM)',
      };
      return codeMessages[exitCode] || `Process exited with code ${exitCode}`;
    }

    return 'Unknown error';
  }

  // ===========================================================================
  // State Persistence
  // ===========================================================================

  /**
   * Persist crash state for recovery
   */
  private persistCrashState(crashInfo: CrashInfo): void {
    // Update execution state with failure
    this.stateManager.setStatus('failed', {
      message: crashInfo.errorMessage || 'Process crashed unexpectedly',
      code: crashInfo.exitCode ?? undefined,
    });

    // Save crash info separately for detailed recovery
    const crashDir = join(this.projectRoot, '.yoyo-dev', 'ralph');
    if (!existsSync(crashDir)) {
      mkdirSync(crashDir, { recursive: true });
    }

    const crashFile = join(crashDir, 'last-crash.json');
    writeFileSync(crashFile, JSON.stringify(crashInfo, null, 2));
  }

  /**
   * Get crash file path
   */
  getCrashFilePath(): string {
    return join(this.projectRoot, '.yoyo-dev', 'ralph', 'last-crash.json');
  }

  /**
   * Read last crash info
   */
  getLastCrashInfo(): CrashInfo | null {
    const crashFile = this.getCrashFilePath();
    if (!existsSync(crashFile)) {
      return null;
    }

    try {
      const content = readFileSync(crashFile, 'utf-8');
      return JSON.parse(content) as CrashInfo;
    } catch {
      return null;
    }
  }

  /**
   * Clear crash state (after successful recovery)
   */
  clearCrashState(): void {
    const crashFile = this.getCrashFilePath();
    if (existsSync(crashFile)) {
      try {
        const { unlinkSync } = require('fs');
        unlinkSync(crashFile);
      } catch {
        // Ignore
      }
    }
  }

  // ===========================================================================
  // WebSocket Events
  // ===========================================================================

  /**
   * Emit crash event via WebSocket
   */
  private emitCrashEvent(crashInfo: CrashInfo): void {
    wsManager.broadcast({
      type: 'phase:execution:failed' as any,
      payload: {
        data: {
          error: crashInfo.errorMessage,
          exitCode: crashInfo.exitCode,
          signal: crashInfo.signal,
          timestamp: crashInfo.timestamp,
          resumable: true,
          pendingSpecs: crashInfo.pendingSpecs,
        },
        timestamp: Date.now(),
      },
    });
  }

  // ===========================================================================
  // Recovery State
  // ===========================================================================

  /**
   * Get recovery state information
   */
  getRecoveryState(): RecoveryState {
    const crashInfo = this.getLastCrashInfo();
    const executionState = this.stateManager.load();

    const hasCrashState = crashInfo !== null;
    const canResume = executionState !== null &&
      (executionState.status === 'failed' ||
       executionState.status === 'paused' ||
       executionState.status === 'stopped');

    return {
      hasCrashState,
      crashInfo,
      executionState,
      canResume,
    };
  }

  /**
   * Check if there's recoverable state on startup
   */
  checkStartupRecovery(): RecoveryState {
    const recovery = this.getRecoveryState();

    if (recovery.hasCrashState && recovery.canResume) {
      // Log recovery opportunity
      console.log('[CrashRecovery] Found recoverable state from previous crash');
    }

    return recovery;
  }

  // ===========================================================================
  // Heartbeat Monitoring (Optional)
  // ===========================================================================

  /**
   * Start heartbeat monitoring
   */
  startHeartbeatMonitoring(intervalMs: number = 60000): void {
    this.stopHeartbeatMonitoring();

    this.heartbeatInterval = setInterval(() => {
      this.recordHeartbeat();
    }, intervalMs);

    // Record initial heartbeat
    this.recordHeartbeat();
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Record a heartbeat
   */
  recordHeartbeat(): void {
    this.lastHeartbeat = new Date();

    const heartbeatFile = join(this.projectRoot, '.yoyo-dev', 'ralph', 'heartbeat');
    const heartbeatDir = dirname(heartbeatFile);

    if (!existsSync(heartbeatDir)) {
      mkdirSync(heartbeatDir, { recursive: true });
    }

    writeFileSync(heartbeatFile, this.lastHeartbeat.toISOString());
  }

  /**
   * Get last heartbeat time
   */
  getLastHeartbeat(): Date | null {
    const heartbeatFile = join(this.projectRoot, '.yoyo-dev', 'ralph', 'heartbeat');
    if (!existsSync(heartbeatFile)) {
      return null;
    }

    try {
      const content = readFileSync(heartbeatFile, 'utf-8');
      return new Date(content.trim());
    } catch {
      return null;
    }
  }

  /**
   * Check if heartbeat is stale (process likely dead)
   */
  isHeartbeatStale(thresholdMs: number = 120000): boolean {
    const lastHeartbeat = this.getLastHeartbeat();
    if (!lastHeartbeat) {
      return true;
    }

    const elapsed = Date.now() - lastHeartbeat.getTime();
    return elapsed > thresholdMs;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a crash recovery service for a project
 */
export function createCrashRecoveryService(projectRoot: string): CrashRecoveryService {
  return new CrashRecoveryService({ projectRoot });
}

/**
 * Check for crash recovery on server startup
 */
export function checkCrashRecoveryOnStartup(projectRoot: string): RecoveryState {
  const service = createCrashRecoveryService(projectRoot);
  return service.checkStartupRecovery();
}
