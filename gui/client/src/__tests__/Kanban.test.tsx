/**
 * Kanban Component Tests
 *
 * Tests for KanbanBoard, KanbanColumn, and KanbanTaskCard components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndContext } from '@dnd-kit/core';
import { KanbanTaskCard } from '../components/kanban/KanbanTaskCard';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import type { KanbanTask, KanbanColumn as KanbanColumnType } from '../hooks/useKanban';

// =============================================================================
// Test Utilities
// =============================================================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createQueryClient();
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DndContext>
          {children}
        </DndContext>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Mock task data
const mockTask: KanbanTask = {
  id: 'task-1',
  groupId: '1',
  taskIndex: 1,
  specId: '2025-01-01-test-spec',
  specName: 'test-spec',
  title: 'Implement feature X',
  status: 'pending',
  column: 'backlog',
  subtasks: ['Subtask 1', 'Subtask 2'],
  subtaskCount: 2,
  completedSubtasks: 0,
  progress: 0,
};

const mockColumn: KanbanColumnType = {
  id: 'backlog',
  title: 'Backlog',
  tasks: [mockTask],
  color: 'gray',
};

// =============================================================================
// KanbanTaskCard Tests
// =============================================================================

describe('KanbanTaskCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render task title', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
    });

    it('should render spec name', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText('test-spec')).toBeInTheDocument();
    });

    it('should render subtask count', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByText(/2 subtasks/i)).toBeInTheDocument();
    });

    it('should render progress indicator when task has progress', () => {
      const taskWithProgress = { ...mockTask, progress: 50, completedSubtasks: 1 };
      render(
        <TestWrapper>
          <KanbanTaskCard task={taskWithProgress} onClick={mockOnClick} />
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show completed status for completed tasks', () => {
      const completedTask = { ...mockTask, status: 'completed' as const, column: 'completed' as const, progress: 100 };
      render(
        <TestWrapper>
          <KanbanTaskCard task={completedTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      const card = screen.getByTestId('kanban-task-card');
      expect(card).toHaveClass('border-green-200');
    });
  });

  describe('interactions', () => {
    it('should call onClick when card is clicked', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('kanban-task-card'));
      expect(mockOnClick).toHaveBeenCalledWith(mockTask);
    });

    it('should have draggable attributes', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      const card = screen.getByTestId('kanban-task-card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      const card = screen.getByTestId('kanban-task-card');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Implement feature X'));
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <KanbanTaskCard task={mockTask} onClick={mockOnClick} />
        </TestWrapper>
      );

      const card = screen.getByTestId('kanban-task-card');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith(mockTask);
    });
  });
});

// =============================================================================
// KanbanColumn Tests
// =============================================================================

describe('KanbanColumn', () => {
  const mockOnTaskClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render column title', () => {
      render(
        <TestWrapper>
          <KanbanColumn column={mockColumn} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Backlog')).toBeInTheDocument();
    });

    it('should render task count badge', () => {
      render(
        <TestWrapper>
          <KanbanColumn column={mockColumn} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render all tasks in column', () => {
      const columnWithMultipleTasks: KanbanColumnType = {
        ...mockColumn,
        tasks: [
          mockTask,
          { ...mockTask, id: 'task-2', title: 'Second task' },
        ],
      };

      render(
        <TestWrapper>
          <KanbanColumn column={columnWithMultipleTasks} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('Second task')).toBeInTheDocument();
    });

    it('should show empty state when no tasks', () => {
      const emptyColumn: KanbanColumnType = { ...mockColumn, tasks: [] };

      render(
        <TestWrapper>
          <KanbanColumn column={emptyColumn} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply column color styling', () => {
      render(
        <TestWrapper>
          <KanbanColumn column={mockColumn} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      const header = screen.getByTestId('kanban-column-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper role', () => {
      render(
        <TestWrapper>
          <KanbanColumn column={mockColumn} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      const column = screen.getByTestId('kanban-column');
      expect(column).toHaveAttribute('role', 'region');
    });

    it('should have aria-label with column name', () => {
      render(
        <TestWrapper>
          <KanbanColumn column={mockColumn} onTaskClick={mockOnTaskClick} />
        </TestWrapper>
      );

      const column = screen.getByTestId('kanban-column');
      expect(column).toHaveAttribute('aria-label', 'Backlog column with 1 tasks');
    });
  });
});

// =============================================================================
// KanbanBoard Tests
// =============================================================================

describe('KanbanBoard', () => {
  const mockColumns: KanbanColumnType[] = [
    { id: 'backlog', title: 'Backlog', tasks: [mockTask], color: 'gray' },
    { id: 'in_progress', title: 'In Progress', tasks: [], color: 'blue' },
    { id: 'review', title: 'Review', tasks: [], color: 'purple' },
    { id: 'completed', title: 'Completed', tasks: [], color: 'green' },
  ];

  const mockOnTaskClick = vi.fn();
  const mockOnTaskMove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all four columns', () => {
      render(
        <TestWrapper>
          <KanbanBoard
            columns={mockColumns}
            onTaskClick={mockOnTaskClick}
            onTaskMove={mockOnTaskMove}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Backlog')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <TestWrapper>
          <KanbanBoard
            columns={mockColumns}
            onTaskClick={mockOnTaskClick}
            onTaskMove={mockOnTaskMove}
            isLoading={true}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('kanban-loading')).toBeInTheDocument();
    });

    it('should render empty state when no columns', () => {
      render(
        <TestWrapper>
          <KanbanBoard
            columns={[]}
            onTaskClick={mockOnTaskClick}
            onTaskMove={mockOnTaskMove}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should use grid layout for columns', () => {
      render(
        <TestWrapper>
          <KanbanBoard
            columns={mockColumns}
            onTaskClick={mockOnTaskClick}
            onTaskMove={mockOnTaskMove}
          />
        </TestWrapper>
      );

      const board = screen.getByTestId('kanban-board');
      expect(board).toHaveClass('grid');
    });
  });

  describe('accessibility', () => {
    it('should have proper role for the board', () => {
      render(
        <TestWrapper>
          <KanbanBoard
            columns={mockColumns}
            onTaskClick={mockOnTaskClick}
            onTaskMove={mockOnTaskMove}
          />
        </TestWrapper>
      );

      const board = screen.getByTestId('kanban-board');
      expect(board).toHaveAttribute('role', 'application');
    });

    it('should have aria-label describing the board', () => {
      render(
        <TestWrapper>
          <KanbanBoard
            columns={mockColumns}
            onTaskClick={mockOnTaskClick}
            onTaskMove={mockOnTaskMove}
          />
        </TestWrapper>
      );

      const board = screen.getByTestId('kanban-board');
      expect(board).toHaveAttribute('aria-label', 'Kanban board with 4 columns');
    });
  });
});
