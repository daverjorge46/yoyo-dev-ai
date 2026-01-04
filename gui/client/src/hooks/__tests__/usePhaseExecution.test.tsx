/**
 * usePhaseExecution Hook Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePhaseExecution } from '../usePhaseExecution';
import { usePhaseExecutionStore } from '../../stores/phaseExecutionStore';

// =============================================================================
// Mocks
// =============================================================================

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Reset store before each test
beforeEach(() => {
  act(() => {
    usePhaseExecutionStore.getState().reset();
  });
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('usePhaseExecution', () => {
  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('Initialization', () => {
    it('should return store state', () => {
      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.executionId).toBeNull();
      expect(result.current.isRunning).toBe(false);
    });
  });

  // ===========================================================================
  // Start Execution
  // ===========================================================================

  describe('startExecution', () => {
    it('should call API to start execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            phaseId: 'phase-1',
            status: 'running',
            specsToExecute: [{ id: 'spec-1', title: 'Auth', hasSpec: true, hasTasks: true }],
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startExecution('phase-1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/phases/phase-1/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should pass selected specs when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            phaseId: 'phase-1',
            status: 'running',
            specsToExecute: [{ id: 'auth', title: 'Auth', hasSpec: true, hasTasks: true }],
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startExecution('phase-1', ['Auth', 'Settings']);
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.selectedSpecs).toEqual(['Auth', 'Settings']);
    });

    it('should handle start execution error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Another execution in progress' }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.startExecution('phase-1');
        })
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Pause Execution
  // ===========================================================================

  describe('pauseExecution', () => {
    it('should call API to pause execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            status: 'paused',
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.pauseExecution();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/execution/pause',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  // ===========================================================================
  // Resume Execution
  // ===========================================================================

  describe('resumeExecution', () => {
    it('should call API to resume execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            status: 'running',
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resumeExecution();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/execution/resume',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  // ===========================================================================
  // Stop Execution
  // ===========================================================================

  describe('stopExecution', () => {
    it('should call API to stop execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            status: 'stopped',
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.stopExecution('User cancelled');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/execution/stop',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.reason).toBe('User cancelled');
    });
  });

  // ===========================================================================
  // Fetch Status
  // ===========================================================================

  describe('fetchStatus', () => {
    it('should fetch current execution status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            status: 'running',
            phaseId: 'phase-1',
            phaseTitle: 'Core Features',
            progress: { overall: 45 },
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchStatus();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/execution/status',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  // ===========================================================================
  // Fetch Logs
  // ===========================================================================

  describe('fetchLogs', () => {
    it('should fetch execution logs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            logs: [
              { timestamp: '2026-01-04T12:00:00Z', level: 'info', message: 'Starting' },
            ],
            total: 1,
            hasMore: false,
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/execution/logs',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should support pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            logs: [],
            total: 100,
            hasMore: true,
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.fetchLogs({ limit: 50, offset: 10 });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/execution/logs?limit=50&offset=10',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  // ===========================================================================
  // Fetch Preview
  // ===========================================================================

  describe('fetchPreview', () => {
    it('should fetch execution preview for a phase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            phaseId: 'phase-1',
            phaseTitle: 'Core Features',
            items: [
              { title: 'Auth', specExists: true, tasksExist: true, taskCount: 10 },
            ],
            estimatedSteps: 15,
          }),
      });

      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      let preview;
      await act(async () => {
        preview = await result.current.fetchPreview('phase-1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/roadmap/phases/phase-1/execution-preview',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(preview).toBeDefined();
    });
  });

  // ===========================================================================
  // Computed Properties
  // ===========================================================================

  describe('Computed Properties', () => {
    it('should provide isRunning from store', () => {
      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRunning).toBe(false);

      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('should provide canPause from store', () => {
      const { result } = renderHook(() => usePhaseExecution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.canPause).toBe(false);

      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Test',
          specs: [],
        });
      });

      expect(result.current.canPause).toBe(true);
    });
  });
});
