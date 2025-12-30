/**
 * Skill Selection Engine
 *
 * Auto-selects relevant skills for task context.
 * Matches skills based on triggers, tags, and content relevance.
 */

import type {
  Skill,
  SkillEntry,
  TaskContext,
  SkillMatch,
  SkillPaths,
} from './types.js';
import { getAllSkillEntries, findSkillsByTrigger, findSkillsByTag } from './discovery.js';
import { parseSkill } from './parser.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Selection configuration.
 */
export interface SelectionConfig {
  /** Maximum skills to select (default: 3) */
  maxSkills?: number;

  /** Minimum relevance score (0-1) to include skill */
  minRelevance?: number;

  /** Boost factor for exact trigger matches */
  triggerBoost?: number;

  /** Boost factor for tag matches */
  tagBoost?: number;

  /** Boost factor for high success rate skills */
  successRateBoost?: number;
}

const DEFAULT_CONFIG: SelectionConfig = {
  maxSkills: 3,
  minRelevance: 0.3,
  triggerBoost: 2.0,
  tagBoost: 1.5,
  successRateBoost: 1.2,
};

// =============================================================================
// Task Context Analysis
// =============================================================================

/**
 * Analyze task context to extract searchable terms.
 *
 * @param context - Task context
 * @returns Extracted keywords, technologies, and action verbs
 */
export function analyzeTaskContext(context: TaskContext): {
  keywords: string[];
  technologies: string[];
  actions: string[];
} {
  const description = context.description.toLowerCase();
  const keywords: Set<string> = new Set();
  const technologies: Set<string> = new Set();
  const actions: Set<string> = new Set();

  // Extract action verbs
  const actionVerbs = [
    'implement', 'create', 'add', 'build', 'fix', 'update', 'refactor',
    'test', 'debug', 'optimize', 'deploy', 'configure', 'setup', 'migrate',
    'delete', 'remove', 'modify', 'change', 'improve', 'enhance',
  ];

  for (const verb of actionVerbs) {
    if (description.includes(verb)) {
      actions.add(verb);
    }
  }

  // Extract technology keywords
  const techKeywords = [
    'react', 'vue', 'angular', 'svelte', 'next', 'nuxt',
    'node', 'express', 'fastify', 'nest', 'koa',
    'typescript', 'javascript', 'python', 'rust', 'go', 'java',
    'api', 'rest', 'graphql', 'grpc', 'websocket',
    'database', 'sql', 'postgres', 'mysql', 'mongodb', 'redis',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure',
    'testing', 'jest', 'vitest', 'pytest', 'mocha',
    'css', 'tailwind', 'styled', 'sass', 'scss',
    'authentication', 'auth', 'oauth', 'jwt',
    'component', 'hook', 'context', 'state', 'redux', 'zustand',
  ];

  for (const tech of techKeywords) {
    if (description.includes(tech)) {
      technologies.add(tech);
    }
  }

  // Add explicitly provided technologies
  if (context.technologies) {
    for (const tech of context.technologies) {
      technologies.add(tech.toLowerCase());
    }
  }

  // Extract general keywords (words longer than 3 chars)
  const words = description
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  for (const word of words) {
    if (!actionVerbs.includes(word) && !techKeywords.includes(word)) {
      keywords.add(word);
    }
  }

  // Add file-based hints
  if (context.currentFile) {
    const ext = context.currentFile.split('.').pop()?.toLowerCase();
    const extToTech: Record<string, string> = {
      ts: 'typescript',
      tsx: 'react',
      js: 'javascript',
      jsx: 'react',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      vue: 'vue',
      svelte: 'svelte',
    };
    if (ext && extToTech[ext]) {
      technologies.add(extToTech[ext]);
    }
  }

  return {
    keywords: Array.from(keywords),
    technologies: Array.from(technologies),
    actions: Array.from(actions),
  };
}

// =============================================================================
// Skill Matching
// =============================================================================

/**
 * Match skills by their triggers against task context.
 *
 * @param paths - Skill paths
 * @param context - Analyzed task context
 * @returns Matching skill entries with trigger match count
 */
export function matchSkillTriggers(
  paths: SkillPaths,
  context: { keywords: string[]; technologies: string[]; actions: string[] }
): Map<string, { entry: SkillEntry; triggerMatches: number }> {
  const matches = new Map<string, { entry: SkillEntry; triggerMatches: number }>();
  const allTerms = [...context.keywords, ...context.technologies, ...context.actions];

  // Find skills by each term
  for (const term of allTerms) {
    const byTrigger = findSkillsByTrigger(paths, term);
    const byTag = findSkillsByTag(paths, term);

    for (const entry of [...byTrigger, ...byTag]) {
      const existing = matches.get(entry.id);
      if (existing) {
        existing.triggerMatches++;
      } else {
        matches.set(entry.id, { entry, triggerMatches: 1 });
      }
    }
  }

  return matches;
}

/**
 * Score a skill's relevance to the task context.
 *
 * @param skill - Skill to score
 * @param context - Task context analysis
 * @param triggerMatches - Number of trigger matches
 * @param config - Selection config
 * @returns Relevance score (0-1)
 */
export function scoreSkillRelevance(
  skill: Skill,
  context: { keywords: string[]; technologies: string[]; actions: string[] },
  triggerMatches: number,
  config: SelectionConfig = DEFAULT_CONFIG
): number {
  let score = 0;
  const maxScore = 10; // Normalize to 0-1

  // Trigger match score (up to 3 points)
  const triggerScore = Math.min(triggerMatches * (config.triggerBoost ?? 2.0), 3);
  score += triggerScore;

  // Tag match score (up to 2 points)
  const allTerms = [...context.keywords, ...context.technologies, ...context.actions];
  const tagMatches = skill.tags.filter(tag =>
    allTerms.some(term => tag.toLowerCase().includes(term) || term.includes(tag.toLowerCase()))
  ).length;
  score += Math.min(tagMatches * (config.tagBoost ?? 1.5), 2);

  // Content relevance (up to 2 points)
  const contentText = [
    ...skill.content.whenToApply,
    ...skill.content.approaches.map(a => a.name + ' ' + a.description),
    ...skill.content.pitfalls.map(p => p.mistake),
  ].join(' ').toLowerCase();

  let contentMatches = 0;
  for (const term of allTerms) {
    if (contentText.includes(term)) {
      contentMatches++;
    }
  }
  score += Math.min(contentMatches * 0.5, 2);

  // Success rate boost (up to 1 point)
  if (skill.successRate > 0.7) {
    score += (skill.successRate - 0.7) * (config.successRateBoost ?? 1.2) * 3;
  }

  // Usage frequency bonus (up to 1 point)
  if (skill.usageCount > 0) {
    score += Math.min(Math.log10(skill.usageCount + 1) * 0.5, 1);
  }

  // Recency bonus (up to 1 point) - newer skills get slight boost
  // This encourages using recently learned/updated skills

  return Math.min(score / maxScore, 1.0);
}

// =============================================================================
// Skill Selection
// =============================================================================

/**
 * Select top skills for a task context.
 *
 * @param paths - Skill paths
 * @param context - Task context
 * @param config - Selection configuration
 * @returns Top matching skills with relevance scores
 */
export function selectTopSkills(
  paths: SkillPaths,
  context: TaskContext,
  config: SelectionConfig = DEFAULT_CONFIG
): SkillMatch[] {
  const maxSkills = config.maxSkills ?? 3;
  const minRelevance = config.minRelevance ?? 0.3;

  // Analyze task context
  const analyzed = analyzeTaskContext(context);

  // If no extractable terms, return empty
  if (
    analyzed.keywords.length === 0 &&
    analyzed.technologies.length === 0 &&
    analyzed.actions.length === 0
  ) {
    return [];
  }

  // Find matching skills
  const matches = matchSkillTriggers(paths, analyzed);

  // Score each match
  const scored: SkillMatch[] = [];

  for (const [skillId, { entry, triggerMatches }] of matches) {
    // Load full skill to score content
    const parseResult = parseSkill(paths, skillId);
    if (!parseResult.success || !parseResult.skill) {
      continue;
    }

    const relevance = scoreSkillRelevance(
      parseResult.skill,
      analyzed,
      triggerMatches,
      config
    );

    // Only include if above threshold
    if (relevance >= minRelevance) {
      scored.push({
        skill: parseResult.skill,
        relevance,
        matchedTriggers: entry.triggers.filter(t =>
          [...analyzed.keywords, ...analyzed.technologies, ...analyzed.actions]
            .some(term => t.toLowerCase().includes(term) || term.includes(t.toLowerCase()))
        ),
        matchedTags: entry.tags.filter(t =>
          [...analyzed.keywords, ...analyzed.technologies, ...analyzed.actions]
            .some(term => t.toLowerCase().includes(term) || term.includes(t.toLowerCase()))
        ),
      });
    }
  }

  // Sort by relevance (descending) and take top N
  scored.sort((a, b) => b.relevance - a.relevance);

  return scored.slice(0, maxSkills);
}

/**
 * Quick check if any skills might be relevant for a task.
 *
 * @param paths - Skill paths
 * @param description - Task description
 * @returns True if there might be relevant skills
 */
export function hasRelevantSkills(paths: SkillPaths, description: string): boolean {
  const analyzed = analyzeTaskContext({ description });

  // Quick check - do we have any potential matches?
  const allTerms = [...analyzed.keywords, ...analyzed.technologies, ...analyzed.actions];

  for (const term of allTerms.slice(0, 5)) { // Check first 5 terms only for speed
    if (findSkillsByTrigger(paths, term).length > 0) {
      return true;
    }
    if (findSkillsByTag(paths, term).length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Get skill suggestions for autocomplete.
 *
 * @param paths - Skill paths
 * @param query - Partial query string
 * @param limit - Maximum suggestions
 * @returns Matching skill entries
 */
export function getSkillSuggestions(
  paths: SkillPaths,
  query: string,
  limit: number = 5
): SkillEntry[] {
  const lowerQuery = query.toLowerCase();
  const allEntries = getAllSkillEntries(paths);

  // Score entries by match quality
  const scored = allEntries
    .map(entry => {
      let score = 0;

      // Exact name start match
      if (entry.name.toLowerCase().startsWith(lowerQuery)) {
        score += 10;
      }
      // Name contains
      else if (entry.name.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // ID match
      if (entry.id.includes(lowerQuery)) {
        score += 3;
      }

      // Tag match
      if (entry.tags.some(t => t.toLowerCase().includes(lowerQuery))) {
        score += 2;
      }

      // Trigger match
      if (entry.triggers.some(t => t.toLowerCase().includes(lowerQuery))) {
        score += 2;
      }

      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ entry }) => entry);
}
