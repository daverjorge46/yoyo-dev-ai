/**
 * Skill File Parser
 *
 * Parses skill markdown files with YAML frontmatter into structured data.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import matter from 'gray-matter';
import type {
  Skill,
  SkillContent,
  SkillApproach,
  SkillPitfall,
  SkillPaths,
} from './types.js';
import { getSkillFilePath, skillIdToFilename } from './directory.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Raw frontmatter data from YAML.
 */
interface RawFrontmatter {
  id?: string;
  name?: string;
  version?: number;
  created?: string;
  updated?: string;
  tags?: string[];
  triggers?: string[];
  success_rate?: number;
  usage_count?: number;
}

/**
 * Parse result with success indicator.
 */
export interface ParseResult {
  success: boolean;
  skill?: Skill;
  error?: string;
}

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parse a skill file into structured data.
 *
 * @param filepath - Path to the skill file
 * @returns Parse result
 */
export function parseSkillFile(filepath: string): ParseResult {
  try {
    const content = readFileSync(filepath, 'utf-8');
    return parseSkillContent(content);
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse skill content string into structured data.
 *
 * @param content - Raw file content
 * @returns Parse result
 */
export function parseSkillContent(content: string): ParseResult {
  try {
    const { data, content: body } = matter(content);
    const frontmatter = data as RawFrontmatter;

    // Validate required fields
    const validation = validateFrontmatter(frontmatter);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Parse markdown body
    const skillContent = parseMarkdownBody(body);

    const skill: Skill = {
      id: frontmatter.id!,
      name: frontmatter.name!,
      version: frontmatter.version ?? 1,
      created: frontmatter.created ?? new Date().toISOString(),
      updated: frontmatter.updated ?? new Date().toISOString(),
      tags: frontmatter.tags ?? [],
      triggers: frontmatter.triggers ?? [],
      successRate: frontmatter.success_rate ?? 0,
      usageCount: frontmatter.usage_count ?? 0,
      content: skillContent,
    };

    return { success: true, skill };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse skill from a skill path and ID.
 *
 * @param paths - Skill paths
 * @param id - Skill ID
 * @returns Parse result
 */
export function parseSkill(paths: SkillPaths, id: string): ParseResult {
  const filename = skillIdToFilename(id);
  const filepath = getSkillFilePath(paths, filename);
  return parseSkillFile(filepath);
}

// =============================================================================
// Validation
// =============================================================================

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate frontmatter has required fields.
 *
 * @param data - Raw frontmatter data
 * @returns Validation result
 */
function validateFrontmatter(data: RawFrontmatter): ValidationResult {
  if (!data.id || typeof data.id !== 'string') {
    return { valid: false, error: 'Missing required field: id' };
  }

  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: 'Missing required field: name' };
  }

  if (data.version !== undefined && typeof data.version !== 'number') {
    return { valid: false, error: 'Invalid field type: version must be a number' };
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    return { valid: false, error: 'Invalid field type: tags must be an array' };
  }

  if (data.triggers !== undefined && !Array.isArray(data.triggers)) {
    return { valid: false, error: 'Invalid field type: triggers must be an array' };
  }

  if (data.success_rate !== undefined) {
    if (typeof data.success_rate !== 'number' || data.success_rate < 0 || data.success_rate > 1) {
      return { valid: false, error: 'Invalid field: success_rate must be a number between 0 and 1' };
    }
  }

  return { valid: true };
}

// =============================================================================
// Markdown Body Parsing
// =============================================================================

/**
 * Parse markdown body into structured sections.
 *
 * @param body - Markdown body content
 * @returns Parsed skill content
 */
function parseMarkdownBody(body: string): SkillContent {
  const lines = body.split('\n');
  const content: SkillContent = {
    whenToApply: [],
    approaches: [],
    pitfalls: [],
    verificationSteps: [],
    rawBody: body.trim(),
  };

  let currentSection = '';
  let currentApproach: Partial<SkillApproach> | null = null;
  let currentPitfall: Partial<SkillPitfall> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers
    if (trimmed.startsWith('## ')) {
      const header = trimmed.slice(3).toLowerCase();
      if (header.includes('when to apply')) {
        currentSection = 'whenToApply';
      } else if (header.includes('approach')) {
        currentSection = 'approaches';
      } else if (header.includes('pitfall')) {
        currentSection = 'pitfalls';
      } else if (header.includes('verification')) {
        currentSection = 'verification';
      }
      continue;
    }

    // Detect subsection headers (###)
    if (trimmed.startsWith('### ')) {
      const subheader = trimmed.slice(4);
      if (currentSection === 'approaches') {
        if (currentApproach?.name) {
          content.approaches.push(currentApproach as SkillApproach);
        }
        currentApproach = { name: subheader, description: '', steps: [] };
      } else if (currentSection === 'pitfalls') {
        if (currentPitfall?.mistake) {
          content.pitfalls.push(currentPitfall as SkillPitfall);
        }
        currentPitfall = { mistake: subheader, avoidance: '' };
      }
      continue;
    }

    // Parse list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const item = trimmed.slice(2);
      if (currentSection === 'whenToApply') {
        content.whenToApply.push(item);
      } else if (currentSection === 'verification') {
        content.verificationSteps.push(item);
      } else if (currentSection === 'approaches' && currentApproach) {
        currentApproach.steps = currentApproach.steps ?? [];
        currentApproach.steps.push(item);
      }
      continue;
    }

    // Parse numbered list items
    if (/^\d+\.\s/.test(trimmed)) {
      const item = trimmed.replace(/^\d+\.\s/, '');
      if (currentSection === 'verification') {
        content.verificationSteps.push(item);
      } else if (currentSection === 'pitfalls' && currentPitfall) {
        // Numbered items in pitfalls section
        if (!currentPitfall.avoidance) {
          currentPitfall.avoidance = item;
        }
      }
      continue;
    }

    // Regular text - add to current context
    if (trimmed && currentSection === 'approaches' && currentApproach) {
      if (!currentApproach.description) {
        currentApproach.description = trimmed;
      }
    }
    if (trimmed && currentSection === 'pitfalls' && currentPitfall) {
      if (!currentPitfall.avoidance) {
        currentPitfall.avoidance = trimmed;
      }
    }
  }

  // Finalize last items
  if (currentApproach?.name) {
    content.approaches.push(currentApproach as SkillApproach);
  }
  if (currentPitfall?.mistake) {
    content.pitfalls.push(currentPitfall as SkillPitfall);
  }

  return content;
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize a skill back to markdown with frontmatter.
 *
 * @param skill - Skill to serialize
 * @returns Markdown string
 */
export function serializeSkill(skill: Skill): string {
  const frontmatter = {
    id: skill.id,
    name: skill.name,
    version: skill.version,
    created: skill.created,
    updated: skill.updated,
    tags: skill.tags,
    triggers: skill.triggers,
    success_rate: skill.successRate,
    usage_count: skill.usageCount,
  };

  const body = skill.content.rawBody ?? generateMarkdownBody(skill.content);

  return matter.stringify(body, frontmatter);
}

/**
 * Generate markdown body from structured content.
 *
 * @param content - Skill content
 * @returns Markdown string
 */
function generateMarkdownBody(content: SkillContent): string {
  const sections: string[] = [];

  // When to Apply
  if (content.whenToApply.length > 0) {
    sections.push('## When to Apply\n');
    for (const item of content.whenToApply) {
      sections.push(`- ${item}`);
    }
    sections.push('');
  }

  // Approaches
  if (content.approaches.length > 0) {
    sections.push('## Approaches\n');
    for (const approach of content.approaches) {
      sections.push(`### ${approach.name}`);
      if (approach.description) {
        sections.push(approach.description);
      }
      for (const step of approach.steps) {
        sections.push(`- ${step}`);
      }
      sections.push('');
    }
  }

  // Pitfalls
  if (content.pitfalls.length > 0) {
    sections.push('## Pitfalls\n');
    for (const pitfall of content.pitfalls) {
      sections.push(`### ${pitfall.mistake}`);
      sections.push(pitfall.avoidance);
      sections.push('');
    }
  }

  // Verification Steps
  if (content.verificationSteps.length > 0) {
    sections.push('## Verification Steps\n');
    content.verificationSteps.forEach((step, i) => {
      sections.push(`${i + 1}. ${step}`);
    });
    sections.push('');
  }

  return sections.join('\n').trim();
}

/**
 * Save a skill to a file.
 *
 * @param paths - Skill paths
 * @param skill - Skill to save
 * @returns Path where skill was saved
 */
export function saveSkill(paths: SkillPaths, skill: Skill): string {
  const filename = skillIdToFilename(skill.id);
  const filepath = getSkillFilePath(paths, filename);
  const content = serializeSkill(skill);
  writeFileSync(filepath, content, 'utf-8');
  return filepath;
}
