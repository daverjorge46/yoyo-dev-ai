/**
 * ExecutionState Tests
 *
 * Tests for execution state persistence and resume functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ExecutionStateManager,
  createExecutionStateManager,
  hasResumableExecution,
  getResumableState,
  type ExecutionState,
} from '../executionState.js';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_PROJECT_ROOT = join(tmpdir(), 'yoyo-state-test-' + Date.now());

function createTestManager(): ExecutionStateManager {
  return new ExecutionStateManager({ projectRoot: TEST_PROJECT_ROOT });
}

function cleanupTestDir(): void {
  try {
    if (existsSync(TEST_PROJECT_ROOT)) {
      rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }
  } catch {
    // Ignore
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('ExecutionStateManager', () => {
  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Path Helpers', () => {
    it('should generate correct state file path', () => {
      const manager = createTestManager();
      const path = manager.getStateFilePath();

      expect(path).toContain(TEST_PROJECT_ROOT);
      expect(path).toContain('.yoyo-dev');
      expect(path).toContain('ralph');
      expect(path).toMatch(/execution-state\.json$/);
    });
  });

  describe('State Creation', () => {
    it('should create initial state with correct structure', () => {
      const manager = createTestManager();

      const state = manager.createState({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1: Foundation',
        specs: [
          { specId: 'user-auth', tasksTotal: 5 },
          { specId: 'api-routes', tasksTotal: 3 },
        ],
      });

      expect(state.executionId).toBe('exec-123');
      expect(state.phaseId).toBe('phase-1');
      expect(state.phaseTitle).toBe('Phase 1: Foundation');
      expect(state.status).toBe('running');
      expect(state.progress.total).toBe(8);
      expect(state.progress.current).toBe(0);
      expect(state.progress.percentage).toBe(0);
      expect(state.specs).toHaveLength(2);
      expect(state.specs[0].status).toBe('pending');
    });

    it('should persist state to disk on creation', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-456',
        phaseId: 'phase-2',
        phaseTitle: 'Phase 2',
        specs: [{ specId: 'spec-1', tasksTotal: 3 }],
      });

      expect(existsSync(manager.getStateFilePath())).toBe(true);
    });
  });

  describe('State Updates', () => {
    it('should update spec progress', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-1',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 4 }],
      });

      manager.updateSpecProgress('spec-a', {
        status: 'running',
        tasksCompleted: 2,
      });

      const state = manager.getState();
      expect(state?.specs[0].status).toBe('running');
      expect(state?.specs[0].tasksCompleted).toBe(2);
      expect(state?.progress.current).toBe(2);
      expect(state?.progress.percentage).toBe(50);
    });

    it('should set current task', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-1',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 4 }],
      });

      manager.setCurrentTask('spec-a', 2, 'Implement auth middleware');

      const state = manager.getState();
      expect(state?.currentSpec?.specId).toBe('spec-a');
      expect(state?.currentSpec?.taskIndex).toBe(2);
      expect(state?.currentSpec?.taskDescription).toBe('Implement auth middleware');
      expect(state?.specs[0].status).toBe('running');
    });

    it('should complete task and recalculate progress', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-1',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [
          { specId: 'spec-a', tasksTotal: 2 },
          { specId: 'spec-b', tasksTotal: 2 },
        ],
      });

      manager.completeTask('spec-a');
      manager.completeTask('spec-a');

      const state = manager.getState();
      expect(state?.specs[0].tasksCompleted).toBe(2);
      expect(state?.specs[0].status).toBe('completed');
      expect(state?.progress.current).toBe(2);
      expect(state?.progress.percentage).toBe(50);
    });

    it('should update status with error', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-1',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 4 }],
      });

      manager.setStatus('failed', { message: 'Task failed', code: 1 });

      const state = manager.getState();
      expect(state?.status).toBe('failed');
      expect(state?.error?.message).toBe('Task failed');
      expect(state?.error?.code).toBe(1);
      expect(state?.endedAt).toBeDefined();
    });

    it('should set resume context when paused', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-1',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [
          { specId: 'spec-a', tasksTotal: 2 },
          { specId: 'spec-b', tasksTotal: 2 },
        ],
      });

      // Complete first spec
      manager.completeTask('spec-a');
      manager.completeTask('spec-a');

      // Start second spec
      manager.setCurrentTask('spec-b', 0, 'First task of spec-b');

      // Pause
      manager.setStatus('paused');

      const state = manager.getState();
      expect(state?.status).toBe('paused');
      expect(state?.resumeContext?.pendingSpecs).toContain('spec-b');
      expect(state?.resumeContext?.lastCompletedTask).toBe('First task of spec-b');
    });
  });

  describe('State Persistence', () => {
    it('should load state from disk', () => {
      const manager1 = createTestManager();

      manager1.createState({
        executionId: 'exec-load',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 3 }],
      });

      manager1.completeTask('spec-a');

      // Create new manager and load
      const manager2 = createTestManager();
      const loaded = manager2.load();

      expect(loaded?.executionId).toBe('exec-load');
      expect(loaded?.specs[0].tasksCompleted).toBe(1);
    });

    it('should return null when no state file exists', () => {
      const manager = createTestManager();
      const state = manager.load();

      expect(state).toBeNull();
    });

    it('should clear state file', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-clear',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 3 }],
      });

      expect(existsSync(manager.getStateFilePath())).toBe(true);

      manager.clear();

      expect(existsSync(manager.getStateFilePath())).toBe(false);
      expect(manager.getState()).toBeNull();
    });
  });

  describe('Resume Detection', () => {
    it('should detect resumable paused state', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-resume',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 3 }],
      });

      manager.setStatus('paused');

      expect(manager.hasResumableState()).toBe(true);
    });

    it('should detect resumable stopped state', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-resume',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 3 }],
      });

      manager.setStatus('stopped');

      expect(manager.hasResumableState()).toBe(true);
    });

    it('should not detect completed state as resumable', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-done',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 1 }],
      });

      manager.completeTask('spec-a');
      manager.setStatus('completed');

      expect(manager.hasResumableState()).toBe(false);
    });

    it('should not detect running state as resumable', () => {
      const manager = createTestManager();

      manager.createState({
        executionId: 'exec-running',
        phaseId: 'phase-1',
        phaseTitle: 'Phase 1',
        specs: [{ specId: 'spec-a', tasksTotal: 3 }],
      });

      // Status is 'running' by default
      expect(manager.hasResumableState()).toBe(false);
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

  it('should create manager with createExecutionStateManager', () => {
    const manager = createExecutionStateManager(TEST_PROJECT_ROOT);
    expect(manager).toBeInstanceOf(ExecutionStateManager);
  });

  it('should check resumable execution with hasResumableExecution', () => {
    // No state file
    expect(hasResumableExecution(TEST_PROJECT_ROOT)).toBe(false);

    // Create paused state
    const manager = createExecutionStateManager(TEST_PROJECT_ROOT);
    manager.createState({
      executionId: 'exec-1',
      phaseId: 'phase-1',
      phaseTitle: 'Phase 1',
      specs: [{ specId: 'spec-a', tasksTotal: 3 }],
    });
    manager.setStatus('paused');

    expect(hasResumableExecution(TEST_PROJECT_ROOT)).toBe(true);
  });

  it('should get resumable state with getResumableState', () => {
    // No state file
    expect(getResumableState(TEST_PROJECT_ROOT)).toBeNull();

    // Create stopped state
    const manager = createExecutionStateManager(TEST_PROJECT_ROOT);
    manager.createState({
      executionId: 'exec-1',
      phaseId: 'phase-1',
      phaseTitle: 'Phase 1',
      specs: [{ specId: 'spec-a', tasksTotal: 3 }],
    });
    manager.setStatus('stopped');

    const state = getResumableState(TEST_PROJECT_ROOT);
    expect(state).not.toBeNull();
    expect(state?.status).toBe('stopped');
  });

  it('should return null for non-resumable states', () => {
    const manager = createExecutionStateManager(TEST_PROJECT_ROOT);
    manager.createState({
      executionId: 'exec-1',
      phaseId: 'phase-1',
      phaseTitle: 'Phase 1',
      specs: [{ specId: 'spec-a', tasksTotal: 3 }],
    });
    // Running state is not resumable
    expect(getResumableState(TEST_PROJECT_ROOT)).toBeNull();

    // Completed state is not resumable
    manager.setStatus('completed');
    expect(getResumableState(TEST_PROJECT_ROOT)).toBeNull();
  });
});
