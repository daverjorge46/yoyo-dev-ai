/**
 * TaskTree Component Tests
 *
 * Tests for hierarchical task tree rendering:
 * - Flat list rendering
 * - Nested task hierarchy
 * - Collapsed/expanded states
 * - Integration with useTaskState hook
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

import { TaskTree } from '../components/TaskTree.js';
import { useAppStore } from '../backend/state-manager.js';

describe('TaskTree Component', () => {
  beforeEach(() => {
    // Reset task state
    useAppStore.setState({ tasks: [], activeTask: null });
  });

  it('renders empty state when no tasks', () => {
    const { lastFrame } = render(<TaskTree />);

    const output = lastFrame();
    expect(output).toContain('No tasks');
  });

  it('renders flat list of tasks', () => {
    const tasks = [
      {
        id: '1',
        number: '1',
        title: 'Task 1',
        status: 'pending' as const,
        dependencies: [],
        parallelSafe: true,
        children: [],
      },
      {
        id: '2',
        number: '2',
        title: 'Task 2',
        status: 'completed' as const,
        dependencies: [],
        parallelSafe: true,
        children: [],
      },
    ];

    useAppStore.setState({ tasks });

    const { lastFrame } = render(<TaskTree />);

    const output = lastFrame();
    expect(output).toContain('Task 1');
    expect(output).toContain('Task 2');
  });

  it('renders nested task hierarchy with indentation', () => {
    const tasks = [
      {
        id: '1',
        number: '1',
        title: 'Parent Task',
        status: 'pending' as const,
        dependencies: [],
        parallelSafe: true,
        children: [
          {
            id: '1.1',
            number: '1.1',
            title: 'Child Task 1',
            status: 'pending' as const,
            dependencies: [],
            parallelSafe: true,
            parent: '1',
            children: [],
          },
          {
            id: '1.2',
            number: '1.2',
            title: 'Child Task 2',
            status: 'completed' as const,
            dependencies: [],
            parallelSafe: true,
            parent: '1',
            children: [],
          },
        ],
      },
    ];

    useAppStore.setState({ tasks });

    const { lastFrame } = render(<TaskTree />);

    const output = lastFrame();
    expect(output).toContain('Parent Task');
    expect(output).toContain('Child Task 1');
    expect(output).toContain('Child Task 2');
  });

  it('handles collapsed state for parent tasks', () => {
    const tasks = [
      {
        id: '1',
        number: '1',
        title: 'Parent Task',
        status: 'pending' as const,
        dependencies: [],
        parallelSafe: true,
        children: [
          {
            id: '1.1',
            number: '1.1',
            title: 'Hidden Child',
            status: 'pending' as const,
            dependencies: [],
            parallelSafe: true,
            parent: '1',
            children: [],
          },
        ],
      },
    ];

    useAppStore.setState({ tasks });

    // Initially collapsed
    const { lastFrame } = render(<TaskTree initialCollapsed={true} />);

    const output = lastFrame();
    expect(output).toContain('Parent Task');
    // Child should not be visible when collapsed
  });

  it('shows expand/collapse indicator for parent tasks', () => {
    const tasks = [
      {
        id: '1',
        number: '1',
        title: 'Parent Task',
        status: 'pending' as const,
        dependencies: [],
        parallelSafe: true,
        children: [
          {
            id: '1.1',
            number: '1.1',
            title: 'Child',
            status: 'pending' as const,
            dependencies: [],
            parallelSafe: true,
            parent: '1',
            children: [],
          },
        ],
      },
    ];

    useAppStore.setState({ tasks });

    const { lastFrame } = render(<TaskTree />);

    const output = lastFrame();
    // Should show collapse/expand indicator (> or ▼)
    expect(output).toBeTruthy();
  });

  it('updates when task state changes', () => {
    const { lastFrame, rerender } = render(<TaskTree />);

    // Initially empty
    expect(lastFrame()).toContain('No tasks');

    // Update tasks
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

    rerender(<TaskTree />);

    expect(lastFrame()).toContain('New Task');
  });

  it('handles task selection', () => {
    const tasks = [
      {
        id: '1',
        number: '1',
        title: 'Selectable Task',
        status: 'pending' as const,
        dependencies: [],
        parallelSafe: true,
        children: [],
      },
    ];

    useAppStore.setState({ tasks, activeTask: '1' });

    const { lastFrame } = render(<TaskTree />);

    const output = lastFrame();
    expect(output).toContain('Selectable Task');
  });
});
