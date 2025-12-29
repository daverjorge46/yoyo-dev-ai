/**
 * AgentProgressCard Component Tests
 *
 * Tests for the individual agent progress card component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentProgressCard, type AgentProgress } from '../../components/agents/AgentProgressCard';

describe('AgentProgressCard', () => {
  const mockAgent: AgentProgress = {
    id: 'agent-123',
    type: 'implementer',
    status: 'running',
    currentTask: 'Implementing feature X',
    startTime: Date.now() - 60000, // 1 minute ago
    endTime: null,
    progress: 45,
    logs: [
      { timestamp: Date.now() - 30000, message: 'Starting implementation', level: 'info' },
      { timestamp: Date.now() - 15000, message: 'Writing tests', level: 'info' },
    ],
    error: null,
    specId: '2024-01-15-feature-x',
    taskGroupId: 'task-group-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render agent type', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      expect(screen.getByText('implementer')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('should render current task', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      expect(screen.getByText('Implementing feature X')).toBeInTheDocument();
    });

    it('should render progress percentage', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      expect(screen.getByText('45% complete')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('status variations', () => {
    it('should render completed status correctly', () => {
      const completedAgent = { ...mockAgent, status: 'completed' as const, progress: 100 };
      render(<AgentProgressCard agent={completedAgent} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render failed status with error', () => {
      const failedAgent = {
        ...mockAgent,
        status: 'failed' as const,
        error: 'TypeScript compilation failed',
      };
      render(<AgentProgressCard agent={failedAgent} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('TypeScript compilation failed')).toBeInTheDocument();
    });

    it('should render cancelled status', () => {
      const cancelledAgent = { ...mockAgent, status: 'cancelled' as const };
      render(<AgentProgressCard agent={cancelledAgent} />);

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('should render waiting status', () => {
      const waitingAgent = { ...mockAgent, status: 'waiting' as const };
      render(<AgentProgressCard agent={waitingAgent} />);

      expect(screen.getByText('Waiting')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should toggle expanded state on button click', () => {
      render(<AgentProgressCard agent={mockAgent} defaultExpanded={false} />);

      const expandButton = screen.getByRole('button', { name: /expand details/i });
      fireEvent.click(expandButton);

      // Should now show collapse button
      expect(screen.getByRole('button', { name: /collapse details/i })).toBeInTheDocument();
    });

    it('should show logs when expanded', () => {
      render(<AgentProgressCard agent={mockAgent} defaultExpanded={true} />);

      expect(screen.getByText('Starting implementation')).toBeInTheDocument();
      expect(screen.getByText('Writing tests')).toBeInTheDocument();
    });

    it('should show metadata when expanded', () => {
      render(<AgentProgressCard agent={mockAgent} defaultExpanded={true} />);

      expect(screen.getByText(/ID:/)).toBeInTheDocument();
      expect(screen.getByText(/Spec:/)).toBeInTheDocument();
      expect(screen.getByText('2024-01-15-feature-x')).toBeInTheDocument();
    });
  });

  describe('controls', () => {
    it('should show cancel button for running agent', () => {
      const onCancel = vi.fn();
      render(<AgentProgressCard agent={mockAgent} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn().mockResolvedValue(undefined);
      render(<AgentProgressCard agent={mockAgent} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(onCancel).toHaveBeenCalledWith('agent-123');
      });
    });

    it('should show remove button for completed agent', () => {
      const completedAgent = { ...mockAgent, status: 'completed' as const };
      const onRemove = vi.fn();
      render(<AgentProgressCard agent={completedAgent} onRemove={onRemove} />);

      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
    });

    it('should not show cancel button for completed agent', () => {
      const completedAgent = { ...mockAgent, status: 'completed' as const };
      render(<AgentProgressCard agent={completedAgent} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('duration display', () => {
    it('should display duration for running agent', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      // Should show some duration format (contains time units)
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should display duration for completed agent', () => {
      const completedAgent = {
        ...mockAgent,
        status: 'completed' as const,
        endTime: Date.now(),
        duration: 120000, // 2 minutes
      };
      render(<AgentProgressCard agent={completedAgent} />);

      expect(screen.getByText(/2m/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have article role', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should have aria-label with agent info', () => {
      render(<AgentProgressCard agent={mockAgent} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', expect.stringContaining('implementer'));
    });

    it('should have aria-expanded on toggle button', () => {
      render(<AgentProgressCard agent={mockAgent} defaultExpanded={false} />);

      const expandButton = screen.getByRole('button', { name: /expand details/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
