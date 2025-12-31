/**
 * useChat Hook Tests
 *
 * Tests for chat hook with Claude Code CLI SSE streaming.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChat } from '../useChat.js';
import type { ReactNode } from 'react';

// =============================================================================
// Test Setup
// =============================================================================

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Create wrapper with QueryClient
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

// Helper to create SSE stream response
function createSSEResponse(chunks: string[], done = true): Response {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (chunkIndex < chunks.length) {
        const chunk = chunks[chunkIndex];
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        chunkIndex++;
      } else if (done) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// Helper to create error response
function createErrorResponse(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('useChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Default: status available
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/status')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ available: true, version: '2.0.76 (Claude Code)' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      return Promise.resolve(createSSEResponse([]));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Availability Status', () => {
    it('should check Claude availability on mount', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isCheckingAvailability).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat/status');
      expect(result.current.isAvailable).toBe(true);
      expect(result.current.claudeVersion).toBe('2.0.76 (Claude Code)');
    });

    it('should report unavailable when Claude is not installed', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                available: false,
                error: 'Claude Code CLI not found. Install from https://claude.ai/download',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(createSSEResponse([]));
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isCheckingAvailability).toBe(false);
      });

      expect(result.current.isAvailable).toBe(false);
      expect(result.current.availabilityError).toContain('not found');
    });

    it('should handle status check network errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(createSSEResponse([]));
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isCheckingAvailability).toBe(false);
        },
        { timeout: 3000 }
      );

      expect(result.current.isAvailable).toBe(false);
      expect(result.current.availabilityError).toBe('Network error');
    });
  });

  describe('SSE Streaming', () => {
    it('should stream response chunks and accumulate content', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        // SSE response with chunks
        return Promise.resolve(
          createSSEResponse([
            JSON.stringify({ content: 'Hello' }),
            JSON.stringify({ content: ', ' }),
            JSON.stringify({ content: 'world!' }),
          ])
        );
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      // Wait for availability check
      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      // Send message
      act(() => {
        result.current.sendMessage('Test question');
      });

      // Wait for streaming to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have user message and assistant response
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Test question');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('Hello, world!');
    });

    it('should update message content during streaming', async () => {
      let streamController: ReadableStreamDefaultController | null = null;
      const encoder = new TextEncoder();

      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        // Create a controllable stream
        const stream = new ReadableStream({
          start(controller) {
            streamController = controller;
          },
        });

        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
        );
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      // Send message
      act(() => {
        result.current.sendMessage('Test');
      });

      // Wait for streaming to start
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Send first chunk
      act(() => {
        streamController?.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: 'First' })}\n\n`)
        );
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBe(2);
        expect(result.current.messages[1].content).toBe('First');
      });

      // Send second chunk
      act(() => {
        streamController?.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: ' Second' })}\n\n`)
        );
      });

      await waitFor(() => {
        expect(result.current.messages[1].content).toBe('First Second');
      });

      // Complete stream
      act(() => {
        streamController?.enqueue(encoder.encode('data: [DONE]\n\n'));
        streamController?.close();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle stream errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        // SSE response with error
        return Promise.resolve(
          createSSEResponse([
            JSON.stringify({ content: 'Start' }),
            JSON.stringify({ error: 'Stream error occurred' }),
          ])
        );
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      act(() => {
        result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Stream error occurred');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(createErrorResponse('Message is required', 400));
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      act(() => {
        result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Message is required');
    });
  });

  describe('Message Management', () => {
    it('should add user message immediately on send', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        // Never resolve to keep loading
        return new Promise(() => {});
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      act(() => {
        result.current.sendMessage('Hello');
      });

      // User message and placeholder assistant message should be added immediately
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe(''); // Placeholder
      expect(result.current.isLoading).toBe(true);
    });

    it('should clear history', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      // Add a message
      act(() => {
        result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should persist messages to localStorage', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(
          createSSEResponse([JSON.stringify({ content: 'Response' })])
        );
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      act(() => {
        result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockLocalStorage['yoyo-chat-history'] || '[]'
      );
      expect(savedData).toHaveLength(2);
    });

    it('should load messages from localStorage on mount', async () => {
      const existingMessages = [
        { id: 'msg-1', role: 'user', content: 'Previous', timestamp: Date.now() },
      ];
      mockLocalStorage['yoyo-chat-history'] = JSON.stringify(existingMessages);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Previous');
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      act(() => {
        result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Abort', () => {
    it('should provide abort function', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.abort).toBe('function');
    });

    it('should call abort endpoint when abort is called', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        if (url.endsWith('/abort') && options?.method === 'POST') {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        // Keep streaming pending
        return new Promise(() => {});
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      // Start a request
      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.isLoading).toBe(true);

      // Abort
      act(() => {
        result.current.abort();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/abort', {
          method: 'POST',
        });
      });
    });
  });

  describe('Retry', () => {
    it('should retry last failed message', async () => {
      let callCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        callCount++;
        if (callCount === 1) {
          // First call fails
          return Promise.resolve(createErrorResponse('Temporary error', 500));
        }
        // Second call succeeds
        return Promise.resolve(
          createSSEResponse([JSON.stringify({ content: 'Success!' })])
        );
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      // Send message - will fail
      act(() => {
        result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      // Should have successful response
      expect(result.current.messages.find((m) => m.role === 'assistant')?.content).toBe('Success!');
    });
  });

  describe('Custom Options', () => {
    it('should use custom endpoint', async () => {
      const { result } = renderHook(
        () => useChat({ endpoint: '/custom/chat' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isCheckingAvailability).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/custom/chat/status');
    });

    it('should use custom storage key', async () => {
      const customKey = 'custom-chat-key';
      mockLocalStorage[customKey] = JSON.stringify([
        { id: 'msg-1', role: 'user', content: 'Custom', timestamp: Date.now() },
      ]);

      const { result } = renderHook(() => useChat({ storageKey: customKey }), {
        wrapper: createWrapper(),
      });

      expect(result.current.messages[0].content).toBe('Custom');
    });
  });
});
