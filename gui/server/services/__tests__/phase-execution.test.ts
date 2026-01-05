/**
 * PhaseExecutionService Tests
 *
 * Tests for Ralph phase execution management.
 */

import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

// Mock WebSocket manager before importing
vi.mock('../websocket.js', () => ({
  wsManager: {
    broadcast: vi.fn(),
  },
}));

// Import after mocking
import {
  PhaseExecutionService,
  getPhaseExecutionService,
  resetPhaseExecutionService,
} from '../phase-execution.js';
import { wsManager } from '../websocket.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockChildProcess(options: {
  stdout?: string[];
  stderr?: string;
  exitCode?: number;
  delay?: number;
  stayRunning?: boolean;
}): ChildProcess {
  const process = new EventEmitter() as ChildProcess;
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();

  (process as any).stdout = stdoutEmitter;
  (process as any).stderr = stderrEmitter;
  (process as any).pid = 12345;
  (process as any).killed = false;

  (process as any).kill = vi.fn((signal?: NodeJS.Signals | number) => {
    if (signal === 'SIGTSTP') {
      // Pause signal - don't mark as killed, don't exit
      return true;
    }
    if (signal === 'SIGCONT') {
      // Resume signal - don't mark as killed, don't exit
      return true;
    }
    // SIGTERM or other - mark as killed and exit
    (process as any).killed = true;
    setTimeout(() => {
      process.emit('exit', options.exitCode ?? 0, null);
    }, 10);
    return true;
  });

  // Emit stdout data
  if (options.stdout && !options.stayRunning) {
    setTimeout(() => {
      for (const chunk of options.stdout!) {
        stdoutEmitter.emit('data', Buffer.from(chunk));
      }
      if (!options.stayRunning) {
        process.emit('exit', options.exitCode ?? 0, null);
      }
    }, options.delay ?? 10);
  }

  // Emit stderr if provided
  if (options.stderr) {
    setTimeout(() => {
      stderrEmitter.emit('data', Buffer.from(options.stderr!));
    }, options.delay ?? 10);
  }

  return process;
}

const testProjectRoot = '/tmp/test-project';

// =============================================================================
// Tests
// =============================================================================

describe('PhaseExecutionService', () => {
  let mockSpawn: Mock;
  let service: PhaseExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetPhaseExecutionService();
    mockSpawn = vi.fn();
    // Skip prompt generation and preflight validation in tests
    service = new PhaseExecutionService(testProjectRoot, {
      spawn: mockSpawn,
      skipPromptGeneration: true,
      skipPreflightValidation: true,
    });
  });

  afterEach(() => {
    // Clean up any running processes
    service.cleanup();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe('initialization', () => {
    it('should create service with project root', () => {
      expect(service).toBeDefined();
      expect(service.getStatus()).toEqual({
        executionId: null,
        status: 'idle',
        phaseId: null,
        phaseTitle: null,
        progress: { overall: 0, currentSpec: null },
        specs: [],
        metrics: null,
        error: null,
      });
    });

    it('should use singleton factory', () => {
      const service1 = getPhaseExecutionService(testProjectRoot);
      const service2 = getPhaseExecutionService(testProjectRoot);
      expect(service1).toBe(service2);
    });

    it('should reset singleton', () => {
      const service1 = getPhaseExecutionService(testProjectRoot);
      resetPhaseExecutionService();
      const service2 = getPhaseExecutionService(testProjectRoot);
      expect(service1).not.toBe(service2);
    });
  });

  // ===========================================================================
  // Start Execution Tests
  // ===========================================================================

  describe('startExecution', () => {
    it('should start phase execution and return execution state', async () => {
      const mockProcess = createMockChildProcess({
        stdout: ['Starting execution...\n', 'Task 1 complete\n'],
        exitCode: 0,
        stayRunning: true,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: 'Implement core functionality',
        items: [
          { title: 'User Auth', specExists: true, specPath: '.yoyo-dev/specs/user-auth' },
          { title: 'Settings', specExists: false, specPath: null },
        ],
      });

      expect(result.executionId).toMatch(/^exec-/);
      expect(result.phaseId).toBe('phase-1');
      expect(result.status).toBe('running');
      expect(result.specsToExecute).toHaveLength(2);
    });

    it('should skip preflight validation when skipPreflightValidation is true', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      // Service with skipPreflightValidation: true should start without running PreflightValidator
      const result = await service.startExecution({
        phaseId: 'phase-2',
        phaseTitle: 'API Layer',
        phaseGoal: 'Build REST API',
        items: [{ title: 'Endpoints', specExists: false, specPath: null }],
      });

      // Should have started successfully (skipPreflightValidation is true in test setup)
      expect(result.status).toBe('running');
      expect(result.error).toBeUndefined();
      expect(result.errorCode).toBeUndefined();
      expect(mockSpawn).toHaveBeenCalled();
    });

    it('should return error if already running', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      // Second execution should return an error result, not throw
      const result = await service.startExecution({
        phaseId: 'phase-2',
        phaseTitle: 'Another',
        phaseGoal: 'Test',
        items: [],
      });

      expect(result.status).toBe('running'); // Status is still the current running status
      expect(result.errorCode).toBe('ALREADY_RUNNING');
      expect(result.error).toContain('already');
    });

    it('should broadcast phase:execution:started event', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: 'Test',
        items: [],
      });

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:started',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              phaseId: 'phase-1',
              phaseTitle: 'Core Features',
            }),
          }),
        })
      );
    });

    it('should allow selecting specific specs', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [
          { title: 'Spec A', specExists: true, specPath: '.yoyo-dev/specs/a' },
          { title: 'Spec B', specExists: true, specPath: '.yoyo-dev/specs/b' },
          { title: 'Spec C', specExists: true, specPath: '.yoyo-dev/specs/c' },
        ],
        selectedSpecs: ['Spec A', 'Spec C'],
      });

      expect(result.specsToExecute).toHaveLength(2);
      expect(result.specsToExecute.map((s) => s.title)).toEqual(['Spec A', 'Spec C']);
    });
  });

  // ===========================================================================
  // Pause/Resume Tests
  // ===========================================================================

  describe('pause', () => {
    it('should pause running execution', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      const result = await service.pause();

      expect(result.status).toBe('paused');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTSTP');
    });

    it('should reject if not running', async () => {
      await expect(service.pause()).rejects.toThrow('No execution running');
    });

    it('should reject if already paused', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      await service.pause();

      await expect(service.pause()).rejects.toThrow('Execution is not running');
    });

    it('should broadcast phase:execution:paused event', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();
      await service.pause();

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:paused',
        })
      );
    });
  });

  describe('resume', () => {
    it('should resume paused execution', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      await service.pause();
      const result = await service.resume();

      expect(result.status).toBe('running');
      // kill should have been called twice: SIGTSTP for pause, SIGCONT for resume
      expect(mockProcess.kill).toHaveBeenNthCalledWith(1, 'SIGTSTP');
      expect(mockProcess.kill).toHaveBeenNthCalledWith(2, 'SIGCONT');
    });

    it('should reject if not paused', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      await expect(service.resume()).rejects.toThrow('Execution is not paused');
    });

    it('should broadcast phase:execution:resumed event', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      await service.pause();
      vi.clearAllMocks();
      await service.resume();

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:resumed',
        })
      );
    });
  });

  // ===========================================================================
  // Stop Tests
  // ===========================================================================

  describe('stop', () => {
    it('should stop running execution gracefully', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      const result = await service.stop('User requested');

      expect(result.status).toBe('stopped');
      expect(result.statePreserved).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should stop paused execution', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      await service.pause();
      const result = await service.stop();

      expect(result.status).toBe('stopped');
    });

    it('should reject if not running or paused', async () => {
      await expect(service.stop()).rejects.toThrow('No execution to stop');
    });

    it('should broadcast phase:execution:stopped event', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();
      await service.stop();

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:stopped',
        })
      );
    });

    it('should preserve state for later resumption', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [{ title: 'Task A', specExists: true, specPath: '.yoyo-dev/specs/a' }],
      });

      // Simulate some progress
      service.updateProgress({ overall: 50, currentSpec: { id: 'a', title: 'Task A', progress: 50 } });

      const result = await service.stop();

      expect(result.statePreserved).toBe(true);
      expect(result.resumable).toBe(true);
    });
  });

  // ===========================================================================
  // Status & Progress Tests
  // ===========================================================================

  describe('getStatus', () => {
    it('should return idle status when not running', () => {
      const status = service.getStatus();
      expect(status.status).toBe('idle');
      expect(status.executionId).toBeNull();
    });

    it('should return running status with details', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        phaseGoal: 'Test',
        items: [{ title: 'Auth', specExists: true, specPath: '.yoyo-dev/specs/auth' }],
      });

      const status = service.getStatus();

      expect(status.status).toBe('running');
      expect(status.phaseId).toBe('phase-1');
      expect(status.phaseTitle).toBe('Core Features');
      expect(status.specs).toHaveLength(1);
    });

    it('should include metrics when running', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      const status = service.getStatus();

      expect(status.metrics).not.toBeNull();
      expect(status.metrics?.startedAt).toBeDefined();
      expect(status.metrics?.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateProgress', () => {
    it('should update progress and broadcast', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();
      service.updateProgress({
        overall: 45,
        currentSpec: { id: 'auth', title: 'Authentication', progress: 30 },
      });

      const status = service.getStatus();
      expect(status.progress.overall).toBe(45);
      expect(status.progress.currentSpec?.id).toBe('auth');

      // Wait for debounce to flush
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:progress',
        })
      );
    });

    it('should debounce rapid progress updates', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        service.updateProgress({ overall: i * 10 });
      }

      // Should debounce - not broadcast every update
      // Wait for debounce to flush
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should have fewer broadcasts than updates due to debouncing
      const progressCalls = (wsManager.broadcast as Mock).mock.calls.filter(
        (call) => call[0].type === 'phase:execution:progress'
      );
      expect(progressCalls.length).toBeLessThan(10);
    });
  });

  // ===========================================================================
  // Logging Tests
  // ===========================================================================

  describe('addLog', () => {
    it('should add log entries', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      // Service adds a "Ralph process started" log automatically
      const initialLogs = service.getLogs();
      const initialCount = initialLogs.length;

      service.addLog('Starting task execution', 'info');
      service.addLog('Warning: slow operation', 'warn');
      service.addLog('Error occurred', 'error');

      const logs = service.getLogs();
      expect(logs).toHaveLength(initialCount + 3);
      // Check our added logs (skip the auto-generated one)
      expect(logs[initialCount].message).toBe('Starting task execution');
      expect(logs[initialCount + 1].level).toBe('warn');
      expect(logs[initialCount + 2].level).toBe('error');
    });

    it('should broadcast phase:execution:log events', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();
      service.addLog('Test log', 'info');

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:log',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              message: 'Test log',
              level: 'info',
            }),
          }),
        })
      );
    });

    it('should limit log size', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      // Add more than max logs
      for (let i = 0; i < 1100; i++) {
        service.addLog(`Log entry ${i}`, 'info');
      }

      const logs = service.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  // ===========================================================================
  // Ralph Output Parsing Tests
  // ===========================================================================

  describe('Ralph output parsing', () => {
    it('should parse task completion from Ralph output', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      // Manually emit stdout data to simulate Ralph output
      (mockProcess as any).stdout.emit('data', Buffer.from('[TASK_COMPLETE] Task 1.1 - Write tests\n'));

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const logs = service.getLogs();
      expect(logs.some((l) => l.message.includes('Task 1.1'))).toBe(true);
    });

    it('should detect phase completion signal', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test Phase',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();

      // Emit completion signal and exit
      (mockProcess as any).stdout.emit('data', Buffer.from('PHASE COMPLETE: Test Phase\n'));

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:completed',
        })
      );
    });

    it('should handle Ralph process failure', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      vi.clearAllMocks();

      // Emit exit with error code
      mockProcess.emit('exit', 1, null);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase:execution:failed',
        })
      );
    });
  });

  // ===========================================================================
  // State Persistence Tests
  // ===========================================================================

  describe('state persistence', () => {
    it('should save execution state on stop', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [
          { title: 'Spec A', specExists: true, specPath: '.yoyo-dev/specs/a' },
          { title: 'Spec B', specExists: true, specPath: '.yoyo-dev/specs/b' },
        ],
      });

      // Mark first spec as completed
      service.markSpecCompleted('Spec A');
      service.updateProgress({ overall: 50 });

      const result = await service.stop();

      expect(result.completedSpecs).toBe(1);
      expect(result.totalSpecs).toBe(2);
    });

    it('should return last execution info when idle', async () => {
      const mockProcess = createMockChildProcess({ stayRunning: true });
      mockSpawn.mockReturnValue(mockProcess);

      await service.startExecution({
        phaseId: 'phase-1',
        phaseTitle: 'Test',
        phaseGoal: 'Test',
        items: [],
      });

      // Emit completion signal
      (mockProcess as any).stdout.emit('data', Buffer.from('PHASE COMPLETE: Test\n'));

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 50));

      const status = service.getStatus();
      expect(status.status).toBe('idle');
      expect(status.lastExecution).toBeDefined();
      expect(status.lastExecution?.phaseId).toBe('phase-1');
      expect(status.lastExecution?.status).toBe('completed');
    });
  });
});
