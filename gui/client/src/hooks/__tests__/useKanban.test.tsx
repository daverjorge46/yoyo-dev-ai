/**
 * useKanban Hook Tests
 *
 * Tests for pagination and column state functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKanban } from '../useKanban';

// =============================================================================
// Test Utilities
// =============================================================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Mock Data
// =============================================================================

const createMockSpec = (id: number) => ({
  specId: `2026-01-${String(id).padStart(2, '0')}-spec-${id}`,
  specName: `spec-${id}`,
  groups: [
    {
      id: '1',
      title: `Task Group ${id}`,
      tasks: [
        {
          id: '1.1',
          title: `Task ${id}`,
          status: 'pending',
          column: 'backlog',
          subtasks: [],
        },
      ],
      completed: false,
    },
  ],
  totalTasks: 1,
  completedTasks: 0,
});

const createMockResponse = (
  specs: ReturnType<typeof createMockSpec>[],
  pagination: { offset: number; limit: number; total: number; hasMore: boolean }
) => ({
  specs,
  summary: {
    totalSpecs: pagination.total,
    totalTasks: pagination.total,
    completedTasks: 0,
    progress: 0,
  },
  pagination,
});

// =============================================================================
// Tests
// =============================================================================

describe('useKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial load', () => {
    it('should fetch tasks on mount', async () => {
      const mockData = createMockResponse(
        [createMockSpec(1), createMockSpec(2)],
        { offset: 0, limit: 10, total: 2, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tasks');
      expect(result.current.specs).toHaveLength(2);
    });

    it('should expose hasMore from pagination', async () => {
      const mockData = createMockResponse(
        Array.from({ length: 10 }, (_, i) => createMockSpec(i + 1)),
        { offset: 0, limit: 10, total: 15, hasMore: true }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should set hasMore to false when no more specs', async () => {
      const mockData = createMockResponse(
        [createMockSpec(1)],
        { offset: 0, limit: 10, total: 1, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('should fetch more specs when loadMore is called', async () => {
      // Initial fetch
      const initialData = createMockResponse(
        Array.from({ length: 10 }, (_, i) => createMockSpec(i + 1)),
        { offset: 0, limit: 10, total: 15, hasMore: true }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Load more fetch
      const moreData = createMockResponse(
        Array.from({ length: 5 }, (_, i) => createMockSpec(i + 11)),
        { offset: 10, limit: 10, total: 15, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(moreData),
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetch).toHaveBeenLastCalledWith('/api/tasks?offset=10');
    });

    it('should merge new specs with existing', async () => {
      // Initial fetch - 3 specs
      const initialData = createMockResponse(
        Array.from({ length: 3 }, (_, i) => createMockSpec(i + 1)),
        { offset: 0, limit: 10, total: 5, hasMore: true }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.specs).toHaveLength(3);
      });

      // Load more - 2 more specs
      const moreData = createMockResponse(
        Array.from({ length: 2 }, (_, i) => createMockSpec(i + 4)),
        { offset: 3, limit: 10, total: 5, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(moreData),
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // Should now have 5 specs total
      expect(result.current.specs).toHaveLength(5);
      expect(result.current.hasMore).toBe(false);
    });

    it('should set isLoadingMore to false after loading completes', async () => {
      const initialData = createMockResponse(
        [createMockSpec(1)],
        { offset: 0, limit: 10, total: 2, hasMore: true }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set up response for loadMore
      const moreData = createMockResponse(
        [createMockSpec(2)],
        { offset: 1, limit: 10, total: 2, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(moreData),
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // Should no longer be loading
      expect(result.current.isLoadingMore).toBe(false);
    });

    it('should not loadMore when hasMore is false', async () => {
      const mockData = createMockResponse(
        [createMockSpec(1)],
        { offset: 0, limit: 10, total: 1, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      const fetchCountBefore = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      // Should not have made another fetch
      expect(mockFetch.mock.calls.length).toBe(fetchCountBefore);
    });
  });

  describe('column state from API', () => {
    it('should use column value from API response', async () => {
      const mockData = createMockResponse(
        [
          {
            specId: '2026-01-01-test',
            specName: 'test',
            groups: [
              {
                id: '1',
                title: 'Group 1',
                tasks: [
                  { id: '1.1', title: 'Task 1', status: 'pending', column: 'in_progress', subtasks: [] },
                  { id: '1.2', title: 'Task 2', status: 'pending', column: 'review', subtasks: [] },
                  { id: '1.3', title: 'Task 3', status: 'completed', column: 'completed', subtasks: [] },
                ],
                completed: false,
              },
            ],
            totalTasks: 3,
            completedTasks: 1,
          },
        ],
        { offset: 0, limit: 10, total: 1, hasMore: false }
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useKanban(), {
        wrapper: createWrapper(),
      });

      // Wait for specs to be loaded
      await waitFor(() => {
        expect(result.current.specs).toHaveLength(1);
      });

      // Check tasks are in correct columns
      const inProgressColumn = result.current.columns.find((c) => c.id === 'in_progress');
      const reviewColumn = result.current.columns.find((c) => c.id === 'review');
      const completedColumn = result.current.columns.find((c) => c.id === 'completed');

      expect(inProgressColumn?.tasks).toHaveLength(1);
      expect(inProgressColumn?.tasks[0].title).toBe('Task 1');

      expect(reviewColumn?.tasks).toHaveLength(1);
      expect(reviewColumn?.tasks[0].title).toBe('Task 2');

      expect(completedColumn?.tasks).toHaveLength(1);
      expect(completedColumn?.tasks[0].title).toBe('Task 3');
    });
  });
});
