/**
 * ChatService Tests
 *
 * Tests for ChatService API key management and configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService, getChatService } from '../services/chat.js';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation((config) => {
      if (!config.apiKey) {
        throw new Error('API key is required');
      }
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Test response' }],
          }),
        },
      };
    }),
  };
});

describe('ChatService', () => {
  let chatService: ChatService;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    // Clear environment variable
    delete process.env.ANTHROPIC_API_KEY;
    chatService = new ChatService(testProjectRoot);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateApiKey', () => {
    it('should accept valid API key and create client', async () => {
      const validKey = 'sk-ant-test-key-12345678901234567890';

      const result = await chatService.updateApiKey(validKey);

      expect(result).toBe(true);
      expect(chatService.isAvailable()).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const invalidKey = '';

      const result = await chatService.updateApiKey(invalidKey);

      expect(result).toBe(false);
      expect(chatService.isAvailable()).toBe(false);
    });

    it('should reject non-string API key', async () => {
      // @ts-expect-error Testing invalid input
      const result = await chatService.updateApiKey(null);

      expect(result).toBe(false);
    });

    it('should invalidate old client when updating key', async () => {
      const firstKey = 'sk-ant-test-key-11111111111111111111';
      const secondKey = 'sk-ant-test-key-22222222222222222222';

      await chatService.updateApiKey(firstKey);
      expect(chatService.isAvailable()).toBe(true);

      await chatService.updateApiKey(secondKey);
      expect(chatService.isAvailable()).toBe(true);

      // Verify service still works after update
      const response = await chatService.chat({
        message: 'Test message',
      });
      expect(response).toBeDefined();
    });

    it('should validate API key with test request', async () => {
      // Mock Anthropic to fail on first attempt
      const Anthropic = await import('@anthropic-ai/sdk');
      const mockCreate = vi.fn()
        .mockRejectedValueOnce(new Error('Invalid API key'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Test response' }],
        });

      vi.mocked(Anthropic.default).mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }) as any);

      const invalidKey = 'sk-ant-invalid-key';
      const validKey = 'sk-ant-valid-key-12345678901234567890';

      const result1 = await chatService.updateApiKey(invalidKey);
      expect(result1).toBe(false);

      const result2 = await chatService.updateApiKey(validKey);
      expect(result2).toBe(true);
    });
  });

  describe('singleton management', () => {
    it('should clear singleton cache when updating key', async () => {
      const service1 = getChatService(testProjectRoot);
      const validKey = 'sk-ant-test-key-12345678901234567890';

      await service1.updateApiKey(validKey);

      // Get service again - should be same instance
      const service2 = getChatService(testProjectRoot);
      expect(service2).toBe(service1);
      expect(service2.isAvailable()).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return false when no API key configured', () => {
      expect(chatService.isAvailable()).toBe(false);
    });

    it('should return true after successful API key update', async () => {
      const validKey = 'sk-ant-test-key-12345678901234567890';

      await chatService.updateApiKey(validKey);

      expect(chatService.isAvailable()).toBe(true);
    });

    it('should return false after failed API key update', async () => {
      const invalidKey = '';

      await chatService.updateApiKey(invalidKey);

      expect(chatService.isAvailable()).toBe(false);
    });
  });
});
