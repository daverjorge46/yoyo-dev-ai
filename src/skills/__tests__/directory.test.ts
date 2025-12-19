/**
 * Skill Directory Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getSkillPaths,
  getProjectSkillPaths,
  getGlobalSkillPaths,
  skillDirectoryExists,
  registryExists,
  ensureSkillDirectory,
  listSkillFiles,
  getSkillFilePath,
  skillIdToFilename,
  filenameToSkillId,
  isValidSkillId,
  generateSkillId,
  skillExists,
  getDirectoryInfo,
} from '../directory.js';
import { SKILL_DIRECTORY, REGISTRY_FILE } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `skill-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// =============================================================================
// Path Helper Tests
// =============================================================================

describe('Skill Path Helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getSkillPaths', () => {
    it('should return project paths for project scope', () => {
      const paths = getSkillPaths('project', tempDir);

      expect(paths.root).toBe(join(tempDir, SKILL_DIRECTORY));
      expect(paths.registry).toBe(join(tempDir, SKILL_DIRECTORY, REGISTRY_FILE));
    });

    it('should return global paths for global scope', () => {
      const paths = getSkillPaths('global');

      expect(paths.root).toContain('.yoyo-ai');
      expect(paths.root).toContain(SKILL_DIRECTORY);
      expect(paths.registry).toContain(REGISTRY_FILE);
    });
  });

  describe('getProjectSkillPaths', () => {
    it('should return project-scoped paths', () => {
      const paths = getProjectSkillPaths(tempDir);

      expect(paths.root).toBe(join(tempDir, SKILL_DIRECTORY));
    });
  });

  describe('getGlobalSkillPaths', () => {
    it('should return global-scoped paths', () => {
      const paths = getGlobalSkillPaths();

      expect(paths.root).toContain('.yoyo-ai');
    });
  });
});

// =============================================================================
// Directory Management Tests
// =============================================================================

describe('Skill Directory Management', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('skillDirectoryExists', () => {
    it('should return false for non-existent directory', () => {
      const paths = getProjectSkillPaths(tempDir);

      expect(skillDirectoryExists(paths)).toBe(false);
    });

    it('should return true for existing directory', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });

      expect(skillDirectoryExists(paths)).toBe(true);
    });
  });

  describe('registryExists', () => {
    it('should return false for non-existent registry', () => {
      const paths = getProjectSkillPaths(tempDir);

      expect(registryExists(paths)).toBe(false);
    });

    it('should return true for existing registry', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });
      writeFileSync(paths.registry, '{}');

      expect(registryExists(paths)).toBe(true);
    });
  });

  describe('ensureSkillDirectory', () => {
    it('should create directory if not exists', () => {
      const paths = getProjectSkillPaths(tempDir);

      const created = ensureSkillDirectory(paths);

      expect(created).toBe(true);
      expect(skillDirectoryExists(paths)).toBe(true);
    });

    it('should return false if directory already exists', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });

      const created = ensureSkillDirectory(paths);

      expect(created).toBe(false);
    });
  });

  describe('listSkillFiles', () => {
    it('should return empty array for non-existent directory', () => {
      const paths = getProjectSkillPaths(tempDir);

      expect(listSkillFiles(paths)).toEqual([]);
    });

    it('should return empty array for empty directory', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });

      expect(listSkillFiles(paths)).toEqual([]);
    });

    it('should return skill files', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });
      writeFileSync(join(paths.root, 'skill-one.md'), '# Skill One');
      writeFileSync(join(paths.root, 'skill-two.md'), '# Skill Two');
      writeFileSync(join(paths.root, 'index.json'), '{}');

      const files = listSkillFiles(paths);

      expect(files).toContain('skill-one.md');
      expect(files).toContain('skill-two.md');
      expect(files).not.toContain('index.json');
    });

    it('should exclude README.md', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });
      writeFileSync(join(paths.root, 'skill.md'), '# Skill');
      writeFileSync(join(paths.root, 'README.md'), '# README');

      const files = listSkillFiles(paths);

      expect(files).toContain('skill.md');
      expect(files).not.toContain('README.md');
    });
  });

  describe('getSkillFilePath', () => {
    it('should return full path for skill file', () => {
      const paths = getProjectSkillPaths(tempDir);
      const filepath = getSkillFilePath(paths, 'my-skill.md');

      expect(filepath).toBe(join(paths.root, 'my-skill.md'));
    });
  });
});

// =============================================================================
// ID and Filename Tests
// =============================================================================

describe('Skill ID and Filename Utilities', () => {
  describe('skillIdToFilename', () => {
    it('should add .md extension', () => {
      expect(skillIdToFilename('my-skill')).toBe('my-skill.md');
    });
  });

  describe('filenameToSkillId', () => {
    it('should remove .md extension', () => {
      expect(filenameToSkillId('my-skill.md')).toBe('my-skill');
    });

    it('should handle files without .md extension', () => {
      expect(filenameToSkillId('my-skill')).toBe('my-skill');
    });
  });

  describe('isValidSkillId', () => {
    it('should accept valid kebab-case IDs', () => {
      expect(isValidSkillId('react-hooks')).toBe(true);
      expect(isValidSkillId('api-error-handling')).toBe(true);
      expect(isValidSkillId('skill123')).toBe(true);
      expect(isValidSkillId('a')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidSkillId('')).toBe(false);
      expect(isValidSkillId('React-Hooks')).toBe(false); // uppercase
      expect(isValidSkillId('react_hooks')).toBe(false); // underscore
      expect(isValidSkillId('123skill')).toBe(false); // starts with number
      expect(isValidSkillId('-skill')).toBe(false); // starts with hyphen
      expect(isValidSkillId('skill-')).toBe(false); // ends with hyphen
      expect(isValidSkillId('skill--name')).toBe(false); // double hyphen
    });

    it('should reject non-string values', () => {
      expect(isValidSkillId(null as unknown as string)).toBe(false);
      expect(isValidSkillId(undefined as unknown as string)).toBe(false);
      expect(isValidSkillId(123 as unknown as string)).toBe(false);
    });
  });

  describe('generateSkillId', () => {
    it('should convert name to kebab-case', () => {
      expect(generateSkillId('React Hooks')).toBe('react-hooks');
      expect(generateSkillId('API Error Handling')).toBe('api-error-handling');
    });

    it('should remove special characters', () => {
      expect(generateSkillId("React's Hooks!")).toBe('reacts-hooks');
    });

    it('should collapse multiple spaces/hyphens', () => {
      expect(generateSkillId('React   Hooks')).toBe('react-hooks');
      expect(generateSkillId('React - - Hooks')).toBe('react-hooks');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(generateSkillId(' React Hooks ')).toBe('react-hooks');
    });
  });
});

// =============================================================================
// Skill Existence Tests
// =============================================================================

describe('Skill Existence Checks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('skillExists', () => {
    it('should return false for non-existent skill', () => {
      const paths = getProjectSkillPaths(tempDir);

      expect(skillExists(paths, 'non-existent')).toBe(false);
    });

    it('should return true for existing skill', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });
      writeFileSync(join(paths.root, 'my-skill.md'), '# My Skill');

      expect(skillExists(paths, 'my-skill')).toBe(true);
    });
  });
});

// =============================================================================
// Directory Info Tests
// =============================================================================

describe('Directory Info', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getDirectoryInfo', () => {
    it('should return info for non-existent directory', () => {
      const paths = getProjectSkillPaths(tempDir);
      const info = getDirectoryInfo(paths);

      expect(info.exists).toBe(false);
      expect(info.hasRegistry).toBe(false);
      expect(info.skillCount).toBe(0);
    });

    it('should return info for empty directory', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });
      const info = getDirectoryInfo(paths);

      expect(info.exists).toBe(true);
      expect(info.hasRegistry).toBe(false);
      expect(info.skillCount).toBe(0);
    });

    it('should return info for populated directory', () => {
      const paths = getProjectSkillPaths(tempDir);
      mkdirSync(paths.root, { recursive: true });
      writeFileSync(paths.registry, '{}');
      writeFileSync(join(paths.root, 'skill1.md'), '# Skill 1');
      writeFileSync(join(paths.root, 'skill2.md'), '# Skill 2');

      const info = getDirectoryInfo(paths);

      expect(info.exists).toBe(true);
      expect(info.hasRegistry).toBe(true);
      expect(info.skillCount).toBe(2);
      expect(info.root).toBe(paths.root);
    });
  });
});
