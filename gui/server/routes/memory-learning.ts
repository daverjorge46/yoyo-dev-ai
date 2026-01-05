/**
 * Memory Learning API Routes
 *
 * Provides endpoints for pattern detection, automatic learning,
 * and memory consolidation.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';

export const memoryLearningRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface LearnFromConversationRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
  context?: {
    agentId?: string;
    workflowType?: string;
    corrections?: Array<{
      issue: string;
      correction: string;
      context?: string;
    }>;
    autoUpdate?: boolean;
  };
}

interface LearnFromInstructionRequest {
  instruction: string;
  targetBlock?: 'persona' | 'project' | 'user' | 'corrections';
}

interface LearningResult {
  learningsExtracted: number;
  memoriesUpdated: number;
  newPatternsDetected: number;
  confidence: number;
  details: Array<{
    type: 'correction' | 'preference' | 'pattern' | 'tag';
    description: string;
    confidence: number;
    targetBlock?: string;
    applied: boolean;
    reason?: string;
  }>;
}

interface DetectedPattern {
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  evidence: string[];
  firstSeen: string;
  lastSeen: string;
}

interface ConversationAnalysis {
  patterns: DetectedPattern[];
  topics: string[];
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  entities: string[];
}

// =============================================================================
// Routes
// =============================================================================

// POST /api/memory/learn/conversation - Learn from a conversation
memoryLearningRoutes.post('/conversation', async (c) => {
  try {
    const body = await c.req.json<LearnFromConversationRequest>();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json({ error: 'Messages array is required' }, 400);
    }

    const result = learnFromConversation(body.messages, body.context);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Learning from conversation failed' }, 500);
  }
});

// POST /api/memory/learn/instruction - Learn from a manual instruction
memoryLearningRoutes.post('/instruction', async (c) => {
  try {
    const body = await c.req.json<LearnFromInstructionRequest>();

    if (!body.instruction || typeof body.instruction !== 'string') {
      return c.json({ error: 'Instruction is required' }, 400);
    }

    const result = learnFromInstruction(body.instruction, body.targetBlock);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Learning from instruction failed' }, 500);
  }
});

// POST /api/memory/learn/consolidate - Consolidate memory
memoryLearningRoutes.post('/consolidate', async (c) => {
  try {
    const result = await consolidateMemory();
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Memory consolidation failed' }, 500);
  }
});

// GET /api/memory/learn/patterns - Get detected patterns
memoryLearningRoutes.get('/patterns', async (c) => {
  const type = c.req.query('type');
  const minConfidence = parseFloat(c.req.query('minConfidence') || '0.5');

  const patterns = getLearnedPatterns(type, minConfidence);
  return c.json({ patterns, count: patterns.length });
});

// POST /api/memory/learn/analyze - Analyze a conversation
memoryLearningRoutes.post('/analyze', async (c) => {
  try {
    const body = await c.req.json<{ messages: LearnFromConversationRequest['messages'] }>();

    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: 'Messages array is required' }, 400);
    }

    const analysis = analyzeConversation(body.messages);
    return c.json(analysis);
  } catch (error) {
    return c.json({ error: 'Conversation analysis failed' }, 500);
  }
});

// GET /api/memory/learn/preferences - Get inferred preferences
memoryLearningRoutes.get('/preferences', async (c) => {
  const preferences = getInferredPreferences();
  return c.json(preferences);
});

// DELETE /api/memory/learn/patterns - Clear learned patterns
memoryLearningRoutes.delete('/patterns', async (c) => {
  clearLearnedPatterns();
  return c.json({ success: true, message: 'Patterns cleared' });
});

// =============================================================================
// Learning Implementation (Simplified)
// =============================================================================

// In-memory storage for patterns (would be persisted in production)
let learnedPatterns: DetectedPattern[] = [];

function learnFromConversation(
  messages: LearnFromConversationRequest['messages'],
  context?: LearnFromConversationRequest['context']
): LearningResult {
  const details: LearningResult['details'] = [];
  const userMessages = messages.filter(m => m.role === 'user');

  // Detect patterns from user messages
  const detectionPatterns = [
    { regex: /prefer\s+(functional|class|arrow|async)/i, type: 'code_style', confidence: 0.8 },
    { regex: /always\s+use\s+(\w+)/i, type: 'preference', confidence: 0.7 },
    { regex: /don't\s+(use|like|want)\s+(\w+)/i, type: 'correction', confidence: 0.7 },
    { regex: /prefer\s+(react|vue|angular|typescript)/i, type: 'technology', confidence: 0.9 },
  ];

  let patternsFound = 0;
  for (const msg of userMessages) {
    for (const pattern of detectionPatterns) {
      if (pattern.regex.test(msg.content)) {
        const match = msg.content.match(pattern.regex);
        if (match) {
          details.push({
            type: pattern.type as any,
            description: match[0],
            confidence: pattern.confidence,
            targetBlock: pattern.type === 'correction' ? 'corrections' : 'user',
            applied: context?.autoUpdate !== false && pattern.confidence >= 0.7,
            reason: pattern.confidence < 0.7 ? 'Below confidence threshold' : undefined,
          });
          patternsFound++;
        }
      }
    }
  }

  // Process explicit corrections
  if (context?.corrections) {
    for (const correction of context.corrections) {
      details.push({
        type: 'correction',
        description: `${correction.issue} -> ${correction.correction}`,
        confidence: 0.85,
        targetBlock: 'corrections',
        applied: context?.autoUpdate !== false,
      });
    }
  }

  const avgConfidence = details.length > 0
    ? details.reduce((sum, d) => sum + d.confidence, 0) / details.length
    : 0;

  return {
    learningsExtracted: details.length,
    memoriesUpdated: details.filter(d => d.applied).length,
    newPatternsDetected: patternsFound,
    confidence: Math.round(avgConfidence * 100) / 100,
    details,
  };
}

function learnFromInstruction(
  instruction: string,
  targetBlock?: 'persona' | 'project' | 'user' | 'corrections'
): LearningResult {
  const details: LearningResult['details'] = [];
  const lower = instruction.toLowerCase();

  // Detect target block if not specified
  let block = targetBlock;
  if (!block) {
    if (/project|codebase|architecture/.test(lower)) block = 'project';
    else if (/persona|behavior|style|tone/.test(lower)) block = 'persona';
    else if (/preference|prefer|like|want/.test(lower)) block = 'user';
    else if (/correction|wrong|mistake|fix/.test(lower)) block = 'corrections';
    else block = 'user';
  }

  // Determine type of learning
  let type: 'correction' | 'preference' | 'pattern' | 'tag' = 'pattern';
  let confidence = 0.7;

  if (/^(no|don't|stop|never)/i.test(instruction) || instruction.includes('instead')) {
    type = 'correction';
    confidence = 0.85;
  } else if (/^(prefer|always|use|want)/i.test(instruction)) {
    type = 'preference';
    confidence = 0.75;
  }

  details.push({
    type,
    description: instruction.substring(0, 100),
    confidence,
    targetBlock: block,
    applied: confidence >= 0.7,
    reason: confidence < 0.7 ? 'Below confidence threshold' : undefined,
  });

  return {
    learningsExtracted: 1,
    memoriesUpdated: confidence >= 0.7 ? 1 : 0,
    newPatternsDetected: 0,
    confidence,
    details,
  };
}

async function consolidateMemory() {
  // Simplified consolidation - would use actual LearningEngine
  return {
    blocksConsolidated: 0,
    relevanceUpdated: 0,
    tagsMerged: 0,
    embeddingsRegenerated: 0,
  };
}

function getLearnedPatterns(type?: string, minConfidence: number = 0.5): DetectedPattern[] {
  let patterns = [...learnedPatterns];

  if (type) {
    patterns = patterns.filter(p => p.type === type);
  }

  patterns = patterns.filter(p => p.confidence >= minConfidence);

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

function analyzeConversation(
  messages: LearnFromConversationRequest['messages']
): ConversationAnalysis {
  const allText = messages.map(m => m.content).join(' ');
  const userText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');

  // Extract topics
  const topicPatterns = [
    /\b(react|vue|angular|svelte)\b/gi,
    /\b(typescript|javascript|python)\b/gi,
    /\b(api|rest|graphql)\b/gi,
    /\b(database|sql|mongodb)\b/gi,
  ];

  const topics = new Set<string>();
  for (const pattern of topicPatterns) {
    const matches = Array.from(allText.matchAll(pattern));
    for (const match of matches) {
      topics.add(match[0].toLowerCase());
    }
  }

  // Analyze sentiment
  const positiveWords = ['good', 'great', 'perfect', 'excellent', 'thanks', 'nice', 'love', 'awesome'];
  const negativeWords = ['bad', 'wrong', 'incorrect', 'no', "don't", 'hate', 'awful', 'terrible'];

  const words = userText.toLowerCase().split(/\s+/);
  let positive = 0, negative = 0;

  for (const word of words) {
    if (positiveWords.some(p => word.includes(p))) positive++;
    if (negativeWords.some(n => word.includes(n))) negative++;
  }

  const total = words.length || 1;

  // Extract entities (file paths, component names)
  const entities = new Set<string>();
  const fileMatches = allText.match(/[\w\-./]+\.(ts|js|tsx|jsx|json|md)/g);
  if (fileMatches) fileMatches.forEach(m => entities.add(m));

  return {
    patterns: [],
    topics: Array.from(topics),
    sentiment: {
      positive: positive / total,
      negative: negative / total,
      neutral: 1 - (positive + negative) / total,
    },
    entities: Array.from(entities),
  };
}

function getInferredPreferences() {
  // Would be populated by actual pattern analysis
  return {
    frontend_framework: null,
    language: null,
    styling: null,
    naming_convention: null,
  };
}

function clearLearnedPatterns() {
  learnedPatterns = [];
}
