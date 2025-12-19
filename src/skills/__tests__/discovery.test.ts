/**
 * Skill Discovery Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadSkillRegistry,
  saveSkillRegistry,
  discoverSkills,
  skillToEntry,
  refreshRegistry,
  addToRegistry,
  removeFromRegistry,
  getFromRegistry,
  updateSkillUsage,
  getAllSkillEntries,
  findSkillsByTag,
  findSkillsByTrigger,
  getTopSkillsByUsage,
  getRecentSkills,
} from '../discovery.js';
import { getProjectSkillPaths, ensureSkillDirectory } from '../directory.js';
import type { Skill, SkillRegistry } from '../types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const SKILL_1_CONTENT = `---
id: skill-one
name: Skill One
version: 1
tags:
  - react
  - frontend
triggers:
  - component
success_rate: 0.8
usage_count: 10
---

# Skill One

Content for skill one.
`;

const SKILL_2_CONTENT = `---
id: skill-two
name: Skill Two
version: 1
tags:
  - api
  - backend
triggers:
  - endpoint
success_rate: 0.9
usage_count: 5
---

# Skill Two

Content for skill two.
`;

function createTestSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    version: 1,
    created: '2025-12-17T10:00:00Z',
    updated: '2025-12-17T10:00:00Z',
    tags: ['test'],
    triggers: ['keyword'],
    successRate: 0.75,
    usageCount: 5,
    content: {
      whenToApply: [],
      approaches: [],
      pitfalls: [],
      verificationSteps: [],
    },
    ...overrides,
  };
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `discovery-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// =============================================================================
// Registry Management Tests
// =============================================================================

describe('Skill Registry Management', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('loadSkillRegistry', () => {
    it('should return default registry for non-existent file', () => {
      const paths = getProjectSkillPaths(tempDir);
      const registry = loadSkillRegistry(paths);

      expect(registry.version).toBe(1);
      expect(registry.skills).toEqual([]);
    });

    it('should load existing registry', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);

      const existingRegistry: SkillRegistry = {
        version: 1,
        skills: [{ id: 'test', path: 'test.md', name: 'Test', tags: [], triggers: [], successRate: 0, usageCount: 0 }],
        updatedAt: '2025-12-17T10:00:00Z',
      };
      writeFileSync(paths.registry, JSON.stringify(existingRegistry));

      const registry = loadSkillRegistry(paths);

      expect(registry.skills).toHaveLength(1);
      expect(registry.skills[0].id).toBe('test');
    });

    it('should return default for invalid JSON', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(paths.registry, 'invalid json');

      const registry = loadSkillRegistry(paths);

      expect(registry.version).toBe(1);
      expect(registry.skills).toEqual([]);
    });
  });

  describe('saveSkillRegistry', () => {
    it('should save registry to file', () => {
      const paths = getProjectSkillPaths(tempDir);
      const registry: SkillRegistry = {
        version: 1,
        skills: [{ id: 'saved', path: 'saved.md', name: 'Saved', tags: [], triggers: [], successRate: 0, usageCount: 0 }],
        updatedAt: '2025-12-17T10:00:00Z',
      };

      saveSkillRegistry(paths, registry);

      expect(existsSync(paths.registry)).toBe(true);
      const loaded = JSON.parse(readFileSync(paths.registry, 'utf-8'));
      expect(loaded.skills[0].id).toBe('saved');
    });

    it('should create directory if needed', () => {
      const paths = getProjectSkillPaths(tempDir);
      const registry: SkillRegistry = { version: 1, skills: [], updatedAt: '' };

      saveSkillRegistry(paths, registry);

      expect(existsSync(paths.root)).toBe(true);
    });
  });
});

// =============================================================================
// Discovery Tests
// =============================================================================

describe('Skill Discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('discoverSkills', () => {
    it('should return empty array for non-existent directory', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skills = discoverSkills(paths);

      expect(skills).toEqual([]);
    });

    it('should discover all skill files', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(join(paths.root, 'skill-one.md'), SKILL_1_CONTENT);
      writeFileSync(join(paths.root, 'skill-two.md'), SKILL_2_CONTENT);

      const skills = discoverSkills(paths);

      expect(skills).toHaveLength(2);
      expect(skills.map(s => s.id)).toContain('skill-one');
      expect(skills.map(s => s.id)).toContain('skill-two');
    });

    it('should skip invalid skill files', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(join(paths.root, 'valid.md'), SKILL_1_CONTENT);
      writeFileSync(join(paths.root, 'invalid.md'), '---\ninvalid: yaml\n---\nNo id or name');

      const skills = discoverSkills(paths);

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe('skill-one');
    });
  });

  describe('skillToEntry', () => {
    it('should convert skill to entry', () => {
      const skill = createTestSkill();
      const entry = skillToEntry(skill, 'test-skill.md');

      expect(entry.id).toBe('test-skill');
      expect(entry.path).toBe('test-skill.md');
      expect(entry.name).toBe('Test Skill');
      expect(entry.tags).toEqual(['test']);
      expect(entry.triggers).toEqual(['keyword']);
    });
  });

  describe('refreshRegistry', () => {
    it('should create registry from skill files', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(join(paths.root, 'skill-one.md'), SKILL_1_CONTENT);

      const registry = refreshRegistry(paths);

      expect(registry.skills).toHaveLength(1);
      expect(registry.skills[0].id).toBe('skill-one');
    });

    it('should preserve usage data during refresh', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(join(paths.root, 'skill-one.md'), SKILL_1_CONTENT);

      // Create initial registry with usage data
      const initialRegistry: SkillRegistry = {
        version: 1,
        skills: [{
          id: 'skill-one',
          path: 'skill-one.md',
          name: 'Skill One',
          tags: ['react'],
          triggers: ['component'],
          successRate: 0.95,
          usageCount: 100,
          lastUsed: '2025-12-17T10:00:00Z',
        }],
        updatedAt: '2025-12-17T10:00:00Z',
      };
      writeFileSync(paths.registry, JSON.stringify(initialRegistry));

      const registry = refreshRegistry(paths);

      expect(registry.skills[0].usageCount).toBe(100);
      expect(registry.skills[0].successRate).toBe(0.95);
      expect(registry.skills[0].lastUsed).toBe('2025-12-17T10:00:00Z');
    });

    it('should remove deleted skills', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(join(paths.root, 'skill-one.md'), SKILL_1_CONTENT);

      // Create registry with extra skill
      const initialRegistry: SkillRegistry = {
        version: 1,
        skills: [
          { id: 'skill-one', path: 'skill-one.md', name: 'One', tags: [], triggers: [], successRate: 0, usageCount: 0 },
          { id: 'deleted-skill', path: 'deleted.md', name: 'Deleted', tags: [], triggers: [], successRate: 0, usageCount: 0 },
        ],
        updatedAt: '2025-12-17T10:00:00Z',
      };
      writeFileSync(paths.registry, JSON.stringify(initialRegistry));

      const registry = refreshRegistry(paths);

      expect(registry.skills).toHaveLength(1);
      expect(registry.skills[0].id).toBe('skill-one');
    });
  });
});

// =============================================================================
// Registry Operations Tests
// =============================================================================

describe('Registry Operations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('addToRegistry', () => {
    it('should add skill to registry', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skill = createTestSkill();

      addToRegistry(paths, skill, 'test-skill.md');

      const registry = loadSkillRegistry(paths);
      expect(registry.skills).toHaveLength(1);
      expect(registry.skills[0].id).toBe('test-skill');
    });

    it('should replace existing skill with same id', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skill1 = createTestSkill({ name: 'Old Name' });
      const skill2 = createTestSkill({ name: 'New Name' });

      addToRegistry(paths, skill1, 'test-skill.md');
      addToRegistry(paths, skill2, 'test-skill.md');

      const registry = loadSkillRegistry(paths);
      expect(registry.skills).toHaveLength(1);
      expect(registry.skills[0].name).toBe('New Name');
    });
  });

  describe('removeFromRegistry', () => {
    it('should remove skill from registry', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skill = createTestSkill();
      addToRegistry(paths, skill, 'test-skill.md');

      const removed = removeFromRegistry(paths, 'test-skill');

      expect(removed).toBe(true);
      const registry = loadSkillRegistry(paths);
      expect(registry.skills).toHaveLength(0);
    });

    it('should return false for non-existent skill', () => {
      const paths = getProjectSkillPaths(tempDir);

      const removed = removeFromRegistry(paths, 'non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('getFromRegistry', () => {
    it('should get skill entry by id', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skill = createTestSkill();
      addToRegistry(paths, skill, 'test-skill.md');

      const entry = getFromRegistry(paths, 'test-skill');

      expect(entry).toBeDefined();
      expect(entry!.name).toBe('Test Skill');
    });

    it('should return undefined for non-existent skill', () => {
      const paths = getProjectSkillPaths(tempDir);

      const entry = getFromRegistry(paths, 'non-existent');

      expect(entry).toBeUndefined();
    });
  });

  describe('updateSkillUsage', () => {
    it('should update usage count and success rate', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skill = createTestSkill({ successRate: 0.8, usageCount: 10 });
      addToRegistry(paths, skill, 'test-skill.md');

      updateSkillUsage(paths, 'test-skill', true);

      const entry = getFromRegistry(paths, 'test-skill');
      expect(entry!.usageCount).toBe(11);
      expect(entry!.lastUsed).toBeDefined();
    });

    it('should decrease success rate on failure', () => {
      const paths = getProjectSkillPaths(tempDir);
      const skill = createTestSkill({ successRate: 1.0, usageCount: 10 });
      addToRegistry(paths, skill, 'test-skill.md');

      updateSkillUsage(paths, 'test-skill', false);

      const entry = getFromRegistry(paths, 'test-skill');
      expect(entry!.successRate).toBeLessThan(1.0);
    });
  });
});

// =============================================================================
// Query Function Tests
// =============================================================================

describe('Registry Query Functions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getAllSkillEntries', () => {
    it('should return all skills', () => {
      const paths = getProjectSkillPaths(tempDir);
      addToRegistry(paths, createTestSkill({ id: 'skill-1' }), 'skill-1.md');
      addToRegistry(paths, createTestSkill({ id: 'skill-2' }), 'skill-2.md');

      const entries = getAllSkillEntries(paths);

      expect(entries).toHaveLength(2);
    });
  });

  describe('findSkillsByTag', () => {
    it('should find skills by tag', () => {
      const paths = getProjectSkillPaths(tempDir);
      addToRegistry(paths, createTestSkill({ id: 'skill-1', tags: ['react', 'frontend'] }), 'skill-1.md');
      addToRegistry(paths, createTestSkill({ id: 'skill-2', tags: ['api', 'backend'] }), 'skill-2.md');

      const entries = findSkillsByTag(paths, 'react');

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('skill-1');
    });
  });

  describe('findSkillsByTrigger', () => {
    it('should find skills by trigger keyword', () => {
      const paths = getProjectSkillPaths(tempDir);
      addToRegistry(paths, createTestSkill({ id: 'skill-1', triggers: ['useEffect', 'useState'] }), 'skill-1.md');
      addToRegistry(paths, createTestSkill({ id: 'skill-2', triggers: ['fetch', 'api'] }), 'skill-2.md');

      const entries = findSkillsByTrigger(paths, 'use');

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('skill-1');
    });
  });

  describe('getTopSkillsByUsage', () => {
    it('should return skills sorted by usage', () => {
      const paths = getProjectSkillPaths(tempDir);
      addToRegistry(paths, createTestSkill({ id: 'skill-1', usageCount: 5 }), 'skill-1.md');
      addToRegistry(paths, createTestSkill({ id: 'skill-2', usageCount: 20 }), 'skill-2.md');
      addToRegistry(paths, createTestSkill({ id: 'skill-3', usageCount: 10 }), 'skill-3.md');

      const entries = getTopSkillsByUsage(paths, 2);

      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('skill-2');
      expect(entries[1].id).toBe('skill-3');
    });
  });

  describe('getRecentSkills', () => {
    it('should return recently used skills', () => {
      const paths = getProjectSkillPaths(tempDir);

      const skill1 = createTestSkill({ id: 'skill-1' });
      addToRegistry(paths, skill1, 'skill-1.md');
      updateSkillUsage(paths, 'skill-1', true);

      const entries = getRecentSkills(paths, 5);

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('skill-1');
    });
  });
});
