/**
 * Skill Application Engine
 *
 * Injects selected skills into agent context and tracks usage.
 */

import type {
  Skill,
  SkillMatch,
  SkillPaths,
  TaskContext,
} from './types.js';
import { updateSkillUsage } from './discovery.js';
import { selectTopSkills, type SelectionConfig } from './selection.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Format configuration for skill injection.
 */
export interface FormatConfig {
  /** Include approaches section */
  includeApproaches?: boolean;

  /** Include pitfalls section */
  includePitfalls?: boolean;

  /** Include verification steps */
  includeVerification?: boolean;

  /** Maximum approaches to include */
  maxApproaches?: number;

  /** Maximum pitfalls to include */
  maxPitfalls?: number;

  /** Use compact format (less tokens) */
  compact?: boolean;
}

/**
 * Result of skill application.
 */
export interface ApplicationResult {
  /** Whether skills were successfully applied */
  success: boolean;

  /** Formatted context string to inject */
  context: string;

  /** Skills that were applied */
  appliedSkills: SkillMatch[];

  /** Any errors encountered */
  errors?: string[];

  /** Token estimate for the context */
  tokenEstimate?: number;
}

/**
 * Skill usage record for tracking.
 */
export interface UsageRecord {
  skillId: string;
  taskDescription: string;
  appliedAt: string;
  success?: boolean;
}

const DEFAULT_FORMAT_CONFIG: FormatConfig = {
  includeApproaches: true,
  includePitfalls: true,
  includeVerification: true,
  maxApproaches: 2,
  maxPitfalls: 3,
  compact: false,
};

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format a single skill for context injection.
 *
 * @param skill - Skill to format
 * @param relevance - Relevance score
 * @param config - Format configuration
 * @returns Formatted skill text
 */
export function formatSkillForContext(
  skill: Skill,
  relevance: number,
  config: FormatConfig = DEFAULT_FORMAT_CONFIG
): string {
  const lines: string[] = [];
  const compact = config.compact ?? false;

  // Header
  if (compact) {
    lines.push(`### ${skill.name} (${Math.round(relevance * 100)}% relevant)`);
  } else {
    lines.push(`## Skill: ${skill.name}`);
    lines.push(`*Relevance: ${Math.round(relevance * 100)}% | Success Rate: ${Math.round(skill.successRate * 100)}%*`);
    lines.push('');
  }

  // When to Apply
  if (skill.content.whenToApply.length > 0) {
    if (!compact) {
      lines.push('**When to Apply:**');
    }
    for (const item of skill.content.whenToApply.slice(0, 3)) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Approaches
  if (config.includeApproaches !== false && skill.content.approaches.length > 0) {
    const maxApproaches = config.maxApproaches ?? 2;
    const approaches = skill.content.approaches.slice(0, maxApproaches);

    if (!compact) {
      lines.push('**Approaches:**');
    }

    for (const approach of approaches) {
      if (compact) {
        lines.push(`- **${approach.name}:** ${approach.description}`);
      } else {
        lines.push(`### ${approach.name}`);
        lines.push(approach.description);
        if (approach.steps.length > 0) {
          lines.push('');
          lines.push('Steps:');
          for (const step of approach.steps) {
            lines.push(`1. ${step}`);
          }
        }
        lines.push('');
      }
    }
  }

  // Pitfalls
  if (config.includePitfalls !== false && skill.content.pitfalls.length > 0) {
    const maxPitfalls = config.maxPitfalls ?? 3;
    const pitfalls = skill.content.pitfalls.slice(0, maxPitfalls);

    if (!compact) {
      lines.push('**Common Pitfalls:**');
    } else {
      lines.push('**Avoid:**');
    }

    for (const pitfall of pitfalls) {
      if (compact) {
        lines.push(`- ${pitfall.mistake}: ${pitfall.avoidance}`);
      } else {
        lines.push(`- **${pitfall.mistake}:** ${pitfall.avoidance}`);
      }
    }
    lines.push('');
  }

  // Verification
  if (config.includeVerification !== false && skill.content.verificationSteps.length > 0) {
    if (!compact) {
      lines.push('**Verification:**');
      for (const step of skill.content.verificationSteps) {
        lines.push(`- [ ] ${step}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format multiple skills into a combined context.
 *
 * @param matches - Skill matches to format
 * @param config - Format configuration
 * @returns Combined context string
 */
export function formatSkillsForContext(
  matches: SkillMatch[],
  config: FormatConfig = DEFAULT_FORMAT_CONFIG
): string {
  if (matches.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Header
  lines.push('# Relevant Skills');
  lines.push('');
  lines.push('The following learned skills may help with this task:');
  lines.push('');

  // Format each skill
  for (const match of matches) {
    lines.push(formatSkillForContext(match.skill, match.relevance, config));
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// Application Functions
// =============================================================================

/**
 * Apply skills to a task context.
 *
 * Selects relevant skills and formats them for injection.
 *
 * @param paths - Skill paths
 * @param context - Task context
 * @param selectionConfig - Selection configuration
 * @param formatConfig - Format configuration
 * @returns Application result
 */
export function applySkills(
  paths: SkillPaths,
  context: TaskContext,
  selectionConfig?: SelectionConfig,
  formatConfig?: FormatConfig
): ApplicationResult {
  const errors: string[] = [];

  try {
    // Select relevant skills
    const matches = selectTopSkills(paths, context, selectionConfig);

    if (matches.length === 0) {
      return {
        success: true,
        context: '',
        appliedSkills: [],
        tokenEstimate: 0,
      };
    }

    // Format skills for context
    const formattedContext = formatSkillsForContext(matches, formatConfig);

    // Estimate tokens (rough: ~4 chars per token)
    const tokenEstimate = Math.ceil(formattedContext.length / 4);

    return {
      success: true,
      context: formattedContext,
      appliedSkills: matches,
      tokenEstimate,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during skill application');

    return {
      success: false,
      context: '',
      appliedSkills: [],
      errors,
    };
  }
}

/**
 * Inject skills into an existing prompt/context.
 *
 * @param originalContext - Original prompt or context
 * @param skillContext - Formatted skill context
 * @param position - Where to inject ('start', 'end', or 'after-system')
 * @returns Combined context
 */
export function injectSkillsIntoContext(
  originalContext: string,
  skillContext: string,
  position: 'start' | 'end' | 'after-system' = 'start'
): string {
  if (!skillContext) {
    return originalContext;
  }

  switch (position) {
    case 'start':
      return `${skillContext}\n\n${originalContext}`;

    case 'end':
      return `${originalContext}\n\n${skillContext}`;

    case 'after-system':
      // Try to find system message boundary
      const systemEndMarkers = ['</system>', '---', '\n\n'];
      for (const marker of systemEndMarkers) {
        const idx = originalContext.indexOf(marker);
        if (idx !== -1) {
          const insertPoint = idx + marker.length;
          return (
            originalContext.slice(0, insertPoint) +
            '\n\n' +
            skillContext +
            '\n\n' +
            originalContext.slice(insertPoint)
          );
        }
      }
      // Fall back to start if no system marker found
      return `${skillContext}\n\n${originalContext}`;

    default:
      return `${skillContext}\n\n${originalContext}`;
  }
}

// =============================================================================
// Usage Tracking
// =============================================================================

/**
 * Record that skills were used for a task.
 *
 * @param paths - Skill paths
 * @param appliedSkills - Skills that were applied
 * @param taskDescription - Description of the task
 */
export function recordSkillsApplied(
  paths: SkillPaths,
  appliedSkills: SkillMatch[],
  _taskDescription: string
): void {
  for (const match of appliedSkills) {
    // Update usage count in registry
    // Success will be recorded later via recordSkillOutcome
    updateSkillUsage(paths, match.skill.id, true);
  }
}

/**
 * Record the outcome of skill usage.
 *
 * @param paths - Skill paths
 * @param skillId - Skill ID
 * @param success - Whether the skill application was successful
 */
export function recordSkillOutcome(
  paths: SkillPaths,
  skillId: string,
  success: boolean
): void {
  updateSkillUsage(paths, skillId, success);
}

/**
 * Create a usage record for logging/analytics.
 *
 * @param skillId - Skill ID
 * @param taskDescription - Task description
 * @returns Usage record
 */
export function createUsageRecord(
  skillId: string,
  taskDescription: string
): UsageRecord {
  return {
    skillId,
    taskDescription,
    appliedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick apply skills and get formatted context.
 *
 * Convenience function combining selection and formatting.
 *
 * @param paths - Skill paths
 * @param description - Task description
 * @param compact - Use compact format
 * @returns Formatted skill context or empty string
 */
export function getSkillContext(
  paths: SkillPaths,
  description: string,
  compact: boolean = false
): string {
  const result = applySkills(
    paths,
    {
      description,
      technologies: [],
      fileTypes: [],
      taskType: 'other',
      keywords: [],
    },
    undefined,
    { compact }
  );

  return result.context;
}

/**
 * Apply skills and track usage in one call.
 *
 * @param paths - Skill paths
 * @param context - Task context
 * @param options - Options
 * @returns Application result with tracking done
 */
export function applyAndTrackSkills(
  paths: SkillPaths,
  context: TaskContext,
  options?: {
    selectionConfig?: SelectionConfig;
    formatConfig?: FormatConfig;
    trackUsage?: boolean;
  }
): ApplicationResult {
  const result = applySkills(
    paths,
    context,
    options?.selectionConfig,
    options?.formatConfig
  );

  // Track usage if successful and enabled
  if (result.success && result.appliedSkills.length > 0 && options?.trackUsage !== false) {
    recordSkillsApplied(paths, result.appliedSkills, context.description);
  }

  return result;
}
