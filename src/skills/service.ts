/**
 * Skill Service
 *
 * High-level service for skill operations (CRUD, search, usage tracking).
 */

import { unlinkSync } from 'node:fs';
import type {
  Skill,
  SkillEntry,
  SkillPaths,
  SkillFilters,
  SkillSearchOptions,
  SkillScope,
} from './types.js';
import {
  getSkillPaths,
  ensureSkillDirectory,
  skillExists,
  getSkillFilePath,
  skillIdToFilename,
  isValidSkillId,
  generateSkillId,
} from './directory.js';
import { parseSkill, saveSkill } from './parser.js';
import {
  refreshRegistry,
  addToRegistry,
  removeFromRegistry,
  getFromRegistry,
  updateSkillUsage,
  getAllSkillEntries,
} from './discovery.js';

// =============================================================================
// Service Configuration
// =============================================================================

/**
 * Skill service configuration.
 */
export interface SkillServiceConfig {
  /** Skill scope (project or global) */
  scope: SkillScope;

  /** Project root directory (required for project scope) */
  projectRoot?: string;

  /** Auto-refresh registry on operations */
  autoRefresh?: boolean;
}

// =============================================================================
// Skill Service
// =============================================================================

/**
 * High-level service for skill operations.
 */
export class SkillService {
  private paths: SkillPaths;
  private config: SkillServiceConfig;

  /**
   * Create a new skill service.
   *
   * @param config - Service configuration
   */
  constructor(config: SkillServiceConfig) {
    this.config = {
      autoRefresh: true,
      ...config,
    };
    this.paths = getSkillPaths(config.scope, config.projectRoot);
  }

  /**
   * Initialize the skill service.
   *
   * Creates the skill directory if it doesn't exist and refreshes the registry.
   */
  initialize(): void {
    ensureSkillDirectory(this.paths);
    if (this.config.autoRefresh) {
      refreshRegistry(this.paths);
    }
  }

  /**
   * Get the skill paths.
   */
  getPaths(): SkillPaths {
    return this.paths;
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Get a skill by ID.
   *
   * @param id - Skill ID
   * @returns Skill or undefined if not found
   */
  getSkill(id: string): Skill | undefined {
    if (!skillExists(this.paths, id)) {
      return undefined;
    }

    const result = parseSkill(this.paths, id);
    return result.success ? result.skill : undefined;
  }

  /**
   * List all skills with optional filtering.
   *
   * @param filters - Optional filters
   * @returns Array of skill entries
   */
  listSkills(filters?: SkillFilters): SkillEntry[] {
    let skills = getAllSkillEntries(this.paths);

    if (!filters) {
      return skills;
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      skills = skills.filter(s =>
        filters.tags!.some(tag => s.tags.includes(tag))
      );
    }

    // Apply success rate filter
    if (filters.minSuccessRate !== undefined) {
      skills = skills.filter(s => s.successRate >= filters.minSuccessRate!);
    }

    // Apply usage count filter
    if (filters.minUsageCount !== undefined) {
      skills = skills.filter(s => s.usageCount >= filters.minUsageCount!);
    }

    // Apply sorting
    if (filters.sortBy) {
      const order = filters.sortOrder === 'desc' ? -1 : 1;
      skills = [...skills].sort((a, b) => {
        switch (filters.sortBy) {
          case 'name':
            return order * a.name.localeCompare(b.name);
          case 'successRate':
            return order * (a.successRate - b.successRate);
          case 'usageCount':
            return order * (a.usageCount - b.usageCount);
          case 'updated':
            return order * ((a.lastUsed ?? '').localeCompare(b.lastUsed ?? ''));
          default:
            return 0;
        }
      });
    }

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      skills = skills.slice(0, filters.limit);
    }

    return skills;
  }

  /**
   * Search skills by query.
   *
   * @param options - Search options
   * @returns Matching skill entries
   */
  searchSkills(options: SkillSearchOptions): SkillEntry[] {
    const {
      query,
      searchName = true,
      searchTags = true,
      searchTriggers = true,
      searchContent = false,
      limit,
    } = options;

    const lowerQuery = query.toLowerCase();
    let skills = getAllSkillEntries(this.paths);

    skills = skills.filter(skill => {
      // Search in name
      if (searchName && skill.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in tags
      if (searchTags && skill.tags.some(t => t.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // Search in triggers
      if (searchTriggers && skill.triggers.some(t => t.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // Search in content (requires loading full skill)
      if (searchContent) {
        const fullSkill = this.getSkill(skill.id);
        if (fullSkill?.content.rawBody?.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }

      return false;
    });

    if (limit && limit > 0) {
      skills = skills.slice(0, limit);
    }

    return skills;
  }

  /**
   * Create a new skill.
   *
   * @param skill - Skill to create
   * @returns Created skill with generated fields
   */
  createSkill(skill: Partial<Skill> & { name: string }): Skill {
    // Generate ID if not provided
    const id = skill.id && isValidSkillId(skill.id)
      ? skill.id
      : generateSkillId(skill.name);

    // Check for duplicate
    if (skillExists(this.paths, id)) {
      throw new Error(`Skill with ID '${id}' already exists`);
    }

    const now = new Date().toISOString();
    const newSkill: Skill = {
      id,
      name: skill.name,
      version: skill.version ?? 1,
      created: skill.created ?? now,
      updated: skill.updated ?? now,
      tags: skill.tags ?? [],
      triggers: skill.triggers ?? [],
      successRate: skill.successRate ?? 0,
      usageCount: skill.usageCount ?? 0,
      content: skill.content ?? {
        whenToApply: [],
        approaches: [],
        pitfalls: [],
        verificationSteps: [],
      },
    };

    // Save to file
    ensureSkillDirectory(this.paths);
    saveSkill(this.paths, newSkill);

    // Update registry
    addToRegistry(this.paths, newSkill, skillIdToFilename(id));

    return newSkill;
  }

  /**
   * Update an existing skill.
   *
   * @param id - Skill ID
   * @param updates - Partial skill updates
   * @returns Updated skill
   */
  updateSkill(id: string, updates: Partial<Omit<Skill, 'id' | 'created'>>): Skill {
    const existing = this.getSkill(id);
    if (!existing) {
      throw new Error(`Skill with ID '${id}' not found`);
    }

    const updatedSkill: Skill = {
      ...existing,
      ...updates,
      id: existing.id, // Cannot change ID
      created: existing.created, // Cannot change created
      updated: new Date().toISOString(),
      version: (updates.version ?? existing.version) + 1,
    };

    // Save to file
    saveSkill(this.paths, updatedSkill);

    // Update registry
    addToRegistry(this.paths, updatedSkill, skillIdToFilename(id));

    return updatedSkill;
  }

  /**
   * Delete a skill.
   *
   * @param id - Skill ID
   * @returns True if skill was deleted
   */
  deleteSkill(id: string): boolean {
    if (!skillExists(this.paths, id)) {
      return false;
    }

    // Remove file
    const filepath = getSkillFilePath(this.paths, skillIdToFilename(id));
    unlinkSync(filepath);

    // Remove from registry
    removeFromRegistry(this.paths, id);

    return true;
  }

  // ===========================================================================
  // Usage Tracking
  // ===========================================================================

  /**
   * Record skill usage.
   *
   * @param id - Skill ID
   * @param success - Whether the task was successful
   */
  recordUsage(id: string, success: boolean): void {
    updateSkillUsage(this.paths, id, success);
  }

  /**
   * Get skill entry with usage stats.
   *
   * @param id - Skill ID
   * @returns Skill entry or undefined
   */
  getSkillEntry(id: string): SkillEntry | undefined {
    return getFromRegistry(this.paths, id);
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * Refresh the skill registry from files.
   */
  refresh(): void {
    refreshRegistry(this.paths);
  }

  /**
   * Get total skill count.
   */
  getSkillCount(): number {
    return getAllSkillEntries(this.paths).length;
  }

  /**
   * Get average success rate across all skills.
   */
  getAverageSuccessRate(): number {
    const skills = getAllSkillEntries(this.paths);
    if (skills.length === 0) return 0;

    const total = skills.reduce((sum, s) => sum + s.successRate, 0);
    return total / skills.length;
  }

  /**
   * Get total usage count across all skills.
   */
  getTotalUsageCount(): number {
    const skills = getAllSkillEntries(this.paths);
    return skills.reduce((sum, s) => sum + s.usageCount, 0);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a project-scoped skill service.
 *
 * @param projectRoot - Project root directory
 * @returns Skill service
 */
export function createProjectSkillService(projectRoot?: string): SkillService {
  return new SkillService({
    scope: 'project',
    projectRoot,
  });
}

/**
 * Create a global-scoped skill service.
 *
 * @returns Skill service
 */
export function createGlobalSkillService(): SkillService {
  return new SkillService({
    scope: 'global',
  });
}
