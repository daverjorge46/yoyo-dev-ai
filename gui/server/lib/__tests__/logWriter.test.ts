/**
 * LogWriter Tests
 *
 * Tests for JSONL log writing, reading, and rotation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { LogWriter, createLogWriter, listLogFiles, type LogEntry } from '../logWriter.js';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_DIR = join(tmpdir(), 'yoyo-log-test-' + Date.now());
const TEST_EXECUTION_ID = 'test-exec-123';

function createTestLogWriter(options?: { maxFileSize?: number }): LogWriter {
  return new LogWriter({
    logsDir: TEST_DIR,
    executionId: TEST_EXECUTION_ID,
    maxFileSize: options?.maxFileSize,
  });
}

function cleanupTestDir(): void {
  try {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  } catch {
    // Ignore
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('LogWriter', () => {
  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Initialization', () => {
    it('should create logs directory if not exists', () => {
      const writer = createTestLogWriter();

      expect(existsSync(TEST_DIR)).toBe(false);

      writer.write({ level: 'info', msg: 'test' });

      expect(existsSync(TEST_DIR)).toBe(true);
    });

    it('should generate correct log file path', () => {
      const writer = createTestLogWriter();
      const path = writer.getLogFilePath();

      expect(path).toBe(join(TEST_DIR, `${TEST_EXECUTION_ID}.jsonl`));
    });
  });

  describe('Writing', () => {
    it('should write a single log entry', () => {
      const writer = createTestLogWriter();

      writer.write({ level: 'info', msg: 'Hello world' });

      const content = readFileSync(writer.getLogFilePath(), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      expect(lines).toHaveLength(1);

      const entry = JSON.parse(lines[0]) as LogEntry;
      expect(entry.level).toBe('info');
      expect(entry.msg).toBe('Hello world');
      expect(entry.ts).toBeDefined();
    });

    it('should write multiple log entries', () => {
      const writer = createTestLogWriter();

      writer.write({ level: 'info', msg: 'First' });
      writer.write({ level: 'warn', msg: 'Second' });
      writer.write({ level: 'error', msg: 'Third' });

      expect(writer.getLineCount()).toBe(3);

      const result = writer.read();
      expect(result.logs).toHaveLength(3);
      expect(result.logs[0].msg).toBe('First');
      expect(result.logs[1].msg).toBe('Second');
      expect(result.logs[2].msg).toBe('Third');
    });

    it('should include metadata in log entries', () => {
      const writer = createTestLogWriter();

      writer.write({
        level: 'info',
        msg: 'Task completed',
        meta: { taskId: '1.1', specId: 'user-auth' },
      });

      const result = writer.read();
      expect(result.logs[0].meta).toEqual({ taskId: '1.1', specId: 'user-auth' });
    });

    it('should write batch entries', () => {
      const writer = createTestLogWriter();

      writer.writeBatch([
        { level: 'info', msg: 'Batch 1' },
        { level: 'info', msg: 'Batch 2' },
        { level: 'info', msg: 'Batch 3' },
      ]);

      expect(writer.getLineCount()).toBe(3);
    });
  });

  describe('Reading', () => {
    it('should return empty result for non-existent file', () => {
      const writer = createTestLogWriter();

      const result = writer.read();

      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should paginate results', () => {
      const writer = createTestLogWriter();

      for (let i = 0; i < 10; i++) {
        writer.write({ level: 'info', msg: `Entry ${i}` });
      }

      // First page
      const page1 = writer.read({ limit: 3, offset: 0 });
      expect(page1.logs).toHaveLength(3);
      expect(page1.total).toBe(10);
      expect(page1.hasMore).toBe(true);
      expect(page1.logs[0].msg).toBe('Entry 0');

      // Second page
      const page2 = writer.read({ limit: 3, offset: 3 });
      expect(page2.logs).toHaveLength(3);
      expect(page2.logs[0].msg).toBe('Entry 3');

      // Last page
      const page4 = writer.read({ limit: 3, offset: 9 });
      expect(page4.logs).toHaveLength(1);
      expect(page4.hasMore).toBe(false);
    });

    it('should filter by log level', () => {
      const writer = createTestLogWriter();

      writer.write({ level: 'info', msg: 'Info 1' });
      writer.write({ level: 'error', msg: 'Error 1' });
      writer.write({ level: 'info', msg: 'Info 2' });
      writer.write({ level: 'error', msg: 'Error 2' });

      const errors = writer.read({ level: 'error' });
      expect(errors.logs).toHaveLength(2);
      expect(errors.logs[0].msg).toBe('Error 1');
      expect(errors.logs[1].msg).toBe('Error 2');
    });
  });

  describe('Rotation', () => {
    it('should rotate when file exceeds max size', () => {
      const writer = new LogWriter({
        logsDir: TEST_DIR,
        executionId: TEST_EXECUTION_ID,
        maxFileSize: 100, // Very small for testing
      });

      // Write enough to trigger rotation
      for (let i = 0; i < 10; i++) {
        writer.write({ level: 'info', msg: 'A very long message to fill up the log file quickly' });
      }

      // Check that rotated file exists
      const rotatedPath = join(TEST_DIR, `${TEST_EXECUTION_ID}.jsonl.1`);
      expect(existsSync(rotatedPath)).toBe(true);
    });

    it('should keep max rotated files', () => {
      const writer = new LogWriter({
        logsDir: TEST_DIR,
        executionId: TEST_EXECUTION_ID,
        maxFileSize: 50, // Very small for testing
        maxRotatedFiles: 2,
      });

      // Write a lot to trigger multiple rotations
      for (let i = 0; i < 50; i++) {
        writer.write({ level: 'info', msg: 'Rotation test message ' + i });
      }

      // Should have main file and up to 2 rotated files
      const mainFile = join(TEST_DIR, `${TEST_EXECUTION_ID}.jsonl`);
      const rotated1 = join(TEST_DIR, `${TEST_EXECUTION_ID}.jsonl.1`);
      const rotated2 = join(TEST_DIR, `${TEST_EXECUTION_ID}.jsonl.2`);
      const rotated3 = join(TEST_DIR, `${TEST_EXECUTION_ID}.jsonl.3`);

      expect(existsSync(mainFile)).toBe(true);
      // At least one rotation should have happened
      expect(existsSync(rotated1)).toBe(true);
      // Third rotation file should not exist (max 2)
      expect(existsSync(rotated3)).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should return correct line count', () => {
      const writer = createTestLogWriter();

      expect(writer.getLineCount()).toBe(0);

      writer.write({ level: 'info', msg: 'One' });
      expect(writer.getLineCount()).toBe(1);

      writer.write({ level: 'info', msg: 'Two' });
      expect(writer.getLineCount()).toBe(2);
    });

    it('should return correct file size', () => {
      const writer = createTestLogWriter();

      expect(writer.getFileSize()).toBe(0);

      writer.write({ level: 'info', msg: 'Hello' });

      expect(writer.getFileSize()).toBeGreaterThan(0);
    });

    it('should cleanup all log files', () => {
      const writer = new LogWriter({
        logsDir: TEST_DIR,
        executionId: TEST_EXECUTION_ID,
        maxFileSize: 50,
      });

      // Write enough to create rotated files
      for (let i = 0; i < 20; i++) {
        writer.write({ level: 'info', msg: 'Cleanup test ' + i });
      }

      const mainFile = writer.getLogFilePath();
      expect(existsSync(mainFile)).toBe(true);

      writer.cleanup();

      expect(existsSync(mainFile)).toBe(false);
      expect(writer.getLineCount()).toBe(0);
    });
  });

  describe('Read All (including rotated)', () => {
    it('should read from all files including rotated', () => {
      const writer = new LogWriter({
        logsDir: TEST_DIR,
        executionId: TEST_EXECUTION_ID,
        maxFileSize: 100,
      });

      // Write enough to trigger rotation
      for (let i = 0; i < 20; i++) {
        writer.write({ level: 'info', msg: `Entry ${i}` });
      }

      // readAll should include entries from rotated files
      const result = writer.readAll({ limit: 100 });
      expect(result.logs.length).toBeGreaterThan(0);
    });
  });
});

describe('Factory Functions', () => {
  beforeEach(() => {
    cleanupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  it('should create log writer with correct paths', () => {
    const writer = createLogWriter('/test/project', 'exec-456');
    const path = writer.getLogFilePath();

    expect(path).toContain('/test/project');
    expect(path).toContain('.yoyo-dev/ralph/logs');
    expect(path).toContain('exec-456.jsonl');
  });

  it('should list log files', () => {
    // Create test directory and files
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'exec-1.jsonl'), '');
    writeFileSync(join(TEST_DIR, 'exec-2.jsonl'), '');
    writeFileSync(join(TEST_DIR, 'other.txt'), '');

    // Create a fake project structure
    const projectRoot = join(tmpdir(), 'yoyo-log-list-test');
    const logsDir = join(projectRoot, '.yoyo-dev', 'ralph', 'logs');
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(join(logsDir, 'exec-a.jsonl'), '');
    writeFileSync(join(logsDir, 'exec-b.jsonl'), '');

    const files = listLogFiles(projectRoot);
    expect(files).toContain('exec-a');
    expect(files).toContain('exec-b');

    // Cleanup
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('should return empty array for non-existent logs directory', () => {
    const files = listLogFiles('/non/existent/path');
    expect(files).toEqual([]);
  });
});
