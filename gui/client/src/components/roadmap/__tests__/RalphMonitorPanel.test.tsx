/**
 * RalphMonitorPanel Component Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { RalphMonitorPanel } from '../RalphMonitorPanel';
import { usePhaseExecutionStore } from '../../../stores/phaseExecutionStore';

// =============================================================================
// Mocks
// =============================================================================

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useWebSocket hook
vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: 'connected',
    send: vi.fn(),
    reconnect: vi.fn(),
    clientId: 'test-client-1',
    lastHeartbeat: Date.now(),
    isHeartbeatStale: false,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({
        children,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        ...props
      }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

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
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('RalphMonitorPanel', () => {
  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('Rendering', () => {
    it('should not render when not open', () => {
      render(
        <RalphMonitorPanel
          isOpen={false}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByTestId('ralph-monitor-panel')).not.toBeInTheDocument();
    });

    it('should render panel when open', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('ralph-monitor-panel')).toBeInTheDocument();
    });

    it('should display phase title', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Core Features')).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={onClose}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Idle State
  // ===========================================================================

  describe('Idle State', () => {
    it('should show start button when idle', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });

    it('should not show pause/stop buttons when idle', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Running State
  // ===========================================================================

  describe('Running State', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [
            { id: 'spec-1', title: 'Auth', status: 'pending', progress: 0 },
            { id: 'spec-2', title: 'Settings', status: 'pending', progress: 0 },
          ],
        });
      });
    });

    it('should show pause and stop buttons when running', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    it('should not show start button when running', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    });

    it('should display specs list', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Auth')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      act(() => {
        usePhaseExecutionStore.getState().updateProgress({
          overallProgress: 45,
        });
      });

      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Paused State
  // ===========================================================================

  describe('Paused State', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [],
        });
        usePhaseExecutionStore.getState().setPaused();
      });
    });

    it('should show resume button when paused', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });

    it('should show paused status', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/paused/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Completed State
  // ===========================================================================

  describe('Completed State', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [{ id: 'spec-1', title: 'Auth', status: 'pending', progress: 0 }],
        });
        usePhaseExecutionStore.getState().setCompleted();
      });
    });

    it('should show completed status', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('should show 100% progress', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      // Check for 100% in the progress bar - multiple elements can have 100%
      expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Failed State
  // ===========================================================================

  describe('Failed State', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [],
        });
        usePhaseExecutionStore.getState().setFailed('Test execution failed');
      });
    });

    it('should show error message', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/test execution failed/i)).toBeInTheDocument();
    });

    it('should show retry button', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Logs Display
  // ===========================================================================

  describe('Logs Display', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [],
        });
        usePhaseExecutionStore.getState().addLog({
          timestamp: '2026-01-04T12:00:00Z',
          level: 'info',
          message: 'Starting execution',
        });
        usePhaseExecutionStore.getState().addLog({
          timestamp: '2026-01-04T12:01:00Z',
          level: 'error',
          message: 'Something went wrong',
        });
      });
    });

    it('should display logs', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Starting execution')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Starting State
  // ===========================================================================

  describe('Starting State', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarting({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          phaseGoal: 'Build core',
        });
      });
    });

    it('should show starting status badge', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });

    it('should show validating message instead of buttons', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('starting-indicator')).toBeInTheDocument();
      expect(screen.getByText('Validating prerequisites...')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Connection Indicator
  // ===========================================================================

  describe('Connection Indicator', () => {
    it('should show connection indicator', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Alert
  // ===========================================================================

  describe('Error Alert', () => {
    beforeEach(() => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [],
        });
        usePhaseExecutionStore.getState().setFailed('Ralph not found', 'spec-1', 'task-1');
      });
    });

    it('should display error alert with message', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
      expect(screen.getByText('Ralph not found')).toBeInTheDocument();
    });

    it('should show copy error button', () => {
      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('copy-error-button')).toBeInTheDocument();
      expect(screen.getByText('Copy Error Details')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Control Actions
  // ===========================================================================

  describe('Control Actions', () => {
    it('should call start execution API when start clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            executionId: 'exec-123',
            phaseId: 'phase-1',
            status: 'running',
            specsToExecute: [],
          }),
      });

      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button', { name: /start/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/roadmap/phases/phase-1/execute',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should call pause API when pause clicked', async () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [],
        });
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ executionId: 'exec-123', status: 'paused' }),
      });

      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button', { name: /pause/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/roadmap/execution/pause',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should call stop API when stop clicked', async () => {
      act(() => {
        usePhaseExecutionStore.getState().setStarted({
          executionId: 'exec-123',
          phaseId: 'phase-1',
          phaseTitle: 'Core Features',
          specs: [],
        });
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ executionId: 'exec-123', status: 'stopped' }),
      });

      render(
        <RalphMonitorPanel
          isOpen={true}
          onClose={() => {}}
          phaseId="phase-1"
          phaseTitle="Core Features"
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button', { name: /stop/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/roadmap/execution/stop',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });
});
