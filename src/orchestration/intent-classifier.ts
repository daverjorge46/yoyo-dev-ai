/**
 * Intent Classifier for Global Orchestration Mode
 * @version 6.1.0
 * @description Fast keyword-based intent classification (<10ms target)
 */

import {
  IntentClassification,
  IntentType,
  ClassifierConfig,
  AgentName,
  IntentAgentMapping,
} from './types';

// Default keyword lists for each intent type
const DEFAULT_KEYWORD_LISTS: Record<IntentType, string[]> = {
  research: [
    'how to',
    'best practice',
    'recommended',
    'example of',
    'documentation',
    'tutorial',
    'guide',
    'library for',
    'package for',
    'what is the best',
    'compare',
    'vs',
    'versus',
    'difference between',
    'pros and cons',
    'latest',
    'modern approach',
    'industry standard',
  ],
  codebase: [
    'where is',
    'find',
    'locate',
    'search for',
    'show me',
    'what file',
    'which component',
    'how is implemented',
    'look for',
    'grep for',
    'which files',
    'codebase',
    'existing code',
    'current implementation',
  ],
  frontend: [
    'style',
    'css',
    'tailwind',
    'styling',
    'ui',
    'ux',
    'button',
    'form',
    'modal',
    'dialog',
    'layout',
    'responsive',
    'mobile',
    'color',
    'spacing',
    'padding',
    'margin',
    'font',
    'animation',
    'hover',
    'focus',
    'accessibility',
    'component',
    'react component',
    'jsx',
    'tsx',
    'design system',
    'theme',
    'dark mode',
    'light mode',
  ],
  debug: [
    'fix',
    'error',
    'bug',
    'broken',
    'not working',
    'failing',
    'crash',
    'exception',
    'issue',
    'problem',
    'wrong',
    'incorrect',
    'unexpected',
    "doesn't work",
    "can't",
    'cannot',
    'failed',
    'failure',
  ],
  documentation: [
    'document',
    'readme',
    'explain',
    'write docs',
    'add documentation',
    'describe',
    'summarize',
    'create guide',
    'write tutorial',
    'changelog',
    'api docs',
    'jsdoc',
    'comment',
  ],
  planning: [
    'plan',
    'design',
    'architecture',
    'how should we',
    'strategy',
    'approach',
    'implement feature',
    'new feature',
    'roadmap',
    'spec',
    'specification',
    'requirements',
    'scope',
  ],
  implementation: [
    'implement',
    'build',
    'create',
    'add',
    'code',
    'write',
    'develop',
    'make',
    'generate',
    'set up',
    'configure',
    'integrate',
  ],
  general: [], // No keywords, fallback
};

// Mapping from intent type to agents
const INTENT_TO_AGENT: Record<IntentType, IntentAgentMapping> = {
  research: { primary: 'alma-librarian', background: null },
  codebase: { primary: 'alvaro-explore', background: null },
  frontend: { primary: 'dave-engineer', background: null },
  debug: { primary: 'alvaro-explore', background: 'arthas-oracle' },
  documentation: { primary: 'angeles-writer', background: 'alvaro-explore' },
  planning: { primary: 'yoyo-ai', background: 'alma-librarian' },
  implementation: { primary: 'yoyo-ai', background: 'alvaro-explore' },
  general: { primary: null, background: null },
};

export class IntentClassifier {
  private config: ClassifierConfig;
  private keywordCache: Map<IntentType, Set<string>>;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 0.6,
      maxLatencyMs: config.maxLatencyMs ?? 10,
      keywordLists: config.keywordLists ?? DEFAULT_KEYWORD_LISTS,
    };

    // Pre-compile keyword sets for O(1) lookup
    this.keywordCache = new Map();
    for (const [intent, keywords] of Object.entries(this.config.keywordLists)) {
      this.keywordCache.set(
        intent as IntentType,
        new Set(keywords.map((k) => k.toLowerCase()))
      );
    }
  }

  /**
   * Classify user input into an intent category
   * @param input - User input string
   * @returns IntentClassification result
   */
  classify(input: string): IntentClassification {
    const startTime = performance.now();
    const normalizedInput = input.toLowerCase();

    // Check for bypass patterns
    if (this.shouldBypass(input)) {
      return this.createBypassResult();
    }

    // Find matching intents with scores
    const scores = this.calculateScores(normalizedInput);

    // Get best match
    const bestMatch = this.findBestMatch(scores);

    const elapsedMs = performance.now() - startTime;
    if (elapsedMs > this.config.maxLatencyMs) {
      console.warn(
        `[intent-classifier] Classification took ${elapsedMs.toFixed(2)}ms (target: ${this.config.maxLatencyMs}ms)`
      );
    }

    return bestMatch;
  }

  /**
   * Check if input should bypass orchestration
   */
  shouldBypass(input: string): boolean {
    const trimmed = input.trim();

    // Slash commands bypass orchestration
    if (trimmed.startsWith('/')) return true;

    // "directly:" prefix bypasses orchestration
    if (trimmed.toLowerCase().startsWith('directly:')) return true;

    return false;
  }

  /**
   * Create a bypass result (no orchestration)
   */
  private createBypassResult(): IntentClassification {
    return {
      intent: 'general',
      confidence: 1.0,
      primaryAgent: null,
      backgroundAgent: null,
      matchedKeywords: [],
      shouldOrchestrate: false,
    };
  }

  /**
   * Calculate confidence scores for each intent type
   *
   * Scoring algorithm:
   * - First keyword match: base score of 0.65 (above default 0.6 threshold)
   * - Each additional keyword: +0.1 (capped at 1.0)
   * - Longer keywords get slight bonus (more specific = more confident)
   */
  private calculateScores(
    input: string
  ): Map<IntentType, { score: number; keywords: string[] }> {
    const scores = new Map<IntentType, { score: number; keywords: string[] }>();

    for (const [intent, keywordSet] of this.keywordCache.entries()) {
      const matchedKeywords: string[] = [];

      for (const keyword of keywordSet) {
        if (input.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }

      // Scoring: first match = 0.65, each additional = +0.1
      // This ensures single keyword matches pass the 0.6 threshold
      let score = 0;
      if (matchedKeywords.length > 0) {
        const baseScore = 0.65;
        const bonusPerKeyword = 0.1;
        const additionalBonus = (matchedKeywords.length - 1) * bonusPerKeyword;

        // Longer keywords are more specific, slight bonus
        const avgKeywordLength =
          matchedKeywords.reduce((sum, k) => sum + k.length, 0) /
          matchedKeywords.length;
        const lengthBonus = Math.min(avgKeywordLength / 50, 0.1); // Max 0.1 bonus

        score = Math.min(baseScore + additionalBonus + lengthBonus, 1.0);
      }

      scores.set(intent, { score, keywords: matchedKeywords });
    }

    return scores;
  }

  /**
   * Find the best matching intent from scores
   */
  private findBestMatch(
    scores: Map<IntentType, { score: number; keywords: string[] }>
  ): IntentClassification {
    let bestIntent: IntentType = 'general';
    let bestScore = 0;
    let bestKeywords: string[] = [];

    for (const [intent, { score, keywords }] of scores.entries()) {
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
        bestKeywords = keywords;
      }
    }

    // Apply confidence threshold
    const shouldOrchestrate =
      bestScore >= this.config.confidenceThreshold && bestIntent !== 'general';

    const agents = INTENT_TO_AGENT[bestIntent];

    return {
      intent: bestIntent,
      confidence: bestScore,
      primaryAgent: shouldOrchestrate ? agents.primary : null,
      backgroundAgent: shouldOrchestrate ? agents.background : null,
      matchedKeywords: bestKeywords,
      shouldOrchestrate,
    };
  }

  /**
   * Get the default keyword lists (for testing/debugging)
   */
  getKeywordLists(): Record<IntentType, string[]> {
    return { ...this.config.keywordLists };
  }

  /**
   * Get configuration (for testing/debugging)
   */
  getConfig(): ClassifierConfig {
    return { ...this.config };
  }
}
