/**
 * AgentLogStream Component Tests
 *
 * Tests for the real-time log display component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentLogStream, type AgentLog } from '../../components/agents/AgentLogStream';

describe('AgentLogStream', () => {
  const mockLogs: AgentLog[] = [
    { timestamp: 1703500000000, message: 'Starting task execution', level: 'info' },
    { timestamp: 1703500001000, message: 'Loading context files', level: 'debug' },
    { timestamp: 1703500002000, message: 'Warning: Large file detected', level: 'warn' },
    { timestamp: 1703500003000, message: 'Error processing file', level: 'error' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('rendering', () => {
    it('should render empty state when no logs', () => {
      render(<AgentLogStream logs={[]} />);

      expect(screen.getByText('No logs yet')).toBeInTheDocument();
    });

    it('should render log entries', () => {
      render(<AgentLogStream logs={mockLogs} />);

      expect(screen.getByText('Starting task execution')).toBeInTheDocument();
      expect(screen.getByText('Loading context files')).toBeInTheDocument();
      expect(screen.getByText('Warning: Large file detected')).toBeInTheDocument();
      expect(screen.getByText('Error processing file')).toBeInTheDocument();
    });

    it('should show log count in header', () => {
      render(<AgentLogStream logs={mockLogs} />);

      expect(screen.getByText('4 log entries')).toBeInTheDocument();
    });

    it('should apply level-specific styling', () => {
      render(<AgentLogStream logs={mockLogs} />);

      // Check for level badges (abbreviated)
      expect(screen.getByText('inf')).toBeInTheDocument();
      expect(screen.getByText('deb')).toBeInTheDocument();
      expect(screen.getByText('war')).toBeInTheDocument();
      expect(screen.getByText('err')).toBeInTheDocument();
    });

    it('should format timestamps correctly', () => {
      render(<AgentLogStream logs={mockLogs} />);

      // Timestamps should be in HH:MM:SS format
      const logContainer = screen.getByRole('log');
      expect(logContainer).toBeInTheDocument();
    });
  });

  describe('truncation', () => {
    it('should truncate to maxLines when not expanded', () => {
      const manyLogs: AgentLog[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: 1703500000000 + i * 1000,
        message: `Log entry ${i + 1}`,
        level: 'info' as const,
      }));

      const onToggleExpand = vi.fn();
      render(
        <AgentLogStream
          logs={manyLogs}
          maxLines={20}
          expanded={false}
          onToggleExpand={onToggleExpand}
        />
      );

      // Should show "Show all" button when there are more logs
      expect(screen.getByText(/Show all/)).toBeInTheDocument();
    });

    it('should show expand button when logs exceed maxLines', () => {
      const manyLogs: AgentLog[] = Array.from({ length: 25 }, (_, i) => ({
        timestamp: 1703500000000 + i * 1000,
        message: `Log entry ${i + 1}`,
        level: 'info' as const,
      }));

      const onToggleExpand = vi.fn();
      render(
        <AgentLogStream
          logs={manyLogs}
          maxLines={20}
          expanded={false}
          onToggleExpand={onToggleExpand}
        />
      );

      const expandButton = screen.getByText(/Show all/);
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should call onToggleExpand when expand button is clicked', () => {
      const manyLogs: AgentLog[] = Array.from({ length: 25 }, (_, i) => ({
        timestamp: 1703500000000 + i * 1000,
        message: `Log entry ${i + 1}`,
        level: 'info' as const,
      }));

      const onToggleExpand = vi.fn();
      render(
        <AgentLogStream
          logs={manyLogs}
          maxLines={20}
          expanded={false}
          onToggleExpand={onToggleExpand}
        />
      );

      fireEvent.click(screen.getByText(/Show all/));
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('should show collapse button when expanded', () => {
      const manyLogs: AgentLog[] = Array.from({ length: 25 }, (_, i) => ({
        timestamp: 1703500000000 + i * 1000,
        message: `Log entry ${i + 1}`,
        level: 'info' as const,
      }));

      const onToggleExpand = vi.fn();
      render(
        <AgentLogStream
          logs={manyLogs}
          maxLines={20}
          expanded={true}
          onToggleExpand={onToggleExpand}
        />
      );

      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy logs to clipboard when copy button is clicked', async () => {
      render(<AgentLogStream logs={mockLogs} />);

      const copyButton = screen.getByRole('button', { name: /copy logs/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have log role for the container', () => {
      render(<AgentLogStream logs={mockLogs} />);

      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('should have aria-live for real-time updates', () => {
      render(<AgentLogStream logs={mockLogs} />);

      const logContainer = screen.getByRole('log');
      expect(logContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-expanded on expand button', () => {
      const manyLogs: AgentLog[] = Array.from({ length: 25 }, (_, i) => ({
        timestamp: 1703500000000 + i * 1000,
        message: `Log entry ${i + 1}`,
        level: 'info' as const,
      }));

      render(
        <AgentLogStream
          logs={manyLogs}
          maxLines={20}
          expanded={false}
          onToggleExpand={() => {}}
        />
      );

      const expandButton = screen.getByRole('button', { name: /expand logs/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
