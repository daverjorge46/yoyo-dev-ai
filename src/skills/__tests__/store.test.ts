/**
 * Skill Store Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initializeSkillStore,
  closeSkillStore,
  skillStoreExists,
  getSkillDbPath,
  ensureSkillTracking,
  recordSkillUsage,
  updateSkillUsageOutcome,
  updateSkillSuccess,
  getSkillStats,
  getAllSkillStats,
  getTopSkillsByUsageFromStore,
  getTopSkillsBySuccessFromStore,
  getRecentlyUsedSkills,
  getSkillUsageHistory,
  getRecentUsageHistory,
  getAggregateStats,
  type SkillStore,
} from '../store.js';
import type { SkillPaths } from '../types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `skill-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createTestPaths(tempDir: string): SkillPaths {
  return {
    root: join(tempDir, '.skills'),
    registry: join(tempDir, '.skills', 'registry.json'),
  };
}

// =============================================================================
// Initialization Tests
// =============================================================================

describe('Skill Store Initialization', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should create database file', () => {
    const paths = createTestPaths(tempDir);
    const store = initializeSkillStore(paths);

    expect(existsSync(getSkillDbPath(paths))).toBe(true);
    closeSkillStore(store);
  });

  it('should report store exists after initialization', () => {
    const paths = createTestPaths(tempDir);

    expect(skillStoreExists(paths)).toBe(false);

    const store = initializeSkillStore(paths);
    expect(skillStoreExists(paths)).toBe(true);

    closeSkillStore(store);
  });

  it('should create skills directory if missing', () => {
    const paths = createTestPaths(tempDir);

    expect(existsSync(paths.root)).toBe(false);

    const store = initializeSkillStore(paths);
    expect(existsSync(paths.root)).toBe(true);

    closeSkillStore(store);
  });

  it('should handle multiple initializations', () => {
    const paths = createTestPaths(tempDir);

    const store1 = initializeSkillStore(paths);
    closeSkillStore(store1);

    const store2 = initializeSkillStore(paths);
    expect(store2.db).toBeDefined();
    closeSkillStore(store2);
  });
});

// =============================================================================
// Skill Tracking Tests
// =============================================================================

describe('ensureSkillTracking', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should create skill tracking entry', () => {
    ensureSkillTracking(store, 'test-skill', 'Test Skill');

    const stats = getSkillStats(store, 'test-skill');
    expect(stats).not.toBeNull();
    expect(stats?.skillId).toBe('test-skill');
    expect(stats?.name).toBe('Test Skill');
  });

  it('should not duplicate existing entries', () => {
    ensureSkillTracking(store, 'test-skill', 'Test Skill');
    ensureSkillTracking(store, 'test-skill', 'Different Name');

    const stats = getSkillStats(store, 'test-skill');
    expect(stats?.name).toBe('Test Skill'); // Original name preserved
  });

  it('should initialize with zero counts', () => {
    ensureSkillTracking(store, 'new-skill', 'New Skill');

    const stats = getSkillStats(store, 'new-skill');
    expect(stats?.totalUsage).toBe(0);
    expect(stats?.successCount).toBe(0);
    expect(stats?.failureCount).toBe(0);
    expect(stats?.successRate).toBe(0);
  });
});

// =============================================================================
// Usage Recording Tests
// =============================================================================

describe('recordSkillUsage', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should record usage and return ID', () => {
    const usageId = recordSkillUsage(store, 'test-skill', 'Test Skill', 'Build a component');

    expect(usageId).toBeDefined();
    expect(usageId.startsWith('usage-')).toBe(true);
  });

  it('should increment usage count', () => {
    ensureSkillTracking(store, 'count-skill', 'Count Skill');

    recordSkillUsage(store, 'count-skill', 'Count Skill', 'Task 1');
    recordSkillUsage(store, 'count-skill', 'Count Skill', 'Task 2');
    recordSkillUsage(store, 'count-skill', 'Count Skill', 'Task 3');

    const stats = getSkillStats(store, 'count-skill');
    expect(stats?.totalUsage).toBe(3);
  });

  it('should update last used timestamp', () => {
    recordSkillUsage(store, 'time-skill', 'Time Skill', 'Some task');

    const stats = getSkillStats(store, 'time-skill');
    expect(stats?.lastUsed).toBeDefined();
    expect(new Date(stats!.lastUsed!).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should create tracking entry if not exists', () => {
    recordSkillUsage(store, 'auto-create-skill', 'Auto Created', 'Task');

    const stats = getSkillStats(store, 'auto-create-skill');
    expect(stats).not.toBeNull();
    expect(stats?.name).toBe('Auto Created');
  });
});

// =============================================================================
// Outcome Tracking Tests
// =============================================================================

describe('updateSkillUsageOutcome', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should update usage record with success', () => {
    const usageId = recordSkillUsage(store, 'outcome-skill', 'Outcome Skill', 'Task');
    updateSkillUsageOutcome(store, usageId, true);

    const history = getSkillUsageHistory(store, 'outcome-skill');
    expect(history[0].success).toBe(true);
    expect(history[0].completedAt).toBeDefined();
  });

  it('should update usage record with failure', () => {
    const usageId = recordSkillUsage(store, 'fail-skill', 'Fail Skill', 'Task');
    updateSkillUsageOutcome(store, usageId, false);

    const history = getSkillUsageHistory(store, 'fail-skill');
    expect(history[0].success).toBe(false);
  });

  it('should update success count on success', () => {
    const usageId = recordSkillUsage(store, 'success-skill', 'Success Skill', 'Task');
    updateSkillUsageOutcome(store, usageId, true);

    const stats = getSkillStats(store, 'success-skill');
    expect(stats?.successCount).toBe(1);
    expect(stats?.failureCount).toBe(0);
  });

  it('should update failure count on failure', () => {
    const usageId = recordSkillUsage(store, 'failure-skill', 'Failure Skill', 'Task');
    updateSkillUsageOutcome(store, usageId, false);

    const stats = getSkillStats(store, 'failure-skill');
    expect(stats?.successCount).toBe(0);
    expect(stats?.failureCount).toBe(1);
  });

  it('should calculate success rate correctly', () => {
    // 2 successes, 1 failure = 67% success rate
    const id1 = recordSkillUsage(store, 'rate-skill', 'Rate Skill', 'Task 1');
    updateSkillUsageOutcome(store, id1, true);

    const id2 = recordSkillUsage(store, 'rate-skill', 'Rate Skill', 'Task 2');
    updateSkillUsageOutcome(store, id2, true);

    const id3 = recordSkillUsage(store, 'rate-skill', 'Rate Skill', 'Task 3');
    updateSkillUsageOutcome(store, id3, false);

    const stats = getSkillStats(store, 'rate-skill');
    expect(stats?.successRate).toBeCloseTo(0.67, 1);
  });
});

describe('updateSkillSuccess', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should update counts directly', () => {
    ensureSkillTracking(store, 'direct-skill', 'Direct Skill');

    updateSkillSuccess(store, 'direct-skill', true);
    updateSkillSuccess(store, 'direct-skill', true);
    updateSkillSuccess(store, 'direct-skill', false);

    const stats = getSkillStats(store, 'direct-skill');
    expect(stats?.totalUsage).toBe(3);
    expect(stats?.successCount).toBe(2);
    expect(stats?.failureCount).toBe(1);
  });
});

// =============================================================================
// Statistics Tests
// =============================================================================

describe('getSkillStats', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return null for non-existent skill', () => {
    const stats = getSkillStats(store, 'nonexistent');
    expect(stats).toBeNull();
  });

  it('should return complete stats', () => {
    recordSkillUsage(store, 'complete-skill', 'Complete Skill', 'Task');

    const stats = getSkillStats(store, 'complete-skill');
    expect(stats).toEqual(expect.objectContaining({
      skillId: 'complete-skill',
      name: 'Complete Skill',
      totalUsage: 1,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
    }));
  });
});

describe('getAllSkillStats', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return empty array when no skills', () => {
    const stats = getAllSkillStats(store);
    expect(stats).toEqual([]);
  });

  it('should return all skill stats', () => {
    recordSkillUsage(store, 'skill-1', 'Skill One', 'Task');
    recordSkillUsage(store, 'skill-2', 'Skill Two', 'Task');
    recordSkillUsage(store, 'skill-3', 'Skill Three', 'Task');

    const stats = getAllSkillStats(store);
    expect(stats.length).toBe(3);
  });

  it('should order by usage by default', () => {
    recordSkillUsage(store, 'low', 'Low Usage', 'Task');
    recordSkillUsage(store, 'high', 'High Usage', 'Task 1');
    recordSkillUsage(store, 'high', 'High Usage', 'Task 2');
    recordSkillUsage(store, 'high', 'High Usage', 'Task 3');

    const stats = getAllSkillStats(store);
    expect(stats[0].skillId).toBe('high');
    expect(stats[1].skillId).toBe('low');
  });

  it('should respect limit', () => {
    for (let i = 0; i < 10; i++) {
      recordSkillUsage(store, `skill-${i}`, `Skill ${i}`, 'Task');
    }

    const stats = getAllSkillStats(store, { limit: 5 });
    expect(stats.length).toBe(5);
  });
});

describe('getTopSkillsByUsageFromStore', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return skills ordered by usage', () => {
    for (let i = 0; i < 3; i++) recordSkillUsage(store, 'mid', 'Mid', 'Task');
    for (let i = 0; i < 5; i++) recordSkillUsage(store, 'high', 'High', 'Task');
    recordSkillUsage(store, 'low', 'Low', 'Task');

    const top = getTopSkillsByUsageFromStore(store, 3);
    expect(top[0].skillId).toBe('high');
    expect(top[1].skillId).toBe('mid');
    expect(top[2].skillId).toBe('low');
  });
});

describe('getTopSkillsBySuccessFromStore', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return skills ordered by success rate', () => {
    ensureSkillTracking(store, 'perfect', 'Perfect');
    updateSkillSuccess(store, 'perfect', true);
    updateSkillSuccess(store, 'perfect', true);

    ensureSkillTracking(store, 'mixed', 'Mixed');
    updateSkillSuccess(store, 'mixed', true);
    updateSkillSuccess(store, 'mixed', false);

    ensureSkillTracking(store, 'poor', 'Poor');
    updateSkillSuccess(store, 'poor', false);
    updateSkillSuccess(store, 'poor', false);

    const top = getTopSkillsBySuccessFromStore(store, 3);
    expect(top[0].skillId).toBe('perfect');
    expect(top[0].successRate).toBe(1.0);
  });
});

// =============================================================================
// Usage History Tests
// =============================================================================

describe('getSkillUsageHistory', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return empty array for non-existent skill', () => {
    const history = getSkillUsageHistory(store, 'nonexistent');
    expect(history).toEqual([]);
  });

  it('should return usage history', () => {
    recordSkillUsage(store, 'hist-skill', 'History Skill', 'Task 1');
    recordSkillUsage(store, 'hist-skill', 'History Skill', 'Task 2');
    recordSkillUsage(store, 'hist-skill', 'History Skill', 'Task 3');

    const history = getSkillUsageHistory(store, 'hist-skill');
    expect(history.length).toBe(3);
    // All records have the same timestamp, so just verify all tasks are present
    const tasks = history.map(h => h.taskDescription);
    expect(tasks).toContain('Task 1');
    expect(tasks).toContain('Task 2');
    expect(tasks).toContain('Task 3');
  });

  it('should respect limit', () => {
    for (let i = 0; i < 10; i++) {
      recordSkillUsage(store, 'many-uses', 'Many Uses', `Task ${i}`);
    }

    const history = getSkillUsageHistory(store, 'many-uses', 5);
    expect(history.length).toBe(5);
  });
});

describe('getRecentUsageHistory', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return recent usage across all skills', () => {
    recordSkillUsage(store, 'skill-a', 'Skill A', 'Task A');
    recordSkillUsage(store, 'skill-b', 'Skill B', 'Task B');
    recordSkillUsage(store, 'skill-c', 'Skill C', 'Task C');

    const history = getRecentUsageHistory(store);
    expect(history.length).toBe(3);
    // All records have the same timestamp, so just verify all tasks are present
    const tasks = history.map(h => h.taskDescription);
    expect(tasks).toContain('Task A');
    expect(tasks).toContain('Task B');
    expect(tasks).toContain('Task C');
  });
});

// =============================================================================
// Aggregate Statistics Tests
// =============================================================================

describe('getAggregateStats', () => {
  let tempDir: string;
  let paths: SkillPaths;
  let store: SkillStore;

  beforeEach(() => {
    tempDir = createTempDir();
    paths = createTestPaths(tempDir);
    store = initializeSkillStore(paths);
  });

  afterEach(() => {
    closeSkillStore(store);
    cleanupTempDir(tempDir);
  });

  it('should return zeros when no skills', () => {
    const stats = getAggregateStats(store);

    expect(stats.totalSkills).toBe(0);
    expect(stats.totalUsage).toBe(0);
    expect(stats.averageSuccessRate).toBe(0);
    expect(stats.mostUsedSkill).toBeNull();
    expect(stats.bestPerformingSkill).toBeNull();
  });

  it('should calculate totals correctly', () => {
    recordSkillUsage(store, 'skill-1', 'Skill One', 'Task 1');
    recordSkillUsage(store, 'skill-1', 'Skill One', 'Task 2');
    recordSkillUsage(store, 'skill-2', 'Skill Two', 'Task 3');

    const stats = getAggregateStats(store);

    expect(stats.totalSkills).toBe(2);
    expect(stats.totalUsage).toBe(3);
  });

  it('should identify most used skill', () => {
    recordSkillUsage(store, 'popular', 'Popular Skill', 'Task 1');
    recordSkillUsage(store, 'popular', 'Popular Skill', 'Task 2');
    recordSkillUsage(store, 'popular', 'Popular Skill', 'Task 3');
    recordSkillUsage(store, 'unpopular', 'Unpopular Skill', 'Task');

    const stats = getAggregateStats(store);

    expect(stats.mostUsedSkill).toBe('Popular Skill');
  });

  it('should identify best performing skill', () => {
    ensureSkillTracking(store, 'perfect', 'Perfect Skill');
    updateSkillSuccess(store, 'perfect', true);
    updateSkillSuccess(store, 'perfect', true);
    updateSkillSuccess(store, 'perfect', true);

    ensureSkillTracking(store, 'okay', 'Okay Skill');
    updateSkillSuccess(store, 'okay', true);
    updateSkillSuccess(store, 'okay', false);
    updateSkillSuccess(store, 'okay', false);

    const stats = getAggregateStats(store);

    expect(stats.bestPerformingSkill).toBe('Perfect Skill');
  });

  it('should calculate average success rate', () => {
    ensureSkillTracking(store, 's1', 'Skill 1');
    updateSkillSuccess(store, 's1', true); // 100%

    ensureSkillTracking(store, 's2', 'Skill 2');
    updateSkillSuccess(store, 's2', false); // 0%

    const stats = getAggregateStats(store);

    // Average of 100% and 0% = 50%
    expect(stats.averageSuccessRate).toBeCloseTo(0.5, 1);
  });
});
