/**
 * Skill Service Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SkillService,
  createProjectSkillService,
  createGlobalSkillService,
} from '../service.js';
import type { Skill } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `service-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createTestSkill(overrides: Partial<Skill> = {}): Partial<Skill> & { name: string } {
  return {
    name: 'Test Skill',
    tags: ['test'],
    triggers: ['keyword'],
    content: {
      whenToApply: ['When testing'],
      approaches: [],
      pitfalls: [],
      verificationSteps: [],
    },
    ...overrides,
  };
}

// =============================================================================
// Service Initialization Tests
// =============================================================================

describe('SkillService Initialization', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should create service with project scope', () => {
    const service = new SkillService({
      scope: 'project',
      projectRoot: tempDir,
    });

    expect(service.getPaths().root).toContain(tempDir);
  });

  it('should initialize skill directory', () => {
    const service = createProjectSkillService(tempDir);
    service.initialize();

    expect(existsSync(service.getPaths().root)).toBe(true);
  });

  it('should create factory functions correctly', () => {
    const projectService = createProjectSkillService(tempDir);
    expect(projectService.getPaths().root).toContain('.skills');

    const globalService = createGlobalSkillService();
    expect(globalService.getPaths().root).toContain('.yoyo-ai');
  });
});

// =============================================================================
// CRUD Operations Tests
// =============================================================================

describe('SkillService CRUD Operations', () => {
  let tempDir: string;
  let service: SkillService;

  beforeEach(() => {
    tempDir = createTempDir();
    service = createProjectSkillService(tempDir);
    service.initialize();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('createSkill', () => {
    it('should create a new skill', () => {
      const skill = service.createSkill(createTestSkill());

      expect(skill.id).toBe('test-skill');
      expect(skill.name).toBe('Test Skill');
      expect(skill.version).toBe(1);
      expect(skill.tags).toContain('test');
    });

    it('should generate ID from name', () => {
      const skill = service.createSkill(createTestSkill({ name: 'React Hooks Patterns' }));

      expect(skill.id).toBe('react-hooks-patterns');
    });

    it('should use provided valid ID', () => {
      const skill = service.createSkill(createTestSkill({ id: 'custom-id' }));

      expect(skill.id).toBe('custom-id');
    });

    it('should throw on duplicate ID', () => {
      service.createSkill(createTestSkill());

      expect(() => service.createSkill(createTestSkill())).toThrow('already exists');
    });

    it('should set created and updated timestamps', () => {
      const skill = service.createSkill(createTestSkill());

      expect(skill.created).toBeDefined();
      expect(skill.updated).toBeDefined();
    });
  });

  describe('getSkill', () => {
    it('should get skill by ID', () => {
      service.createSkill(createTestSkill());

      const skill = service.getSkill('test-skill');

      expect(skill).toBeDefined();
      expect(skill!.name).toBe('Test Skill');
    });

    it('should return undefined for non-existent skill', () => {
      const skill = service.getSkill('non-existent');

      expect(skill).toBeUndefined();
    });
  });

  describe('updateSkill', () => {
    it('should update existing skill', () => {
      service.createSkill(createTestSkill());

      const updated = service.updateSkill('test-skill', { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.version).toBe(2);
    });

    it('should preserve immutable fields', () => {
      const created = service.createSkill(createTestSkill());

      const updated = service.updateSkill('test-skill', { name: 'New Name' });

      expect(updated.id).toBe(created.id);
      expect(updated.created).toBe(created.created);
    });

    it('should throw for non-existent skill', () => {
      expect(() => service.updateSkill('non-existent', { name: 'New' })).toThrow('not found');
    });
  });

  describe('deleteSkill', () => {
    it('should delete existing skill', () => {
      service.createSkill(createTestSkill());

      const deleted = service.deleteSkill('test-skill');

      expect(deleted).toBe(true);
      expect(service.getSkill('test-skill')).toBeUndefined();
    });

    it('should return false for non-existent skill', () => {
      const deleted = service.deleteSkill('non-existent');

      expect(deleted).toBe(false);
    });
  });
});

// =============================================================================
// List and Search Tests
// =============================================================================

describe('SkillService List and Search', () => {
  let tempDir: string;
  let service: SkillService;

  beforeEach(() => {
    tempDir = createTempDir();
    service = createProjectSkillService(tempDir);
    service.initialize();

    // Create test skills
    service.createSkill(createTestSkill({ name: 'React Hooks', tags: ['react', 'frontend'], triggers: ['useEffect'] }));
    service.createSkill(createTestSkill({ name: 'API Patterns', tags: ['api', 'backend'], triggers: ['fetch'] }));
    service.createSkill(createTestSkill({ name: 'Testing Utils', tags: ['test', 'frontend'], triggers: ['jest'] }));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('listSkills', () => {
    it('should list all skills', () => {
      const skills = service.listSkills();

      expect(skills).toHaveLength(3);
    });

    it('should filter by tags', () => {
      const skills = service.listSkills({ tags: ['frontend'] });

      expect(skills).toHaveLength(2);
    });

    it('should sort by name', () => {
      const skills = service.listSkills({ sortBy: 'name', sortOrder: 'asc' });

      expect(skills[0].name).toBe('API Patterns');
      expect(skills[2].name).toBe('Testing Utils');
    });

    it('should limit results', () => {
      const skills = service.listSkills({ limit: 2 });

      expect(skills).toHaveLength(2);
    });
  });

  describe('searchSkills', () => {
    it('should search by name', () => {
      const skills = service.searchSkills({ query: 'react' });

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('React Hooks');
    });

    it('should search by tag', () => {
      const skills = service.searchSkills({ query: 'frontend' });

      expect(skills).toHaveLength(2);
    });

    it('should search by trigger', () => {
      const skills = service.searchSkills({ query: 'fetch' });

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('API Patterns');
    });

    it('should be case insensitive', () => {
      const skills = service.searchSkills({ query: 'REACT' });

      expect(skills).toHaveLength(1);
    });

    it('should limit search results', () => {
      const skills = service.searchSkills({ query: 'a', limit: 1 });

      expect(skills).toHaveLength(1);
    });
  });
});

// =============================================================================
// Usage Tracking Tests
// =============================================================================

describe('SkillService Usage Tracking', () => {
  let tempDir: string;
  let service: SkillService;

  beforeEach(() => {
    tempDir = createTempDir();
    service = createProjectSkillService(tempDir);
    service.initialize();
    service.createSkill(createTestSkill());
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('recordUsage', () => {
    it('should increment usage count', () => {
      service.recordUsage('test-skill', true);

      const entry = service.getSkillEntry('test-skill');
      expect(entry!.usageCount).toBe(1);
    });

    it('should update success rate', () => {
      service.recordUsage('test-skill', true);
      service.recordUsage('test-skill', false);

      const entry = service.getSkillEntry('test-skill');
      expect(entry!.successRate).toBe(0.5);
    });

    it('should set lastUsed timestamp', () => {
      service.recordUsage('test-skill', true);

      const entry = service.getSkillEntry('test-skill');
      expect(entry!.lastUsed).toBeDefined();
    });
  });

  describe('getSkillEntry', () => {
    it('should get skill entry with usage stats', () => {
      service.recordUsage('test-skill', true);

      const entry = service.getSkillEntry('test-skill');

      expect(entry).toBeDefined();
      expect(entry!.usageCount).toBe(1);
    });

    it('should return undefined for non-existent skill', () => {
      const entry = service.getSkillEntry('non-existent');

      expect(entry).toBeUndefined();
    });
  });
});

// =============================================================================
// Bulk Operations Tests
// =============================================================================

describe('SkillService Bulk Operations', () => {
  let tempDir: string;
  let service: SkillService;

  beforeEach(() => {
    tempDir = createTempDir();
    service = createProjectSkillService(tempDir);
    service.initialize();

    service.createSkill(createTestSkill({ name: 'Skill 1' }));
    service.createSkill(createTestSkill({ name: 'Skill 2' }));
    service.recordUsage('skill-1', true);
    service.recordUsage('skill-2', true);
    service.recordUsage('skill-2', false);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getSkillCount', () => {
    it('should return total skill count', () => {
      expect(service.getSkillCount()).toBe(2);
    });
  });

  describe('getAverageSuccessRate', () => {
    it('should calculate average success rate', () => {
      const avg = service.getAverageSuccessRate();

      // skill-1: 100%, skill-2: 50%, avg = 75%
      expect(avg).toBe(0.75);
    });

    it('should return 0 for no skills', () => {
      service.deleteSkill('skill-1');
      service.deleteSkill('skill-2');

      expect(service.getAverageSuccessRate()).toBe(0);
    });
  });

  describe('getTotalUsageCount', () => {
    it('should return total usage count', () => {
      expect(service.getTotalUsageCount()).toBe(3);
    });
  });

  describe('refresh', () => {
    it('should refresh registry from files', () => {
      // Delete a skill file manually (simulating external change)
      const filepath = join(service.getPaths().root, 'skill-1.md');
      rmSync(filepath);

      service.refresh();

      expect(service.getSkillCount()).toBe(1);
    });
  });
});
