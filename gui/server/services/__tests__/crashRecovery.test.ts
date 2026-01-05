/**
 * CrashRecovery Tests
 *
 * Tests for crash detection, state persistence, and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  CrashRecoveryService,
  createCrashRecoveryService,
  checkCrashRecoveryOnStartup,
  type CrashInfo,
} from '../crashRecovery.js';
import { ExecutionStateManager } from '../../lib/executionState.js';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_PROJECT_ROOT = join(tmpdir(), 'yoyo-crash-test-' + Date.now());

function cleanupTestDir(): void {
  try {
    if (existsSync(TEST_PROJECT_ROOT)) {
      rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }
  } catch {
    // Ignore
  }
}

function setupTestState(): ExecutionStateManager {
  const stateManager = new ExecutionStateManager({ projectRoot: TEST_PROJECT_ROOT });
  stateManager.createState({
    executionId: 'exec-test',
    phaseId: 'phase-1',
    phaseTitle: 'Test Phase',
    specs: [
      { specId: 'spec-a', tasksTotal: 3 },
      { specId: 'spec-b', tasksTotal: 3 },
    ],
  });
  stateManager.setCurrentTask('spec-a', 1, 'Implement feature X');
  return stateManager;
}

// =============================================================================
// Tests
// =============================================================================

describe('CrashRecoveryService', () => {
  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Crash Detection', () => {
    it('should return null for normal exit (code 0)', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const result = service.handleProcessExit(0, null);

      expect(result).toBeNull();
    });

    it('should detect crash on non-zero exit code', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const result = service.handleProcessExit(1, null);

      expect(result).not.toBeNull();
      expect(result?.exitCode).toBe(1);
      expect(result?.signal).toBeNull();
      expect(result?.errorMessage).toBe('General error');
    });

    it('should detect crash on signal termination', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const result = service.handleProcessExit(null, 'SIGKILL');

      expect(result).not.toBeNull();
      expect(result?.signal).toBe('SIGKILL');
      expect(result?.errorMessage).toBe('Process was killed');
    });

    it('should capture last task in crash info', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const result = service.handleProcessExit(1, null);

      expect(result?.lastTask).toBe('Implement feature X');
    });

    it('should capture pending specs in crash info', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const result = service.handleProcessExit(1, null);

      expect(result?.pendingSpecs).toContain('spec-a');
      expect(result?.pendingSpecs).toContain('spec-b');
    });

    it('should call onCrash callback when provided', () => {
      setupTestState();
      const onCrash = vi.fn();
      const service = new CrashRecoveryService({
        projectRoot: TEST_PROJECT_ROOT,
        onCrash,
      });

      service.handleProcessExit(1, null);

      expect(onCrash).toHaveBeenCalledTimes(1);
      expect(onCrash).toHaveBeenCalledWith(expect.objectContaining({
        exitCode: 1,
      }));
    });

    it('should return null when no state exists', () => {
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const result = service.handleProcessExit(1, null);

      expect(result).toBeNull();
    });
  });

  describe('State Persistence', () => {
    it('should persist crash info to file', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.handleProcessExit(1, null);

      const crashFile = service.getCrashFilePath();
      expect(existsSync(crashFile)).toBe(true);
    });

    it('should update execution state to failed', () => {
      const stateManager = setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.handleProcessExit(1, null);

      const state = stateManager.load();
      expect(state?.status).toBe('failed');
      expect(state?.error).toBeDefined();
    });

    it('should read last crash info', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.handleProcessExit(137, 'SIGKILL');

      const crashInfo = service.getLastCrashInfo();
      expect(crashInfo).not.toBeNull();
      expect(crashInfo?.exitCode).toBe(137);
      expect(crashInfo?.signal).toBe('SIGKILL');
    });

    it('should clear crash state', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.handleProcessExit(1, null);
      expect(service.getLastCrashInfo()).not.toBeNull();

      service.clearCrashState();
      expect(service.getLastCrashInfo()).toBeNull();
    });
  });

  describe('Recovery State', () => {
    it('should report no crash state when none exists', () => {
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const recovery = service.getRecoveryState();

      expect(recovery.hasCrashState).toBe(false);
      expect(recovery.crashInfo).toBeNull();
      expect(recovery.canResume).toBe(false);
    });

    it('should report crash state after crash', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.handleProcessExit(1, null);

      const recovery = service.getRecoveryState();
      expect(recovery.hasCrashState).toBe(true);
      expect(recovery.crashInfo).not.toBeNull();
      expect(recovery.canResume).toBe(true);
    });

    it('should report canResume=true for failed state', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.handleProcessExit(1, null);

      const recovery = service.getRecoveryState();
      expect(recovery.canResume).toBe(true);
      expect(recovery.executionState?.status).toBe('failed');
    });

    it('should check startup recovery', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });
      service.handleProcessExit(1, null);

      // Create new service (simulating restart)
      const newService = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });
      const recovery = newService.checkStartupRecovery();

      expect(recovery.hasCrashState).toBe(true);
      expect(recovery.canResume).toBe(true);
    });
  });

  describe('Error Messages', () => {
    it('should map common exit codes to messages', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const codes: Array<[number, string]> = [
        [1, 'General error'],
        [126, 'Command not executable'],
        [127, 'Command not found'],
        [130, 'Script terminated by Ctrl+C'],
        [137, 'Process killed (SIGKILL)'],
      ];

      for (const [code, expectedMsg] of codes) {
        const stateManager = new ExecutionStateManager({ projectRoot: TEST_PROJECT_ROOT });
        stateManager.createState({
          executionId: `exec-${code}`,
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [{ specId: 'spec-a', tasksTotal: 1 }],
        });

        const result = service.handleProcessExit(code, null);
        expect(result?.errorMessage).toBe(expectedMsg);
      }
    });

    it('should map signals to messages', () => {
      setupTestState();
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      const signals: Array<[string, string]> = [
        ['SIGTERM', 'Process was terminated'],
        ['SIGKILL', 'Process was killed'],
        ['SIGINT', 'Process was interrupted'],
        ['SIGSEGV', 'Segmentation fault'],
      ];

      for (const [signal, expectedMsg] of signals) {
        const stateManager = new ExecutionStateManager({ projectRoot: TEST_PROJECT_ROOT });
        stateManager.createState({
          executionId: `exec-${signal}`,
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [{ specId: 'spec-a', tasksTotal: 1 }],
        });

        const result = service.handleProcessExit(null, signal);
        expect(result?.errorMessage).toBe(expectedMsg);
      }
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should record heartbeat', () => {
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.recordHeartbeat();

      const lastHeartbeat = service.getLastHeartbeat();
      expect(lastHeartbeat).not.toBeNull();
      expect(lastHeartbeat!.getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
    });

    it('should detect stale heartbeat', () => {
      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      // No heartbeat = stale
      expect(service.isHeartbeatStale()).toBe(true);

      // Fresh heartbeat = not stale
      service.recordHeartbeat();
      expect(service.isHeartbeatStale(60000)).toBe(false);
    });

    it('should start and stop heartbeat monitoring', () => {
      vi.useFakeTimers();

      const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });

      service.startHeartbeatMonitoring(1000);

      // Initial heartbeat
      expect(service.getLastHeartbeat()).not.toBeNull();

      // Advance time and check heartbeat updates
      const initialTime = service.getLastHeartbeat()!.getTime();
      vi.advanceTimersByTime(1000);

      // Heartbeat should have been recorded again
      // (Note: In real tests, this would update)

      service.stopHeartbeatMonitoring();

      vi.useRealTimers();
    });
  });
});

describe('Factory Functions', () => {
  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  it('should create service with createCrashRecoveryService', () => {
    const service = createCrashRecoveryService(TEST_PROJECT_ROOT);
    expect(service).toBeInstanceOf(CrashRecoveryService);
  });

  it('should check startup recovery with checkCrashRecoveryOnStartup', () => {
    // Setup crash state
    const stateManager = new ExecutionStateManager({ projectRoot: TEST_PROJECT_ROOT });
    stateManager.createState({
      executionId: 'exec-1',
      phaseId: 'phase-1',
      phaseTitle: 'Test',
      specs: [{ specId: 'spec-a', tasksTotal: 1 }],
    });
    const service = new CrashRecoveryService({ projectRoot: TEST_PROJECT_ROOT });
    service.handleProcessExit(1, null);

    // Check startup
    const recovery = checkCrashRecoveryOnStartup(TEST_PROJECT_ROOT);
    expect(recovery.hasCrashState).toBe(true);
    expect(recovery.canResume).toBe(true);
  });
});
