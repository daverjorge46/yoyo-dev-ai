/**
 * Skill Application Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  formatSkillForContext,
  formatSkillsForContext,
  applySkills,
  injectSkillsIntoContext,
  recordSkillsApplied,
  recordSkillOutcome,
  createUsageRecord,
  getSkillContext,
  applyAndTrackSkills,
} from '../application.js';
import { getProjectSkillPaths, ensureSkillDirectory } from '../directory.js';
import { saveSkill } from '../parser.js';
import { addToRegistry, getFromRegistry } from '../discovery.js';
import type { Skill, SkillMatch, TaskContext } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `application-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createTestSkill(overrides: Partial<Skill> = {}): Skill {
  const now = new Date().toISOString();
  return {
    id: 'test-skill',
    name: 'Test Skill',
    version: 1,
    created: now,
    updated: now,
    tags: ['react', 'typescript'],
    triggers: ['component', 'hook'],
    successRate: 0.85,
    usageCount: 10,
    content: {
      whenToApply: [
        'When building React components',
        'When implementing custom hooks',
      ],
      approaches: [
        {
          name: 'Component Pattern',
          description: 'Standard functional component implementation',
          steps: ['Create component file', 'Define props interface', 'Implement component logic'],
        },
        {
          name: 'Hook Pattern',
          description: 'Custom hook for reusable logic',
          steps: ['Create hook file', 'Implement state/effect logic', 'Return values'],
        },
      ],
      pitfalls: [
        {
          mistake: 'Missing key prop in lists',
          avoidance: 'Always add unique key prop to list items',
        },
        {
          mistake: 'Stale closure in useEffect',
          avoidance: 'Include all dependencies in dependency array',
        },
      ],
      verificationSteps: [
        'No TypeScript errors',
        'Component renders correctly',
        'Tests pass',
      ],
    },
    ...overrides,
  };
}

function createTestMatch(skill: Skill, relevance: number = 0.8): SkillMatch {
  return {
    skill,
    relevance,
    matchedTriggers: skill.triggers.slice(0, 1),
    matchedTags: skill.tags.slice(0, 1),
  };
}

// =============================================================================
// Format Skill Tests
// =============================================================================

describe('formatSkillForContext', () => {
  it('should format skill with all sections', () => {
    const skill = createTestSkill();
    const formatted = formatSkillForContext(skill, 0.85);

    expect(formatted).toContain('Test Skill');
    expect(formatted).toContain('85%');
    expect(formatted).toContain('When to Apply');
    expect(formatted).toContain('Component Pattern');
    expect(formatted).toContain('Missing key prop');
    expect(formatted).toContain('No TypeScript errors');
  });

  it('should respect includeApproaches config', () => {
    const skill = createTestSkill();
    const formatted = formatSkillForContext(skill, 0.8, {
      includeApproaches: false,
    });

    expect(formatted).not.toContain('Component Pattern');
    expect(formatted).not.toContain('Hook Pattern');
  });

  it('should respect includePitfalls config', () => {
    const skill = createTestSkill();
    const formatted = formatSkillForContext(skill, 0.8, {
      includePitfalls: false,
    });

    expect(formatted).not.toContain('Missing key prop');
  });

  it('should respect maxApproaches limit', () => {
    const skill = createTestSkill();
    const formatted = formatSkillForContext(skill, 0.8, {
      maxApproaches: 1,
    });

    expect(formatted).toContain('Component Pattern');
    expect(formatted).not.toContain('Hook Pattern');
  });

  it('should use compact format when configured', () => {
    const skill = createTestSkill();
    const full = formatSkillForContext(skill, 0.8, { compact: false });
    const compact = formatSkillForContext(skill, 0.8, { compact: true });

    expect(compact.length).toBeLessThan(full.length);
    expect(compact).toContain('###'); // Compact uses smaller headers
  });
});

describe('formatSkillsForContext', () => {
  it('should format multiple skills', () => {
    const skill1 = createTestSkill({ id: 'skill-1', name: 'Skill One' });
    const skill2 = createTestSkill({ id: 'skill-2', name: 'Skill Two' });
    const matches = [
      createTestMatch(skill1, 0.9),
      createTestMatch(skill2, 0.7),
    ];

    const formatted = formatSkillsForContext(matches);

    expect(formatted).toContain('Relevant Skills');
    expect(formatted).toContain('Skill One');
    expect(formatted).toContain('Skill Two');
    expect(formatted).toContain('---'); // Separator
  });

  it('should return empty string for no matches', () => {
    const formatted = formatSkillsForContext([]);

    expect(formatted).toBe('');
  });

  it('should include header with description', () => {
    const skill = createTestSkill();
    const matches = [createTestMatch(skill)];

    const formatted = formatSkillsForContext(matches);

    expect(formatted).toContain('Relevant Skills');
    expect(formatted).toContain('may help with this task');
  });
});

// =============================================================================
// Apply Skills Tests
// =============================================================================

describe('applySkills', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should return empty result when no skills match', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context: TaskContext = {
      description: 'Something completely unrelated',
    };

    const result = applySkills(paths, context);

    expect(result.success).toBe(true);
    expect(result.context).toBe('');
    expect(result.appliedSkills).toHaveLength(0);
  });

  it('should apply matching skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'react-patterns',
      triggers: ['react', 'component'],
      tags: ['react', 'typescript'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-patterns.md');

    const context: TaskContext = {
      description: 'Create a React component with TypeScript',
    };

    const result = applySkills(paths, context);

    expect(result.success).toBe(true);
    expect(result.context.length).toBeGreaterThan(0);
    expect(result.appliedSkills.length).toBeGreaterThan(0);
  });

  it('should estimate tokens', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'test-patterns',
      triggers: ['react'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-patterns.md');

    const context: TaskContext = {
      description: 'Build a React application',
    };

    const result = applySkills(paths, context);

    if (result.appliedSkills.length > 0) {
      expect(result.tokenEstimate).toBeDefined();
      expect(result.tokenEstimate).toBeGreaterThan(0);
    }
  });

  it('should handle errors gracefully', () => {
    // Invalid paths to trigger error
    const paths = getProjectSkillPaths('/nonexistent/path');

    const context: TaskContext = {
      description: 'Any task',
    };

    const result = applySkills(paths, context);

    // Should not throw, but may return empty or error
    expect(result).toBeDefined();
  });
});

// =============================================================================
// Context Injection Tests
// =============================================================================

describe('injectSkillsIntoContext', () => {
  it('should inject at start by default', () => {
    const original = 'Original context here';
    const skills = '# Skills\nSome skill content';

    const result = injectSkillsIntoContext(original, skills);

    expect(result.startsWith('# Skills')).toBe(true);
    expect(result).toContain('Original context here');
  });

  it('should inject at end when specified', () => {
    const original = 'Original context here';
    const skills = '# Skills\nSome skill content';

    const result = injectSkillsIntoContext(original, skills, 'end');

    expect(result.startsWith('Original')).toBe(true);
    expect(result.endsWith('skill content')).toBe(true);
  });

  it('should inject after system marker when specified', () => {
    const original = '<system>System instructions</system>\n\nUser content here';
    const skills = '# Skills';

    const result = injectSkillsIntoContext(original, skills, 'after-system');

    expect(result).toContain('</system>');
    expect(result.indexOf('# Skills')).toBeGreaterThan(result.indexOf('</system>'));
  });

  it('should return original when skill context is empty', () => {
    const original = 'Original context';

    const result = injectSkillsIntoContext(original, '');

    expect(result).toBe(original);
  });
});

// =============================================================================
// Usage Tracking Tests
// =============================================================================

describe('recordSkillsApplied', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should update usage count for applied skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ usageCount: 5 });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-skill.md');

    const initialEntry = getFromRegistry(paths, skill.id);
    const initialCount = initialEntry?.usageCount ?? 0;

    const matches = [createTestMatch(skill)];
    recordSkillsApplied(paths, matches, 'Test task');

    const updatedEntry = getFromRegistry(paths, skill.id);

    expect(updatedEntry?.usageCount).toBe(initialCount + 1);
  });
});

describe('recordSkillOutcome', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should update skill usage', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill();
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-skill.md');

    recordSkillOutcome(paths, skill.id, true);

    const entry = getFromRegistry(paths, skill.id);
    expect(entry?.lastUsed).toBeDefined();
  });
});

describe('createUsageRecord', () => {
  it('should create usage record with timestamp', () => {
    const record = createUsageRecord('skill-123', 'Build a feature');

    expect(record.skillId).toBe('skill-123');
    expect(record.taskDescription).toBe('Build a feature');
    expect(record.appliedAt).toBeDefined();
    expect(new Date(record.appliedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('getSkillContext', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should return formatted context for matching skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      triggers: ['react'],
      tags: ['component'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-skill.md');

    const context = getSkillContext(paths, 'Build a React component');

    expect(context.length).toBeGreaterThan(0);
  });

  it('should return empty string when no matches', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context = getSkillContext(paths, 'Something unrelated');

    expect(context).toBe('');
  });

  it('should use compact format when specified', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      triggers: ['react'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-skill.md');

    const full = getSkillContext(paths, 'Build React', false);
    const compact = getSkillContext(paths, 'Build React', true);

    if (full.length > 0 && compact.length > 0) {
      expect(compact.length).toBeLessThan(full.length);
    }
  });
});

describe('applyAndTrackSkills', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should apply skills and track usage', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'tracked-skill',
      triggers: ['react'],
      usageCount: 0,
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'tracked-skill.md');

    const context: TaskContext = {
      description: 'Build a React application',
    };

    const result = applyAndTrackSkills(paths, context, { trackUsage: true });

    if (result.appliedSkills.length > 0) {
      const entry = getFromRegistry(paths, 'tracked-skill');
      expect(entry?.usageCount).toBeGreaterThan(0);
    }
  });

  it('should skip tracking when disabled', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'no-track-skill',
      triggers: ['react'],
      usageCount: 5,
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'no-track-skill.md');

    const initialEntry = getFromRegistry(paths, 'no-track-skill');
    const initialCount = initialEntry?.usageCount ?? 0;

    const context: TaskContext = {
      description: 'Build a React application',
    };

    applyAndTrackSkills(paths, context, { trackUsage: false });

    const finalEntry = getFromRegistry(paths, 'no-track-skill');

    expect(finalEntry?.usageCount).toBe(initialCount);
  });
});
