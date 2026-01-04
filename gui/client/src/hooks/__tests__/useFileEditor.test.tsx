/**
 * useFileEditor Hook Tests
 *
 * Tests for file editing hook with auto-save behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFileEditor } from '../useFileEditor.js';
import type { ReactNode } from 'react';

// =============================================================================
// Test Setup
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createFileResponse(content: string, etag = 'etag-123'): Response {
  return new Response(
    JSON.stringify({
      content,
      path: 'test.md',
      modified: new Date().toISOString(),
      etag,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function createSaveResponse(etag = 'etag-456'): Response {
  return new Response(
    JSON.stringify({
      content: 'saved content',
      path: 'test.md',
      modified: new Date().toISOString(),
      etag,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function createErrorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('useFileEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('file loading', () => {
    it('should load file content on mount', async () => {
      mockFetch.mockResolvedValueOnce(createFileResponse('# Hello World'));

      const { result } = renderHook(() => useFileEditor('test.md'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.content).toBe('# Hello World');
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should not fetch when filePath is null', () => {
      renderHook(() => useFileEditor(null), {
        wrapper: createWrapper(),
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('content editing', () => {
    it('should track unsaved changes', async () => {
      mockFetch.mockResolvedValueOnce(createFileResponse('original'));

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      expect(result.current.content).toBe('modified');
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should discard changes', async () => {
      mockFetch.mockResolvedValueOnce(createFileResponse('original'));

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      act(() => {
        result.current.discardChanges();
      });

      expect(result.current.content).toBe('original');
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('auto-save behavior', () => {
    it('should NOT auto-save when autoSave=false', async () => {
      mockFetch.mockResolvedValueOnce(createFileResponse('original'));

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Wait to ensure no auto-save happens
      await new Promise((r) => setTimeout(r, 100));

      // Should NOT have made a save request - only the initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should auto-save when autoSave=true with short delay', async () => {
      mockFetch
        .mockResolvedValueOnce(createFileResponse('original'))
        .mockResolvedValueOnce(createSaveResponse())
        .mockResolvedValueOnce(createFileResponse('modified')); // refetch after save

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: true, autoSaveDelay: 50 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      // Wait for auto-save to trigger (at least 2 calls: initial fetch + save)
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledTimes(3); // fetch + save + refetch
        },
        { timeout: 500 }
      );

      // Verify save was called with PUT
      const saveCall = mockFetch.mock.calls[1];
      expect(saveCall[1].method).toBe('PUT');
    });
  });

  describe('manual save', () => {
    it('should save manually via save()', async () => {
      mockFetch
        .mockResolvedValueOnce(createFileResponse('original'))
        .mockResolvedValueOnce(createSaveResponse())
        .mockResolvedValueOnce(createFileResponse('modified')); // refetch after save

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      await act(async () => {
        await result.current.save();
      });

      // Verify a save (PUT) was made
      const putCalls = mockFetch.mock.calls.filter(
        (call) => call[1]?.method === 'PUT'
      );
      expect(putCalls.length).toBe(1);

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(false);
      });
    });

    it('should not save when content unchanged', async () => {
      mockFetch.mockResolvedValueOnce(createFileResponse('original'));

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      await act(async () => {
        await result.current.save();
      });

      // Only initial fetch, no save
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('callbacks', () => {
    it('should call onSaveSuccess after successful save', async () => {
      const onSaveSuccess = vi.fn();
      mockFetch
        .mockResolvedValueOnce(createFileResponse('original'))
        .mockResolvedValueOnce(createSaveResponse())
        .mockResolvedValueOnce(createFileResponse('modified')); // refetch after save

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false, onSaveSuccess }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      await act(async () => {
        await result.current.save();
      });

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onSaveError on save failure', async () => {
      const onSaveError = vi.fn();
      mockFetch
        .mockResolvedValueOnce(createFileResponse('original'))
        .mockResolvedValueOnce(createErrorResponse('Save failed'));

      const { result } = renderHook(
        () => useFileEditor('test.md', { autoSave: false, onSaveError }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.content).toBe('original');
      });

      act(() => {
        result.current.setContent('modified');
      });

      await act(async () => {
        try {
          await result.current.save();
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(onSaveError).toHaveBeenCalled();
      });
    });
  });
});
