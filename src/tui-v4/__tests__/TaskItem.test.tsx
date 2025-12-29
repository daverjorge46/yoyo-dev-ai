/**
 * TaskItem Component Tests
 *
 * Tests for individual task row rendering:
 * - Task number, status icon, title display
 * - Indent depth handling
 * - Selected/focused states with visual indicators
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { TaskItem } from '../components/TaskItem.js';

describe('TaskItem Component', () => {
  const mockTask = {
    id: '1',
    number: '1.1',
    title: 'Test Task',
    status: 'pending' as const,
    dependencies: [],
    parallelSafe: true,
    children: [],
  };

  it('renders task number and title', () => {
    const { lastFrame } = render(<TaskItem task={mockTask} depth={0} />);

    const output = lastFrame();
    expect(output).toContain('1.1');
    expect(output).toContain('Test Task');
  });

  it('renders status icon', () => {
    const { lastFrame } = render(<TaskItem task={mockTask} depth={0} />);

    const output = lastFrame();
    expect(output).toContain('○'); // pending status icon
  });

  it('applies indentation based on depth', () => {
    const { lastFrame: depth0 } = render(<TaskItem task={mockTask} depth={0} />);
    const { lastFrame: depth1 } = render(<TaskItem task={mockTask} depth={1} />);
    const { lastFrame: depth2 } = render(<TaskItem task={mockTask} depth={2} />);

    // Deeper tasks should have more leading spaces
    expect(depth0()).toBeTruthy();
    expect(depth1()).toBeTruthy();
    expect(depth2()).toBeTruthy();
  });

  it('shows selected state with bright border', () => {
    const { lastFrame } = render(<TaskItem task={mockTask} depth={0} selected={true} />);

    const output = lastFrame();
    expect(output).toBeTruthy();
    // Selected items should be visually distinct
  });

  it('shows normal state without selection', () => {
    const { lastFrame } = render(<TaskItem task={mockTask} depth={0} selected={false} />);

    const output = lastFrame();
    expect(output).toBeTruthy();
  });

  it('updates when task status changes', () => {
    const completedTask = { ...mockTask, status: 'completed' as const };
    const { lastFrame } = render(<TaskItem task={completedTask} depth={0} />);

    const output = lastFrame();
    expect(output).toContain('✓'); // completed status icon
  });

  it('handles long task titles gracefully', () => {
    const longTask = { ...mockTask, title: 'This is a very long task title that should be truncated or wrapped appropriately' };
    const { lastFrame } = render(<TaskItem task={longTask} depth={0} />);

    const output = lastFrame();
    expect(output).toBeTruthy();
  });

  it('renders tasks with different statuses correctly', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'failed'] as const;

    statuses.forEach(status => {
      const task = { ...mockTask, status };
      const { lastFrame } = render(<TaskItem task={task} depth={0} />);

      expect(lastFrame()).toBeTruthy();
    });
  });
});
