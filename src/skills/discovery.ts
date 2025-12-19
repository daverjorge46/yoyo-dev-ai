/**
 * Skill Discovery
 *
 * Scans .skills/ directory and manages the skill registry.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type {
  SkillRegistry,
  SkillEntry,
  SkillPaths,
  Skill,
} from './types.js';
import { DEFAULT_REGISTRY } from './types.js';
import {
  skillDirectoryExists,
  listSkillFiles,
  getSkillFilePath,
  ensureSkillDirectory,
} from './directory.js';
import { parseSkillFile } from './parser.js';

// =============================================================================
// Registry Management
// =============================================================================

/**
 * Load skill registry from index.json.
 *
 * @param paths - Skill paths
 * @returns Skill registry (creates default if not exists)
 */
export function loadSkillRegistry(paths: SkillPaths): SkillRegistry {
  if (!existsSync(paths.registry)) {
    return { ...DEFAULT_REGISTRY, updatedAt: new Date().toISOString() };
  }

  try {
    const content = readFileSync(paths.registry, 'utf-8');
    const data = JSON.parse(content) as SkillRegistry;

    // Validate structure
    if (!data.version || !Array.isArray(data.skills)) {
      return { ...DEFAULT_REGISTRY, updatedAt: new Date().toISOString() };
    }

    return data;
  } catch {
    // Return default on parse error
    return { ...DEFAULT_REGISTRY, updatedAt: new Date().toISOString() };
  }
}

/**
 * Save skill registry to index.json.
 *
 * @param paths - Skill paths
 * @param registry - Registry to save
 */
export function saveSkillRegistry(paths: SkillPaths, registry: SkillRegistry): void {
  ensureSkillDirectory(paths);

  const updated: SkillRegistry = {
    ...registry,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(paths.registry, JSON.stringify(updated, null, 2), 'utf-8');
}

// =============================================================================
// Discovery
// =============================================================================

/**
 * Discover all skills in a directory.
 *
 * @param paths - Skill paths
 * @returns Array of discovered skills
 */
export function discoverSkills(paths: SkillPaths): Skill[] {
  if (!skillDirectoryExists(paths)) {
    return [];
  }

  const files = listSkillFiles(paths);
  const skills: Skill[] = [];

  for (const file of files) {
    const filepath = getSkillFilePath(paths, file);
    const result = parseSkillFile(filepath);

    if (result.success && result.skill) {
      skills.push(result.skill);
    }
  }

  return skills;
}

/**
 * Convert a Skill to a SkillEntry for the registry.
 *
 * @param skill - Skill to convert
 * @param filename - Filename of the skill
 * @returns Skill entry
 */
export function skillToEntry(skill: Skill, filename: string): SkillEntry {
  return {
    id: skill.id,
    path: filename,
    name: skill.name,
    tags: skill.tags,
    triggers: skill.triggers,
    successRate: skill.successRate,
    usageCount: skill.usageCount,
    lastUsed: undefined,
  };
}

/**
 * Refresh registry by scanning skill files.
 *
 * This syncs the registry with actual files:
 * - Adds new skills
 * - Updates changed skills
 * - Removes deleted skills
 *
 * @param paths - Skill paths
 * @returns Updated registry
 */
export function refreshRegistry(paths: SkillPaths): SkillRegistry {
  const existingRegistry = loadSkillRegistry(paths);
  const existingMap = new Map(existingRegistry.skills.map(s => [s.id, s]));

  const files = listSkillFiles(paths);
  const newSkills: SkillEntry[] = [];
  const discoveredIds = new Set<string>();

  for (const file of files) {
    const filepath = getSkillFilePath(paths, file);
    const result = parseSkillFile(filepath);

    if (result.success && result.skill) {
      const skill = result.skill;
      discoveredIds.add(skill.id);

      // Preserve usage data from existing entry
      const existing = existingMap.get(skill.id);
      const entry = skillToEntry(skill, file);

      if (existing) {
        // Preserve usage tracking data
        entry.usageCount = Math.max(entry.usageCount, existing.usageCount);
        entry.successRate = existing.successRate; // Keep tracked rate
        entry.lastUsed = existing.lastUsed;
      }

      newSkills.push(entry);
    }
  }

  const updatedRegistry: SkillRegistry = {
    version: existingRegistry.version,
    skills: newSkills,
    updatedAt: new Date().toISOString(),
  };

  saveSkillRegistry(paths, updatedRegistry);
  return updatedRegistry;
}

// =============================================================================
// Registry Operations
// =============================================================================

/**
 * Add a skill to the registry.
 *
 * @param paths - Skill paths
 * @param skill - Skill to add
 * @param filename - Filename of the skill
 */
export function addToRegistry(paths: SkillPaths, skill: Skill, filename: string): void {
  const registry = loadSkillRegistry(paths);
  const entry = skillToEntry(skill, filename);

  // Remove existing entry with same ID
  registry.skills = registry.skills.filter(s => s.id !== skill.id);
  registry.skills.push(entry);

  saveSkillRegistry(paths, registry);
}

/**
 * Remove a skill from the registry.
 *
 * @param paths - Skill paths
 * @param skillId - ID of skill to remove
 * @returns True if skill was removed
 */
export function removeFromRegistry(paths: SkillPaths, skillId: string): boolean {
  const registry = loadSkillRegistry(paths);
  const initialLength = registry.skills.length;

  registry.skills = registry.skills.filter(s => s.id !== skillId);

  if (registry.skills.length < initialLength) {
    saveSkillRegistry(paths, registry);
    return true;
  }

  return false;
}

/**
 * Get a skill entry from the registry.
 *
 * @param paths - Skill paths
 * @param skillId - ID of skill to get
 * @returns Skill entry or undefined
 */
export function getFromRegistry(paths: SkillPaths, skillId: string): SkillEntry | undefined {
  const registry = loadSkillRegistry(paths);
  return registry.skills.find(s => s.id === skillId);
}

/**
 * Update skill usage in the registry.
 *
 * @param paths - Skill paths
 * @param skillId - ID of skill used
 * @param success - Whether task was successful
 */
export function updateSkillUsage(
  paths: SkillPaths,
  skillId: string,
  success: boolean
): void {
  const registry = loadSkillRegistry(paths);
  const entry = registry.skills.find(s => s.id === skillId);

  if (entry) {
    const totalUsage = entry.usageCount;
    const successfulUsage = Math.round(entry.successRate * totalUsage);

    entry.usageCount += 1;
    entry.successRate = (successfulUsage + (success ? 1 : 0)) / entry.usageCount;
    entry.lastUsed = new Date().toISOString();

    saveSkillRegistry(paths, registry);
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get all skills from registry.
 *
 * @param paths - Skill paths
 * @returns All skill entries
 */
export function getAllSkillEntries(paths: SkillPaths): SkillEntry[] {
  const registry = loadSkillRegistry(paths);
  return registry.skills;
}

/**
 * Find skills by tag.
 *
 * @param paths - Skill paths
 * @param tag - Tag to search for
 * @returns Matching skill entries
 */
export function findSkillsByTag(paths: SkillPaths, tag: string): SkillEntry[] {
  const registry = loadSkillRegistry(paths);
  return registry.skills.filter(s => s.tags.includes(tag));
}

/**
 * Find skills by trigger keyword.
 *
 * @param paths - Skill paths
 * @param keyword - Keyword to search for
 * @returns Matching skill entries
 */
export function findSkillsByTrigger(paths: SkillPaths, keyword: string): SkillEntry[] {
  const registry = loadSkillRegistry(paths);
  const lowerKeyword = keyword.toLowerCase();
  return registry.skills.filter(s =>
    s.triggers.some(t => t.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * Get top skills by usage.
 *
 * @param paths - Skill paths
 * @param limit - Maximum number of skills to return
 * @returns Top skills by usage count
 */
export function getTopSkillsByUsage(paths: SkillPaths, limit: number = 5): SkillEntry[] {
  const registry = loadSkillRegistry(paths);
  return [...registry.skills]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Get recently used skills.
 *
 * @param paths - Skill paths
 * @param limit - Maximum number of skills to return
 * @returns Recently used skills
 */
export function getRecentSkills(paths: SkillPaths, limit: number = 5): SkillEntry[] {
  const registry = loadSkillRegistry(paths);
  return [...registry.skills]
    .filter(s => s.lastUsed)
    .sort((a, b) => {
      const aTime = new Date(a.lastUsed!).getTime();
      const bTime = new Date(b.lastUsed!).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);
}
