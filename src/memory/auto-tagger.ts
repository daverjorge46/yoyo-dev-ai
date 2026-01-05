/**
 * Auto-Tagger Module
 *
 * Automatically extracts context tags from memory block content.
 * Uses pattern matching and keyword extraction to categorize content.
 */

import type { MemoryBlockContent, MemoryBlockType } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Tag extraction result.
 */
export interface TagExtractionResult {
  /** Extracted tags */
  tags: string[];
  /** Confidence score for the extraction (0.0 to 1.0) */
  confidence: number;
}

/**
 * Tag category with associated keywords.
 */
interface TagCategory {
  tag: string;
  keywords: string[];
  weight: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Technology-related tag categories.
 */
const TECH_CATEGORIES: TagCategory[] = [
  // Languages
  { tag: 'typescript', keywords: ['typescript', 'ts', '.tsx', '.ts'], weight: 1.0 },
  { tag: 'javascript', keywords: ['javascript', 'js', '.jsx', '.js', 'node'], weight: 1.0 },
  { tag: 'python', keywords: ['python', 'py', '.py', 'django', 'flask', 'fastapi'], weight: 1.0 },
  { tag: 'rust', keywords: ['rust', '.rs', 'cargo'], weight: 1.0 },
  { tag: 'go', keywords: ['golang', 'go', '.go'], weight: 1.0 },

  // Frontend frameworks
  { tag: 'react', keywords: ['react', 'jsx', 'tsx', 'use', 'hooks', 'component'], weight: 0.9 },
  { tag: 'vue', keywords: ['vue', '.vue', 'vuex', 'pinia'], weight: 0.9 },
  { tag: 'svelte', keywords: ['svelte', '.svelte'], weight: 0.9 },
  { tag: 'angular', keywords: ['angular', 'ng-', '@angular'], weight: 0.9 },
  { tag: 'next', keywords: ['next.js', 'nextjs', 'next', 'pages/', 'app/'], weight: 0.9 },

  // Backend frameworks
  { tag: 'express', keywords: ['express', 'router', 'middleware'], weight: 0.9 },
  { tag: 'fastify', keywords: ['fastify'], weight: 0.9 },
  { tag: 'django', keywords: ['django', 'models.py', 'views.py'], weight: 0.9 },
  { tag: 'flask', keywords: ['flask', '@app.route'], weight: 0.9 },

  // Databases
  { tag: 'postgresql', keywords: ['postgres', 'postgresql', 'pg'], weight: 0.8 },
  { tag: 'mysql', keywords: ['mysql', 'mariadb'], weight: 0.8 },
  { tag: 'mongodb', keywords: ['mongodb', 'mongoose', 'mongo'], weight: 0.8 },
  { tag: 'sqlite', keywords: ['sqlite', 'better-sqlite'], weight: 0.8 },
  { tag: 'redis', keywords: ['redis', 'cache'], weight: 0.8 },
  { tag: 'convex', keywords: ['convex', '_generated', 'convex.json'], weight: 0.8 },

  // Styling
  { tag: 'tailwind', keywords: ['tailwind', 'tw-', 'tailwindcss'], weight: 0.8 },
  { tag: 'css', keywords: ['css', 'scss', 'sass', 'styled'], weight: 0.7 },

  // Testing
  { tag: 'testing', keywords: ['test', 'spec', 'jest', 'vitest', 'mocha'], weight: 0.7 },
  { tag: 'tdd', keywords: ['tdd', 'test-driven'], weight: 0.7 },

  // Architecture
  { tag: 'monolith', keywords: ['monolith', 'monolithic'], weight: 0.6 },
  { tag: 'microservices', keywords: ['microservice', 'service-oriented'], weight: 0.6 },
  { tag: 'serverless', keywords: ['serverless', 'lambda', 'function'], weight: 0.6 },
  { tag: 'api', keywords: ['api', 'rest', 'graphql', 'endpoint'], weight: 0.6 },

  // DevOps
  { tag: 'docker', keywords: ['docker', 'container', 'dockerfile'], weight: 0.7 },
  { tag: 'kubernetes', keywords: ['kubernetes', 'k8s', 'kubectl'], weight: 0.7 },
  { tag: 'ci-cd', keywords: ['ci/cd', 'github-actions', 'jenkins', 'gitlab-ci'], weight: 0.7 },
];

/**
 * Content pattern categories.
 */
const CONTENT_CATEGORIES: TagCategory[] = [
  { tag: 'authentication', keywords: ['auth', 'login', 'password', 'jwt', 'oauth'], weight: 0.8 },
  { tag: 'validation', keywords: ['validate', 'validation', 'schema', 'zod'], weight: 0.7 },
  { tag: 'error-handling', keywords: ['error', 'exception', 'catch', 'throw'], weight: 0.7 },
  { tag: 'logging', keywords: ['log', 'logger', 'console', 'debug'], weight: 0.6 },
  { tag: 'performance', keywords: ['performance', 'optimize', 'cache', 'memoize'], weight: 0.7 },
  { tag: 'security', keywords: ['security', 'encrypt', 'hash', 'sanitize'], weight: 0.8 },
];

// =============================================================================
// Tag Extraction Functions
// =============================================================================

/**
 * Extract tags from text content.
 *
 * @param text - Text to extract tags from
 * @returns Array of extracted tags
 */
function extractTagsFromText(text: string): string[] {
  const lowerText = text.toLowerCase();
  const tags = new Set<string>();

  // Check tech categories
  for (const category of TECH_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        tags.add(category.tag);
        break;
      }
    }
  }

  // Check content categories
  for (const category of CONTENT_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        tags.add(category.tag);
        break;
      }
    }
  }

  return Array.from(tags);
}

/**
 * Calculate confidence based on number of matches.
 *
 * @param matchCount - Number of category matches
 * @param totalCategories - Total number of categories checked
 * @returns Confidence score (0.0 to 1.0)
 */
function calculateConfidence(matchCount: number, totalCategories: number): number {
  if (matchCount === 0) return 0;
  // Use logarithmic scaling for confidence
  const ratio = matchCount / totalCategories;
  const confidence = Math.min(0.5 + ratio * 0.5, 1.0);
  return Math.round(confidence * 100) / 100;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract tags from a memory block's content.
 *
 * @param type - Memory block type
 * @param content - Memory block content
 * @returns Tag extraction result
 */
export function extractTags(
  type: MemoryBlockType,
  content: MemoryBlockContent
): TagExtractionResult {
  const tags = new Set<string>();
  let matchCount = 0;

  // Add type as a base tag
  tags.add(type);

  // Extract from content based on type
  const contentStr = JSON.stringify(content).toLowerCase();

  // Check tech categories
  for (const category of TECH_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (contentStr.includes(keyword.toLowerCase())) {
        tags.add(category.tag);
        matchCount++;
        break;
      }
    }
  }

  // Check content categories
  for (const category of CONTENT_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (contentStr.includes(keyword.toLowerCase())) {
        tags.add(category.tag);
        matchCount++;
        break;
      }
    }
  }

  // Type-specific extraction
  if (type === 'project' && 'tech_stack' in content) {
    const projectContent = content as { tech_stack: Record<string, string | undefined> };
    const techStack = projectContent.tech_stack;

    if (techStack.language) {
      tags.add(techStack.language.toLowerCase());
    }
    if (techStack.framework) {
      tags.add(techStack.framework.toLowerCase());
    }
    if (techStack.database) {
      tags.add(techStack.database.toLowerCase());
    }
    if (techStack.styling) {
      tags.add(techStack.styling.toLowerCase());
    }
  }

  if (type === 'persona' && 'expertise_areas' in content) {
    const personaContent = content as { expertise_areas: string[] };
    for (const area of personaContent.expertise_areas) {
      tags.add(area.toLowerCase().replace(/\s+/g, '-'));
    }
  }

  const totalCategories = TECH_CATEGORIES.length + CONTENT_CATEGORIES.length;
  const confidence = calculateConfidence(matchCount, totalCategories);

  return {
    tags: Array.from(tags).sort(),
    confidence,
  };
}

/**
 * Generate suggested tags from free-form text.
 *
 * @param text - Text to analyze
 * @returns Tag extraction result
 */
export function suggestTags(text: string): TagExtractionResult {
  const tags = extractTagsFromText(text);
  const totalCategories = TECH_CATEGORIES.length + CONTENT_CATEGORIES.length;
  const confidence = calculateConfidence(tags.length, totalCategories);

  return {
    tags: tags.sort(),
    confidence,
  };
}

/**
 * Merge multiple tag sets, removing duplicates.
 *
 * @param tagSets - Arrays of tags to merge
 * @returns Merged and deduplicated tags
 */
export function mergeTags(...tagSets: string[][]): string[] {
  const merged = new Set<string>();
  for (const tags of tagSets) {
    for (const tag of tags) {
      merged.add(tag.toLowerCase());
    }
  }
  return Array.from(merged).sort();
}

/**
 * Filter tags by category.
 *
 * @param tags - Tags to filter
 * @param category - Category to filter by ('tech', 'content', 'all')
 * @returns Filtered tags
 */
export function filterTagsByCategory(
  tags: string[],
  category: 'tech' | 'content' | 'all'
): string[] {
  if (category === 'all') return tags;

  const categoryTags = new Set(
    (category === 'tech' ? TECH_CATEGORIES : CONTENT_CATEGORIES).map((c) => c.tag)
  );

  return tags.filter((tag) => categoryTags.has(tag));
}
