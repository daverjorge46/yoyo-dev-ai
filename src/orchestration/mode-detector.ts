/**
 * Keyword Mode Detection
 *
 * Detects specialized agent modes from user prompts using simple string matching.
 * Performance target: < 10ms for detection.
 *
 * Modes:
 * - ultrawork: Deep, thorough analysis with forced Opus model
 * - research: External research focus with search tools
 * - debug: Debugging mode with precise temperature
 * - implement: Implementation focus with write tools
 * - plan: Planning mode with read-only tools
 * - default: Standard mode with no overrides
 */

import type { AgentConfig } from "../agents/types.js";

/**
 * Available mode types
 */
export type ModeType =
  | "default"
  | "ultrawork"
  | "research"
  | "debug"
  | "implement"
  | "plan";

/**
 * Detected mode result
 */
export interface DetectedMode {
  /** Detected mode type */
  mode: ModeType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Keywords that triggered the detection */
  triggers: string[];

  /** Configuration overrides for this mode */
  overrides: Partial<AgentConfig>;
}

/**
 * Keyword definitions for each mode
 *
 * Keywords are all lowercase for case-insensitive matching.
 * Some keywords may overlap between modes - the mode with more matches wins.
 */
export const MODE_KEYWORDS: Record<Exclude<ModeType, "default">, string[]> = {
  ultrawork: [
    "deep",
    "thorough",
    "comprehensive",
    "exhaustive",
    "detailed",
    "ulw",
    "ultrawork",
    "in-depth",
    "complete",
    "full",
  ],
  research: [
    "find",
    "search",
    "how",
    "what",
    "why",
    "examples",
    "docs",
    "documentation",
    "best practice",
    "pattern",
    "library",
  ],
  debug: [
    "fix",
    "error",
    "bug",
    "failing",
    "broken",
    "crash",
    "issue",
    "problem",
    "not working",
    "debug",
    "investigate",
  ],
  implement: [
    "build",
    "create",
    "implement",
    "add",
    "code",
    "write",
    "develop",
    "make",
    "construct",
  ],
  plan: [
    "plan",
    "roadmap",
    "design",
    "architect",
    "spec",
    "strategy",
    "approach",
    "outline",
  ],
};

/**
 * Mode priority order for tie-breaking
 * Lower index = higher priority when scores are equal
 */
const MODE_PRIORITY: Exclude<ModeType, "default">[] = [
  "ultrawork",
  "debug",
  "implement",
  "research",
  "plan",
];

/**
 * Detect mode from user prompt using keyword matching
 *
 * @param userPrompt - The user's input prompt
 * @returns Detected mode with confidence and overrides
 */
export function detectMode(userPrompt: string): DetectedMode {
  // Normalize prompt for case-insensitive matching
  const lowerPrompt = userPrompt.toLowerCase();

  // Score each mode
  const scores: Array<{
    mode: Exclude<ModeType, "default">;
    score: number;
    triggers: string[];
  }> = [];

  for (const mode of MODE_PRIORITY) {
    const keywords = MODE_KEYWORDS[mode];
    const matches = keywords.filter((kw) => lowerPrompt.includes(kw));

    scores.push({
      mode,
      score: matches.length,
      triggers: matches,
    });
  }

  // Sort by score descending, then by priority (already in priority order from MODE_PRIORITY)
  scores.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Equal scores: use priority order
    return MODE_PRIORITY.indexOf(a.mode) - MODE_PRIORITY.indexOf(b.mode);
  });

  const best = scores[0];

  // Require at least 1 match for non-default mode
  if (!best || best.score === 0) {
    return {
      mode: "default",
      confidence: 1.0,
      triggers: [],
      overrides: {},
    };
  }

  // Calculate confidence
  // Confidence is based on matches vs a reasonable threshold (3 matches = max confidence)
  const confidence = Math.min(1.0, best.score / 3);

  return {
    mode: best.mode,
    confidence,
    triggers: best.triggers,
    overrides: getModeOverrides(best.mode),
  };
}

/**
 * Get configuration overrides for a specific mode
 *
 * @param mode - The mode to get overrides for
 * @returns Partial agent configuration overrides
 */
export function getModeOverrides(mode: ModeType): Partial<AgentConfig> {
  switch (mode) {
    case "ultrawork":
      return {
        temperature: 0.2, // More focused, precise
        model: "anthropic/claude-opus-4-5", // Force best model
        metadata: { mode: "ultrawork" },
      };

    case "research":
      return {
        temperature: 0.5, // Balanced for exploration
        tools: [
          "mcp__MCP_DOCKER__search_*",
          "mcp__context7__*",
          "WebSearch",
          "WebFetch",
          "Read",
          "Grep",
          "Glob",
        ],
        metadata: { mode: "research" },
      };

    case "debug":
      return {
        temperature: 0.1, // Very precise for debugging
        tools: ["*"], // All tools for thorough debugging
        metadata: { mode: "debug" },
      };

    case "implement":
      return {
        temperature: 0.3, // Focused but creative enough
        tools: [
          "Write",
          "Edit",
          "Read",
          "Grep",
          "Glob",
          "Bash",
          "TodoWrite",
        ],
        metadata: { mode: "implement" },
      };

    case "plan":
      return {
        temperature: 0.7, // More creative for brainstorming
        tools: [
          "Read",
          "Grep",
          "Glob",
          "WebSearch",
          "WebFetch",
          "TodoWrite",
          "AskUserQuestion",
        ],
        metadata: { mode: "plan" },
      };

    case "default":
    default:
      return {};
  }
}

/**
 * Log mode activation for debugging
 *
 * @param detected - The detected mode result
 */
export function logModeActivation(detected: DetectedMode): void {
  if (detected.mode === "default") {
    return;
  }

  console.log(`[Mode Detection] Activated: ${detected.mode}`);
  console.log(`[Mode Detection] Triggers: ${detected.triggers.join(", ")}`);
  console.log(
    `[Mode Detection] Confidence: ${(detected.confidence * 100).toFixed(0)}%`
  );
}

/**
 * Check if a mode is active (non-default)
 *
 * @param detected - The detected mode result
 * @returns True if a non-default mode is active
 */
export function isModeActive(detected: DetectedMode): boolean {
  return detected.mode !== "default";
}
