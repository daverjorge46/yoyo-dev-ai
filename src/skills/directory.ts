/**
 * Skill Directory Management
 *
 * Manages the .skills/ directory structure for project and global scopes.
 */

import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SkillPaths, SkillScope } from './types.js';
import { SKILL_DIRECTORY, REGISTRY_FILE } from './types.js';

// =============================================================================
// Path Helpers
// =============================================================================

/**
 * Get skill paths for a given scope.
 *
 * @param scope - Skill scope (project or global)
 * @param projectRoot - Project root directory (required for project scope)
 * @returns Skill directory paths
 */
export function getSkillPaths(
  scope: SkillScope,
  projectRoot?: string
): SkillPaths {
  const root =
    scope === 'project'
      ? join(projectRoot ?? process.cwd(), SKILL_DIRECTORY)
      : join(homedir(), '.yoyo-dev', SKILL_DIRECTORY);

  return {
    root,
    registry: join(root, REGISTRY_FILE),
  };
}

/**
 * Get the default project skill paths.
 *
 * @param projectRoot - Project root directory
 * @returns Skill directory paths
 */
export function getProjectSkillPaths(projectRoot?: string): SkillPaths {
  return getSkillPaths('project', projectRoot);
}

/**
 * Get the global skill paths.
 *
 * @returns Skill directory paths
 */
export function getGlobalSkillPaths(): SkillPaths {
  return getSkillPaths('global');
}

// =============================================================================
// Directory Management
// =============================================================================

/**
 * Check if the skill directory exists.
 *
 * @param paths - Skill paths to check
 * @returns True if directory exists
 */
export function skillDirectoryExists(paths: SkillPaths): boolean {
  return existsSync(paths.root) && statSync(paths.root).isDirectory();
}

/**
 * Check if the skill registry exists.
 *
 * @param paths - Skill paths to check
 * @returns True if registry file exists
 */
export function registryExists(paths: SkillPaths): boolean {
  return existsSync(paths.registry);
}

/**
 * Ensure the skill directory exists, creating it if necessary.
 *
 * @param paths - Skill paths
 * @returns True if directory was created, false if already existed
 */
export function ensureSkillDirectory(paths: SkillPaths): boolean {
  if (skillDirectoryExists(paths)) {
    return false;
  }

  mkdirSync(paths.root, { recursive: true });
  return true;
}

/**
 * List all skill files in a directory.
 *
 * @param paths - Skill paths
 * @returns Array of skill file names (without path)
 */
export function listSkillFiles(paths: SkillPaths): string[] {
  if (!skillDirectoryExists(paths)) {
    return [];
  }

  const files = readdirSync(paths.root);
  return files.filter((file) => file.endsWith('.md') && file !== 'README.md');
}

/**
 * Get the full path for a skill file.
 *
 * @param paths - Skill paths
 * @param filename - Skill filename
 * @returns Full path to skill file
 */
export function getSkillFilePath(paths: SkillPaths, filename: string): string {
  return join(paths.root, filename);
}

/**
 * Generate a skill filename from an ID.
 *
 * @param id - Skill ID
 * @returns Filename with .md extension
 */
export function skillIdToFilename(id: string): string {
  return `${id}.md`;
}

/**
 * Extract skill ID from a filename.
 *
 * @param filename - Skill filename
 * @returns Skill ID without extension
 */
export function filenameToSkillId(filename: string): string {
  return filename.replace(/\.md$/, '');
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a skill ID format.
 *
 * Valid IDs are kebab-case: lowercase letters, numbers, and hyphens.
 *
 * @param id - Skill ID to validate
 * @returns True if valid
 */
export function isValidSkillId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Must be kebab-case: lowercase, numbers, hyphens
  const kebabCasePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  return kebabCasePattern.test(id);
}

/**
 * Generate a valid skill ID from a name.
 *
 * @param name - Human-readable skill name
 * @returns Valid skill ID
 */
export function generateSkillId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Check if a skill file exists.
 *
 * @param paths - Skill paths
 * @param id - Skill ID
 * @returns True if skill file exists
 */
export function skillExists(paths: SkillPaths, id: string): boolean {
  const filename = skillIdToFilename(id);
  const filepath = getSkillFilePath(paths, filename);
  return existsSync(filepath);
}

// =============================================================================
// Info
// =============================================================================

/**
 * Get information about a skill directory.
 *
 * @param paths - Skill paths
 * @returns Directory info
 */
export function getDirectoryInfo(paths: SkillPaths): {
  exists: boolean;
  hasRegistry: boolean;
  skillCount: number;
  root: string;
} {
  const exists = skillDirectoryExists(paths);
  const hasRegistry = exists && registryExists(paths);
  const skillCount = exists ? listSkillFiles(paths).length : 0;

  return {
    exists,
    hasRegistry,
    skillCount,
    root: paths.root,
  };
}
