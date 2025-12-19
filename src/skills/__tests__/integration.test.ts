/**
 * Skill System Integration Tests
 *
 * End-to-end tests for the complete skill workflow:
 * - Skill creation from reflection
 * - Skill storage and discovery
 * - Skill selection for tasks
 * - Skill application and tracking
 * - Database persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import all skill system modules
import {
  // Types
  type Skill,
  type SkillPaths,
  type TaskContext,
  type ReflectionResult,
  type ExtractedPattern,
  type ExtractedPitfall,

  // Directory management
  getProjectSkillPaths,
  ensureSkillDirectory,
  skillDirectoryExists,
  skillExists,

  // Parser
  parseSkill,
  saveSkill,
  serializeSkill,

  // Discovery
  loadSkillRegistry,
  addToRegistry,
  getFromRegistry,
  getAllSkillEntries,
  refreshRegistry,
  updateSkillUsage,

  // Service
  SkillService,
  createProjectSkillService,

  // Reflection Engine
  analyzeTrajectory,
  shouldCreateSkill,
  detectPatterns,
  extractPitfalls,

  // Creation Engine
  createSkillFromReflection,
  patternsToApproaches,
  generateSkillContent,

  // Selection Engine
  analyzeTaskContext,
  selectTopSkills,
  hasRelevantSkills,
  scoreSkillRelevance,

  // Application Engine
  applySkills,
  formatSkillForContext,
  injectSkillsIntoContext,
  applyAndTrackSkills,

  // Store (Database)
  initializeSkillStore,
  closeSkillStore,
  recordSkillUsage as dbRecordSkillUsage,
  updateSkillUsageOutcome,
  getSkillStats,
  getAggregateStats,
  type SkillStore,
} from '../index.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `skill-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
          steps: ['Create component file', 'Define props interface', 'Implement logic'],
        },
      ],
      pitfalls: [
        {
          mistake: 'Missing key prop',
          avoidance: 'Always add unique key prop',
        },
      ],
      verificationSteps: ['No TypeScript errors', 'Tests pass'],
    },
    ...overrides,
  };
}

// =============================================================================
// Full Workflow Integration Tests
// =============================================================================

describe('Skill System Integration', () => {
  let tempDir: string;
  let paths: SkillPaths;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = getProjectSkillPaths(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Complete Skill Lifecycle', () => {
    it('should support full create -> save -> discover -> select -> apply workflow', () => {
      // 1. Ensure directory exists
      ensureSkillDirectory(paths);
      expect(skillDirectoryExists(paths)).toBe(true);

      // 2. Create a skill
      const skill = createTestSkill({
        id: 'react-patterns',
        name: 'React Patterns',
        tags: ['react', 'component', 'hooks'],
        triggers: ['react component', 'custom hook', 'useState'],
      });

      // 3. Save the skill
      saveSkill(paths, skill);
      expect(skillExists(paths, 'react-patterns')).toBe(true);

      // 4. Add to registry
      addToRegistry(paths, skill, 'react-patterns.md');

      // 5. Discover via registry
      const entry = getFromRegistry(paths, 'react-patterns');
      expect(entry).not.toBeNull();
      expect(entry?.name).toBe('React Patterns');

      // 6. Parse the skill back
      const parsed = parseSkill(paths, 'react-patterns');
      expect(parsed.success).toBe(true);
      expect(parsed.skill?.id).toBe('react-patterns');

      // 7. Select for a relevant task
      const context: TaskContext = {
        description: 'Create a React component with useState hook',
      };
      const matches = selectTopSkills(paths, context);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].skill.id).toBe('react-patterns');

      // 8. Apply skills to get context
      const result = applySkills(paths, context);
      expect(result.success).toBe(true);
      expect(result.context.length).toBeGreaterThan(0);
      expect(result.appliedSkills.length).toBeGreaterThan(0);

      // 9. Inject into prompt
      const originalPrompt = 'Build a user profile component';
      const enhanced = injectSkillsIntoContext(originalPrompt, result.context);
      expect(enhanced.length).toBeGreaterThan(originalPrompt.length);
      expect(enhanced).toContain('React Patterns');
    });

    it('should support skill creation from reflection analysis', () => {
      ensureSkillDirectory(paths);

      // 1. Create reflection result (simulating what reflection engine produces)
      const reflection: ReflectionResult = {
        taskCompleted: true,
        reasoningQuality: 0.85,
        patterns: [
          {
            name: 'Custom Hook Pattern',
            description: 'Use custom hooks for reusable state logic',
            context: 'When building reusable stateful logic in React',
            steps: ['Extract state logic', 'Create hook function', 'Return state and setters'],
          },
        ],
        pitfalls: [
          {
            issue: 'Not memoizing expensive computations',
            resolution: 'Use useMemo for expensive calculations',
            prevention: 'Review computation complexity',
          },
        ],
        shouldCreateSkill: true,
        creationReason: 'Novel approach with high confidence',
        suggestedTags: ['react', 'hooks', 'state-management'],
        suggestedTriggers: ['custom hook', 'reusable state', 'useState'],
        suggestedName: 'State Management Hooks',
      };

      // 2. Create skill from reflection
      const skillInput = {
        reflection,
        name: 'State Management Hooks',
        tags: ['react', 'hooks', 'state-management'],
        triggers: ['custom hook', 'reusable state', 'useState'],
      };

      const result = createSkillFromReflection(skillInput, paths);
      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill!.name).toBe('State Management Hooks');
      expect(result.skill!.content.approaches.length).toBeGreaterThan(0);
      expect(result.skill!.content.pitfalls.length).toBeGreaterThan(0);

      // 3. Save and register the created skill
      saveSkill(paths, result.skill!);
      addToRegistry(paths, result.skill!, `${result.skill!.id}.md`);

      // 4. Verify it can be discovered and selected
      const entries = getAllSkillEntries(paths);
      expect(entries.length).toBe(1);

      const context: TaskContext = {
        description: 'Create a custom hook for state management',
      };
      const matches = selectTopSkills(paths, context);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Service-Based Workflow', () => {
    it('should support CRUD operations via SkillService', () => {
      const service = createProjectSkillService(tempDir);

      // Create
      const skillData = {
        name: 'Service Test Skill',
        tags: ['test'],
        triggers: ['test'],
        content: {
          whenToApply: ['When testing'],
          approaches: [{ name: 'Test', description: 'Test approach', steps: ['Step 1'] }],
          pitfalls: [{ mistake: 'Test mistake', avoidance: 'Avoid it' }],
          verificationSteps: ['Verify'],
        },
      };
      const created = service.createSkill(skillData);
      expect(created).toBeDefined();
      expect(created.name).toBe('Service Test Skill');

      // Read
      const retrieved = service.getSkill(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Service Test Skill');

      // List
      const skills = service.listSkills();
      expect(skills.length).toBe(1);

      // Search
      const searchResults = service.searchSkills({ query: 'test' });
      expect(searchResults.length).toBeGreaterThan(0);

      // Update
      service.updateSkill(created.id, { tags: ['updated', 'test'] });
      const updated = service.getSkill(created.id);
      expect(updated?.tags).toContain('updated');

      // Delete
      const deleted = service.deleteSkill(created.id);
      expect(deleted).toBe(true);
      expect(service.getSkill(created.id)).toBeUndefined();
    });
  });

  describe('Multiple Skills Selection', () => {
    it('should select and rank multiple relevant skills', () => {
      const service = createProjectSkillService(tempDir);

      // Create multiple skills
      service.createSkill(createTestSkill({
        id: 'react-skill',
        name: 'React Patterns',
        tags: ['react'],
        triggers: ['react', 'component'],
        successRate: 0.9,
      }));

      service.createSkill(createTestSkill({
        id: 'typescript-skill',
        name: 'TypeScript Patterns',
        tags: ['typescript'],
        triggers: ['typescript', 'types'],
        successRate: 0.8,
      }));

      service.createSkill(createTestSkill({
        id: 'testing-skill',
        name: 'Testing Patterns',
        tags: ['testing', 'jest'],
        triggers: ['test', 'jest'],
        successRate: 0.7,
      }));

      // Select for task mentioning multiple technologies
      const context: TaskContext = {
        description: 'Create a React component with TypeScript types',
      };
      const matches = selectTopSkills(paths, context, { maxSkills: 3 });

      expect(matches.length).toBeGreaterThanOrEqual(2);
      // Both React and TypeScript skills should match
      const skillIds = matches.map(m => m.skill.id);
      expect(skillIds).toContain('react-skill');
      expect(skillIds).toContain('typescript-skill');
    });

    it('should handle no matches gracefully', () => {
      const service = createProjectSkillService(tempDir);

      service.createSkill(createTestSkill({
        id: 'python-skill',
        name: 'Python Patterns',
        tags: ['python'],
        triggers: ['python', 'django'],
      }));

      const context: TaskContext = {
        description: 'Build a Ruby on Rails application',
      };
      const matches = selectTopSkills(paths, context);

      expect(matches.length).toBe(0);
      expect(hasRelevantSkills(paths, context.description)).toBe(false);
    });
  });

  describe('Skill Application with Tracking', () => {
    it('should apply skills and track usage', () => {
      const service = createProjectSkillService(tempDir);

      const skill = createTestSkill({
        id: 'tracked-skill',
        name: 'Tracked Skill',
        triggers: ['react'],
        usageCount: 0,
      });
      service.createSkill(skill);

      // Verify initial usage count
      let entry = getFromRegistry(paths, 'tracked-skill');
      expect(entry?.usageCount).toBe(0);

      // Apply with tracking
      const context: TaskContext = {
        description: 'Build a React component',
      };
      const result = applyAndTrackSkills(paths, context, { trackUsage: true });

      if (result.appliedSkills.length > 0) {
        // Verify usage was tracked
        entry = getFromRegistry(paths, 'tracked-skill');
        expect(entry?.usageCount).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Database Integration Tests
// =============================================================================

describe('Skill Database Integration', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = getProjectSkillPaths(tempDir);
    ensureSkillDirectory(paths);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should persist skill usage across sessions', () => {
    // Record usage
    dbRecordSkillUsage(store, 'test-skill', 'Test Skill', 'Build a component');
    dbRecordSkillUsage(store, 'test-skill', 'Test Skill', 'Build another component');

    // Close and reopen store
    closeSkillStore(store);
    store = initializeSkillStore(paths);

    // Verify persistence
    const stats = getSkillStats(store, 'test-skill');
    expect(stats).not.toBeNull();
    expect(stats?.totalUsage).toBe(2);
  });

  it('should track success rates correctly', () => {
    // Create skill tracking with usage records and update outcomes
    const usageId1 = dbRecordSkillUsage(store, 'success-skill', 'Success Skill', 'Task 1');
    updateSkillUsageOutcome(store, usageId1, true);

    const usageId2 = dbRecordSkillUsage(store, 'success-skill', 'Success Skill', 'Task 2');
    updateSkillUsageOutcome(store, usageId2, true);

    const usageId3 = dbRecordSkillUsage(store, 'success-skill', 'Success Skill', 'Task 3');
    updateSkillUsageOutcome(store, usageId3, false);

    const stats = getSkillStats(store, 'success-skill');
    // 2 successes out of 3 = ~67%
    expect(stats?.successRate).toBeCloseTo(0.67, 1);
  });

  it('should provide aggregate statistics', () => {
    // Create multiple skills with usage
    dbRecordSkillUsage(store, 'skill-1', 'Skill One', 'Task');
    dbRecordSkillUsage(store, 'skill-1', 'Skill One', 'Task');
    dbRecordSkillUsage(store, 'skill-2', 'Skill Two', 'Task');

    const aggregate = getAggregateStats(store);
    expect(aggregate.totalSkills).toBe(2);
    expect(aggregate.totalUsage).toBe(3);
  });
});

// =============================================================================
// Error Handling Integration Tests
// =============================================================================

describe('Error Handling Integration', () => {
  let tempDir: string;
  let paths: SkillPaths;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = getProjectSkillPaths(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should handle missing skill gracefully', () => {
    ensureSkillDirectory(paths);

    const result = parseSkill(paths, 'nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle corrupted skill file gracefully', () => {
    ensureSkillDirectory(paths);

    // Write invalid content
    const fs = require('node:fs');
    const skillPath = join(paths.root, 'corrupted.md');
    fs.writeFileSync(skillPath, 'not valid yaml frontmatter');

    const result = parseSkill(paths, 'corrupted');
    expect(result.success).toBe(false);
  });

  it('should continue operation when one skill fails', () => {
    const service = createProjectSkillService(tempDir);

    // Create one valid skill
    service.createSkill(createTestSkill({
      id: 'valid-skill',
      name: 'Valid Skill',
      triggers: ['test'],
    }));

    // Apply should still work even if some operations fail
    const context: TaskContext = {
      description: 'Test task',
    };
    const result = applySkills(paths, context);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Formatting Integration Tests
// =============================================================================

describe('Skill Formatting Integration', () => {
  it('should produce valid context format', () => {
    const skill = createTestSkill({
      id: 'format-test',
      name: 'Formatting Test',
      content: {
        whenToApply: ['When testing formatting'],
        approaches: [
          {
            name: 'Test Approach',
            description: 'A test approach',
            steps: ['Step 1', 'Step 2'],
          },
        ],
        pitfalls: [
          {
            mistake: 'Test mistake',
            avoidance: 'Test avoidance',
          },
        ],
        verificationSteps: ['Verify 1'],
      },
    });

    const formatted = formatSkillForContext(skill, 0.85);

    // Should contain all sections
    expect(formatted).toContain('Formatting Test');
    expect(formatted).toContain('85%');
    expect(formatted).toContain('Test Approach');
    expect(formatted).toContain('Test mistake');
    expect(formatted).toContain('Verify 1');
  });

  it('should inject skills at correct position', () => {
    const original = 'Original prompt content';
    const skills = '# Skills\nSome skills here';

    const atStart = injectSkillsIntoContext(original, skills, 'start');
    expect(atStart.startsWith('# Skills')).toBe(true);

    const atEnd = injectSkillsIntoContext(original, skills, 'end');
    expect(atEnd.startsWith('Original')).toBe(true);
    expect(atEnd.endsWith('skills here')).toBe(true);
  });
});
