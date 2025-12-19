/**
 * Skill Store - SQLite Database Layer for Skills
 *
 * Provides persistent storage for skill usage tracking and analytics
 * using better-sqlite3 for synchronous, fast local storage.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { SkillPaths } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Skill store instance wrapping the database connection.
 */
export interface SkillStore {
  db: Database.Database;
  path: string;
}

/**
 * Skill usage record in the database.
 */
export interface SkillUsageRecord {
  id: string;
  skillId: string;
  taskDescription: string;
  appliedAt: string;
  success: boolean | null;
  completedAt: string | null;
}

/**
 * Skill statistics.
 */
export interface SkillStatsRecord {
  skillId: string;
  name: string;
  totalUsage: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUsed: string | null;
  averageResponseTime: number | null;
}

/**
 * Row type for skill_tracking table.
 */
interface SkillTrackingRow {
  id: string;
  skill_id: string;
  name: string;
  success_count: number;
  failure_count: number;
  total_usage: number;
  success_rate: number;
  last_used: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Row type for skill_usage table.
 */
interface SkillUsageRow {
  id: string;
  skill_id: string;
  task_description: string;
  applied_at: string;
  success: number | null;
  completed_at: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Database filename within skills directory.
 */
const SKILL_DB_NAME = 'skills.db';

/**
 * SQL to initialize the skill database schema.
 */
const INIT_SQL = `
  -- Enable WAL mode for better concurrency
  PRAGMA journal_mode = WAL;

  -- Skill tracking table (aggregate stats per skill)
  CREATE TABLE IF NOT EXISTS skill_tracking (
    id TEXT PRIMARY KEY,
    skill_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    total_usage INTEGER NOT NULL DEFAULT 0,
    success_rate REAL NOT NULL DEFAULT 0.0,
    last_used TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_skill_tracking_skill_id ON skill_tracking(skill_id);
  CREATE INDEX IF NOT EXISTS idx_skill_tracking_usage ON skill_tracking(total_usage DESC);
  CREATE INDEX IF NOT EXISTS idx_skill_tracking_success ON skill_tracking(success_rate DESC);

  -- Skill usage table (individual usage events)
  CREATE TABLE IF NOT EXISTS skill_usage (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    task_description TEXT,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    success INTEGER,
    completed_at TEXT,
    FOREIGN KEY (skill_id) REFERENCES skill_tracking(skill_id)
  );

  CREATE INDEX IF NOT EXISTS idx_skill_usage_skill ON skill_usage(skill_id);
  CREATE INDEX IF NOT EXISTS idx_skill_usage_time ON skill_usage(applied_at DESC);
  CREATE INDEX IF NOT EXISTS idx_skill_usage_success ON skill_usage(success);

  -- Schema metadata
  CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

/**
 * Current schema version.
 */
const SKILL_SCHEMA_VERSION = 1;

// =============================================================================
// Database Initialization
// =============================================================================

/**
 * Get the skill database path for a skill paths config.
 *
 * @param paths - Skill paths configuration
 * @returns Path to the skills database file
 */
export function getSkillDbPath(paths: SkillPaths): string {
  return join(paths.root, SKILL_DB_NAME);
}

/**
 * Initialize the skill database.
 *
 * @param paths - Skill paths configuration
 * @returns SkillStore instance
 */
export function initializeSkillStore(paths: SkillPaths): SkillStore {
  const dbPath = getSkillDbPath(paths);

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Execute schema initialization
  db.exec(INIT_SQL);

  // Set schema version if not exists
  const setMetadata = db.prepare(
    'INSERT OR REPLACE INTO schema_metadata (key, value) VALUES (?, ?)'
  );
  setMetadata.run('version', String(SKILL_SCHEMA_VERSION));
  setMetadata.run('initialized_at', new Date().toISOString());

  return { db, path: dbPath };
}

/**
 * Close the skill store connection.
 *
 * @param store - SkillStore instance to close
 */
export function closeSkillStore(store: SkillStore): void {
  store.db.close();
}

/**
 * Check if skill store exists.
 *
 * @param paths - Skill paths configuration
 * @returns True if database exists
 */
export function skillStoreExists(paths: SkillPaths): boolean {
  return existsSync(getSkillDbPath(paths));
}

// =============================================================================
// Skill Tracking Operations
// =============================================================================

/**
 * Ensure a skill exists in the tracking table.
 *
 * @param store - SkillStore instance
 * @param skillId - Skill ID
 * @param name - Skill name
 */
export function ensureSkillTracking(
  store: SkillStore,
  skillId: string,
  name: string
): void {
  const now = new Date().toISOString();
  const id = `track-${skillId}`;

  store.db
    .prepare(
      `INSERT OR IGNORE INTO skill_tracking (id, skill_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, skillId, name, now, now);
}

/**
 * Record skill usage (when a skill is applied to a task).
 *
 * @param store - SkillStore instance
 * @param skillId - Skill ID
 * @param skillName - Skill name
 * @param taskDescription - Description of the task
 * @returns Usage record ID
 */
export function recordSkillUsage(
  store: SkillStore,
  skillId: string,
  skillName: string,
  taskDescription: string
): string {
  const now = new Date().toISOString();
  const usageId = `usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Ensure skill tracking exists
  ensureSkillTracking(store, skillId, skillName);

  // Insert usage record
  store.db
    .prepare(
      `INSERT INTO skill_usage (id, skill_id, task_description, applied_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(usageId, skillId, taskDescription, now);

  // Update tracking stats
  store.db
    .prepare(
      `UPDATE skill_tracking
       SET total_usage = total_usage + 1,
           last_used = ?,
           updated_at = ?
       WHERE skill_id = ?`
    )
    .run(now, now, skillId);

  return usageId;
}

/**
 * Update skill success/failure for a usage record.
 *
 * @param store - SkillStore instance
 * @param usageId - Usage record ID
 * @param success - Whether the skill application was successful
 */
export function updateSkillUsageOutcome(
  store: SkillStore,
  usageId: string,
  success: boolean
): void {
  const now = new Date().toISOString();

  // Get the skill_id for this usage
  const usage = store.db
    .prepare('SELECT skill_id FROM skill_usage WHERE id = ?')
    .get(usageId) as { skill_id: string } | undefined;

  if (!usage) return;

  // Update usage record
  store.db
    .prepare(
      `UPDATE skill_usage
       SET success = ?,
           completed_at = ?
       WHERE id = ?`
    )
    .run(success ? 1 : 0, now, usageId);

  // Update tracking stats
  if (success) {
    store.db
      .prepare(
        `UPDATE skill_tracking
         SET success_count = success_count + 1,
             success_rate = CAST(success_count + 1 AS REAL) / CAST(total_usage AS REAL),
             updated_at = ?
         WHERE skill_id = ?`
      )
      .run(now, usage.skill_id);
  } else {
    store.db
      .prepare(
        `UPDATE skill_tracking
         SET failure_count = failure_count + 1,
             success_rate = CAST(success_count AS REAL) / CAST(total_usage AS REAL),
             updated_at = ?
         WHERE skill_id = ?`
      )
      .run(now, usage.skill_id);
  }
}

/**
 * Update skill success rate directly.
 *
 * @param store - SkillStore instance
 * @param skillId - Skill ID
 * @param success - Whether the usage was successful
 */
export function updateSkillSuccess(
  store: SkillStore,
  skillId: string,
  success: boolean
): void {
  const now = new Date().toISOString();

  if (success) {
    store.db
      .prepare(
        `UPDATE skill_tracking
         SET success_count = success_count + 1,
             total_usage = total_usage + 1,
             success_rate = CAST(success_count + 1 AS REAL) / CAST(total_usage + 1 AS REAL),
             last_used = ?,
             updated_at = ?
         WHERE skill_id = ?`
      )
      .run(now, now, skillId);
  } else {
    store.db
      .prepare(
        `UPDATE skill_tracking
         SET failure_count = failure_count + 1,
             total_usage = total_usage + 1,
             success_rate = CAST(success_count AS REAL) / CAST(total_usage + 1 AS REAL),
             last_used = ?,
             updated_at = ?
         WHERE skill_id = ?`
      )
      .run(now, now, skillId);
  }
}

// =============================================================================
// Skill Statistics
// =============================================================================

/**
 * Get statistics for a specific skill.
 *
 * @param store - SkillStore instance
 * @param skillId - Skill ID
 * @returns Skill stats or null if not found
 */
export function getSkillStats(
  store: SkillStore,
  skillId: string
): SkillStatsRecord | null {
  const row = store.db
    .prepare('SELECT * FROM skill_tracking WHERE skill_id = ?')
    .get(skillId) as SkillTrackingRow | undefined;

  if (!row) return null;

  return {
    skillId: row.skill_id,
    name: row.name,
    totalUsage: row.total_usage,
    successCount: row.success_count,
    failureCount: row.failure_count,
    successRate: row.success_rate,
    lastUsed: row.last_used,
    averageResponseTime: null, // Could be calculated from usage records
  };
}

/**
 * Get statistics for all skills.
 *
 * @param store - SkillStore instance
 * @param options - Query options
 * @returns Array of skill stats
 */
export function getAllSkillStats(
  store: SkillStore,
  options?: {
    orderBy?: 'usage' | 'success' | 'recent';
    limit?: number;
  }
): SkillStatsRecord[] {
  let orderClause = 'total_usage DESC';
  if (options?.orderBy === 'success') {
    orderClause = 'success_rate DESC';
  } else if (options?.orderBy === 'recent') {
    orderClause = 'last_used DESC';
  }

  const limit = options?.limit ?? 100;

  const rows = store.db
    .prepare(`SELECT * FROM skill_tracking ORDER BY ${orderClause} LIMIT ?`)
    .all(limit) as SkillTrackingRow[];

  return rows.map(row => ({
    skillId: row.skill_id,
    name: row.name,
    totalUsage: row.total_usage,
    successCount: row.success_count,
    failureCount: row.failure_count,
    successRate: row.success_rate,
    lastUsed: row.last_used,
    averageResponseTime: null,
  }));
}

/**
 * Get top skills by usage.
 *
 * @param store - SkillStore instance
 * @param limit - Maximum number of skills to return
 * @returns Top skills by usage count
 */
export function getTopSkillsByUsageFromStore(
  store: SkillStore,
  limit = 10
): SkillStatsRecord[] {
  return getAllSkillStats(store, { orderBy: 'usage', limit });
}

/**
 * Get top skills by success rate.
 *
 * @param store - SkillStore instance
 * @param limit - Maximum number of skills to return
 * @returns Top skills by success rate
 */
export function getTopSkillsBySuccessFromStore(
  store: SkillStore,
  limit = 10
): SkillStatsRecord[] {
  return getAllSkillStats(store, { orderBy: 'success', limit });
}

/**
 * Get recently used skills.
 *
 * @param store - SkillStore instance
 * @param limit - Maximum number of skills to return
 * @returns Recently used skills
 */
export function getRecentlyUsedSkills(
  store: SkillStore,
  limit = 10
): SkillStatsRecord[] {
  return getAllSkillStats(store, { orderBy: 'recent', limit });
}

// =============================================================================
// Usage History
// =============================================================================

/**
 * Get usage history for a skill.
 *
 * @param store - SkillStore instance
 * @param skillId - Skill ID
 * @param limit - Maximum records to return
 * @returns Usage records
 */
export function getSkillUsageHistory(
  store: SkillStore,
  skillId: string,
  limit = 50
): SkillUsageRecord[] {
  const rows = store.db
    .prepare(
      `SELECT * FROM skill_usage
       WHERE skill_id = ?
       ORDER BY applied_at DESC
       LIMIT ?`
    )
    .all(skillId, limit) as SkillUsageRow[];

  return rows.map(row => ({
    id: row.id,
    skillId: row.skill_id,
    taskDescription: row.task_description,
    appliedAt: row.applied_at,
    success: row.success === null ? null : row.success === 1,
    completedAt: row.completed_at,
  }));
}

/**
 * Get all recent usage records.
 *
 * @param store - SkillStore instance
 * @param limit - Maximum records to return
 * @returns Usage records
 */
export function getRecentUsageHistory(
  store: SkillStore,
  limit = 50
): SkillUsageRecord[] {
  const rows = store.db
    .prepare(
      `SELECT * FROM skill_usage
       ORDER BY applied_at DESC
       LIMIT ?`
    )
    .all(limit) as SkillUsageRow[];

  return rows.map(row => ({
    id: row.id,
    skillId: row.skill_id,
    taskDescription: row.task_description,
    appliedAt: row.applied_at,
    success: row.success === null ? null : row.success === 1,
    completedAt: row.completed_at,
  }));
}

// =============================================================================
// Aggregate Statistics
// =============================================================================

/**
 * Get overall skill system statistics.
 *
 * @param store - SkillStore instance
 * @returns Aggregate statistics
 */
export function getAggregateStats(store: SkillStore): {
  totalSkills: number;
  totalUsage: number;
  averageSuccessRate: number;
  mostUsedSkill: string | null;
  bestPerformingSkill: string | null;
} {
  const skillCount = store.db
    .prepare('SELECT COUNT(*) as count FROM skill_tracking')
    .get() as { count: number };

  const usageSum = store.db
    .prepare('SELECT SUM(total_usage) as sum FROM skill_tracking')
    .get() as { sum: number | null };

  const avgSuccess = store.db
    .prepare('SELECT AVG(success_rate) as avg FROM skill_tracking WHERE total_usage > 0')
    .get() as { avg: number | null };

  const mostUsed = store.db
    .prepare('SELECT name FROM skill_tracking ORDER BY total_usage DESC LIMIT 1')
    .get() as { name: string } | undefined;

  const bestPerforming = store.db
    .prepare('SELECT name FROM skill_tracking WHERE total_usage >= 3 ORDER BY success_rate DESC LIMIT 1')
    .get() as { name: string } | undefined;

  return {
    totalSkills: skillCount.count,
    totalUsage: usageSum.sum ?? 0,
    averageSuccessRate: avgSuccess.avg ?? 0,
    mostUsedSkill: mostUsed?.name ?? null,
    bestPerformingSkill: bestPerforming?.name ?? null,
  };
}
