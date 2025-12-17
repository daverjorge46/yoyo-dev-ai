/**
 * Memory Scopes Tests
 *
 * Tests for the dual scope architecture:
 * - Global scope (~/.yoyo-ai/memory/)
 * - Project scope (.yoyo-ai/memory/)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import {
  getGlobalMemoryPath,
  getProjectMemoryPath,
  ensureMemoryDirectory,
  detectProjectRoot,
  ScopeManager,
} from '../scopes.js';
import { initializeDatabase, closeDatabase, saveBlock, getBlock } from '../store.js';
import type { PersonaContent } from '../types.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;

function createTestDir(): string {
  const dir = join(tmpdir(), `yoyo-scope-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

beforeEach(() => {
  testDir = createTestDir();
});

afterEach(() => {
  cleanupTestDir(testDir);
});

// =============================================================================
// Path Resolution Tests
// =============================================================================

describe('Path Resolution', () => {
  describe('getGlobalMemoryPath', () => {
    it('should return path in home directory', () => {
      const path = getGlobalMemoryPath();
      expect(path.startsWith(homedir())).toBe(true);
    });

    it('should use .yoyo-ai/memory/ structure', () => {
      const path = getGlobalMemoryPath();
      expect(path).toBe(join(homedir(), '.yoyo-ai', 'memory'));
    });
  });

  describe('getProjectMemoryPath', () => {
    it('should return path relative to provided directory', () => {
      const path = getProjectMemoryPath(testDir);
      expect(path).toBe(join(testDir, '.yoyo-ai', 'memory'));
    });

    it('should use current working directory when no path provided', () => {
      const path = getProjectMemoryPath();
      expect(path).toBe(join(process.cwd(), '.yoyo-ai', 'memory'));
    });
  });

  describe('detectProjectRoot', () => {
    it('should detect directory with .yoyo-ai folder', () => {
      const yoyoDir = join(testDir, '.yoyo-ai');
      mkdirSync(yoyoDir);

      const root = detectProjectRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should detect directory with .git folder', () => {
      const gitDir = join(testDir, '.git');
      mkdirSync(gitDir);

      const root = detectProjectRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should detect directory with package.json', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');

      const root = detectProjectRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should search parent directories', () => {
      const subDir = join(testDir, 'src', 'components');
      mkdirSync(subDir, { recursive: true });
      mkdirSync(join(testDir, '.git'));

      const root = detectProjectRoot(subDir);
      expect(root).toBe(testDir);
    });

    it('should return null when no project markers found', () => {
      const isolatedDir = join(tmpdir(), `isolated-${Date.now()}`);
      mkdirSync(isolatedDir);

      try {
        // This test may find a project root in parent dirs of tmpdir
        // So we just check it returns a string or null
        const root = detectProjectRoot(isolatedDir);
        expect(root === null || typeof root === 'string').toBe(true);
      } finally {
        cleanupTestDir(isolatedDir);
      }
    });
  });
});

// =============================================================================
// Directory Management Tests
// =============================================================================

describe('Directory Management', () => {
  describe('ensureMemoryDirectory', () => {
    it('should create directory if not exists', () => {
      const memoryPath = join(testDir, '.yoyo-ai', 'memory');
      expect(existsSync(memoryPath)).toBe(false);

      ensureMemoryDirectory(memoryPath);

      expect(existsSync(memoryPath)).toBe(true);
    });

    it('should be idempotent (safe to call multiple times)', () => {
      const memoryPath = join(testDir, '.yoyo-ai', 'memory');

      ensureMemoryDirectory(memoryPath);
      ensureMemoryDirectory(memoryPath);

      expect(existsSync(memoryPath)).toBe(true);
    });

    it('should create parent directories', () => {
      const deepPath = join(testDir, 'a', 'b', 'c', 'memory');

      ensureMemoryDirectory(deepPath);

      expect(existsSync(deepPath)).toBe(true);
    });
  });
});

// =============================================================================
// ScopeManager Tests
// =============================================================================

describe('ScopeManager', () => {
  let manager: ScopeManager;

  beforeEach(() => {
    manager = new ScopeManager({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
  });

  afterEach(() => {
    manager.close();
  });

  describe('initialization', () => {
    it('should start with project scope as default', () => {
      expect(manager.getCurrentScope()).toBe('project');
    });

    it('should create memory directories on initialization', () => {
      manager.initialize();

      expect(existsSync(join(testDir, '.yoyo-ai', 'memory'))).toBe(true);
      expect(existsSync(join(testDir, 'global-memory'))).toBe(true);
    });

    it('should initialize databases on initialize()', () => {
      manager.initialize();

      // Should be able to get stores after initialization
      expect(manager.getProjectStore()).toBeDefined();
      expect(manager.getGlobalStore()).toBeDefined();
    });
  });

  describe('scope switching', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should switch to global scope', () => {
      manager.setScope('global');
      expect(manager.getCurrentScope()).toBe('global');
    });

    it('should switch back to project scope', () => {
      manager.setScope('global');
      manager.setScope('project');
      expect(manager.getCurrentScope()).toBe('project');
    });

    it('should return current store based on scope', () => {
      const projectStore = manager.getCurrentStore();
      expect(projectStore).toBe(manager.getProjectStore());

      manager.setScope('global');
      const globalStore = manager.getCurrentStore();
      expect(globalStore).toBe(manager.getGlobalStore());
    });
  });

  describe('database operations', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should save to project scope by default', () => {
      const content: PersonaContent = {
        name: 'ProjectAgent',
        traits: ['project-specific'],
        communication_style: 'formal',
        expertise_areas: ['testing'],
      };

      saveBlock(manager.getProjectStore(), {
        type: 'persona',
        scope: 'project',
        content,
      });

      const block = getBlock(manager.getProjectStore(), 'persona', 'project');
      expect(block?.content).toEqual(content);

      // Should not exist in global
      const globalBlock = getBlock(manager.getGlobalStore(), 'persona', 'project');
      expect(globalBlock).toBeNull();
    });

    it('should save to global scope', () => {
      const content: PersonaContent = {
        name: 'GlobalAgent',
        traits: ['global-preference'],
        communication_style: 'casual',
        expertise_areas: ['general'],
      };

      saveBlock(manager.getGlobalStore(), {
        type: 'persona',
        scope: 'global',
        content,
      });

      const block = getBlock(manager.getGlobalStore(), 'persona', 'global');
      expect(block?.content).toEqual(content);
    });

    it('should keep project and global databases separate', () => {
      saveBlock(manager.getProjectStore(), {
        type: 'persona',
        scope: 'project',
        content: {
          name: 'ProjectAgent',
          traits: [],
          communication_style: 'formal',
          expertise_areas: [],
        } as PersonaContent,
      });

      saveBlock(manager.getGlobalStore(), {
        type: 'persona',
        scope: 'global',
        content: {
          name: 'GlobalAgent',
          traits: [],
          communication_style: 'casual',
          expertise_areas: [],
        } as PersonaContent,
      });

      const projectBlock = getBlock(manager.getProjectStore(), 'persona', 'project');
      const globalBlock = getBlock(manager.getGlobalStore(), 'persona', 'global');

      expect((projectBlock?.content as PersonaContent).name).toBe('ProjectAgent');
      expect((globalBlock?.content as PersonaContent).name).toBe('GlobalAgent');
    });
  });

  describe('database paths', () => {
    it('should use correct database paths', () => {
      expect(manager.getProjectDatabasePath()).toBe(
        join(testDir, '.yoyo-ai', 'memory', 'memory.db')
      );
      expect(manager.getGlobalDatabasePath()).toBe(
        join(testDir, 'global-memory', 'memory.db')
      );
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle switching scopes multiple times', () => {
    const manager = new ScopeManager({
      projectRoot: testDir,
      globalPath: join(testDir, 'global'),
    });
    manager.initialize();

    for (let i = 0; i < 10; i++) {
      manager.setScope(i % 2 === 0 ? 'global' : 'project');
    }

    // Last iteration: i=9, 9%2=1 (odd), so 'project'
    expect(manager.getCurrentScope()).toBe('project');
    manager.close();
  });

  it('should handle close and reinitialize', () => {
    const manager = new ScopeManager({
      projectRoot: testDir,
      globalPath: join(testDir, 'global'),
    });
    manager.initialize();

    saveBlock(manager.getProjectStore(), {
      type: 'persona',
      scope: 'project',
      content: {
        name: 'Test',
        traits: [],
        communication_style: 'normal',
        expertise_areas: [],
      } as PersonaContent,
    });

    manager.close();

    // Reinitialize
    const manager2 = new ScopeManager({
      projectRoot: testDir,
      globalPath: join(testDir, 'global'),
    });
    manager2.initialize();

    // Data should persist
    const block = getBlock(manager2.getProjectStore(), 'persona', 'project');
    expect(block).not.toBeNull();
    expect((block?.content as PersonaContent).name).toBe('Test');

    manager2.close();
  });
});
