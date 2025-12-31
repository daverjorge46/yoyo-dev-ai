/**
 * Chat Routes Tests
 *
 * Tests for chat API endpoints with Claude Code CLI integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { chatRoutes } from '../routes/chat.js';
import type { Variables } from '../types.js';

// Mock ChatService
const mockCheckClaudeAvailability = vi.fn();
const mockChat = vi.fn();
const mockAbort = vi.fn();

vi.mock('../services/chat.js', () => ({
  getChatService: vi.fn(() => ({
    checkClaudeAvailability: mockCheckClaudeAvailability,
    chat: mockChat,
    abort: mockAbort,
  })),
  resetChatService: vi.fn(),
}));

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

  describe('GET /status', () => {
    it('should return available status when Claude Code is installed', async () => {
      mockCheckClaudeAvailability.mockResolvedValue({
        available: true,
        version: '2.0.76 (Claude Code)',
      });

      const response = await app.request('/status', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        available: true,
        version: '2.0.76 (Claude Code)',
      });
    });

    it('should return unavailable status when Claude Code is not installed', async () => {
      mockCheckClaudeAvailability.mockResolvedValue({
        available: false,
        error: 'Claude Code CLI not found. Install from https://claude.ai/download',
      });

      const response = await app.request('/status', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        available: false,
        error: 'Claude Code CLI not found. Install from https://claude.ai/download',
      });
    });

    it('should return unavailable status when authentication is required', async () => {
      mockCheckClaudeAvailability.mockResolvedValue({
        available: false,
        error: 'Authentication required. Run "claude" in terminal to authenticate.',
      });

      const response = await app.request('/status', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.available).toBe(false);
      expect(data.error).toContain('Authentication');
    });

    it('should handle errors gracefully', async () => {
      mockCheckClaudeAvailability.mockRejectedValue(new Error('Unexpected error'));

      const response = await app.request('/status', {
        method: 'GET',
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST / (chat endpoint)', () => {
    it('should stream response chunks as SSE', async () => {
      // Create async iterable that yields chunks
      async function* mockStream() {
        yield 'Hello';
        yield ', ';
        yield 'world!';
      }
      mockChat.mockReturnValue(mockStream());

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
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');

      const text = await response.text();
      expect(text).toContain('data: {"content":"Hello"}');
      expect(text).toContain('data: {"content":", "}');
      expect(text).toContain('data: {"content":"world!"}');
      expect(text).toContain('data: [DONE]');
    });

    it('should return 400 for missing message', async () => {
      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Message is required');
    });

    it('should return 400 for empty message', async () => {
      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '   ',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('empty');
    });

    it('should return 400 for non-string message', async () => {
      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 12345,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('string');
    });

    it('should handle stream errors gracefully', async () => {
      // Create async iterable that throws
      async function* mockErrorStream() {
        yield 'Start';
        throw new Error('Stream error');
      }
      mockChat.mockReturnValue(mockErrorStream());

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
      const text = await response.text();
      expect(text).toContain('data: {"content":"Start"}');
      expect(text).toContain('data: {"error":"Stream error"}');
    });

    it('should pass message to chat service', async () => {
      async function* mockStream() {
        yield 'Response';
      }
      mockChat.mockReturnValue(mockStream());

      await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What is this codebase about?',
        }),
      });

      expect(mockChat).toHaveBeenCalledWith('What is this codebase about?', undefined);
    });

    it('should pass sessionId to chat service when provided', async () => {
      async function* mockStream() {
        yield 'Response';
      }
      mockChat.mockReturnValue(mockStream());

      const sessionId = 'test-session-abc-123';
      await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'First message',
          sessionId,
        }),
      });

      expect(mockChat).toHaveBeenCalledWith('First message', sessionId);
    });

    it('should work without sessionId for backwards compatibility', async () => {
      async function* mockStream() {
        yield 'Response';
      }
      mockChat.mockReturnValue(mockStream());

      await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Message without session',
        }),
      });

      expect(mockChat).toHaveBeenCalledWith('Message without session', undefined);
    });

    it('should pass different sessionIds for different conversations', async () => {
      async function* mockStream1() {
        yield 'Response 1';
      }
      async function* mockStream2() {
        yield 'Response 2';
      }
      mockChat
        .mockReturnValueOnce(mockStream1())
        .mockReturnValueOnce(mockStream2());

      // First conversation
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'First conversation',
          sessionId: 'session-1',
        }),
      });

      // Second conversation
      await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Second conversation',
          sessionId: 'session-2',
        }),
      });

      expect(mockChat).toHaveBeenCalledTimes(2);
      expect(mockChat).toHaveBeenNthCalledWith(1, 'First conversation', 'session-1');
      expect(mockChat).toHaveBeenNthCalledWith(2, 'Second conversation', 'session-2');
    });
  });

  describe('POST /configure (removed)', () => {
    it('should return 404 for removed configure endpoint', async () => {
      const response = await app.request('/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-test-key',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /abort', () => {
    it('should abort current request', async () => {
      const response = await app.request('/abort', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ success: true });
      expect(mockAbort).toHaveBeenCalled();
    });
  });
});
