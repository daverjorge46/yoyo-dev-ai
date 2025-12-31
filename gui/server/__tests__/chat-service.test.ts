/**
 * ChatService Tests
 *
 * Tests for ChatService with Claude Code CLI integration.
 * Uses dependency injection for spawn function to enable clean testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { ChatService, getChatService, resetChatService } from '../services/chat.js';

// Type for mock spawn function
type MockSpawnFn = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => ChildProcess;

// Helper to create mock child process
function createMockProcess(options: {
  stdout?: string[];
  stderr?: string;
  exitCode?: number;
  delay?: number;
}): ChildProcess {
  const process = new EventEmitter() as ChildProcess;
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();

  (process as any).stdout = stdout;
  (process as any).stderr = stderr;
  (process as any).kill = vi.fn(() => {
    process.emit('close', 1);
    return true;
  });
  (process as any).pid = 12345;

  // Emit stdout chunks with delay
  setTimeout(() => {
    if (options.stdout) {
      for (const chunk of options.stdout) {
        stdout.emit('data', Buffer.from(chunk));
      }
    }
    if (options.stderr) {
      stderr.emit('data', Buffer.from(options.stderr));
    }
    process.emit('close', options.exitCode ?? 0);
  }, options.delay ?? 10);

  return process;
}

describe('ChatService', () => {
  const testProjectRoot = '/test/project';
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSpawn = vi.fn();
    resetChatService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkClaudeAvailability', () => {
    it('should return true when Claude Code CLI is installed', async () => {
      const mockProcess = createMockProcess({
        stdout: ['claude-code 1.0.0\n'],
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const result = await chatService.checkClaudeAvailability();

      expect(result.available).toBe(true);
      expect(result.version).toBe('claude-code 1.0.0');
      expect(mockSpawn).toHaveBeenCalledWith('claude', ['--version'], expect.any(Object));
    });

    it('should return false when Claude Code CLI is not installed', async () => {
      const mockProcess = createMockProcess({
        stderr: 'command not found: claude',
        exitCode: 127,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const result = await chatService.checkClaudeAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return false when spawn throws ENOENT error', async () => {
      const mockProcess = new EventEmitter() as ChildProcess;
      (mockProcess as any).stdout = new EventEmitter();
      (mockProcess as any).stderr = new EventEmitter();

      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });

      // Simulate ENOENT error (command not found)
      const errorPromise = chatService.checkClaudeAvailability();

      setTimeout(() => {
        mockProcess.emit('error', Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' }));
      }, 10);

      const result = await errorPromise;

      expect(result.available).toBe(false);
      expect(result.error).toContain('Install from');
    });

    it('should handle non-zero exit code as unavailable', async () => {
      const mockProcess = createMockProcess({
        stderr: 'Authentication required',
        exitCode: 1,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const result = await chatService.checkClaudeAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toContain('Authentication');
    });
  });

  describe('chat', () => {
    it('should stream response chunks from Claude Code CLI', async () => {
      const mockProcess = createMockProcess({
        stdout: ['Hello', ', ', 'world!'],
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const chunks: string[] = [];
      const stream = chatService.chat('Test message');

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ', ', 'world!']);
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--print', 'Test message'],
        expect.objectContaining({
          cwd: testProjectRoot,
          env: expect.any(Object),
        })
      );
    });

    it('should throw error when Claude Code returns non-zero exit', async () => {
      const mockProcess = createMockProcess({
        stderr: 'Error: Something went wrong',
        exitCode: 1,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const stream = chatService.chat('Test message');

      await expect(async () => {
        for await (const _ of stream) {
          // Consume stream
        }
      }).rejects.toThrow('Something went wrong');
    });

    it('should throw error when Claude Code CLI not found', async () => {
      const mockProcess = new EventEmitter() as ChildProcess;
      (mockProcess as any).stdout = new EventEmitter();
      (mockProcess as any).stderr = new EventEmitter();
      (mockProcess as any).kill = vi.fn();

      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const stream = chatService.chat('Test message');
      const iterator = stream[Symbol.asyncIterator]();

      // Emit ENOENT error after a short delay
      setTimeout(() => {
        mockProcess.emit('error', Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' }));
      }, 10);

      await expect(iterator.next()).rejects.toThrow('Claude Code CLI not found');
    });

    it('should pass environment variables to subprocess', async () => {
      const mockProcess = createMockProcess({
        stdout: ['Response'],
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const stream = chatService.chat('Test message');
      for await (const _ of stream) {
        // Consume stream
      }

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: expect.any(String),
          }),
        })
      );
    });

    it('should use project root as working directory', async () => {
      const mockProcess = createMockProcess({
        stdout: ['Response'],
        exitCode: 0,
      });
      mockSpawn.mockReturnValue(mockProcess);

      const customRoot = '/custom/project/root';
      const customService = new ChatService(customRoot, { spawn: mockSpawn });

      const stream = customService.chat('Test message');
      for await (const _ of stream) {
        // Consume stream
      }

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({
          cwd: customRoot,
        })
      );
    });
  });

  describe('abort', () => {
    it('should kill subprocess when abort is called', async () => {
      const mockProcess = new EventEmitter() as ChildProcess;
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();

      (mockProcess as any).stdout = stdout;
      (mockProcess as any).stderr = stderr;
      (mockProcess as any).kill = vi.fn(() => {
        mockProcess.emit('close', 1);
        return true;
      });
      (mockProcess as any).pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      const chatService = new ChatService(testProjectRoot, { spawn: mockSpawn });
      const stream = chatService.chat('Test message');

      // Start consuming - this initiates the process
      const iterator = stream[Symbol.asyncIterator]();

      // Emit one chunk
      stdout.emit('data', Buffer.from('Hello'));

      // Get first chunk
      await iterator.next();

      // Abort the request
      chatService.abort();

      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe('singleton management', () => {
    it('should return same instance for same project root', () => {
      const service1 = getChatService(testProjectRoot);
      const service2 = getChatService(testProjectRoot);

      expect(service2).toBe(service1);
    });

    it('should return new instance for different project root', () => {
      const service1 = getChatService(testProjectRoot);
      const service2 = getChatService('/different/root');

      expect(service2).not.toBe(service1);
    });
  });

  describe('timeout handling', () => {
    it('should kill process after timeout', async () => {
      // Create a mock process that never completes
      const mockProcess = new EventEmitter() as ChildProcess;
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();

      (mockProcess as any).stdout = stdout;
      (mockProcess as any).stderr = stderr;
      (mockProcess as any).kill = vi.fn(() => {
        mockProcess.emit('close', 1);
        return true;
      });
      (mockProcess as any).pid = 12345;

      mockSpawn.mockReturnValue(mockProcess);

      // Use a short timeout for testing
      const shortTimeoutService = new ChatService(testProjectRoot, {
        spawn: mockSpawn,
        timeoutMs: 50
      });
      const stream = shortTimeoutService.chat('Test message');

      await expect(async () => {
        for await (const _ of stream) {
          // Consume stream - should timeout
        }
      }).rejects.toThrow('timeout');

      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });
});
