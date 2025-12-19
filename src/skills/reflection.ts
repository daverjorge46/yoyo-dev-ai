/**
 * Reflection Engine
 *
 * Analyzes conversation trajectories for learning opportunities.
 * This is Stage 1 of the two-stage learning process.
 */

import type {
  ReflectionResult,
  ExtractedPattern,
  ExtractedPitfall,
} from './types.js';
import { generateSkillId } from './directory.js';

// =============================================================================
// Types
// =============================================================================

/**
 * A message in the conversation trajectory.
 */
export interface TrajectoryMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system';

  /** Message content */
  content: string;

  /** Timestamp */
  timestamp?: string;

  /** Associated tool calls */
  toolCalls?: ToolCall[];
}

/**
 * A tool call in the trajectory.
 */
export interface ToolCall {
  /** Tool name */
  name: string;

  /** Tool arguments */
  args?: Record<string, unknown>;

  /** Tool result */
  result?: string;

  /** Whether the call succeeded */
  success?: boolean;
}

/**
 * Trajectory to analyze.
 */
export interface Trajectory {
  /** Task description */
  taskDescription: string;

  /** Messages in the conversation */
  messages: TrajectoryMessage[];

  /** Whether the task was completed */
  taskCompleted?: boolean;

  /** Technologies detected */
  technologies?: string[];

  /** Files modified */
  filesModified?: string[];
}

/**
 * Reflection configuration.
 */
export interface ReflectionConfig {
  /** Minimum messages required */
  minMessages?: number;

  /** Minimum reasoning quality threshold */
  minQualityThreshold?: number;

  /** Keywords indicating success patterns */
  successKeywords?: string[];

  /** Keywords indicating failure patterns */
  failureKeywords?: string[];
}

const DEFAULT_CONFIG: ReflectionConfig = {
  minMessages: 3,
  minQualityThreshold: 0.6,
  successKeywords: [
    'completed',
    'done',
    'finished',
    'success',
    'works',
    'passed',
    'fixed',
    'resolved',
  ],
  failureKeywords: [
    'error',
    'failed',
    'bug',
    'issue',
    'problem',
    'wrong',
    'broken',
    'doesn\'t work',
  ],
};

// =============================================================================
// Analysis Functions
// =============================================================================

/**
 * Check if the task was completed successfully.
 *
 * @param trajectory - Trajectory to analyze
 * @param config - Reflection config
 * @returns Completion status and confidence
 */
export function checkTaskCompletion(
  trajectory: Trajectory,
  config: ReflectionConfig = DEFAULT_CONFIG
): { completed: boolean; confidence: number } {
  // If explicitly marked, use that
  if (trajectory.taskCompleted !== undefined) {
    return { completed: trajectory.taskCompleted, confidence: 1.0 };
  }

  const lastMessages = trajectory.messages.slice(-3);
  const content = lastMessages.map(m => m.content.toLowerCase()).join(' ');

  // Count success and failure indicators
  const successCount = (config.successKeywords ?? []).filter(kw =>
    content.includes(kw.toLowerCase())
  ).length;

  const failureCount = (config.failureKeywords ?? []).filter(kw =>
    content.includes(kw.toLowerCase())
  ).length;

  // Check for tool call success
  const toolCalls = trajectory.messages.flatMap(m => m.toolCalls ?? []);
  const successfulTools = toolCalls.filter(t => t.success !== false).length;
  const totalTools = toolCalls.length;

  // Calculate completion likelihood
  let score = 0.5; // Neutral start

  if (successCount > failureCount) {
    score += 0.2 * Math.min(successCount - failureCount, 3);
  } else if (failureCount > successCount) {
    score -= 0.2 * Math.min(failureCount - successCount, 3);
  }

  if (totalTools > 0) {
    score += 0.2 * (successfulTools / totalTools);
  }

  // Check if there's a clear completion message
  const lastAssistant = lastMessages.find(m => m.role === 'assistant');
  if (lastAssistant) {
    const completionPhrases = [
      'i have completed',
      'task is complete',
      'successfully implemented',
      'all done',
      'finished implementing',
    ];
    if (completionPhrases.some(p => lastAssistant.content.toLowerCase().includes(p))) {
      score += 0.3;
    }
  }

  const completed = score >= 0.6;
  const confidence = Math.min(1.0, Math.max(0.0, score));

  return { completed, confidence };
}

/**
 * Assess the quality of reasoning in the trajectory.
 *
 * @param trajectory - Trajectory to analyze
 * @returns Quality score from 0.0 to 1.0
 */
export function assessReasoningQuality(trajectory: Trajectory): number {
  let score = 0.0;
  const messages = trajectory.messages;

  // Check for structured thinking
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const hasStructuredThinking = assistantMessages.some(m => {
    const content = m.content.toLowerCase();
    return (
      content.includes('let me') ||
      content.includes('first,') ||
      content.includes('step 1') ||
      content.includes('i\'ll start by') ||
      content.includes('approach:')
    );
  });
  if (hasStructuredThinking) score += 0.2;

  // Check for problem decomposition
  const hasDecomposition = assistantMessages.some(m => {
    const content = m.content.toLowerCase();
    return (
      content.includes('break this down') ||
      content.includes('several parts') ||
      content.includes('the key steps are') ||
      content.includes('we need to:')
    );
  });
  if (hasDecomposition) score += 0.2;

  // Check for verification/testing
  const toolCalls = messages.flatMap(m => m.toolCalls ?? []);
  const hasVerification = toolCalls.some(t =>
    t.name.toLowerCase().includes('test') ||
    t.name.toLowerCase().includes('verify') ||
    t.name.toLowerCase().includes('check')
  );
  if (hasVerification) score += 0.2;

  // Check for error handling
  const hasErrorHandling = assistantMessages.some(m => {
    const content = m.content.toLowerCase();
    return (
      content.includes('error handling') ||
      content.includes('edge case') ||
      content.includes('what if') ||
      content.includes('handle the case')
    );
  });
  if (hasErrorHandling) score += 0.15;

  // Check for iteration/refinement
  const hasSomeToolCalls = toolCalls.length > 0;
  if (hasSomeToolCalls) score += 0.1;

  // Check message length (too short = low effort)
  const avgLength = assistantMessages.reduce((sum, m) => sum + m.content.length, 0) /
    Math.max(1, assistantMessages.length);
  if (avgLength > 200) score += 0.15;

  return Math.min(1.0, score);
}

/**
 * Detect patterns that could be abstracted into skills.
 *
 * @param trajectory - Trajectory to analyze
 * @returns Extracted patterns
 */
export function detectPatterns(trajectory: Trajectory): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];
  const messages = trajectory.messages;
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // Look for repeated tool usage patterns
  const toolCalls = messages.flatMap(m => m.toolCalls ?? []);
  const toolSequences = extractToolSequences(toolCalls);

  for (const sequence of toolSequences) {
    if (sequence.tools.length >= 2) {
      patterns.push({
        name: `${sequence.tools[0]} Workflow`,
        description: `Common sequence: ${sequence.tools.join(' -> ')}`,
        context: 'When performing similar tasks',
        steps: sequence.tools.map(t => `Use ${t}`),
      });
    }
  }

  // Look for explicit approach descriptions
  for (const message of assistantMessages) {
    const content = message.content;

    // Extract numbered lists as patterns
    const numberedLines = content.match(/^\d+\.\s+.+$/gm);
    if (numberedLines && numberedLines.length >= 2) {
      const steps = numberedLines.map(l => l.replace(/^\d+\.\s*/, ''));

      patterns.push({
        name: 'Implementation Steps',
        description: 'Structured approach to the task',
        context: 'Similar implementation scenarios',
        steps,
      });
    }
  }

  return patterns;
}

/**
 * Extract tool call sequences.
 */
function extractToolSequences(toolCalls: ToolCall[]): { tools: string[] }[] {
  if (toolCalls.length < 2) return [];

  const sequences: { tools: string[] }[] = [];
  const tools = toolCalls.map(t => t.name);

  // Look for common sequences
  for (let i = 0; i < tools.length - 1; i++) {
    const sequence = [tools[i], tools[i + 1]];
    if (i + 2 < tools.length) {
      sequence.push(tools[i + 2]);
    }
    sequences.push({ tools: sequence });
  }

  return sequences.slice(0, 3); // Limit to 3 sequences
}

/**
 * Extract pitfalls from failed attempts or corrections.
 *
 * @param trajectory - Trajectory to analyze
 * @returns Extracted pitfalls
 */
export function extractPitfalls(trajectory: Trajectory): ExtractedPitfall[] {
  const pitfalls: ExtractedPitfall[] = [];
  const messages = trajectory.messages;

  // Look for error patterns
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const content = message.content.toLowerCase();

    // Check for error mentions
    if (content.includes('error') || content.includes('failed') || content.includes('issue')) {
      // Look for resolution in next messages
      for (let j = i + 1; j < Math.min(i + 3, messages.length); j++) {
        const nextMessage = messages[j];
        const nextContent = nextMessage.content.toLowerCase();

        if (
          nextContent.includes('fixed') ||
          nextContent.includes('resolved') ||
          nextContent.includes('the solution') ||
          nextContent.includes('instead')
        ) {
          // Extract the error and fix
          const errorMatch = message.content.match(/error[:\s]+([^.]+)/i);
          const fixMatch = nextMessage.content.match(/(?:fixed|resolved|solution)[:\s]+([^.]+)/i);

          if (errorMatch || fixMatch) {
            pitfalls.push({
              issue: errorMatch?.[1] ?? 'Encountered an issue',
              resolution: fixMatch?.[1] ?? 'Applied a fix',
              prevention: 'Check for this pattern before implementation',
            });
          }
          break;
        }
      }
    }
  }

  // Look for "should have" or "forgot to" patterns
  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    const content = message.content;
    const shouldHaveMatch = content.match(/(?:should have|forgot to|missed)\s+([^.]+)/i);

    if (shouldHaveMatch) {
      pitfalls.push({
        issue: `Missed: ${shouldHaveMatch[1]}`,
        resolution: 'Corrected the oversight',
        prevention: `Remember to ${shouldHaveMatch[1]}`,
      });
    }
  }

  return pitfalls.slice(0, 5); // Limit pitfalls
}

// =============================================================================
// Main Reflection Function
// =============================================================================

/**
 * Analyze a trajectory and produce a reflection result.
 *
 * @param trajectory - Trajectory to analyze
 * @param config - Reflection configuration
 * @returns Reflection result
 */
export function analyzeTrajectory(
  trajectory: Trajectory,
  config: ReflectionConfig = DEFAULT_CONFIG
): ReflectionResult {
  // Check task completion
  const { completed: taskCompleted } = checkTaskCompletion(trajectory, config);

  // Assess reasoning quality
  const reasoningQuality = assessReasoningQuality(trajectory);

  // Detect patterns
  const patterns = detectPatterns(trajectory);

  // Extract pitfalls
  const pitfalls = extractPitfalls(trajectory);

  // Determine if skill creation is worthwhile
  const shouldCreateSkill =
    taskCompleted &&
    reasoningQuality >= (config.minQualityThreshold ?? 0.6) &&
    (patterns.length > 0 || pitfalls.length > 0) &&
    trajectory.messages.length >= (config.minMessages ?? 3);

  // Generate suggested metadata
  const suggestedName = generateSkillName(trajectory);
  const suggestedTags = extractTags(trajectory);
  const suggestedTriggers = extractTriggers(trajectory);

  return {
    taskCompleted,
    reasoningQuality,
    shouldCreateSkill,
    patterns,
    pitfalls,
    suggestedName,
    suggestedTags,
    suggestedTriggers,
  };
}

/**
 * Generate a suggested skill name from the trajectory.
 */
function generateSkillName(trajectory: Trajectory): string {
  // Use task description if available
  if (trajectory.taskDescription) {
    // Clean up the description
    const cleaned = trajectory.taskDescription
      .replace(/^(implement|create|add|build|fix|update|make)\s+/i, '')
      .replace(/[^\w\s-]/g, '')
      .trim();

    if (cleaned.length > 0 && cleaned.length < 50) {
      return cleaned.split(' ').slice(0, 4).join(' ');
    }
  }

  // Fall back to technology-based name
  if (trajectory.technologies && trajectory.technologies.length > 0) {
    return `${trajectory.technologies[0]} Patterns`;
  }

  return 'Learned Pattern';
}

/**
 * Extract suggested tags from the trajectory.
 */
function extractTags(trajectory: Trajectory): string[] {
  const tags = new Set<string>();

  // Add technologies
  if (trajectory.technologies) {
    for (const tech of trajectory.technologies) {
      tags.add(tech.toLowerCase());
    }
  }

  // Extract from file extensions
  if (trajectory.filesModified) {
    for (const file of trajectory.filesModified) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) {
        const extToTag: Record<string, string> = {
          ts: 'typescript',
          tsx: 'react',
          js: 'javascript',
          jsx: 'react',
          py: 'python',
          rs: 'rust',
          go: 'golang',
          css: 'css',
          scss: 'css',
        };
        if (extToTag[ext]) {
          tags.add(extToTag[ext]);
        }
      }
    }
  }

  // Extract from content keywords
  const content = trajectory.messages.map(m => m.content.toLowerCase()).join(' ');
  const techKeywords = [
    'react', 'vue', 'angular', 'node', 'express', 'api', 'database',
    'testing', 'docker', 'kubernetes', 'aws', 'typescript', 'graphql',
  ];

  for (const keyword of techKeywords) {
    if (content.includes(keyword)) {
      tags.add(keyword);
    }
  }

  return Array.from(tags).slice(0, 10);
}

/**
 * Extract suggested triggers from the trajectory.
 */
function extractTriggers(trajectory: Trajectory): string[] {
  const triggers = new Set<string>();

  // Add tool names as triggers
  const toolCalls = trajectory.messages.flatMap(m => m.toolCalls ?? []);
  for (const tool of toolCalls) {
    triggers.add(tool.name);
  }

  // Extract key verbs from task description
  if (trajectory.taskDescription) {
    const verbs = ['implement', 'create', 'add', 'build', 'fix', 'update', 'refactor', 'test'];
    for (const verb of verbs) {
      if (trajectory.taskDescription.toLowerCase().includes(verb)) {
        triggers.add(verb);
      }
    }
  }

  return Array.from(triggers).slice(0, 10);
}

/**
 * Determine if a skill should be created from a reflection.
 *
 * @param reflection - Reflection result
 * @returns True if skill creation is recommended
 */
export function shouldCreateSkill(reflection: ReflectionResult): boolean {
  return reflection.shouldCreateSkill;
}
