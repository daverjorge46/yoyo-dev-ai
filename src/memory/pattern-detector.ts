/**
 * Pattern Detector Module
 *
 * Detects recurring patterns from:
 * - Conversation history
 * - Workflow executions
 * - User interactions and corrections
 *
 * Used by the learning engine to automatically update memory.
 */

import type { ConversationMessage } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Types of patterns that can be detected.
 */
export type PatternType =
  | 'code_style'         // Consistent coding preferences
  | 'technology_choice'  // Technology/framework preferences
  | 'workflow_pattern'   // Repeated workflow patterns
  | 'correction'         // User corrections or feedback
  | 'preference'         // General preferences
  | 'error_handling'     // Error handling approaches
  | 'naming_convention'; // Naming conventions

/**
 * A detected pattern.
 */
export interface DetectedPattern {
  /** Pattern type */
  type: PatternType;
  /** Description of the pattern */
  description: string;
  /** How many times this pattern was observed */
  frequency: number;
  /** Confidence level (0.0 to 1.0) */
  confidence: number;
  /** Supporting evidence */
  evidence: string[];
  /** When the pattern was first detected */
  firstSeen: Date;
  /** When the pattern was last observed */
  lastSeen: Date;
  /** Extracted key-value pairs from pattern */
  extractedData?: Record<string, unknown>;
}

/**
 * Pattern detection options.
 */
export interface PatternDetectionOptions {
  /** Minimum frequency to report a pattern (default: 2) */
  minFrequency?: number;
  /** Minimum confidence threshold (default: 0.5) */
  minConfidence?: number;
  /** Maximum patterns to return (default: 20) */
  maxPatterns?: number;
  /** Pattern types to look for (default: all) */
  types?: PatternType[];
}

/**
 * Conversation analysis result.
 */
export interface ConversationAnalysis {
  /** Detected patterns */
  patterns: DetectedPattern[];
  /** Topics discussed */
  topics: string[];
  /** User sentiment indicators */
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  /** Key entities mentioned */
  entities: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<PatternDetectionOptions> = {
  minFrequency: 2,
  minConfidence: 0.5,
  maxPatterns: 20,
  types: [
    'code_style',
    'technology_choice',
    'workflow_pattern',
    'correction',
    'preference',
    'error_handling',
    'naming_convention',
  ],
};

/**
 * Patterns to detect in user messages.
 */
const DETECTION_PATTERNS: Array<{
  type: PatternType;
  patterns: Array<{
    regex: RegExp;
    weight: number;
    extractor?: (match: RegExpMatchArray) => Record<string, unknown>;
  }>;
}> = [
  {
    type: 'code_style',
    patterns: [
      { regex: /prefer\s+(functional|class|arrow|async)/i, weight: 0.8 },
      { regex: /always\s+use\s+(\w+)/i, weight: 0.7 },
      { regex: /don't\s+(use|like|want)\s+(\w+)/i, weight: 0.7 },
      { regex: /use\s+(const|let|var)/i, weight: 0.6 },
    ],
  },
  {
    type: 'technology_choice',
    patterns: [
      { regex: /prefer\s+(react|vue|angular|svelte)/i, weight: 0.9 },
      { regex: /use\s+(typescript|javascript)/i, weight: 0.8 },
      { regex: /prefer\s+(tailwind|css|scss|styled)/i, weight: 0.7 },
      { regex: /database.*?(postgres|mysql|mongo|sqlite)/i, weight: 0.7 },
    ],
  },
  {
    type: 'preference',
    patterns: [
      { regex: /I\s+(like|prefer|want|need)\s+(.+)/i, weight: 0.7 },
      { regex: /please\s+(always|never|don't)\s+(.+)/i, weight: 0.8 },
      { regex: /remember\s+that\s+(.+)/i, weight: 0.9 },
    ],
  },
  {
    type: 'correction',
    patterns: [
      { regex: /no,?\s*(actually|that's wrong|incorrect)/i, weight: 0.9 },
      { regex: /should\s+be\s+(.+)\s+instead/i, weight: 0.8 },
      { regex: /change\s+(.+)\s+to\s+(.+)/i, weight: 0.7 },
      { regex: /fix\s+that/i, weight: 0.6 },
    ],
  },
  {
    type: 'naming_convention',
    patterns: [
      { regex: /use\s+(camelCase|snake_case|PascalCase|kebab-case)/i, weight: 0.9 },
      { regex: /name\s+\w+\s+like\s+(.+)/i, weight: 0.7 },
      { regex: /prefix\s+with\s+(\w+)/i, weight: 0.7 },
    ],
  },
  {
    type: 'error_handling',
    patterns: [
      { regex: /always\s+handle\s+errors?/i, weight: 0.8 },
      { regex: /use\s+try[-\s]?catch/i, weight: 0.7 },
      { regex: /log\s+(errors?|exceptions?)/i, weight: 0.6 },
    ],
  },
];

/**
 * Sentiment indicators.
 */
const SENTIMENT_WORDS = {
  positive: ['good', 'great', 'perfect', 'excellent', 'thanks', 'nice', 'love', 'awesome'],
  negative: ['bad', 'wrong', 'incorrect', 'no', 'don\'t', 'hate', 'awful', 'terrible'],
};

// =============================================================================
// Pattern Detection Functions
// =============================================================================

/**
 * Detect patterns in a single message.
 */
function detectPatternsInMessage(
  message: string,
  options: Required<PatternDetectionOptions>
): Array<{ type: PatternType; confidence: number; evidence: string; data?: Record<string, unknown> }> {
  const detected: Array<{ type: PatternType; confidence: number; evidence: string; data?: Record<string, unknown> }> = [];

  for (const category of DETECTION_PATTERNS) {
    if (!options.types.includes(category.type)) continue;

    for (const pattern of category.patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        detected.push({
          type: category.type,
          confidence: pattern.weight,
          evidence: match[0],
          data: pattern.extractor ? pattern.extractor(match) : undefined,
        });
      }
    }
  }

  return detected;
}

/**
 * Analyze sentiment in text.
 */
function analyzeSentiment(text: string): { positive: number; negative: number; neutral: number } {
  const words = text.toLowerCase().split(/\s+/);
  let positive = 0;
  let negative = 0;

  for (const word of words) {
    if (SENTIMENT_WORDS.positive.some((p) => word.includes(p))) {
      positive++;
    }
    if (SENTIMENT_WORDS.negative.some((n) => word.includes(n))) {
      negative++;
    }
  }

  const total = words.length || 1;
  return {
    positive: positive / total,
    negative: negative / total,
    neutral: 1 - (positive + negative) / total,
  };
}

/**
 * Extract topics from text.
 */
function extractTopics(text: string): string[] {
  const topics = new Set<string>();

  // Technology keywords
  const techPatterns = [
    /\b(react|vue|angular|svelte|next\.?js|nuxt)\b/gi,
    /\b(typescript|javascript|python|rust|go)\b/gi,
    /\b(api|rest|graphql|websocket)\b/gi,
    /\b(database|sql|nosql|mongodb|postgres)\b/gi,
    /\b(testing|jest|vitest|cypress)\b/gi,
    /\b(docker|kubernetes|aws|cloud)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      topics.add(match[0].toLowerCase());
    }
  }

  return Array.from(topics);
}

/**
 * Extract named entities from text.
 */
function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // File paths
  const fileMatches = text.match(/[\w\-./]+\.(ts|js|tsx|jsx|json|md|css|scss)/g);
  if (fileMatches) {
    for (const match of fileMatches) {
      entities.add(match);
    }
  }

  // Function/class names (PascalCase or camelCase)
  const nameMatches = text.match(/\b[A-Z][a-zA-Z0-9]*|[a-z]+[A-Z][a-zA-Z0-9]*/g);
  if (nameMatches) {
    for (const match of nameMatches) {
      if (match.length > 3) {
        entities.add(match);
      }
    }
  }

  return Array.from(entities);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Detect patterns from conversation history.
 *
 * @param messages - Array of conversation messages
 * @param options - Detection options
 * @returns Array of detected patterns
 */
export function detectConversationPatterns(
  messages: ConversationMessage[],
  options: PatternDetectionOptions = {}
): DetectedPattern[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter to user messages only
  const userMessages = messages.filter((m) => m.role === 'user');

  // Track pattern occurrences
  const patternMap = new Map<string, {
    type: PatternType;
    description: string;
    frequency: number;
    confidence: number;
    evidence: string[];
    firstSeen: Date;
    lastSeen: Date;
    data?: Record<string, unknown>;
  }>();

  for (const message of userMessages) {
    const detected = detectPatternsInMessage(message.content, opts);

    for (const detection of detected) {
      const key = `${detection.type}:${detection.evidence.toLowerCase()}`;
      const existing = patternMap.get(key);

      if (existing) {
        existing.frequency++;
        existing.confidence = Math.max(existing.confidence, detection.confidence);
        existing.evidence.push(message.content.substring(0, 100));
        existing.lastSeen = message.timestamp;
        if (detection.data) {
          existing.data = { ...existing.data, ...detection.data };
        }
      } else {
        patternMap.set(key, {
          type: detection.type,
          description: detection.evidence,
          frequency: 1,
          confidence: detection.confidence,
          evidence: [message.content.substring(0, 100)],
          firstSeen: message.timestamp,
          lastSeen: message.timestamp,
          data: detection.data,
        });
      }
    }
  }

  // Convert to array and filter
  const patterns: DetectedPattern[] = Array.from(patternMap.values())
    .filter((p) => p.frequency >= opts.minFrequency && p.confidence >= opts.minConfidence)
    .map((p) => ({
      type: p.type,
      description: p.description,
      frequency: p.frequency,
      confidence: p.confidence,
      evidence: p.evidence.slice(0, 5), // Limit evidence
      firstSeen: p.firstSeen,
      lastSeen: p.lastSeen,
      extractedData: p.data,
    }));

  // Sort by confidence * frequency and limit
  patterns.sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency));

  return patterns.slice(0, opts.maxPatterns);
}

/**
 * Analyze a conversation for insights.
 *
 * @param messages - Array of conversation messages
 * @param options - Detection options
 * @returns Conversation analysis result
 */
export function analyzeConversation(
  messages: ConversationMessage[],
  options: PatternDetectionOptions = {}
): ConversationAnalysis {
  const patterns = detectConversationPatterns(messages, options);

  // Combine all message content
  const allText = messages.map((m) => m.content).join(' ');

  // Extract topics and entities
  const topics = extractTopics(allText);
  const entities = extractEntities(allText);

  // Analyze sentiment from user messages
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');
  const sentiment = analyzeSentiment(userText);

  return {
    patterns,
    topics,
    sentiment,
    entities,
  };
}

/**
 * Detect patterns from a workflow execution log.
 *
 * @param logs - Array of workflow log entries
 * @returns Array of detected patterns
 */
export function detectWorkflowPatterns(
  logs: Array<{ action: string; result: string; timestamp: Date }>
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Track action sequences
  const actionSequences = new Map<string, number>();

  for (let i = 0; i < logs.length - 1; i++) {
    const sequence = `${logs[i]!.action} -> ${logs[i + 1]!.action}`;
    actionSequences.set(sequence, (actionSequences.get(sequence) || 0) + 1);
  }

  // Convert frequent sequences to patterns
  for (const [sequence, count] of actionSequences) {
    if (count >= 2) {
      patterns.push({
        type: 'workflow_pattern',
        description: `Frequent sequence: ${sequence}`,
        frequency: count,
        confidence: Math.min(count / 5, 1.0),
        evidence: [sequence],
        firstSeen: logs[0]?.timestamp || new Date(),
        lastSeen: logs[logs.length - 1]?.timestamp || new Date(),
      });
    }
  }

  return patterns;
}

/**
 * Infer user preferences from patterns.
 *
 * @param patterns - Detected patterns
 * @returns Inferred preferences as key-value pairs
 */
export function inferPreferences(patterns: DetectedPattern[]): Record<string, string> {
  const preferences: Record<string, string> = {};

  for (const pattern of patterns) {
    if (pattern.type === 'preference' || pattern.type === 'code_style') {
      // Extract key-value from pattern description
      const match = pattern.description.match(/(\w+).*?([\w\-]+)/);
      if (match && match[1] && match[2]) {
        preferences[match[1].toLowerCase()] = match[2];
      }
    }

    if (pattern.type === 'technology_choice') {
      const match = pattern.description.match(/(react|vue|angular|typescript|javascript|tailwind|postgres|mysql)/i);
      if (match && match[1]) {
        const tech = match[1].toLowerCase();
        if (['react', 'vue', 'angular'].includes(tech)) {
          preferences['frontend_framework'] = tech;
        } else if (['typescript', 'javascript'].includes(tech)) {
          preferences['language'] = tech;
        } else if (['tailwind'].includes(tech)) {
          preferences['styling'] = tech;
        } else if (['postgres', 'mysql'].includes(tech)) {
          preferences['database'] = tech;
        }
      }
    }

    if (pattern.type === 'naming_convention') {
      const match = pattern.description.match(/(camelCase|snake_case|PascalCase|kebab-case)/i);
      if (match && match[1]) {
        preferences['naming_convention'] = match[1];
      }
    }
  }

  return preferences;
}
