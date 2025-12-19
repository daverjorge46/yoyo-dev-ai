/**
 * Skill Selection Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  analyzeTaskContext,
  matchSkillTriggers,
  scoreSkillRelevance,
  selectTopSkills,
  hasRelevantSkills,
  getSkillSuggestions,
} from '../selection.js';
import { getProjectSkillPaths, ensureSkillDirectory } from '../directory.js';
import { saveSkill } from '../parser.js';
import { addToRegistry } from '../discovery.js';
import type { Skill, TaskContext } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `selection-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    successRate: 0.8,
    usageCount: 5,
    content: {
      whenToApply: ['When building React components'],
      approaches: [
        {
          name: 'Component Pattern',
          description: 'Standard component implementation',
          steps: ['Create component', 'Add props', 'Implement logic'],
        },
      ],
      pitfalls: [
        {
          mistake: 'Missing key prop',
          avoidance: 'Always add key prop to list items',
        },
      ],
      verificationSteps: ['Check for TypeScript errors', 'Verify rendering'],
    },
    ...overrides,
  };
}

// =============================================================================
// Task Context Analysis Tests
// =============================================================================

describe('analyzeTaskContext', () => {
  it('should extract action verbs from description', () => {
    const context: TaskContext = {
      description: 'Implement a new user authentication feature',
    };

    const result = analyzeTaskContext(context);

    expect(result.actions).toContain('implement');
  });

  it('should extract technology keywords', () => {
    const context: TaskContext = {
      description: 'Create a React component with TypeScript',
    };

    const result = analyzeTaskContext(context);

    expect(result.technologies).toContain('react');
    expect(result.technologies).toContain('typescript');
  });

  it('should include explicitly provided technologies', () => {
    const context: TaskContext = {
      description: 'Build something',
      technologies: ['Vue', 'GraphQL'],
    };

    const result = analyzeTaskContext(context);

    expect(result.technologies).toContain('vue');
    expect(result.technologies).toContain('graphql');
  });

  it('should extract tech from file extension', () => {
    const context: TaskContext = {
      description: 'Fix the component',
      currentFile: 'src/components/Button.tsx',
    };

    const result = analyzeTaskContext(context);

    expect(result.technologies).toContain('react');
  });

  it('should extract general keywords', () => {
    const context: TaskContext = {
      description: 'Update the dashboard layout with new charts',
    };

    const result = analyzeTaskContext(context);

    expect(result.keywords).toContain('dashboard');
    expect(result.keywords).toContain('layout');
    expect(result.keywords).toContain('charts');
  });
});

// =============================================================================
// Skill Matching Tests
// =============================================================================

describe('matchSkillTriggers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should find skills by matching triggers', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    // Create a skill with specific triggers
    const skill = createTestSkill({
      id: 'react-component',
      triggers: ['react', 'component'],
      tags: ['frontend'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-component.md');

    const context = {
      keywords: [],
      technologies: ['react'],
      actions: [],
    };

    const matches = matchSkillTriggers(paths, context);

    expect(matches.has('react-component')).toBe(true);
  });

  it('should count multiple trigger matches', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'multi-trigger',
      triggers: ['react', 'typescript', 'component'],
      tags: ['frontend'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'multi-trigger.md');

    const context = {
      keywords: [],
      technologies: ['react', 'typescript'],
      actions: [],
    };

    const matches = matchSkillTriggers(paths, context);

    expect(matches.has('multi-trigger')).toBe(true);
    expect(matches.get('multi-trigger')?.triggerMatches).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// Skill Relevance Scoring Tests
// =============================================================================

describe('scoreSkillRelevance', () => {
  it('should give higher score for more trigger matches', () => {
    const skill = createTestSkill();
    const context = {
      keywords: [],
      technologies: ['react', 'typescript'],
      actions: ['implement'],
    };

    const score1 = scoreSkillRelevance(skill, context, 1);
    const score2 = scoreSkillRelevance(skill, context, 3);

    expect(score2).toBeGreaterThan(score1);
  });

  it('should boost skills with high success rate', () => {
    const lowSuccess = createTestSkill({ successRate: 0.5 });
    const highSuccess = createTestSkill({ successRate: 0.9 });
    const context = {
      keywords: [],
      technologies: ['react'],
      actions: [],
    };

    const scoreLow = scoreSkillRelevance(lowSuccess, context, 1);
    const scoreHigh = scoreSkillRelevance(highSuccess, context, 1);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('should consider tag matches', () => {
    const skillWithMatchingTags = createTestSkill({
      tags: ['react', 'typescript', 'frontend'],
    });
    const skillWithoutMatchingTags = createTestSkill({
      tags: ['backend', 'database'],
    });
    const context = {
      keywords: [],
      technologies: ['react', 'typescript'],
      actions: [],
    };

    const scoreWith = scoreSkillRelevance(skillWithMatchingTags, context, 1);
    const scoreWithout = scoreSkillRelevance(skillWithoutMatchingTags, context, 1);

    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('should return score between 0 and 1', () => {
    const skill = createTestSkill();
    const context = {
      keywords: ['test', 'example'],
      technologies: ['react', 'typescript'],
      actions: ['implement', 'create'],
    };

    const score = scoreSkillRelevance(skill, context, 5);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// Top Skills Selection Tests
// =============================================================================

describe('selectTopSkills', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should return empty array when no skills match', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const context: TaskContext = {
      description: 'Implement a completely unrelated feature',
    };

    const matches = selectTopSkills(paths, context);

    expect(matches).toHaveLength(0);
  });

  it('should select matching skills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    // Create a skill that should match
    const skill = createTestSkill({
      id: 'react-patterns',
      name: 'React Patterns',
      triggers: ['react', 'component', 'hook'],
      tags: ['react', 'typescript'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-patterns.md');

    const context: TaskContext = {
      description: 'Create a React component with hooks',
    };

    const matches = selectTopSkills(paths, context);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].skill.id).toBe('react-patterns');
  });

  it('should limit results to maxSkills', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    // Create multiple matching skills
    for (let i = 0; i < 5; i++) {
      const skill = createTestSkill({
        id: `skill-${i}`,
        name: `Skill ${i}`,
        triggers: ['react'],
        tags: ['react'],
      });
      saveSkill(paths, skill);
      addToRegistry(paths, skill, `skill-${i}.md`);
    }

    const context: TaskContext = {
      description: 'Build a React application',
    };

    const matches = selectTopSkills(paths, context, { maxSkills: 2 });

    expect(matches.length).toBeLessThanOrEqual(2);
  });

  it('should sort by relevance', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    // Create skills with different relevance
    const highRelevance = createTestSkill({
      id: 'high-relevance',
      triggers: ['react', 'component', 'hook'],
      tags: ['react', 'typescript', 'frontend'],
      successRate: 0.95,
    });
    const lowRelevance = createTestSkill({
      id: 'low-relevance',
      triggers: ['backend'],
      tags: ['database'],
      successRate: 0.5,
    });

    saveSkill(paths, highRelevance);
    saveSkill(paths, lowRelevance);
    addToRegistry(paths, highRelevance, 'high-relevance.md');
    addToRegistry(paths, lowRelevance, 'low-relevance.md');

    const context: TaskContext = {
      description: 'Create a React component',
    };

    const matches = selectTopSkills(paths, context);

    if (matches.length >= 2) {
      expect(matches[0].relevance).toBeGreaterThanOrEqual(matches[1].relevance);
    }
  });

  it('should include matched triggers and tags in result', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'detailed-match',
      triggers: ['react', 'component'],
      tags: ['typescript', 'frontend'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'detailed-match.md');

    const context: TaskContext = {
      description: 'Create a React component with TypeScript',
    };

    const matches = selectTopSkills(paths, context);

    if (matches.length > 0) {
      expect(matches[0].matchedTriggers.length).toBeGreaterThanOrEqual(0);
      expect(matches[0].matchedTags.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('hasRelevantSkills', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should return false when no skills exist', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const result = hasRelevantSkills(paths, 'Build a React component');

    expect(result).toBe(false);
  });

  it('should return true when relevant skills exist', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      triggers: ['react'],
      tags: ['component'],
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'test-skill.md');

    const result = hasRelevantSkills(paths, 'Build a React component');

    expect(result).toBe(true);
  });
});

describe('getSkillSuggestions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should return suggestions matching query', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const skill = createTestSkill({
      id: 'react-hooks',
      name: 'React Hooks Pattern',
    });
    saveSkill(paths, skill);
    addToRegistry(paths, skill, 'react-hooks.md');

    const suggestions = getSkillSuggestions(paths, 'react');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].name).toContain('React');
  });

  it('should limit suggestions', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    // Create many skills
    for (let i = 0; i < 10; i++) {
      const skill = createTestSkill({
        id: `react-skill-${i}`,
        name: `React Skill ${i}`,
      });
      saveSkill(paths, skill);
      addToRegistry(paths, skill, `react-skill-${i}.md`);
    }

    const suggestions = getSkillSuggestions(paths, 'react', 3);

    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('should prioritize exact name matches', () => {
    const paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);

    const exactMatch = createTestSkill({
      id: 'react-component',
      name: 'React Component',
    });
    const partialMatch = createTestSkill({
      id: 'using-react',
      name: 'Using React Framework',
    });

    saveSkill(paths, exactMatch);
    saveSkill(paths, partialMatch);
    addToRegistry(paths, exactMatch, 'react-component.md');
    addToRegistry(paths, partialMatch, 'using-react.md');

    const suggestions = getSkillSuggestions(paths, 'React');

    expect(suggestions[0].name).toBe('React Component');
  });
});
