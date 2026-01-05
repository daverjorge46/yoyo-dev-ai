import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import after mocks are set up
import {
  PreflightValidator,
  ValidationResult,
  ExecutionErrorCode,
} from '../preflight-validator.js';

// Test project root
const TEST_PROJECT_ROOT = join(tmpdir(), 'yoyo-preflight-test-' + Date.now());

// Helper to create mock exec result
function createMockExec(options: {
  stdout?: string;
  stderr?: string;
  error?: Error | null;
  exitCode?: number;
}): (cmd: string, opts: any, callback: (error: Error | null, stdout: string, stderr: string) => void) => ChildProcess {
  return vi.fn((cmd: string, opts: any, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
    const process = new EventEmitter() as ChildProcess;
    (process as any).pid = 12345;

    setTimeout(() => {
      if (options.error) {
        const err = options.error as any;
        err.code = options.exitCode ?? 1;
        callback(err, options.stdout ?? '', options.stderr ?? '');
      } else {
        callback(null, options.stdout ?? '', options.stderr ?? '');
      }
    }, 5);

    return process;
  });
}

describe('PreflightValidator', () => {
  let validator: PreflightValidator;
  let mockExec: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test project structure
    mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
    mkdirSync(join(TEST_PROJECT_ROOT, '.yoyo-dev'), { recursive: true });
    mkdirSync(join(TEST_PROJECT_ROOT, 'setup'), { recursive: true });

    // Create mock ralph-prompt-generator.sh
    const generatorPath = join(TEST_PROJECT_ROOT, 'setup', 'ralph-prompt-generator.sh');
    writeFileSync(generatorPath, '#!/bin/bash\necho "PROMPT generated"');
    chmodSync(generatorPath, 0o755);

    // Default mock exec - Ralph installed
    mockExec = createMockExec({ stdout: '/usr/local/bin/ralph' });
  });

  afterEach(() => {
    // Cleanup test directory
    try {
      rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('checkRalphInstalled', () => {
    it('should return success when ralph is found in PATH', async () => {
      mockExec = createMockExec({ stdout: '/usr/local/bin/ralph\n' });
      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.checkRalphInstalled();

      expect(result.success).toBe(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('should return RALPH_NOT_FOUND when which ralph fails', async () => {
      mockExec = createMockExec({
        error: new Error('not found'),
        stderr: 'ralph not found',
        exitCode: 1
      });
      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.checkRalphInstalled();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RALPH_NOT_FOUND');
      expect(result.message).toContain('Ralph CLI not installed');
    });

    it('should check ralph version after finding binary', async () => {
      let callCount = 0;
      mockExec = vi.fn((cmd: string, opts: any, callback: Function) => {
        const process = new EventEmitter() as ChildProcess;
        (process as any).pid = 12345;

        setTimeout(() => {
          callCount++;
          if (cmd.includes('which')) {
            callback(null, '/usr/local/bin/ralph\n', '');
          } else if (cmd.includes('--version')) {
            callback(null, 'ralph 1.2.3\n', '');
          }
        }, 5);

        return process;
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.checkRalphInstalled();

      expect(result.success).toBe(true);
      expect(callCount).toBe(2); // which + version
    });
  });

  describe('checkProjectInitialized', () => {
    it('should return success when .yoyo-dev and generator script exist', async () => {
      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.checkProjectInitialized();

      expect(result.success).toBe(true);
    });

    it('should return PROJECT_NOT_INITIALIZED when .yoyo-dev missing', async () => {
      rmSync(join(TEST_PROJECT_ROOT, '.yoyo-dev'), { recursive: true });
      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.checkProjectInitialized();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROJECT_NOT_INITIALIZED');
      expect(result.details).toContain('.yoyo-dev');
    });

    it('should return PROJECT_NOT_INITIALIZED when generator script missing', async () => {
      rmSync(join(TEST_PROJECT_ROOT, 'setup', 'ralph-prompt-generator.sh'));
      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.checkProjectInitialized();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROJECT_NOT_INITIALIZED');
      expect(result.details).toContain('ralph-prompt-generator.sh');
    });
  });

  describe('generatePrompt', () => {
    it('should return success when prompt generation succeeds', async () => {
      // Mock exec for prompt generation
      mockExec = vi.fn((cmd: string, opts: any, callback: Function) => {
        const process = new EventEmitter() as ChildProcess;
        (process as any).pid = 12345;

        setTimeout(() => {
          // Create the PROMPT.md file
          writeFileSync(join(TEST_PROJECT_ROOT, '.yoyo-dev', 'PROMPT.md'), '# Generated Prompt');
          callback(null, 'PROMPT generated\n', '');
        }, 5);

        return process;
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.generatePrompt('phase-1');

      expect(result.success).toBe(true);
    });

    it('should return PROMPT_GENERATION_FAILED when script fails', async () => {
      mockExec = createMockExec({
        error: new Error('Script failed'),
        stderr: 'Error: No specs found',
        exitCode: 1,
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.generatePrompt('phase-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROMPT_GENERATION_FAILED');
      expect(result.message).toContain('Failed to generate');
    });

    it('should timeout after 10 seconds', async () => {
      // Mock that never calls callback
      mockExec = vi.fn((cmd: string, opts: any, callback: Function) => {
        const process = new EventEmitter() as ChildProcess;
        (process as any).pid = 12345;
        (process as any).kill = vi.fn(() => true);
        // Never call callback - simulates hang
        return process;
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, {
        exec: mockExec,
        promptTimeout: 100, // Use short timeout for test
      });

      const result = await validator.generatePrompt('phase-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROMPT_GENERATION_FAILED');
      expect(result.details).toContain('timeout');
    }, 5000);

    it('should verify PROMPT.md was created', async () => {
      // Mock exec that succeeds but doesn't create file
      mockExec = createMockExec({ stdout: 'Done\n' });
      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.generatePrompt('phase-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROMPT_GENERATION_FAILED');
      expect(result.details).toContain('PROMPT.md');
    });
  });

  describe('validateAll', () => {
    it('should run all checks and return success when all pass', async () => {
      // Mock successful ralph check
      let callIndex = 0;
      mockExec = vi.fn((cmd: string, opts: any, callback: Function) => {
        const process = new EventEmitter() as ChildProcess;
        (process as any).pid = 12345;

        setTimeout(() => {
          if (cmd.includes('which ralph')) {
            callback(null, '/usr/local/bin/ralph\n', '');
          } else if (cmd.includes('--version')) {
            callback(null, 'ralph 1.2.3\n', '');
          } else if (cmd.includes('ralph-prompt-generator')) {
            // Create PROMPT.md
            writeFileSync(join(TEST_PROJECT_ROOT, '.yoyo-dev', 'PROMPT.md'), '# Prompt');
            callback(null, 'Generated\n', '');
          }
        }, 5);

        return process;
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.validateAll('phase-1');

      expect(result.success).toBe(true);
      expect(result.checks).toHaveLength(3);
      expect(result.checks.every(c => c.success)).toBe(true);
    });

    it('should stop on first failure and return error', async () => {
      // Ralph not installed
      mockExec = createMockExec({
        error: new Error('not found'),
        exitCode: 1,
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const result = await validator.validateAll('phase-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RALPH_NOT_FOUND');
      // Should stop after first check fails
      expect(result.checks.length).toBeLessThanOrEqual(1);
    });

    it('should complete in under 2 seconds for happy path', async () => {
      // Mock fast successful checks
      mockExec = vi.fn((cmd: string, opts: any, callback: Function) => {
        const process = new EventEmitter() as ChildProcess;
        (process as any).pid = 12345;

        setImmediate(() => {
          if (cmd.includes('ralph-prompt-generator')) {
            writeFileSync(join(TEST_PROJECT_ROOT, '.yoyo-dev', 'PROMPT.md'), '# Prompt');
          }
          callback(null, 'success\n', '');
        });

        return process;
      });

      validator = new PreflightValidator(TEST_PROJECT_ROOT, { exec: mockExec });

      const start = Date.now();
      const result = await validator.validateAll('phase-1');
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project root', async () => {
      validator = new PreflightValidator('', { exec: mockExec });

      const result = await validator.checkProjectInitialized();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROJECT_NOT_INITIALIZED');
    });

    it('should handle special characters in paths', async () => {
      const specialPath = join(TEST_PROJECT_ROOT, 'project with spaces');
      mkdirSync(specialPath, { recursive: true });
      mkdirSync(join(specialPath, '.yoyo-dev'), { recursive: true });
      mkdirSync(join(specialPath, 'setup'), { recursive: true });
      writeFileSync(
        join(specialPath, 'setup', 'ralph-prompt-generator.sh'),
        '#!/bin/bash\necho "ok"'
      );
      chmodSync(join(specialPath, 'setup', 'ralph-prompt-generator.sh'), 0o755);

      validator = new PreflightValidator(specialPath, { exec: mockExec });

      const result = await validator.checkProjectInitialized();

      expect(result.success).toBe(true);
    });
  });
});
