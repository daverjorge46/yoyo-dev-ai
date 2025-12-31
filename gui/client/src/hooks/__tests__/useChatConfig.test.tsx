/**
 * useChatConfig Hook Tests
 *
 * Tests for chat configuration hook that manages API key.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useChatConfig } from '../useChatConfig';

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

function createWrapper() {
  const queryClient = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('useChatConfig', () => {
  const STORAGE_KEY = 'YOYO_CHAT_API_KEY';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with isConfigured=false when no API key in localStorage', () => {
      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with isConfigured=true when API key exists in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'sk-ant-existing-key');

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(true);
    });
  });

  describe('configureApiKey', () => {
    it('should save API key to localStorage', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(false);

      await result.current.configureApiKey('sk-ant-test-key');

      await waitFor(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBe('sk-ant-test-key');
      });
    });

    it('should call backend POST /api/chat/configure endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      await result.current.configureApiKey('sk-ant-test-key');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chat/configure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: 'sk-ant-test-key' }),
        });
      });
    });

    it('should return true when configuration succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      const success = await result.current.configureApiKey('sk-ant-test-key');

      expect(success).toBe(true);
    });

    it('should return false when configuration fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      const success = await result.current.configureApiKey('invalid-key');

      expect(success).toBe(false);
    });

    it('should set isConfigured to true after successful save', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(false);

      await result.current.configureApiKey('sk-ant-test-key');

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });
    });

    it('should set loading state during configuration', async () => {
      let resolveRequest: (value: unknown) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(
        requestPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }))
      );

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      const configurePromise = result.current.configureApiKey('sk-ant-test-key');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolveRequest!(undefined);
      await configurePromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      const success = await result.current.configureApiKey('sk-ant-test-key');

      expect(success).toBe(false);
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain('Network error');
      });
    });

    it('should handle API error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid API key format' }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      const success = await result.current.configureApiKey('invalid-key');

      expect(success).toBe(false);
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain('Invalid API key format');
      });
    });

    it('should clear previous errors on new configuration attempt', async () => {
      // First attempt - fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Error 1' }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      await result.current.configureApiKey('bad-key');

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second attempt - succeed
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await result.current.configureApiKey('good-key');

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('clearApiKey', () => {
    it('should remove API key from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'sk-ant-test-key');

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('sk-ant-test-key');

      result.current.clearApiKey();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should set isConfigured to false', async () => {
      localStorage.setItem(STORAGE_KEY, 'sk-ant-test-key');

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(true);

      result.current.clearApiKey();

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(false);
      });
    });

    it('should clear errors', () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Test error' }),
      });

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      // Create error state
      result.current.configureApiKey('bad-key');

      waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Clear should remove error
      result.current.clearApiKey();

      expect(result.current.error).toBeNull();
    });
  });

  describe('localStorage persistence', () => {
    it('should load existing API key from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY, 'sk-ant-persisted-key');

      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(true);
    });

    it('should handle missing localStorage gracefully', () => {
      const { result } = renderHook(() => useChatConfig(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConfigured).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
