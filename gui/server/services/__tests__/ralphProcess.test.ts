/**
 * RalphProcess Tests
 *
 * Tests for lock file management, PID tracking, and process lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, unlinkSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { RalphProcess, type LockFileContent } from '../ralphProcess.js';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_PROJECT_ROOT = join(tmpdir(), 'yoyo-ralph-test-' + Date.now());

function createTestProcess(): RalphProcess {
  return new RalphProcess({
    projectRoot: TEST_PROJECT_ROOT,
  });
}

function cleanupTestFiles(ralphProcess: RalphProcess): void {
  const lockPath = ralphProcess.getLockFilePath();
  const pidPath = ralphProcess.getPidFilePath();

  try {
    if (existsSync(lockPath)) unlinkSync(lockPath);
    if (existsSync(pidPath)) unlinkSync(pidPath);
  } catch {
    // Ignore
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('RalphProcess', () => {
  let ralphProcess: RalphProcess;

  beforeEach(() => {
    ralphProcess = createTestProcess();
  });

  afterEach(() => {
    cleanupTestFiles(ralphProcess);
  });

  describe('Path Helpers', () => {
    it('should generate consistent lock file path', () => {
      const path1 = ralphProcess.getLockFilePath();
      const path2 = ralphProcess.getLockFilePath();

      expect(path1).toBe(path2);
      expect(path1).toContain('/tmp/yoyo-ralph-');
      expect(path1).toMatch(/\.lock$/);
    });

    it('should generate consistent PID file path', () => {
      const path1 = ralphProcess.getPidFilePath();
      const path2 = ralphProcess.getPidFilePath();

      expect(path1).toBe(path2);
      expect(path1).toContain('/tmp/yoyo-ralph-');
      expect(path1).toMatch(/\.pid$/);
    });

    it('should generate different paths for different project roots', () => {
      const process1 = new RalphProcess({ projectRoot: '/project/a' });
      const process2 = new RalphProcess({ projectRoot: '/project/b' });

      expect(process1.getLockFilePath()).not.toBe(process2.getLockFilePath());
    });
  });

  describe('Lock File Management', () => {
    it('should report not locked when no lock file exists', () => {
      expect(ralphProcess.isLocked()).toBe(false);
    });

    it('should read null when no lock file exists', () => {
      expect(ralphProcess.readLockFile()).toBeNull();
    });

    it('should detect stale lock when process is not running', () => {
      const lockPath = ralphProcess.getLockFilePath();
      const content: LockFileContent = {
        pid: 999999, // Very unlikely to be a real process
        startedAt: new Date().toISOString(),
        phaseId: 'phase-1',
        projectPath: TEST_PROJECT_ROOT,
        executionId: 'exec-123',
      };

      writeFileSync(lockPath, JSON.stringify(content));

      // Should return false because the process isn't running (stale lock)
      expect(ralphProcess.isLocked()).toBe(false);

      // Lock file should be cleaned up
      expect(existsSync(lockPath)).toBe(false);
    });

    it('should cleanup lock files', () => {
      const lockPath = ralphProcess.getLockFilePath();
      const pidPath = ralphProcess.getPidFilePath();

      writeFileSync(lockPath, JSON.stringify({ pid: 123 }));
      writeFileSync(pidPath, '123');

      expect(existsSync(lockPath)).toBe(true);
      expect(existsSync(pidPath)).toBe(true);

      ralphProcess.cleanupLockFiles();

      expect(existsSync(lockPath)).toBe(false);
      expect(existsSync(pidPath)).toBe(false);
    });
  });

  describe('Orphan Detection', () => {
    it('should return wasOrphaned=false when no lock file exists', () => {
      const result = ralphProcess.cleanupOrphanedProcesses();

      expect(result.wasOrphaned).toBe(false);
      expect(result.previousState).toBeNull();
    });

    it('should detect and cleanup orphaned lock file', () => {
      const lockPath = ralphProcess.getLockFilePath();
      const pidPath = ralphProcess.getPidFilePath();

      const content: LockFileContent = {
        pid: 999999,
        startedAt: new Date().toISOString(),
        phaseId: 'phase-1',
        projectPath: TEST_PROJECT_ROOT,
        executionId: 'exec-orphan',
      };

      writeFileSync(lockPath, JSON.stringify(content));
      writeFileSync(pidPath, '999999');

      const result = ralphProcess.cleanupOrphanedProcesses();

      expect(result.wasOrphaned).toBe(true);
      expect(result.previousState).toEqual(content);
      expect(existsSync(lockPath)).toBe(false);
      expect(existsSync(pidPath)).toBe(false);
    });
  });

  describe('Process Status', () => {
    it('should start with idle status', () => {
      expect(ralphProcess.getStatus()).toBe('idle');
    });

    it('should have null PID when not running', () => {
      expect(ralphProcess.getPid()).toBeNull();
    });

    it('should return isRunning=false when not running', () => {
      expect(ralphProcess.isRunning()).toBe(false);
    });

    it('should have null execution ID when not running', () => {
      expect(ralphProcess.getCurrentExecutionId()).toBeNull();
    });

    it('should have null phase ID when not running', () => {
      expect(ralphProcess.getCurrentPhaseId()).toBeNull();
    });
  });

  describe('isProcessRunning', () => {
    it('should return true for current process', () => {
      expect(ralphProcess.isProcessRunning(process.pid)).toBe(true);
    });

    it('should return false for non-existent process', () => {
      expect(ralphProcess.isProcessRunning(999999)).toBe(false);
    });
  });

  describe('State File Path', () => {
    it('should generate state file path in project directory', () => {
      const path = ralphProcess.getStateFilePath();

      expect(path).toContain(TEST_PROJECT_ROOT);
      expect(path).toContain('.yoyo-dev');
      expect(path).toContain('ralph');
      expect(path).toMatch(/execution-state\.json$/);
    });
  });

  describe('Pause/Resume/Stop when not running', () => {
    it('should return false when pausing without running process', () => {
      expect(ralphProcess.pause()).toBe(false);
    });

    it('should return false when resuming without running process', () => {
      expect(ralphProcess.resume()).toBe(false);
    });

    it('should return false when stopping without running process', () => {
      expect(ralphProcess.stop()).toBe(false);
    });

    it('should return false when force killing without running process', () => {
      expect(ralphProcess.forceKill()).toBe(false);
    });
  });
});

describe('RalphProcess Integration', () => {
  // These tests would require actually spawning ralph
  // Skipping since ralph may not be available in test environment

  it.skip('should start ralph process and create lock files', async () => {
    // Would need ralph installed to test
  });

  it.skip('should prevent concurrent execution', async () => {
    // Would need ralph installed to test
  });

  it.skip('should allow force start to override lock', async () => {
    // Would need ralph installed to test
  });
});
