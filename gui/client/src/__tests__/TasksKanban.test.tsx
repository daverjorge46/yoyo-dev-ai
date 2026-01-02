/**
 * TasksKanban Page Tests
 *
 * Tests for pagination UI: Load More button and spec count display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TasksKanban from '../pages/TasksKanban';
import { type KanbanColumn, type KanbanTask } from '../hooks/useKanban';

// =============================================================================
// Mocks
// =============================================================================

// Mock useKanban hook
const mockUseKanban = vi.fn();
vi.mock('../hooks/useKanban', () => ({
  useKanban: () => mockUseKanban(),
}));

// Mock usePanelLayoutContext
vi.mock('../components/layout', () => ({
  usePanelLayoutContext: () => ({
    setDetailContent: vi.fn(),
    setDetailOpen: vi.fn(),
  }),
}));

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

// Mock task data
const createMockTask = (id: number): KanbanTask => ({
  id: `task-${id}`,
  groupId: '1',
  taskIndex: id,
  specId: `2026-01-0${id}-test-spec`,
  specName: `test-spec-${id}`,
  title: `Implement feature ${id}`,
  status: 'pending',
  column: 'backlog',
  subtasks: [],
  subtaskCount: 0,
  completedSubtasks: 0,
  progress: 0,
});

const createMockColumns = (taskCount: number): KanbanColumn[] => {
  const tasks = Array.from({ length: taskCount }, (_, i) => createMockTask(i + 1));
  return [
    { id: 'backlog', title: 'Backlog', tasks, color: 'gray' },
    { id: 'in_progress', title: 'In Progress', tasks: [], color: 'blue' },
    { id: 'review', title: 'Review', tasks: [], color: 'purple' },
    { id: 'completed', title: 'Completed', tasks: [], color: 'green' },
  ];
};

const createDefaultMockReturn = (overrides: Partial<ReturnType<typeof mockUseKanban>> = {}) => ({
  columns: createMockColumns(5),
  specs: Array.from({ length: 5 }, (_, i) => ({ id: `spec-${i + 1}`, name: `Spec ${i + 1}` })),
  specFilter: '',
  setSpecFilter: vi.fn(),
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  loadMore: vi.fn(),
  totalSpecs: 5,
  error: null,
  moveTask: vi.fn(),
  selectedTask: null,
  setSelectedTask: vi.fn(),
  focusedTaskId: null,
  setFocusedTaskId: vi.fn(),
  navigateNext: vi.fn(),
  navigatePrev: vi.fn(),
  navigateNextColumn: vi.fn(),
  navigatePrevColumn: vi.fn(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('TasksKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKanban.mockReturnValue(createDefaultMockReturn());
  });

  describe('Load More button', () => {
    it('should show Load More button when hasMore is true', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          hasMore: true,
          totalSpecs: 15,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('should NOT show Load More button when hasMore is false', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          hasMore: false,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });

    it('should call loadMore when Load More button is clicked', async () => {
      const mockLoadMore = vi.fn();
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          hasMore: true,
          loadMore: mockLoadMore,
          totalSpecs: 15,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /load more/i });
      fireEvent.click(button);

      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should show loading spinner when isLoadingMore is true', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          hasMore: true,
          isLoadingMore: true,
          totalSpecs: 15,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      expect(screen.getByTestId('load-more-spinner')).toBeInTheDocument();
    });

    it('should disable Load More button when isLoadingMore is true', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          hasMore: true,
          isLoadingMore: true,
          totalSpecs: 15,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /loading/i });
      expect(button).toBeDisabled();
    });

    it('should NOT show Load More button during initial loading', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          isLoading: true,
          hasMore: true,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });
  });

  describe('Spec count indicator', () => {
    it('should show "Showing X of Y specs" when more specs available', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          specs: Array.from({ length: 5 }, (_, i) => ({ id: `spec-${i + 1}`, name: `Spec ${i + 1}` })),
          hasMore: true,
          totalSpecs: 15,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      // Check spec count element contains the expected text
      const specCount = screen.getByTestId('spec-count');
      expect(specCount).toHaveTextContent('Showing');
      expect(specCount).toHaveTextContent('5');
      expect(specCount).toHaveTextContent('of');
      expect(specCount).toHaveTextContent('15');
      expect(specCount).toHaveTextContent('specs');
    });

    it('should show total spec count when all specs loaded', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          specs: Array.from({ length: 5 }, (_, i) => ({ id: `spec-${i + 1}`, name: `Spec ${i + 1}` })),
          hasMore: false,
          totalSpecs: 5,
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      // When all specs loaded, should just show "X specs" (no "of Y")
      const specCount = screen.getByTestId('spec-count');
      expect(specCount).toHaveTextContent('5');
      expect(specCount).toHaveTextContent('specs');
      // Should NOT show "Showing" or "of" when all are loaded
      expect(specCount).not.toHaveTextContent('Showing');
      expect(specCount).not.toHaveTextContent('of');
    });

    it('should NOT show spec count during loading', () => {
      mockUseKanban.mockReturnValue(
        createDefaultMockReturn({
          isLoading: true,
          columns: [],
        })
      );

      render(
        <TestWrapper>
          <TasksKanban />
        </TestWrapper>
      );

      // Footer is hidden during loading
      expect(screen.queryByTestId('spec-count')).not.toBeInTheDocument();
    });
  });
});
