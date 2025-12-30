/**
 * TaskPanel Component Tests
 *
 * Tests for left panel composition:
 * - SpecIndicator at top
 * - TaskTree in scrollable middle
 * - MCP/memory status footer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

import { TaskPanel } from '../components/TaskPanel.js';
import { useAppStore } from '../backend/state-manager.js';

describe('TaskPanel Component', () => {
  beforeEach(() => {
    useAppStore.setState({
      tasks: [],
      specs: [],
      activeSpec: null,
      mcp: { serverCount: 0, connected: false },
      memory: { blockCount: 0, lastUpdated: null },
    });
  });

  it('renders without errors', () => {
    const { lastFrame } = render(<TaskPanel />);

    expect(lastFrame()).toBeTruthy();
  });

  it('displays spec indicator when active spec exists', () => {
    useAppStore.setState({
      activeSpec: {
        path: '.yoyo-dev/specs/2025-12-29-test-spec',
        name: 'test-spec',
        created: '2025-12-29',
        phase: 'implementation',
        tasksCreated: '2025-12-29',
      },
    });

    const { lastFrame } = render(<TaskPanel />);

    const output = lastFrame();
    expect(output).toContain('test-spec');
  });

  it('displays task tree', () => {
    useAppStore.setState({
      tasks: [
        {
          id: '1',
          number: '1',
          title: 'Test Task',
          status: 'pending' as const,
          dependencies: [],
          parallelSafe: true,
          children: [],
        },
      ],
    });

    const { lastFrame } = render(<TaskPanel />);

    const output = lastFrame();
    expect(output).toContain('Test Task');
  });

  it('displays MCP server count', () => {
    useAppStore.setState({
      mcp: { serverCount: 3, connected: true },
    });

    const { lastFrame } = render(<TaskPanel />);

    const output = lastFrame();
    expect(output).toContain('3');
  });

  it('displays memory block count', () => {
    useAppStore.setState({
      memory: { blockCount: 5, lastUpdated: '2025-12-29' },
    });

    const { lastFrame } = render(<TaskPanel />);

    const output = lastFrame();
    expect(output).toContain('5');
  });

  it('shows placeholder when no tasks', () => {
    const { lastFrame } = render(<TaskPanel />);

    const output = lastFrame();
    expect(output).toContain('No tasks');
  });

  it('updates when state changes', () => {
    const { lastFrame, rerender } = render(<TaskPanel />);

    // Initially no tasks
    expect(lastFrame()).toContain('No tasks');

    // Update with tasks
    useAppStore.setState({
      tasks: [
        {
          id: '1',
          number: '1',
          title: 'New Task',
          status: 'pending' as const,
          dependencies: [],
          parallelSafe: true,
          children: [],
        },
      ],
    });

    rerender(<TaskPanel />);

    expect(lastFrame()).toContain('New Task');
  });
});
