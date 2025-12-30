/**
 * Creation Engine
 *
 * Generates skill documents from reflection results.
 * This is Stage 2 of the two-stage learning process.
 */

import type {
  Skill,
  SkillContent,
  SkillApproach,
  SkillPitfall,
  SkillCreationInput,
  SkillCreationResult,
  ReflectionResult,
  ExtractedPattern,
  ExtractedPitfall,
  SkillPaths,
} from './types.js';
import { generateSkillId, isValidSkillId, skillExists } from './directory.js';
import { saveSkill } from './parser.js';
import { addToRegistry } from './discovery.js';

// =============================================================================
// Content Generation
// =============================================================================

/**
 * Convert extracted patterns to skill approaches.
 *
 * @param patterns - Extracted patterns from reflection
 * @returns Skill approaches
 */
export function patternsToApproaches(patterns: ExtractedPattern[]): SkillApproach[] {
  return patterns.map(pattern => ({
    name: pattern.name,
    description: pattern.description,
    steps: pattern.steps,
  }));
}

/**
 * Convert extracted pitfalls to skill pitfalls.
 *
 * @param pitfalls - Extracted pitfalls from reflection
 * @returns Skill pitfalls
 */
export function pitfallsToSkillPitfalls(pitfalls: ExtractedPitfall[]): SkillPitfall[] {
  return pitfalls.map(pitfall => ({
    mistake: pitfall.issue,
    avoidance: `${pitfall.resolution}. ${pitfall.prevention}`,
  }));
}

/**
 * Generate "When to Apply" section from reflection.
 *
 * @param reflection - Reflection result
 * @returns When to apply items
 */
export function generateWhenToApply(reflection: ReflectionResult): string[] {
  const items: string[] = [];

  // Add based on tags
  if (reflection.suggestedTags.length > 0) {
    items.push(`Working with ${reflection.suggestedTags.slice(0, 3).join(', ')}`);
  }

  // Add based on patterns
  for (const pattern of reflection.patterns.slice(0, 2)) {
    if (pattern.context) {
      items.push(pattern.context);
    }
  }

  // Add generic items if needed
  if (items.length === 0) {
    items.push('When facing similar tasks');
    items.push('When the same patterns apply');
  }

  return items;
}

/**
 * Generate verification steps from reflection.
 *
 * @param reflection - Reflection result
 * @returns Verification steps
 */
export function generateVerificationSteps(reflection: ReflectionResult): string[] {
  const steps: string[] = [];

  // Generic verification steps
  steps.push('Implementation matches requirements');
  steps.push('No errors or warnings');

  // Add based on pitfalls
  for (const pitfall of reflection.pitfalls.slice(0, 2)) {
    steps.push(`Verify: ${pitfall.prevention}`);
  }

  // Add testing step if relevant
  if (reflection.suggestedTags.includes('testing') ||
      reflection.suggestedTriggers.includes('test')) {
    steps.push('All tests pass');
  }

  return steps;
}

/**
 * Generate skill content from reflection.
 *
 * @param reflection - Reflection result
 * @returns Skill content
 */
export function generateSkillContent(reflection: ReflectionResult): SkillContent {
  return {
    whenToApply: generateWhenToApply(reflection),
    approaches: patternsToApproaches(reflection.patterns),
    pitfalls: pitfallsToSkillPitfalls(reflection.pitfalls),
    verificationSteps: generateVerificationSteps(reflection),
  };
}

// =============================================================================
// Skill Creation
// =============================================================================

/**
 * Generate a unique skill ID.
 *
 * @param name - Skill name
 * @param paths - Skill paths (to check for duplicates)
 * @returns Unique skill ID
 */
export function generateUniqueId(name: string, paths?: SkillPaths): string {
  let baseId = generateSkillId(name);

  if (!paths) {
    return baseId;
  }

  // Check for duplicates and add suffix if needed
  let id = baseId;
  let counter = 1;

  while (skillExists(paths, id)) {
    id = `${baseId}-${counter}`;
    counter++;

    if (counter > 100) {
      // Fallback to timestamp-based ID
      id = `${baseId}-${Date.now()}`;
      break;
    }
  }

  return id;
}

/**
 * Create a skill from reflection result.
 *
 * @param input - Creation input
 * @param paths - Optional skill paths for saving
 * @returns Skill creation result
 */
export function createSkillFromReflection(
  input: SkillCreationInput,
  paths?: SkillPaths
): SkillCreationResult {
  const { reflection, name, tags, triggers } = input;

  // Validate reflection
  if (!reflection.shouldCreateSkill) {
    return {
      success: false,
      error: 'Reflection does not recommend skill creation',
    };
  }

  // Generate skill metadata
  const skillName = name ?? reflection.suggestedName ?? 'Learned Skill';
  const skillId = paths
    ? generateUniqueId(skillName, paths)
    : generateSkillId(skillName);

  if (!isValidSkillId(skillId)) {
    return {
      success: false,
      error: `Invalid skill ID generated: ${skillId}`,
    };
  }

  // Generate skill content
  const content = generateSkillContent(reflection);

  // Create skill object
  const now = new Date().toISOString();
  const skill: Skill = {
    id: skillId,
    name: skillName,
    version: 1,
    created: now,
    updated: now,
    tags: tags ?? reflection.suggestedTags,
    triggers: triggers ?? reflection.suggestedTriggers,
    successRate: 0, // New skill starts at 0
    usageCount: 0,
    content,
  };

  // Save if paths provided
  let savedPath: string | undefined;
  if (paths) {
    try {
      savedPath = saveSkill(paths, skill);
      addToRegistry(paths, skill, `${skillId}.md`);
    } catch (error) {
      return {
        success: false,
        error: `Failed to save skill: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  return {
    success: true,
    skill,
    path: savedPath,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate creation input.
 *
 * @param input - Creation input
 * @returns Validation error or null if valid
 */
export function validateCreationInput(input: SkillCreationInput): string | null {
  if (!input.reflection) {
    return 'Missing reflection result';
  }

  if (input.name && input.name.length < 3) {
    return 'Skill name must be at least 3 characters';
  }

  if (input.name && input.name.length > 100) {
    return 'Skill name must be less than 100 characters';
  }

  if (input.tags && input.tags.length > 20) {
    return 'Too many tags (max 20)';
  }

  if (input.triggers && input.triggers.length > 20) {
    return 'Too many triggers (max 20)';
  }

  return null;
}

/**
 * Merge multiple reflections into a single creation input.
 *
 * Useful when learning from multiple similar tasks.
 *
 * @param reflections - Array of reflection results
 * @returns Merged creation input
 */
export function mergeReflections(reflections: ReflectionResult[]): SkillCreationInput {
  if (reflections.length === 0) {
    throw new Error('No reflections to merge');
  }

  if (reflections.length === 1 && reflections[0]) {
    return { reflection: reflections[0] };
  }

  // Merge patterns
  const allPatterns = reflections.flatMap(r => r.patterns);
  const uniquePatterns = allPatterns.filter((pattern, index, self) =>
    index === self.findIndex(p => p.name === pattern.name)
  );

  // Merge pitfalls
  const allPitfalls = reflections.flatMap(r => r.pitfalls);
  const uniquePitfalls = allPitfalls.filter((pitfall, index, self) =>
    index === self.findIndex(p => p.issue === pitfall.issue)
  );

  // Merge tags
  const allTags = reflections.flatMap(r => r.suggestedTags);
  const uniqueTags = [...new Set(allTags)];

  // Merge triggers
  const allTriggers = reflections.flatMap(r => r.suggestedTriggers);
  const uniqueTriggers = [...new Set(allTriggers)];

  // Average quality
  const avgQuality = reflections.reduce((sum, r) => sum + r.reasoningQuality, 0) / reflections.length;

  // Create merged reflection
  const merged: ReflectionResult = {
    taskCompleted: reflections.every(r => r.taskCompleted),
    reasoningQuality: avgQuality,
    shouldCreateSkill: reflections.some(r => r.shouldCreateSkill),
    patterns: uniquePatterns.slice(0, 5),
    pitfalls: uniquePitfalls.slice(0, 5),
    suggestedName: reflections[0]?.suggestedName,
    suggestedTags: uniqueTags.slice(0, 10),
    suggestedTriggers: uniqueTriggers.slice(0, 10),
  };

  return { reflection: merged };
}

/**
 * Generate a markdown preview of the skill that would be created.
 *
 * @param input - Creation input
 * @returns Markdown preview string
 */
export function generateSkillPreview(input: SkillCreationInput): string {
  const { reflection, name, tags, triggers } = input;

  const skillName = name ?? reflection.suggestedName ?? 'Learned Skill';
  const skillTags = tags ?? reflection.suggestedTags;
  const skillTriggers = triggers ?? reflection.suggestedTriggers;
  const content = generateSkillContent(reflection);

  const lines: string[] = [];

  lines.push(`# ${skillName}`);
  lines.push('');
  lines.push(`**Tags:** ${skillTags.join(', ') || 'none'}`);
  lines.push(`**Triggers:** ${skillTriggers.join(', ') || 'none'}`);
  lines.push('');

  if (content.whenToApply.length > 0) {
    lines.push('## When to Apply');
    for (const item of content.whenToApply) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (content.approaches.length > 0) {
    lines.push('## Approaches');
    for (const approach of content.approaches) {
      lines.push(`### ${approach.name}`);
      lines.push(approach.description);
      for (const step of approach.steps) {
        lines.push(`- ${step}`);
      }
      lines.push('');
    }
  }

  if (content.pitfalls.length > 0) {
    lines.push('## Pitfalls');
    for (const pitfall of content.pitfalls) {
      lines.push(`### ${pitfall.mistake}`);
      lines.push(pitfall.avoidance);
      lines.push('');
    }
  }

  if (content.verificationSteps.length > 0) {
    lines.push('## Verification Steps');
    content.verificationSteps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }

  return lines.join('\n');
}
