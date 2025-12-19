/**
 * Creation Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  patternsToApproaches,
  pitfallsToSkillPitfalls,
  generateWhenToApply,
  generateVerificationSteps,
  generateSkillContent,
  generateUniqueId,
  createSkillFromReflection,
  validateCreationInput,
  mergeReflections,
  generateSkillPreview,
} from '../creation.js';
import { getProjectSkillPaths, ensureSkillDirectory } from '../directory.js';
import type {
  ReflectionResult,
  ExtractedPattern,
  ExtractedPitfall,
  SkillCreationInput,
} from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `creation-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createReflection(overrides: Partial<ReflectionResult> = {}): ReflectionResult {
  return {
    taskCompleted: true,
    reasoningQuality: 0.8,
    shouldCreateSkill: true,
    patterns: [
      {
        name: 'Test Pattern',
        description: 'A test pattern',
        context: 'When testing',
        steps: ['Step 1', 'Step 2'],
      },
    ],
    pitfalls: [
      {
        issue: 'Common mistake',
        resolution: 'Fixed it',
        prevention: 'Check before',
      },
    ],
    suggestedName: 'Test Skill',
    suggestedTags: ['test', 'example'],
    suggestedTriggers: ['test', 'example'],
    ...overrides,
  };
}

// =============================================================================
// Conversion Function Tests
// =============================================================================

describe('patternsToApproaches', () => {
  it('should convert patterns to approaches', () => {
    const patterns: ExtractedPattern[] = [
      {
        name: 'Pattern 1',
        description: 'Description 1',
        context: 'Context 1',
        steps: ['Step 1', 'Step 2'],
      },
    ];

    const approaches = patternsToApproaches(patterns);

    expect(approaches).toHaveLength(1);
    expect(approaches[0].name).toBe('Pattern 1');
    expect(approaches[0].description).toBe('Description 1');
    expect(approaches[0].steps).toEqual(['Step 1', 'Step 2']);
  });
});

describe('pitfallsToSkillPitfalls', () => {
  it('should convert pitfalls to skill pitfalls', () => {
    const pitfalls: ExtractedPitfall[] = [
      {
        issue: 'Issue 1',
        resolution: 'Resolution 1',
        prevention: 'Prevention 1',
      },
    ];

    const skillPitfalls = pitfallsToSkillPitfalls(pitfalls);

    expect(skillPitfalls).toHaveLength(1);
    expect(skillPitfalls[0].mistake).toBe('Issue 1');
    expect(skillPitfalls[0].avoidance).toContain('Resolution 1');
    expect(skillPitfalls[0].avoidance).toContain('Prevention 1');
  });
});

// =============================================================================
// Content Generation Tests
// =============================================================================

describe('generateWhenToApply', () => {
  it('should generate items from tags', () => {
    const reflection = createReflection({
      suggestedTags: ['react', 'typescript'],
    });

    const items = generateWhenToApply(reflection);

    expect(items.length).toBeGreaterThan(0);
    expect(items.some(i => i.toLowerCase().includes('react'))).toBe(true);
  });

  it('should use pattern contexts', () => {
    const reflection = createReflection({
      patterns: [{ name: 'P', description: '', context: 'When doing X', steps: [] }],
    });

    const items = generateWhenToApply(reflection);

    expect(items).toContain('When doing X');
  });
});

describe('generateVerificationSteps', () => {
  it('should generate basic verification steps', () => {
    const reflection = createReflection();
    const steps = generateVerificationSteps(reflection);

    expect(steps.length).toBeGreaterThan(0);
    expect(steps.some(s => s.toLowerCase().includes('error'))).toBe(true);
  });

  it('should add test step for testing-related skills', () => {
    const reflection = createReflection({
      suggestedTags: ['testing'],
    });

    const steps = generateVerificationSteps(reflection);

    expect(steps.some(s => s.toLowerCase().includes('test'))).toBe(true);
  });
});

describe('generateSkillContent', () => {
  it('should generate complete skill content', () => {
    const reflection = createReflection();
    const content = generateSkillContent(reflection);

    expect(content.whenToApply.length).toBeGreaterThan(0);
    expect(content.approaches.length).toBeGreaterThan(0);
    expect(content.pitfalls.length).toBeGreaterThan(0);
    expect(content.verificationSteps.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Skill Creation Tests
// =============================================================================

describe('generateUniqueId', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should generate ID from name', () => {
    const id = generateUniqueId('Test Skill');
    expect(id).toBe('test-skill');
  });

  it('should generate unique ID when duplicate exists', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    // Create a skill first (using already imported createSkillFromReflection)
    createSkillFromReflection({ reflection: createReflection() }, paths);

    // Generate ID for same name
    const id = generateUniqueId('Test Skill', paths);
    expect(id).toMatch(/^test-skill-\d+$/);
  });
});

describe('createSkillFromReflection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should create skill from reflection', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const input: SkillCreationInput = {
      reflection: createReflection(),
    };

    const result = createSkillFromReflection(input, paths);

    expect(result.success).toBe(true);
    expect(result.skill).toBeDefined();
    expect(result.skill!.name).toBe('Test Skill');
    expect(result.path).toBeDefined();
  });

  it('should use custom name when provided', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
      name: 'Custom Name',
    };

    const result = createSkillFromReflection(input);

    expect(result.success).toBe(true);
    expect(result.skill!.name).toBe('Custom Name');
  });

  it('should use custom tags when provided', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
      tags: ['custom', 'tags'],
    };

    const result = createSkillFromReflection(input);

    expect(result.success).toBe(true);
    expect(result.skill!.tags).toEqual(['custom', 'tags']);
  });

  it('should fail when reflection does not recommend creation', () => {
    const input: SkillCreationInput = {
      reflection: createReflection({ shouldCreateSkill: false }),
    };

    const result = createSkillFromReflection(input);

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not recommend');
  });

  it('should save skill to file when paths provided', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const input: SkillCreationInput = {
      reflection: createReflection(),
    };

    const result = createSkillFromReflection(input, paths);

    expect(result.success).toBe(true);
    expect(result.path).toBeDefined();
    expect(existsSync(result.path!)).toBe(true);
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateCreationInput', () => {
  it('should pass valid input', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
      name: 'Valid Name',
    };

    expect(validateCreationInput(input)).toBeNull();
  });

  it('should fail for missing reflection', () => {
    const input = {} as SkillCreationInput;

    expect(validateCreationInput(input)).toContain('Missing reflection');
  });

  it('should fail for short name', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
      name: 'AB',
    };

    expect(validateCreationInput(input)).toContain('at least 3');
  });

  it('should fail for too many tags', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
      tags: Array(25).fill('tag'),
    };

    expect(validateCreationInput(input)).toContain('Too many tags');
  });
});

// =============================================================================
// Merge Reflections Tests
// =============================================================================

describe('mergeReflections', () => {
  it('should merge multiple reflections', () => {
    const reflections = [
      createReflection({ suggestedTags: ['tag1'] }),
      createReflection({ suggestedTags: ['tag2'] }),
    ];

    const merged = mergeReflections(reflections);

    expect(merged.reflection.suggestedTags).toContain('tag1');
    expect(merged.reflection.suggestedTags).toContain('tag2');
  });

  it('should deduplicate patterns', () => {
    const pattern = { name: 'Same', description: '', context: '', steps: [] };
    const reflections = [
      createReflection({ patterns: [pattern] }),
      createReflection({ patterns: [pattern] }),
    ];

    const merged = mergeReflections(reflections);

    expect(merged.reflection.patterns).toHaveLength(1);
  });

  it('should throw for empty array', () => {
    expect(() => mergeReflections([])).toThrow('No reflections');
  });

  it('should return single reflection as-is', () => {
    const reflection = createReflection();
    const merged = mergeReflections([reflection]);

    expect(merged.reflection).toBe(reflection);
  });
});

// =============================================================================
// Preview Tests
// =============================================================================

describe('generateSkillPreview', () => {
  it('should generate markdown preview', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
    };

    const preview = generateSkillPreview(input);

    expect(preview).toContain('# Test Skill');
    expect(preview).toContain('**Tags:**');
    expect(preview).toContain('**Triggers:**');
    expect(preview).toContain('## When to Apply');
    expect(preview).toContain('## Approaches');
    expect(preview).toContain('## Pitfalls');
    expect(preview).toContain('## Verification Steps');
  });

  it('should use custom name in preview', () => {
    const input: SkillCreationInput = {
      reflection: createReflection(),
      name: 'Custom Skill Name',
    };

    const preview = generateSkillPreview(input);

    expect(preview).toContain('# Custom Skill Name');
  });
});
