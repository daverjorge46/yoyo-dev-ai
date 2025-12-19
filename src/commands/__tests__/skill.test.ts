/**
 * Skill Commands Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { skillCommand } from '../skill.js';
import {
  getProjectSkillPaths,
  ensureSkillDirectory,
  saveSkill,
  addToRegistry,
  type Skill,
} from '../../skills/index.js';
import type { CommandContext } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `skill-cmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
      ],
      pitfalls: [
        {
          mistake: 'Missing key prop in lists',
          avoidance: 'Always add unique key prop to list items',
        },
      ],
      verificationSteps: [
        'No TypeScript errors',
        'Component renders correctly',
      ],
    },
    ...overrides,
  };
}

function createMockContext(): CommandContext {
  return {
    state: {
      mode: 'normal',
      inputBuffer: '',
      cursorPosition: 0,
      history: [],
      historyIndex: -1,
      lastOutput: null,
      isProcessing: false,
      scrollOffset: 0,
    },
    dispatch: vi.fn(),
    config: {
      prompt: '> ',
      historySize: 100,
      enableColors: true,
    },
  };
}

// =============================================================================
// Command Definition Tests
// =============================================================================

describe('skillCommand definition', () => {
  it('should have correct name', () => {
    expect(skillCommand.name).toBe('skill');
  });

  it('should have correct aliases', () => {
    expect(skillCommand.aliases).toEqual(['skills', 'sk']);
  });

  it('should have description', () => {
    expect(skillCommand.description).toBe('Manage learned skills');
  });

  it('should have usage example', () => {
    expect(skillCommand.usage).toBe('/skill <subcommand> [options]');
  });

  it('should have handler function', () => {
    expect(typeof skillCommand.handler).toBe('function');
  });
});

// =============================================================================
// Help Subcommand Tests
// =============================================================================

describe('skill help', () => {
  it('should display help information', () => {
    const context = createMockContext();
    const result = skillCommand.handler('help', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Skill Commands');
    expect(result.output).toContain('/skill list');
    expect(result.output).toContain('/skill show');
    expect(result.output).toContain('/skill apply');
    expect(result.output).toContain('/skill delete');
    expect(result.output).toContain('/skill stats');
    expect(result.output).toContain('/skill search');
    expect(result.output).toContain('--global');
  });

  it('should handle ? alias for help', () => {
    const context = createMockContext();
    const result = skillCommand.handler('?', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Skill Commands');
  });
});

// =============================================================================
// List Subcommand Tests
// =============================================================================

describe('skill list', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should list skills when none exist', () => {
    const context = createMockContext();
    const result = skillCommand.handler('list', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('No skills found');
  });

  it('should list existing skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'react-skill', name: 'React Patterns' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-skill.md');

    const context = createMockContext();
    const result = skillCommand.handler('list', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('React Patterns');
    expect(result.output).toContain('react-skill');
  });

  it('should handle ls alias', () => {
    const context = createMockContext();
    const result = skillCommand.handler('ls', context);

    expect(result.success).toBe(true);
  });

  it('should support tag filter', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill1 = createTestSkill({ id: 'skill-1', name: 'Skill One', tags: ['react'] });
    const skill2 = createTestSkill({ id: 'skill-2', name: 'Skill Two', tags: ['vue'] });
    saveSkill(paths, skill1);
    saveSkill(paths, skill2);
    addToRegistry(paths, skill1, 'skill-1.md');
    addToRegistry(paths, skill2, 'skill-2.md');

    const context = createMockContext();
    const result = skillCommand.handler('list --tag=react', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Skill One');
    expect(result.output).not.toContain('Skill Two');
  });

  it('should support sort options', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill1 = createTestSkill({ id: 'skill-a', name: 'A Skill', usageCount: 5 });
    const skill2 = createTestSkill({ id: 'skill-b', name: 'B Skill', usageCount: 20 });
    saveSkill(paths, skill1);
    saveSkill(paths, skill2);
    addToRegistry(paths, skill1, 'skill-a.md');
    addToRegistry(paths, skill2, 'skill-b.md');

    const context = createMockContext();
    const result = skillCommand.handler('list --sort=usage', context);

    expect(result.success).toBe(true);
    // B Skill should appear first (higher usage)
    const outputLines = result.output?.split('\n') || [];
    const skillBIndex = outputLines.findIndex(l => l.includes('B Skill'));
    const skillAIndex = outputLines.findIndex(l => l.includes('A Skill'));
    expect(skillBIndex).toBeLessThan(skillAIndex);
  });
});

// =============================================================================
// Show Subcommand Tests
// =============================================================================

describe('skill show', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should show error when no skill ID provided', () => {
    const context = createMockContext();
    const result = skillCommand.handler('show', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Usage');
  });

  it('should show error for non-existent skill', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context = createMockContext();
    const result = skillCommand.handler('show nonexistent', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Skill not found');
  });

  it('should show skill details', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'react-patterns',
      name: 'React Patterns',
      tags: ['react', 'patterns'],
      triggers: ['component'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-patterns.md');

    const context = createMockContext();
    const result = skillCommand.handler('show react-patterns', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('React Patterns');
    expect(result.output).toContain('ID:');
    expect(result.output).toContain('Version:');
    expect(result.output).toContain('Tags:');
    expect(result.output).toContain('When to Apply');
    expect(result.output).toContain('Approaches');
  });

  it('should handle view alias', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'test-id' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-id.md');

    const context = createMockContext();
    const result = skillCommand.handler('view test-id', context);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Apply Subcommand Tests
// =============================================================================

describe('skill apply', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should show error when no skill ID provided', () => {
    const context = createMockContext();
    const result = skillCommand.handler('apply', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Usage');
  });

  it('should show error for non-existent skill', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context = createMockContext();
    const result = skillCommand.handler('apply nonexistent', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Skill not found');
  });

  it('should apply skill and show formatted context', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'react-patterns', name: 'React Patterns' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-patterns.md');

    const context = createMockContext();
    const result = skillCommand.handler('apply react-patterns', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Applying Skill');
    expect(result.output).toContain('React Patterns');
    expect(result.output).toContain('---');
  });

  it('should support compact format', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'compact-skill' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'compact-skill.md');

    const context = createMockContext();
    const fullResult = skillCommand.handler('apply compact-skill', context);
    const compactResult = skillCommand.handler('apply compact-skill --compact', context);

    expect(fullResult.success).toBe(true);
    expect(compactResult.success).toBe(true);
    expect((compactResult.output?.length || 0)).toBeLessThan((fullResult.output?.length || 0));
  });
});

// =============================================================================
// Delete Subcommand Tests
// =============================================================================

describe('skill delete', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should show error when no skill ID provided', () => {
    const context = createMockContext();
    const result = skillCommand.handler('delete', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Usage');
  });

  it('should show error for non-existent skill', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context = createMockContext();
    const result = skillCommand.handler('delete nonexistent --confirm', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Skill not found');
  });

  it('should require confirmation', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'to-delete' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'to-delete.md');

    const context = createMockContext();
    const result = skillCommand.handler('delete to-delete', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('--confirm');
  });

  it('should delete skill with confirmation', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'to-delete', name: 'Delete Me' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'to-delete.md');

    const context = createMockContext();
    const result = skillCommand.handler('delete to-delete --confirm', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('removed');
  });

  it('should handle rm alias', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'rm-test' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'rm-test.md');

    const context = createMockContext();
    const result = skillCommand.handler('rm rm-test --confirm', context);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Stats Subcommand Tests
// =============================================================================

describe('skill stats', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should show stats when no skills exist', () => {
    const context = createMockContext();
    const result = skillCommand.handler('stats', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Skill Statistics');
    expect(result.output).toContain('No skills found');
  });

  it('should show statistics for existing skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill1 = createTestSkill({ id: 'skill-1', usageCount: 10, successRate: 0.9, tags: ['react'] });
    const skill2 = createTestSkill({ id: 'skill-2', usageCount: 5, successRate: 0.8, tags: ['react', 'vue'] });
    saveSkill(paths, skill1);
    saveSkill(paths, skill2);
    addToRegistry(paths, skill1, 'skill-1.md');
    addToRegistry(paths, skill2, 'skill-2.md');

    const context = createMockContext();
    const result = skillCommand.handler('stats', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Skill Statistics');
    expect(result.output).toContain('Total Skills: 2');
    expect(result.output).toContain('Total Usage: 15');
    expect(result.output).toContain('Top Tags');
    expect(result.output).toContain('Most Used Skills');
  });

  it('should handle statistics alias', () => {
    const context = createMockContext();
    const result = skillCommand.handler('statistics', context);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Search Subcommand Tests
// =============================================================================

describe('skill search', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should show error when no query provided', () => {
    const context = createMockContext();
    const result = skillCommand.handler('search', context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Usage');
  });

  it('should show no results message', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context = createMockContext();
    const result = skillCommand.handler('search nonexistent', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('No skills found');
  });

  it('should find matching skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'react-patterns',
      name: 'React Patterns',
      tags: ['react', 'component'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-patterns.md');

    const context = createMockContext();
    const result = skillCommand.handler('search react', context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Search Results');
    expect(result.output).toContain('React Patterns');
  });

  it('should handle find alias', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context = createMockContext();
    const result = skillCommand.handler('find something', context);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Default Behavior Tests
// =============================================================================

describe('skill default behavior', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('should default to list when no subcommand', () => {
    const context = createMockContext();
    const result = skillCommand.handler('', context);

    // Empty string defaults to 'list' subcommand
    expect(result.success).toBe(true);
  });

  it('should treat unknown subcommand as skill ID for show', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({ id: 'some-skill' });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'some-skill.md');

    const context = createMockContext();
    const result = skillCommand.handler('some-skill', context);

    // Unknown subcommand that doesn't start with '-' should be treated as skill ID
    expect(result.success).toBe(true);
    expect(result.output).toContain('Test Skill');
  });

  it('should show error for truly unknown subcommands', () => {
    const context = createMockContext();
    const result = skillCommand.handler('--invalid', context);

    // Starts with '-' so treated as unknown subcommand
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown subcommand');
  });
});
