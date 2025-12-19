/**
 * Skill Parser Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseSkillFile,
  parseSkillContent,
  parseSkill,
  serializeSkill,
  saveSkill,
} from '../parser.js';
import { getProjectSkillPaths, ensureSkillDirectory } from '../directory.js';
import type { Skill, SkillContent } from '../types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const VALID_SKILL_CONTENT = `---
id: react-hooks
name: React Hooks Patterns
version: 1
created: "2025-12-17T10:00:00Z"
updated: "2025-12-17T10:00:00Z"
tags:
  - react
  - hooks
triggers:
  - useEffect
  - useState
success_rate: 0.85
usage_count: 12
---

# React Hooks Patterns

## When to Apply

- Working with React functional components
- Managing component state
- Handling side effects

## Approaches

### State Management

Use useState for simple state.

- Initialize with default value
- Update with setter function
- Avoid stale closures

### Side Effects

Handle effects properly.

- Include cleanup functions
- Use dependency arrays

## Pitfalls

### Missing Dependencies

Always include all dependencies.

1. Check the dependency array
2. Use ESLint plugin

### Stale Closures

Values can become outdated.

Use refs for latest values.

## Verification Steps

1. No console warnings
2. Effects cleanup properly
3. State updates correctly
`;

const MINIMAL_SKILL_CONTENT = `---
id: minimal-skill
name: Minimal Skill
---

# Minimal Skill

Basic content.
`;

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `parser-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// =============================================================================
// Parse Content Tests
// =============================================================================

describe('Skill Content Parsing', () => {
  describe('parseSkillContent', () => {
    it('should parse valid skill content', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill!.id).toBe('react-hooks');
      expect(result.skill!.name).toBe('React Hooks Patterns');
      expect(result.skill!.version).toBe(1);
      expect(result.skill!.tags).toContain('react');
      expect(result.skill!.tags).toContain('hooks');
      expect(result.skill!.triggers).toContain('useEffect');
      expect(result.skill!.successRate).toBe(0.85);
      expect(result.skill!.usageCount).toBe(12);
    });

    it('should parse when to apply section', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);

      expect(result.skill!.content.whenToApply).toHaveLength(3);
      expect(result.skill!.content.whenToApply[0]).toBe('Working with React functional components');
    });

    it('should parse approaches section', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);

      expect(result.skill!.content.approaches).toHaveLength(2);
      expect(result.skill!.content.approaches[0].name).toBe('State Management');
      expect(result.skill!.content.approaches[0].steps.length).toBeGreaterThan(0);
    });

    it('should parse pitfalls section', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);

      expect(result.skill!.content.pitfalls).toHaveLength(2);
      expect(result.skill!.content.pitfalls[0].mistake).toBe('Missing Dependencies');
    });

    it('should parse verification steps', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);

      expect(result.skill!.content.verificationSteps).toHaveLength(3);
      expect(result.skill!.content.verificationSteps[0]).toBe('No console warnings');
    });

    it('should parse minimal skill content', () => {
      const result = parseSkillContent(MINIMAL_SKILL_CONTENT);

      expect(result.success).toBe(true);
      expect(result.skill!.id).toBe('minimal-skill');
      expect(result.skill!.name).toBe('Minimal Skill');
      expect(result.skill!.version).toBe(1);
      expect(result.skill!.tags).toEqual([]);
      expect(result.skill!.triggers).toEqual([]);
      expect(result.skill!.successRate).toBe(0);
    });

    it('should preserve raw body', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);

      expect(result.skill!.content.rawBody).toBeDefined();
      expect(result.skill!.content.rawBody).toContain('# React Hooks Patterns');
    });
  });

  describe('validation', () => {
    it('should reject content without id', () => {
      const content = `---
name: Missing ID
---
Content
`;
      const result = parseSkillContent(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('id');
    });

    it('should reject content without name', () => {
      const content = `---
id: missing-name
---
Content
`;
      const result = parseSkillContent(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should reject invalid success_rate', () => {
      const content = `---
id: invalid-rate
name: Invalid Rate
success_rate: 2.0
---
Content
`;
      const result = parseSkillContent(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('success_rate');
    });

    it('should reject non-array tags', () => {
      const content = `---
id: invalid-tags
name: Invalid Tags
tags: "not-an-array"
---
Content
`;
      const result = parseSkillContent(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('tags');
    });
  });
});

// =============================================================================
// File Parsing Tests
// =============================================================================

describe('Skill File Parsing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('parseSkillFile', () => {
    it('should parse skill from file', () => {
      const filepath = join(tempDir, 'skill.md');
      writeFileSync(filepath, VALID_SKILL_CONTENT);

      const result = parseSkillFile(filepath);

      expect(result.success).toBe(true);
      expect(result.skill!.id).toBe('react-hooks');
    });

    it('should handle missing file', () => {
      const result = parseSkillFile('/nonexistent/path.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read file');
    });
  });

  describe('parseSkill', () => {
    it('should parse skill by id', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);
      writeFileSync(join(paths.root, 'react-hooks.md'), VALID_SKILL_CONTENT);

      const result = parseSkill(paths, 'react-hooks');

      expect(result.success).toBe(true);
      expect(result.skill!.id).toBe('react-hooks');
    });
  });
});

// =============================================================================
// Serialization Tests
// =============================================================================

describe('Skill Serialization', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('serializeSkill', () => {
    it('should serialize skill to markdown', () => {
      const skill: Skill = {
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
          whenToApply: ['When testing'],
          approaches: [{
            name: 'Test Approach',
            description: 'A testing approach',
            steps: ['Step 1', 'Step 2'],
          }],
          pitfalls: [{
            mistake: 'Common mistake',
            avoidance: 'How to avoid',
          }],
          verificationSteps: ['Verify step 1'],
        },
      };

      const markdown = serializeSkill(skill);

      expect(markdown).toContain('id: test-skill');
      expect(markdown).toContain('name: Test Skill');
      expect(markdown).toContain('success_rate: 0.75');
    });

    it('should roundtrip skill content', () => {
      const result = parseSkillContent(VALID_SKILL_CONTENT);
      expect(result.success).toBe(true);

      const serialized = serializeSkill(result.skill!);
      const reparsed = parseSkillContent(serialized);

      expect(reparsed.success).toBe(true);
      expect(reparsed.skill!.id).toBe(result.skill!.id);
      expect(reparsed.skill!.name).toBe(result.skill!.name);
      expect(reparsed.skill!.tags).toEqual(result.skill!.tags);
    });
  });

  describe('saveSkill', () => {
    it('should save skill to file', () => {
      const paths = getProjectSkillPaths(tempDir);
      ensureSkillDirectory(paths);

      const skill: Skill = {
        id: 'saved-skill',
        name: 'Saved Skill',
        version: 1,
        created: '2025-12-17T10:00:00Z',
        updated: '2025-12-17T10:00:00Z',
        tags: [],
        triggers: [],
        successRate: 0,
        usageCount: 0,
        content: {
          whenToApply: [],
          approaches: [],
          pitfalls: [],
          verificationSteps: [],
        },
      };

      const savedPath = saveSkill(paths, skill);

      expect(existsSync(savedPath)).toBe(true);
      expect(savedPath).toContain('saved-skill.md');

      const content = readFileSync(savedPath, 'utf-8');
      expect(content).toContain('id: saved-skill');
    });
  });
});
