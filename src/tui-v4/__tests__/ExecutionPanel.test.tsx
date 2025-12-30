/**
 * ExecutionPanel Component Tests
 *
 * Tests for right panel composition:
 * - Progress bar at top
 * - Log viewer in middle
 * - Test results at bottom
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';

import { ExecutionPanel } from '../components/ExecutionPanel.js';

describe('ExecutionPanel Component', () => {
  it('renders without errors', () => {
    const { lastFrame } = render(<ExecutionPanel />);

    expect(lastFrame()).toBeTruthy();
  });

  it('shows idle state when no execution', () => {
    const { lastFrame } = render(<ExecutionPanel />);

    const output = lastFrame();
    expect(output).toContain('No active execution');
  });

  it('displays progress bar when task is running', () => {
    const { lastFrame } = render(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Running tests',
          status: 'running',
          progress: 50,
          logs: [],
        }}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Running tests');
    expect(output).toContain('50%');
  });

  it('shows logs in middle section', () => {
    const { lastFrame } = render(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Building project',
          status: 'running',
          progress: 75,
          logs: [
            { timestamp: '10:00:00', level: 'info', message: 'Compiling...' },
            { timestamp: '10:00:01', level: 'info', message: 'Bundling...' },
          ],
        }}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Compiling');
    expect(output).toContain('Bundling');
  });

  it('displays test results when available', () => {
    const { lastFrame } = render(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Running tests',
          status: 'completed',
          progress: 100,
          logs: [],
          testResults: {
            totalTests: 10,
            passedTests: 8,
            failedTests: 2,
            framework: 'vitest',
            failures: [],
          },
        }}
      />
    );

    const output = lastFrame();
    expect(output).toContain('8 passed');
    expect(output).toContain('2 failed');
  });

  it('shows success state when task completes', () => {
    const { lastFrame } = render(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Build complete',
          status: 'completed',
          progress: 100,
          logs: [],
        }}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Build complete');
  });

  it('shows error state when task fails', () => {
    const { lastFrame } = render(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Build failed',
          status: 'failed',
          progress: 45,
          logs: [
            { timestamp: '10:00:00', level: 'error', message: 'Build error occurred' },
          ],
        }}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Build failed');
    expect(output).toContain('Build error occurred');
  });

  it('updates in real-time as execution progresses', () => {
    const { lastFrame, rerender } = render(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Running tests',
          status: 'running',
          progress: 25,
          logs: [],
        }}
      />
    );

    expect(lastFrame()).toContain('25%');

    rerender(
      <ExecutionPanel
        execution={{
          taskId: '1',
          taskName: 'Running tests',
          status: 'running',
          progress: 75,
          logs: [],
        }}
      />
    );

    expect(lastFrame()).toContain('75%');
  });

  it('handles empty execution state', () => {
    const { lastFrame } = render(<ExecutionPanel execution={null} />);

    const output = lastFrame();
    expect(output).toContain('No active execution');
  });
});
