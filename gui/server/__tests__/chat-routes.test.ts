/**
 * Chat Routes Tests
 *
 * Tests for chat API endpoints including API key configuration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { chatRoutes } from '../routes/chat.js';
import type { Variables } from '../types.js';

// Mock ChatService
vi.mock('../services/chat.js', () => {
  let mockClient: any = null;
  let mockUpdateResult = true;

  return {
    getChatService: vi.fn(() => ({
      isAvailable: () => mockClient !== null,
      updateApiKey: vi.fn(async (apiKey: string) => {
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
          mockClient = null;
          return false;
        }
        mockClient = { apiKey };
        return mockUpdateResult;
      }),
      chat: vi.fn(async () => ({
        response: 'Test response',
        references: [],
      })),
    })),
    // Export helper to control mock behavior
    __setMockUpdateResult: (result: boolean) => {
      mockUpdateResult = result;
    },
  };
});

describe('Chat Routes', () => {
  let app: Hono<{ Variables: Variables }>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();

    // Add projectRoot middleware
    app.use('*', async (c, next) => {
      c.set('projectRoot', '/test/project');
      await next();
    });

    app.route('/', chatRoutes);
  });

  describe('POST /configure', () => {
    it('should accept valid API key and return success', async () => {
      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-test-key-12345678901234567890',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ success: true });
    });

    it('should reject invalid API key and return error', async () => {
      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: '',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: expect.stringMatching(/invalid|failed/i),
      });
    });

    it('should validate API key format', async () => {
      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: '   ',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing apiKey field', async () => {
      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 for non-string apiKey', async () => {
      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: 12345,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle internal errors gracefully', async () => {
      // Mock getChatService to throw error
      const { getChatService } = await import('../services/chat.js');
      vi.mocked(getChatService).mockImplementationOnce(() => {
        throw new Error('Service unavailable');
      });

      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-test-key',
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST / (chat endpoint)', () => {
    it('should work after API key configured', async () => {
      // First configure API key
      await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-test-key-12345678901234567890',
        }),
      });

      // Then send chat message
      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test question',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('response');
    });
  });

  describe('GET /status', () => {
    it('should return availability status', async () => {
      const response = await app.request('/status', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('available');
      expect(data).toHaveProperty('message');
    });
  });
});
