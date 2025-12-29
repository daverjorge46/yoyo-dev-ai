/**
 * AgentControls Component Tests
 *
 * Tests for agent start/stop/cancel controls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentControls } from '../../components/agents/AgentControls';

describe('AgentControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render cancel button for running agent', () => {
      const onCancel = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="running" onCancel={onCancel} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render cancel button for waiting agent', () => {
      const onCancel = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="waiting" onCancel={onCancel} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render remove button for completed agent', () => {
      const onRemove = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="completed" onRemove={onRemove} />
      );

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should render remove button for failed agent', () => {
      const onRemove = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="failed" onRemove={onRemove} />
      );

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should render remove button for cancelled agent', () => {
      const onRemove = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="cancelled" onRemove={onRemove} />
      );

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should render nothing when no applicable actions', () => {
      const { container } = render(
        <AgentControls agentId="agent-123" status="completed" />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('compact mode', () => {
    it('should render compact buttons in compact mode', () => {
      const onCancel = vi.fn();
      render(
        <AgentControls
          agentId="agent-123"
          status="running"
          onCancel={onCancel}
          compact
        />
      );

      // Compact mode should still have buttons but without text labels
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should render full buttons in non-compact mode', () => {
      const onCancel = vi.fn();
      render(
        <AgentControls
          agentId="agent-123"
          status="running"
          onCancel={onCancel}
          compact={false}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onCancel with agent ID when cancel button clicked', async () => {
      const onCancel = vi.fn().mockResolvedValue(undefined);
      render(
        <AgentControls agentId="agent-123" status="running" onCancel={onCancel} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(onCancel).toHaveBeenCalledWith('agent-123');
      });
    });

    it('should call onRemove with agent ID when remove button clicked', async () => {
      const onRemove = vi.fn().mockResolvedValue(undefined);
      render(
        <AgentControls agentId="agent-123" status="completed" onRemove={onRemove} />
      );

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(onRemove).toHaveBeenCalledWith('agent-123');
      });
    });

    it('should disable button while action is in progress', async () => {
      let resolveCancel: () => void;
      const onCancel = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveCancel = resolve;
        })
      );

      render(
        <AgentControls agentId="agent-123" status="running" onCancel={onCancel} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Button should be disabled while cancelling
      expect(cancelButton).toBeDisabled();

      // Resolve the promise
      resolveCancel!();

      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle cancel error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onCancel = vi.fn().mockRejectedValue(new Error('Cancel failed'));

      render(
        <AgentControls agentId="agent-123" status="running" onCancel={onCancel} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to cancel agent:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle remove error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onRemove = vi.fn().mockRejectedValue(new Error('Remove failed'));

      render(
        <AgentControls agentId="agent-123" status="completed" onRemove={onRemove} />
      );

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to remove agent:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on cancel button', () => {
      const onCancel = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="running" onCancel={onCancel} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel agent/i });
      expect(cancelButton).toHaveAttribute('aria-label');
    });

    it('should have aria-label on remove button', () => {
      const onRemove = vi.fn();
      render(
        <AgentControls agentId="agent-123" status="completed" onRemove={onRemove} />
      );

      const removeButton = screen.getByRole('button', { name: /remove agent/i });
      expect(removeButton).toHaveAttribute('aria-label');
    });
  });
});
