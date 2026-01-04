/**
 * Phase Execution Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePhaseExecutionStore } from '../phaseExecutionStore';
import { act } from '@testing-library/react';

// Reset store before each test
beforeEach(() => {
  act(() => {
    usePhaseExecutionStore.getState().reset();
  });
});

describe('usePhaseExecutionStore', () => {
  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = usePhaseExecutionStore.getState();

      expect(state.executionId).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.phaseId).toBeNull();
      expect(state.phaseTitle).toBeNull();
      expect(state.phaseGoal).toBeNull();
      expect(state.overallProgress).toBe(0);
      expect(state.currentSpec).toBeNull();
      expect(state.specs).toEqual([]);
      expect(state.logs).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.metrics).toBeNull();
    });
  });

  // ===========================================================================
  // setStarted
  // ===========================================================================

  describe('setStarted', () => {
    it('should set execution as started', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          phaseGoal: 'Build core functionality',
          specs: [
            { id: 'spec-1', title: 'User Auth', status: 'pending', progress: 0 },
            { id: 'spec-2', title: 'Settings', status: 'pending', progress: 0 },
          ],
        });
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.executionId).toBe('exec-123');
      expect(state.status).toBe('running');
      expect(state.phaseId).toBe('phase-1');
      expect(state.phaseTitle).toBe('Core Features');
      expect(state.specs).toHaveLength(2);
      expect(state.overallProgress).toBe(0);
    });

    it('should initialize metrics on start', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.metrics).not.toBeNull();
      expect(state.metrics?.startedAt).toBeDefined();
      expect(state.metrics?.elapsedSeconds).toBe(0);
      expect(state.metrics?.completedSpecs).toBe(0);
      expect(state.metrics?.totalSpecs).toBe(0);
    });
  });

  // ===========================================================================
  // updateProgress
  // ===========================================================================

  describe('updateProgress', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [
            { id: 'spec-1', title: 'Auth', status: 'pending', progress: 0 },
            { id: 'spec-2', title: 'Settings', status: 'pending', progress: 0 },
          ],
        });
      });
    });

    it('should update overall progress', () => {
      act(() => {
        usePhaseExecutionStore.getState().updateProgress({
          overallProgress: 45,
          completedSpecs: 1,
          elapsedSeconds: 300,
        });
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.overallProgress).toBe(45);
      expect(state.metrics?.completedSpecs).toBe(1);
      expect(state.metrics?.elapsedSeconds).toBe(300);
    });

    it('should update current spec', () => {
      act(() => {
        usePhaseExecutionStore.getState().updateProgress({
          overallProgress: 25,
          currentSpec: {
            id: 'spec-1',
            title: 'Auth',
            progress: 50,
            currentTask: 'task-3',
          },
        });
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.currentSpec?.id).toBe('spec-1');
      expect(state.currentSpec?.progress).toBe(50);
      expect(state.currentSpec?.currentTask).toBe('task-3');
    });

    it('should update spec status in specs array', () => {
      act(() => {
        usePhaseExecutionStore.getState().updateSpecStatus('spec-1', 'running', 30);
      });

      const state = usePhaseExecutionStore.getState();
      const spec = state.specs.find((s) => s.id === 'spec-1');
      expect(spec?.status).toBe('running');
      expect(spec?.progress).toBe(30);
    });
  });

  // ===========================================================================
  // setPaused / setResumed
  // ===========================================================================

  describe('setPaused', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });
    });

    it('should set status to paused', () => {
      act(() => {
        usePhaseExecutionStore.getState().setPaused();
      });

      expect(usePhaseExecutionStore.getState().status).toBe('paused');
    });

    it('should preserve current state when paused', () => {
      act(() => {
        usePhaseExecutionStore.getState().updateProgress({
          overallProgress: 50,
          currentSpec: { id: 'spec-1', title: 'Test', progress: 75 },
        });
        usePhaseExecutionStore.getState().setPaused();
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.overallProgress).toBe(50);
      expect(state.currentSpec?.progress).toBe(75);
    });
  });

  describe('setResumed', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
        usePhaseExecutionStore.getState().setPaused();
      });
    });

    it('should set status back to running', () => {
      act(() => {
        usePhaseExecutionStore.getState().setResumed();
      });

      expect(usePhaseExecutionStore.getState().status).toBe('running');
    });
  });

  // ===========================================================================
  // setStopped
  // ===========================================================================

  describe('setStopped', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });
    });

    it('should set status to stopped', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStopped('User cancelled');
      });

      expect(usePhaseExecutionStore.getState().status).toBe('stopped');
    });

    it('should record stop reason', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStopped('Rate limit reached');
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.metrics?.stoppedAt).toBeDefined();
      expect(state.metrics?.stopReason).toBe('Rate limit reached');
    });
  });

  // ===========================================================================
  // setCompleted
  // ===========================================================================

  describe('setCompleted', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [{ id: 'spec-1', title: 'Auth', status: 'pending', progress: 0 }],
        });
      });
    });

    it('should set status to completed', () => {
      act(() => {
        usePhaseExecutionStore.getState().setCompleted();
      });

      expect(usePhaseExecutionStore.getState().status).toBe('completed');
      expect(usePhaseExecutionStore.getState().overallProgress).toBe(100);
    });

    it('should mark all specs as completed', () => {
      act(() => {
        usePhaseExecutionStore.getState().setCompleted();
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.specs.every((s) => s.status === 'completed')).toBe(true);
    });
  });

  // ===========================================================================
  // setFailed
  // ===========================================================================

  describe('setFailed', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });
    });

    it('should set status to failed with error', () => {
      act(() => {
        usePhaseExecutionStore.getState().setFailed('Test execution failed');
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Test execution failed');
    });

    it('should record failure details', () => {
      act(() => {
        usePhaseExecutionStore.getState().setFailed('Test failure', 'spec-1', 'task-5');
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.metrics?.failedSpec).toBe('spec-1');
      expect(state.metrics?.failedTask).toBe('task-5');
    });
  });

  // ===========================================================================
  // addLog
  // ===========================================================================

  describe('addLog', () => {
    it('should add log entry', () => {
      act(() => {
        usePhaseExecutionStore.getState().addLog({
          timestamp: '2026-01-04T12:00:00Z',
          level: 'info',
          message: 'Starting execution',
        });
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].message).toBe('Starting execution');
    });

    it('should append logs in order', () => {
      act(() => {
        usePhaseExecutionStore.getState().addLog({
          timestamp: '2026-01-04T12:00:00Z',
          level: 'info',
          message: 'First',
        });
        usePhaseExecutionStore.getState().addLog({
          timestamp: '2026-01-04T12:01:00Z',
          level: 'info',
          message: 'Second',
        });
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.logs).toHaveLength(2);
      expect(state.logs[0].message).toBe('First');
      expect(state.logs[1].message).toBe('Second');
    });

    it('should limit logs to max size', () => {
      act(() => {
        // Add more than max logs (default 500)
        for (let i = 0; i < 510; i++) {
          usePhaseExecutionStore.getState().addLog({
            timestamp: '2026-01-04T12:00:00Z',
            level: 'info',
            message: `Log ${i}`,
          });
        }
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.logs.length).toBeLessThanOrEqual(500);
    });
  });

  // ===========================================================================
  // reset
  // ===========================================================================

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
        usePhaseExecutionStore.getState().addLog({
          timestamp: '2026-01-04T12:00:00Z',
          level: 'info',
          message: 'Test',
        });
        usePhaseExecutionStore.getState().reset();
      });

      const state = usePhaseExecutionStore.getState();
      expect(state.executionId).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.logs).toEqual([]);
    });
  });

  // ===========================================================================
  // Computed/Derived State
  // ===========================================================================

  describe('Computed State', () => {
    it('isRunning should be true when running', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });

      expect(usePhaseExecutionStore.getState().isRunning()).toBe(true);
    });

    it('isPaused should be true when paused', () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
        usePhaseExecutionStore.getState().setPaused();
      });

      expect(usePhaseExecutionStore.getState().isPaused()).toBe(true);
    });

    it('canPause should be true only when running', () => {
      const store = usePhaseExecutionStore.getState();

      expect(store.canPause()).toBe(false);

      act(() => {
        store.setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });

      expect(usePhaseExecutionStore.getState().canPause()).toBe(true);

      act(() => {
        usePhaseExecutionStore.getState().setPaused();
      });

      expect(usePhaseExecutionStore.getState().canPause()).toBe(false);
    });

    it('canResume should be true only when paused', () => {
      expect(usePhaseExecutionStore.getState().canResume()).toBe(false);

      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });

      expect(usePhaseExecutionStore.getState().canResume()).toBe(false);

      act(() => {
        usePhaseExecutionStore.getState().setPaused();
      });

      expect(usePhaseExecutionStore.getState().canResume()).toBe(true);
    });
  });
});
