/**
 * Skill System Types
 *
 * Type definitions for the skill learning system.
 */

// =============================================================================
// Skill Core Types
// =============================================================================

/**
 * A learned skill that can be applied to future tasks.
 */
export interface Skill {
  /** Unique identifier (kebab-case) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Semantic version number */
  version: number;

  /** Creation timestamp (ISO 8601) */
  created: string;

  /** Last update timestamp (ISO 8601) */
  updated: string;

  /** Categorization tags */
  tags: string[];

  /** Keywords that trigger skill selection */
  triggers: string[];

  /** Success rate (0.0 - 1.0) */
  successRate: number;

  /** Number of times skill has been used */
  usageCount: number;

  /** Markdown content sections */
  content: SkillContent;
}

/**
 * Skill content sections parsed from markdown body.
 */
export interface SkillContent {
  /** When this skill should be applied */
  whenToApply: string[];

  /** Recommended approaches */
  approaches: SkillApproach[];

  /** Common pitfalls to avoid */
  pitfalls: SkillPitfall[];

  /** Steps to verify successful application */
  verificationSteps: string[];

  /** Raw markdown body (for serialization) */
  rawBody?: string;
}

/**
 * A recommended approach within a skill.
 */
export interface SkillApproach {
  /** Approach name/title */
  name: string;

  /** Description of the approach */
  description: string;

  /** Specific steps or guidelines */
  steps: string[];
}

/**
 * A pitfall to avoid.
 */
export interface SkillPitfall {
  /** Mistake description */
  mistake: string;

  /** How to avoid it */
  avoidance: string;
}

// =============================================================================
// Skill Registry Types
// =============================================================================

/**
 * Skill registry stored in index.json.
 */
export interface SkillRegistry {
  /** Registry format version */
  version: number;

  /** Registered skills */
  skills: SkillEntry[];

  /** Last registry update */
  updatedAt: string;
}

/**
 * Entry in the skill registry (lightweight metadata).
 */
export interface SkillEntry {
  /** Skill ID */
  id: string;

  /** Relative path to skill file */
  path: string;

  /** Skill name */
  name: string;

  /** Tags for filtering */
  tags: string[];

  /** Trigger keywords */
  triggers: string[];

  /** Success rate */
  successRate: number;

  /** Usage count */
  usageCount: number;

  /** Last time skill was used */
  lastUsed?: string;
}

/**
 * Default empty registry.
 */
export const DEFAULT_REGISTRY: SkillRegistry = {
  version: 1,
  skills: [],
  updatedAt: new Date().toISOString(),
};

// =============================================================================
// Skill Usage Types
// =============================================================================

/**
 * Record of skill usage for tracking.
 */
export interface SkillUsage {
  /** Unique usage ID */
  id: string;

  /** Skill that was used */
  skillId: string;

  /** Conversation where skill was applied */
  conversationId?: string;

  /** When skill was applied */
  appliedAt: string;

  /** Whether the task was completed successfully */
  taskCompleted: boolean;

  /** Optional user feedback */
  feedback?: string;
}

/**
 * Skill usage statistics.
 */
export interface SkillStats {
  /** Total times used */
  totalUsage: number;

  /** Successful completions */
  successfulUsage: number;

  /** Computed success rate */
  successRate: number;

  /** Last usage timestamp */
  lastUsed?: string;

  /** Usage trend (increasing, decreasing, stable) */
  trend: 'increasing' | 'decreasing' | 'stable';
}

// =============================================================================
// Skill Filter Types
// =============================================================================

/**
 * Filters for listing skills.
 */
export interface SkillFilters {
  /** Filter by tags (OR match) */
  tags?: string[];

  /** Filter by minimum success rate */
  minSuccessRate?: number;

  /** Filter by minimum usage count */
  minUsageCount?: number;

  /** Sort field */
  sortBy?: 'name' | 'successRate' | 'usageCount' | 'updated';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';

  /** Maximum results */
  limit?: number;
}

/**
 * Search options for finding skills.
 */
export interface SkillSearchOptions {
  /** Search query */
  query: string;

  /** Search in name */
  searchName?: boolean;

  /** Search in tags */
  searchTags?: boolean;

  /** Search in triggers */
  searchTriggers?: boolean;

  /** Search in content */
  searchContent?: boolean;

  /** Maximum results */
  limit?: number;
}

// =============================================================================
// Skill Directory Types
// =============================================================================

/**
 * Skill directory paths.
 */
export interface SkillPaths {
  /** Root skills directory */
  root: string;

  /** Path to index.json */
  registry: string;
}

/**
 * Skill directory scope.
 */
export type SkillScope = 'project' | 'global';

/**
 * Default skill directory name.
 */
export const SKILL_DIRECTORY = '.skills';

/**
 * Registry file name.
 */
export const REGISTRY_FILE = 'index.json';

// =============================================================================
// Reflection Types
// =============================================================================

/**
 * Result of analyzing a conversation trajectory.
 */
export interface ReflectionResult {
  /** Whether the task was completed successfully */
  taskCompleted: boolean;

  /** Quality score of reasoning (0.0 - 1.0) */
  reasoningQuality: number;

  /** Whether skill creation is recommended */
  shouldCreateSkill: boolean;

  /** Extracted patterns and approaches */
  patterns: ExtractedPattern[];

  /** Identified pitfalls */
  pitfalls: ExtractedPitfall[];

  /** Suggested skill name */
  suggestedName?: string;

  /** Suggested tags */
  suggestedTags: string[];

  /** Suggested triggers */
  suggestedTriggers: string[];
}

/**
 * Pattern extracted from successful task completion.
 */
export interface ExtractedPattern {
  /** Pattern name */
  name: string;

  /** What the pattern does */
  description: string;

  /** When to use this pattern */
  context: string;

  /** Steps taken */
  steps: string[];
}

/**
 * Pitfall extracted from conversation.
 */
export interface ExtractedPitfall {
  /** What went wrong */
  issue: string;

  /** How it was resolved */
  resolution: string;

  /** How to avoid in future */
  prevention: string;
}

// =============================================================================
// Creation Types
// =============================================================================

/**
 * Input for skill creation from reflection.
 */
export interface SkillCreationInput {
  /** Reflection result */
  reflection: ReflectionResult;

  /** Optional name override */
  name?: string;

  /** Optional tags override */
  tags?: string[];

  /** Optional triggers override */
  triggers?: string[];
}

/**
 * Result of skill creation.
 */
export interface SkillCreationResult {
  /** Whether creation was successful */
  success: boolean;

  /** Created skill (if successful) */
  skill?: Skill;

  /** Error message (if failed) */
  error?: string;

  /** Path where skill was saved */
  path?: string;
}

// =============================================================================
// Selection Types
// =============================================================================

/**
 * Context for skill selection.
 */
export interface TaskContext {
  /** Task description */
  description: string;

  /** Detected technologies */
  technologies: string[];

  /** File types involved */
  fileTypes: string[];

  /** Task type */
  taskType: 'feature' | 'fix' | 'refactor' | 'test' | 'docs' | 'other';

  /** Additional keywords */
  keywords: string[];
}

/**
 * Skill match result.
 */
export interface SkillMatch {
  /** Matched skill */
  skill: SkillEntry;

  /** Relevance score (0.0 - 1.0) */
  score: number;

  /** Why this skill matched */
  matchReasons: string[];
}

/**
 * Maximum number of skills to apply per task.
 */
export const MAX_SKILLS_PER_TASK = 3;
