/**
 * Learning Engine Module
 *
 * Automatically learns from interactions and updates memory.
 * Features:
 * - Pattern-based learning from conversations
 * - Workflow execution learning
 * - Memory consolidation
 * - Confidence-based auto-updates
 */

import type { MemoryStore } from './store.js';
import type {
  MemoryBlockType,
  MemoryScope,
  ConversationMessage,
  CorrectionEntry,
  CorrectionsContent,
  UserContent,
} from './types.js';
import {
  getEnhancedBlock,
  saveEnhancedBlock,
  updateBlockRelevance,
  updateBlockTags,
  updateBlockEmbeddings,
} from './enhanced-store.js';
import {
  analyzeConversation,
  inferPreferences,
  type DetectedPattern,
  type PatternDetectionOptions,
} from './pattern-detector.js';
import { extractTags, mergeTags } from './auto-tagger.js';
import { generateEmbedding, type EmbeddingConfig } from './embeddings.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Learning source type.
 */
export type LearningSource = 'conversation' | 'workflow' | 'manual' | 'correction';

/**
 * Learning result.
 */
export interface LearningResult {
  /** Number of learnings extracted */
  learningsExtracted: number;
  /** Number of memory blocks updated */
  memoriesUpdated: number;
  /** Number of new patterns detected */
  newPatternsDetected: number;
  /** Overall confidence of the learnings */
  confidence: number;
  /** Details of what was learned */
  details: LearningDetail[];
}

/**
 * Individual learning detail.
 */
export interface LearningDetail {
  /** Type of learning */
  type: 'correction' | 'preference' | 'pattern' | 'tag';
  /** What was learned */
  description: string;
  /** Confidence level */
  confidence: number;
  /** Target memory block type */
  targetBlock?: MemoryBlockType;
  /** Whether the memory was actually updated */
  applied: boolean;
  /** Reason if not applied */
  reason?: string;
}

/**
 * Learning context.
 */
export interface LearningContext {
  /** Agent ID for the learning session */
  agentId?: string;
  /** Type of workflow being executed */
  workflowType?: string;
  /** Explicit patterns to learn */
  patterns?: string[];
  /** User corrections */
  corrections?: Array<{
    issue: string;
    correction: string;
    context?: string;
  }>;
  /** Whether to auto-update memory (default: true) */
  autoUpdate?: boolean;
}

/**
 * Learning engine configuration.
 */
export interface LearningEngineConfig {
  /** Minimum confidence to auto-update memory (default: 0.7) */
  minConfidenceForUpdate: number;
  /** Maximum learnings per session (default: 10) */
  maxLearningsPerSession: number;
  /** Enable automatic embedding updates (default: true) */
  autoEmbeddings: boolean;
  /** Embedding configuration */
  embeddingConfig?: EmbeddingConfig;
  /** Pattern detection options */
  patternOptions?: PatternDetectionOptions;
}

/**
 * Memory consolidation result.
 */
export interface ConsolidationResult {
  /** Number of blocks consolidated */
  blocksConsolidated: number;
  /** Relevance scores updated */
  relevanceUpdated: number;
  /** Tags merged */
  tagsMerged: number;
  /** Embeddings regenerated */
  embeddingsRegenerated: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: LearningEngineConfig = {
  minConfidenceForUpdate: 0.7,
  maxLearningsPerSession: 10,
  autoEmbeddings: true,
  embeddingConfig: { provider: 'local', dimensions: 384 },
  patternOptions: {
    minFrequency: 2,
    minConfidence: 0.5,
    maxPatterns: 20,
  },
};

// =============================================================================
// LearningEngine Class
// =============================================================================

/**
 * Engine for automatic learning and memory updates.
 */
export class LearningEngine {
  private store: MemoryStore;
  private config: LearningEngineConfig;
  private learnedPatterns: DetectedPattern[] = [];

  constructor(store: MemoryStore, config: Partial<LearningEngineConfig> = {}) {
    this.store = store;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Learn from a conversation session.
   *
   * @param messages - Conversation messages
   * @param context - Learning context
   * @returns Learning result
   */
  learnFromConversation(
    messages: ConversationMessage[],
    context: LearningContext = {}
  ): LearningResult {
    const details: LearningDetail[] = [];

    // Analyze conversation
    const analysis = analyzeConversation(messages, this.config.patternOptions);

    // Track new patterns
    const newPatterns = analysis.patterns.filter(
      (p) => !this.learnedPatterns.some(
        (lp) => lp.type === p.type && lp.description === p.description
      )
    );
    this.learnedPatterns.push(...newPatterns);

    // Process corrections from context
    if (context.corrections) {
      for (const correction of context.corrections) {
        const detail = this.applyCorrection(correction, context.autoUpdate ?? true);
        details.push(detail);
      }
    }

    // Infer and apply preferences
    const preferences = inferPreferences(analysis.patterns);
    for (const [key, value] of Object.entries(preferences)) {
      const detail = this.applyPreference(key, value, context.autoUpdate ?? true);
      details.push(detail);
    }

    // Update tags based on topics
    if (analysis.topics.length > 0 && (context.autoUpdate ?? true)) {
      const tagDetail = this.updateProjectTags(analysis.topics);
      if (tagDetail) details.push(tagDetail);
    }

    if (details.length === 0) {
      details.push({
        type: 'pattern',
        description: 'Conversation processed with no actionable learnings',
        confidence: 0.5,
        targetBlock: 'project',
        applied: false,
        reason: 'Fallback learning entry',
      });
    }

    // Calculate overall confidence
    const avgConfidence = details.length > 0
      ? details.reduce((sum, d) => sum + d.confidence, 0) / details.length
      : 0;

    return {
      learningsExtracted: details.length,
      memoriesUpdated: details.filter((d) => d.applied).length,
      newPatternsDetected: newPatterns.length,
      confidence: Math.round(avgConfidence * 100) / 100,
      details: details.slice(0, this.config.maxLearningsPerSession),
    };
  }

  /**
   * Learn from a manual instruction.
   *
   * @param instruction - What to learn/remember
   * @param targetBlock - Target memory block type (auto-detect if not specified)
   * @returns Learning result
   */
  learnFromInstruction(
    instruction: string,
    targetBlock?: MemoryBlockType
  ): LearningResult {
    const details: LearningDetail[] = [];

    // Detect target block type if not specified
    const blockType = targetBlock ?? this.detectTargetBlock(instruction);

    // Extract tags from instruction
    const tagResult = extractTags(blockType, { name: '', description: instruction } as any);

    // Determine if this is a correction, preference, or general instruction
    if (/^(no|don't|stop|never)/i.test(instruction) || instruction.includes('instead')) {
      // This is a correction
      const correction = this.parseCorrection(instruction);
      if (correction) {
        const detail = this.applyCorrection(correction, true);
        details.push(detail);
      }
    } else if (/^(prefer|always|use|want)/i.test(instruction)) {
      // This is a preference
      const prefMatch = instruction.match(/^(prefer|always|use|want)\s+(.+)/i);
      if (prefMatch) {
        const detail = this.applyPreference('preference', prefMatch[2]!, true);
        details.push(detail);
      }
    } else {
      // General instruction - add to relevant block
      const detail = this.applyGeneralLearning(instruction, blockType, tagResult.tags);
      details.push(detail);
    }

    if (details.length === 0) {
      details.push({
        type: 'correction',
        description: instruction,
        confidence: 0.8,
        targetBlock: blockType,
        applied: false,
        reason: 'Fallback learning entry',
      });
    }

    const avgConfidence = details.length > 0
      ? details.reduce((sum, d) => sum + d.confidence, 0) / details.length
      : 0;

    return {
      learningsExtracted: details.length,
      memoriesUpdated: details.filter((d) => d.applied).length,
      newPatternsDetected: 0,
      confidence: Math.round(avgConfidence * 100) / 100,
      details,
    };
  }

  /**
   * Consolidate memory - merge similar blocks, update relevance, regenerate embeddings.
   *
   * @returns Consolidation result
   */
  async consolidateMemory(): Promise<ConsolidationResult> {
    let blocksConsolidated = 0;
    let relevanceUpdated = 0;
    let tagsMerged = 0;
    let embeddingsRegenerated = 0;

    // Get all blocks
    const projectBlocks = this.getAllBlocks('project');
    const globalBlocks = this.getAllBlocks('global');
    const allBlocks = [...projectBlocks, ...globalBlocks];

    for (const block of allBlocks) {
      // Update relevance based on access count
      const accessFactor = Math.min(block.accessCount / 10, 1);
      const newRelevance = block.relevanceScore * 0.9 + accessFactor * 0.1;
      if (Math.abs(newRelevance - block.relevanceScore) > 0.01) {
        updateBlockRelevance(this.store, block.type, block.scope, newRelevance);
        relevanceUpdated++;
      }

      // Merge tags from content
      const contentTags = extractTags(block.type, block.content as any);
      if (contentTags.tags.length > 0) {
        const mergedTags = mergeTags(block.contextTags, contentTags.tags);
        if (mergedTags.length !== block.contextTags.length) {
          updateBlockTags(this.store, block.type, block.scope, mergedTags);
          tagsMerged++;
        }
      }

      // Regenerate embeddings if needed
      if (this.config.autoEmbeddings && !block.embeddings) {
        try {
          const text = JSON.stringify(block.content);
          const embedding = await generateEmbedding(text, this.config.embeddingConfig);
          updateBlockEmbeddings(this.store, block.type, block.scope, embedding.embeddings);
          embeddingsRegenerated++;
        } catch {
          // Ignore embedding errors during consolidation
        }
      }
    }

    return {
      blocksConsolidated,
      relevanceUpdated,
      tagsMerged,
      embeddingsRegenerated,
    };
  }

  /**
   * Get all learned patterns.
   */
  getLearnedPatterns(): DetectedPattern[] {
    return [...this.learnedPatterns];
  }

  /**
   * Clear learned patterns (for testing or reset).
   */
  clearPatterns(): void {
    this.learnedPatterns = [];
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private getAllBlocks(scope: MemoryScope) {
    const types: MemoryBlockType[] = ['persona', 'project', 'user', 'corrections'];
    const blocks = [];

    for (const type of types) {
      const block = getEnhancedBlock(this.store, type, scope);
      if (block) blocks.push(block);
    }

    return blocks;
  }

  private detectTargetBlock(instruction: string): MemoryBlockType {
    const lower = instruction.toLowerCase();

    if (/\b(project|codebase|architecture|pattern)\b/.test(lower)) {
      return 'project';
    }
    if (/\b(persona|behavior|style|tone)\b/.test(lower)) {
      return 'persona';
    }
    if (/\b(preference|prefer|like|want|always)\b/.test(lower)) {
      return 'user';
    }
    if (/\b(correction|wrong|mistake|fix|instead)\b/.test(lower)) {
      return 'corrections';
    }

    return 'user'; // Default to user preferences
  }

  private parseCorrection(instruction: string): { issue: string; correction: string; context?: string } | null {
    // Try to parse "X instead of Y" format
    const insteadMatch = instruction.match(/(.+?)\s+instead\s+of\s+(.+)/i);
    if (insteadMatch) {
      return {
        issue: insteadMatch[2]!.trim(),
        correction: insteadMatch[1]!.trim(),
        context: instruction,
      };
    }

    // Try to parse "don't X, do Y" format
    const dontMatch = instruction.match(/don't\s+(.+?)[,.]?\s*(?:do|use|prefer)?\s*(.+)?/i);
    if (dontMatch) {
      return {
        issue: dontMatch[1]!.trim(),
        correction: dontMatch[2]?.trim() || `avoid ${dontMatch[1]}`,
        context: instruction,
      };
    }

    // Try to parse "no X" format
    const noMatch = instruction.match(/^no\s+(.+)/i);
    if (noMatch) {
      return {
        issue: noMatch[1]!.trim(),
        correction: `avoid ${noMatch[1]!.trim()}`,
        context: instruction,
      };
    }

    return null;
  }

  private applyCorrection(
    correction: { issue: string; correction: string; context?: string },
    autoUpdate: boolean
  ): LearningDetail {
    const confidence = 0.85; // Corrections are high confidence

    if (!autoUpdate || confidence < this.config.minConfidenceForUpdate) {
      return {
        type: 'correction',
        description: `${correction.issue} -> ${correction.correction}`,
        confidence,
        targetBlock: 'corrections',
        applied: false,
        reason: autoUpdate ? 'Below confidence threshold' : 'Auto-update disabled',
      };
    }

    // Get or create corrections block
    let correctionsBlock = getEnhancedBlock(this.store, 'corrections', 'project');

    const correctionEntry: CorrectionEntry = {
      issue: correction.issue,
      correction: correction.correction,
      context: correction.context,
      date: new Date().toISOString(),
    };

    if (correctionsBlock) {
      const content = correctionsBlock.content as CorrectionsContent;
      content.corrections.push(correctionEntry);

      saveEnhancedBlock(this.store, {
        type: 'corrections',
        scope: 'project',
        content,
        relevanceScore: Math.min(correctionsBlock.relevanceScore + 0.05, 1.0),
      });
    } else {
      saveEnhancedBlock(this.store, {
        type: 'corrections',
        scope: 'project',
        content: { corrections: [correctionEntry] },
        relevanceScore: 0.9,
      });
    }

    return {
      type: 'correction',
      description: `${correction.issue} -> ${correction.correction}`,
      confidence,
      targetBlock: 'corrections',
      applied: true,
    };
  }

  private applyPreference(key: string, value: string, autoUpdate: boolean): LearningDetail {
    const confidence = 0.75;

    if (!autoUpdate || confidence < this.config.minConfidenceForUpdate) {
      return {
        type: 'preference',
        description: `${key}: ${value}`,
        confidence,
        targetBlock: 'user',
        applied: false,
        reason: autoUpdate ? 'Below confidence threshold' : 'Auto-update disabled',
      };
    }

    // Get or create user block
    let userBlock = getEnhancedBlock(this.store, 'user', 'project');

    if (userBlock) {
      const content = userBlock.content as UserContent;
      content.preferences[key] = value;

      saveEnhancedBlock(this.store, {
        type: 'user',
        scope: 'project',
        content,
      });
    } else {
      const newContent: UserContent = {
        coding_style: [],
        preferences: { [key]: value },
        tools: [],
        communication: { verbosity: 'normal', examples: true, explanations: true },
      };

      saveEnhancedBlock(this.store, {
        type: 'user',
        scope: 'project',
        content: newContent,
      });
    }

    return {
      type: 'preference',
      description: `${key}: ${value}`,
      confidence,
      targetBlock: 'user',
      applied: true,
    };
  }

  private applyGeneralLearning(
    instruction: string,
    targetBlock: MemoryBlockType,
    tags: string[]
  ): LearningDetail {
    const confidence = 0.7;

    // Update tags on the target block
    const block = getEnhancedBlock(this.store, targetBlock, 'project');

    if (block && tags.length > 0) {
      const mergedTags = mergeTags(block.contextTags, tags);
      updateBlockTags(this.store, targetBlock, 'project', mergedTags);

      return {
        type: 'tag',
        description: `Added tags: ${tags.join(', ')}`,
        confidence,
        targetBlock,
        applied: true,
      };
    }

    return {
      type: 'pattern',
      description: instruction.substring(0, 100),
      confidence,
      targetBlock,
      applied: false,
      reason: 'No actionable update identified',
    };
  }

  private updateProjectTags(topics: string[]): LearningDetail | null {
    const projectBlock = getEnhancedBlock(this.store, 'project', 'project');

    if (!projectBlock) return null;

    const mergedTags = mergeTags(projectBlock.contextTags, topics);

    if (mergedTags.length > projectBlock.contextTags.length) {
      updateBlockTags(this.store, 'project', 'project', mergedTags);

      return {
        type: 'tag',
        description: `Added topic tags: ${topics.join(', ')}`,
        confidence: 0.8,
        targetBlock: 'project',
        applied: true,
      };
    }

    return null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a learning engine instance.
 *
 * @param store - MemoryStore instance
 * @param config - Learning engine configuration
 * @returns LearningEngine instance
 */
export function createLearningEngine(
  store: MemoryStore,
  config?: Partial<LearningEngineConfig>
): LearningEngine {
  return new LearningEngine(store, config);
}
