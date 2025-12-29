/**
 * AgentProgressDashboard Component Tests
 *
 * Tests for the multi-agent overview dashboard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentProgressDashboard } from '../../components/agents/AgentProgressDashboard';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const mockAgentsResponse = {
  agents: [
    {
      id: 'agent-1',
      type: 'implementer',
      status: 'running',
      currentTask: 'Writing tests',
      startTime: Date.now() - 60000,
      endTime: null,
      progress: 45,
      logs: [{ timestamp: Date.now(), message: 'Starting', level: 'info' }],
      error: null,
      specId: 'spec-1',
      taskGroupId: 'group-1',
      duration: 60000,
    },
    {
      id: 'agent-2',
      type: 'context-fetcher',
      status: 'completed',
      currentTask: null,
      startTime: Date.now() - 120000,
      endTime: Date.now() - 60000,
      progress: 100,
      logs: [],
      error: null,
      specId: 'spec-1',
      taskGroupId: 'group-2',
      duration: 60000,
    },
    {
      id: 'agent-3',
      type: 'test-runner',
      status: 'failed',
      currentTask: null,
      startTime: Date.now() - 90000,
      endTime: Date.now() - 30000,
      progress: 75,
      logs: [],
      error: 'Tests failed',
      specId: 'spec-1',
      taskGroupId: 'group-3',
      duration: 60000,
    },
  ],
  aggregate: {
    total: 3,
    completed: 1,
    running: 1,
    failed: 1,
    percentage: 73,
  },
};

describe('AgentProgressDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgentsResponse),
    });

    // Mock WebSocket
    const mockWs = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
      send: vi.fn(),
    };
    global.WebSocket = vi.fn().mockImplementation(() => mockWs) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  describe('loading state', () => {
    it('should show loading state initially', () => {
      renderWithProvider(<AgentProgressDashboard />);

      expect(screen.getByText(/loading agents/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no agents', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            agents: [],
            aggregate: { total: 0, completed: 0, running: 0, failed: 0, percentage: 0 },
          }),
      });

      renderWithProvider(<AgentProgressDashboard showEmpty={true} />);

      await waitFor(() => {
        expect(screen.getByText('No active agents')).toBeInTheDocument();
      });
    });

    it('should render nothing when showEmpty is false and no agents', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            agents: [],
            aggregate: { total: 0, completed: 0, running: 0, failed: 0, percentage: 0 },
          }),
      });

      const { container } = renderWithProvider(
        <AgentProgressDashboard showEmpty={false} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('data display', () => {
    it('should display agent count in header', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should display aggregate stats labels', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        // Check for stat labels in the grid
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
      });
    });

    it('should display overall progress bar', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Overall Progress')).toBeInTheDocument();
        expect(screen.getByText('73%')).toBeInTheDocument();
      });
    });

    it('should render agent cards', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('implementer')).toBeInTheDocument();
        expect(screen.getByText('context-fetcher')).toBeInTheDocument();
        expect(screen.getByText('test-runner')).toBeInTheDocument();
      });
    });
  });

  describe('compact mode', () => {
    it('should render compact view', async () => {
      renderWithProvider(<AgentProgressDashboard compact />);

      await waitFor(() => {
        expect(screen.getByText('Agent Progress')).toBeInTheDocument();
        // Compact mode shows limited info
        expect(screen.getByText('3 agents')).toBeInTheDocument();
      });
    });

    it('should show only first 3 agents in compact mode', async () => {
      renderWithProvider(<AgentProgressDashboard compact />);

      await waitFor(() => {
        // In compact mode, agent types should be visible
        expect(screen.getByText('implementer')).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('should filter by status when tab is clicked', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('implementer')).toBeInTheDocument();
      });

      // Click on 'Completed' filter tab (the one with count)
      const completedTab = screen.getByRole('button', { name: /completed/i });
      fireEvent.click(completedTab);

      // Should filter to completed agents
      await waitFor(() => {
        expect(screen.getByText('context-fetcher')).toBeInTheDocument();
      });
    });

    it('should show filter tabs with counts', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        // All filter tabs should be present
        expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /running/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('should refresh on refresh button click', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Agent Progress')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should clear finished agents on button click', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAgentsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              agents: [mockAgentsResponse.agents[0]],
              aggregate: { total: 1, completed: 0, running: 1, failed: 0, percentage: 45 },
            }),
        });

      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Clear finished')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear finished'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/agents/finished', {
          method: 'DELETE',
        });
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });

      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have progress bar with proper aria attributes', async () => {
      renderWithProvider(<AgentProgressDashboard />);

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar', {
          name: /overall agent progress/i,
        });
        expect(progressBar).toHaveAttribute('aria-valuenow', '73');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      });
    });
  });
});
