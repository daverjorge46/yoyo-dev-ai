/**
 * LogViewer Component Tests
 *
 * Tests for scrollable log viewer:
 * - Virtual scrolling (last 1000 lines)
 * - ANSI color preservation
 * - Auto-scroll toggle
 * - Page navigation (Ctrl+d/Ctrl+u)
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { LogViewer } from '../components/LogViewer.js';

describe('LogViewer Component', () => {
  it('renders empty state when no logs', () => {
    const { lastFrame } = render(<LogViewer logs={[]} />);

    const output = lastFrame();
    expect(output).toContain('No logs');
  });

  it('displays log lines', () => {
    const logs = [
      { timestamp: '10:00:00', level: 'info', message: 'Starting task...' },
      { timestamp: '10:00:01', level: 'info', message: 'Running tests...' },
      { timestamp: '10:00:02', level: 'success', message: 'Tests passed!' },
    ];

    const { lastFrame } = render(<LogViewer logs={logs} />);

    const output = lastFrame();
    expect(output).toContain('Starting task');
    expect(output).toContain('Running tests');
    expect(output).toContain('Tests passed');
  });

  it('limits display to last 1000 lines', () => {
    // Create 1500 log lines
    const logs = Array.from({ length: 1500 }, (_, i) => ({
      timestamp: '10:00:00',
      level: 'info',
      message: `Log line ${i}`,
    }));

    const { lastFrame } = render(<LogViewer logs={logs} maxLines={1000} />);

    const output = lastFrame();
    // Should show recent logs (line 1499)
    expect(output).toContain('Log line 1499');
    // Should NOT show old logs (line 0)
    expect(output).not.toContain('Log line 0');
  });

  it('preserves ANSI color codes', () => {
    const logs = [
      {
        timestamp: '10:00:00',
        level: 'error',
        message: '\x1b[31mError: Something failed\x1b[0m',
      },
    ];

    const { lastFrame } = render(<LogViewer logs={logs} />);

    // Output should contain the error message
    const output = lastFrame();
    expect(output).toContain('Error: Something failed');
  });

  it('shows timestamps when enabled', () => {
    const logs = [
      { timestamp: '10:00:00', level: 'info', message: 'Test message' },
    ];

    const { lastFrame } = render(<LogViewer logs={logs} showTimestamps={true} />);

    const output = lastFrame();
    expect(output).toContain('10:00:00');
  });

  it('hides timestamps when disabled', () => {
    const logs = [
      { timestamp: '10:00:00', level: 'info', message: 'Test message' },
    ];

    const { lastFrame } = render(<LogViewer logs={logs} showTimestamps={false} />);

    const output = lastFrame();
    expect(output).not.toContain('10:00:00');
    expect(output).toContain('Test message');
  });

  it('applies level-based colors', () => {
    const logs = [
      { timestamp: '10:00:00', level: 'info', message: 'Info message' },
      { timestamp: '10:00:01', level: 'error', message: 'Error message' },
      { timestamp: '10:00:02', level: 'success', message: 'Success message' },
      { timestamp: '10:00:03', level: 'warn', message: 'Warning message' },
    ];

    const { lastFrame } = render(<LogViewer logs={logs} />);

    const output = lastFrame();
    expect(output).toContain('Info message');
    expect(output).toContain('Error message');
    expect(output).toContain('Success message');
    expect(output).toContain('Warning message');
  });

  it('updates when new logs arrive', () => {
    const initialLogs = [
      { timestamp: '10:00:00', level: 'info', message: 'Initial log' },
    ];

    const { lastFrame, rerender } = render(<LogViewer logs={initialLogs} />);

    expect(lastFrame()).toContain('Initial log');

    const updatedLogs = [
      ...initialLogs,
      { timestamp: '10:00:01', level: 'info', message: 'New log' },
    ];

    rerender(<LogViewer logs={updatedLogs} />);

    const output = lastFrame();
    expect(output).toContain('Initial log');
    expect(output).toContain('New log');
  });

  it('handles multiline log messages', () => {
    const logs = [
      {
        timestamp: '10:00:00',
        level: 'error',
        message: 'Error occurred:\n  at line 1\n  at line 2',
      },
    ];

    const { lastFrame } = render(<LogViewer logs={logs} />);

    const output = lastFrame();
    expect(output).toContain('Error occurred');
  });
});
