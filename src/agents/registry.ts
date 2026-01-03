/**
 * Agent Registry
 *
 * Central registry for all built-in agents in the Yoyo Dev framework.
 * Supports hierarchical configuration loading with dynamic overrides.
 * All agents use Claude models (Opus 4.5 primary, Sonnet 4.5 fallback).
 */

import type { AgentConfig } from "./types.js";
import type { MergedAgentConfig, ConfigLoadResult } from "../config/types.js";

// =============================================================================
// Built-in Agent Configurations
// =============================================================================

/**
 * Built-in agent configurations
 * All agents differentiated by system prompts, temperature, and tool access
 */
const builtinAgents: Record<string, AgentConfig> = {
  "yoyo-ai": {
    name: "Yoyo-AI",
    role: "Primary Orchestrator",
    model: "anthropic/claude-opus-4-5",
    fallbackModel: "anthropic/claude-sonnet-4-5",
    temperature: 1.0,
    mode: "primary",
    tools: ["*"],
    systemPromptPath: ".claude/agents/yoyo-ai.md",
    enabled: true,
    fallbackOnRateLimit: true,
    color: "#00ff88",
    metadata: {
      description:
        "Primary orchestrator that delegates work, manages todos, and coordinates parallel execution",
      version: "6.2.0",
      tags: ["orchestration", "primary", "delegation"],
    },
  },

  oracle: {
    name: "Oracle",
    role: "Strategic Advisor",
    model: "anthropic/claude-opus-4-5",
    fallbackModel: "anthropic/claude-sonnet-4-5",
    temperature: 0.1,
    mode: "subagent",
    tools: ["Read", "Grep", "Glob", "call_agent", "!Bash", "!Write"],
    systemPromptPath: ".claude/agents/oracle.md",
    enabled: true,
    fallbackOnRateLimit: true,
    color: "#ff6b35",
    metadata: {
      description:
        "Strategic advisor providing architecture guidance and failure analysis",
      version: "6.2.0",
      tags: ["strategy", "architecture", "advisory"],
    },
  },

  librarian: {
    name: "Librarian",
    role: "External Research Specialist",
    model: "anthropic/claude-opus-4-5",
    fallbackModel: "anthropic/claude-sonnet-4-5",
    temperature: 0.3,
    mode: "subagent",
    tools: [
      "mcp__context7__*",
      "mcp__websearch_exa__*",
      "mcp__grep_app__*",
      "mcp__MCP_DOCKER__search_*",
      "mcp__MCP_DOCKER__get_*",
      "mcp__MCP_DOCKER__list_*",
      "Read",
      "Grep",
      "!Bash",
    ],
    systemPromptPath: ".claude/agents/librarian.md",
    enabled: true,
    preferFallback: true, // Cost optimization: use Sonnet by default
    fallbackOnRateLimit: true,
    color: "#4ecdc4",
    metadata: {
      description:
        "External research specialist for GitHub, documentation, and web search",
      version: "6.2.0",
      tags: ["research", "github", "documentation"],
    },
  },

  explore: {
    name: "Explore",
    role: "Codebase Search Specialist",
    model: "anthropic/claude-opus-4-5",
    fallbackModel: "anthropic/claude-sonnet-4-5",
    temperature: 0.5,
    mode: "subagent",
    tools: ["Grep", "Glob", "Read", "!Write", "!Bash"],
    systemPromptPath: ".claude/agents/explore.md",
    enabled: true,
    preferFallback: true, // Speed optimization: use Sonnet by default
    fallbackOnRateLimit: true,
    color: "#95e1d3",
    metadata: {
      description:
        "Fast codebase search and pattern matching specialist for internal code exploration",
      version: "6.2.0",
      tags: ["search", "codebase", "exploration"],
    },
  },

  "frontend-engineer": {
    name: "Frontend Engineer",
    role: "UI/UX Development Specialist",
    model: "anthropic/claude-opus-4-5",
    fallbackModel: "anthropic/claude-sonnet-4-5",
    temperature: 0.7,
    mode: "subagent",
    tools: [
      "Write",
      "Read",
      "Edit",
      "mcp__playwright__*",
      "mcp__MCP_DOCKER__browser_*",
      "!call_agent",
    ],
    systemPromptPath: ".claude/agents/frontend-engineer.md",
    enabled: true,
    fallbackOnRateLimit: true,
    color: "#f38181",
    metadata: {
      description:
        "UI/UX specialist handling visual changes, styling, and component development",
      version: "6.2.0",
      tags: ["frontend", "ui", "ux", "visual"],
    },
  },

  "document-writer": {
    name: "Document Writer",
    role: "Technical Writing Specialist",
    model: "anthropic/claude-opus-4-5",
    fallbackModel: "anthropic/claude-sonnet-4-5",
    temperature: 0.5,
    mode: "subagent",
    tools: ["Write", "Read", "Edit", "!Bash"],
    systemPromptPath: ".claude/agents/document-writer.md",
    enabled: true,
    preferFallback: true, // Sonnet sufficient for prose
    fallbackOnRateLimit: true,
    color: "#aa96da",
    metadata: {
      description:
        "Technical writing specialist for README, documentation, and guides",
      version: "6.2.0",
      tags: ["documentation", "writing", "guides"],
    },
  },
};

// =============================================================================
// Dynamic Config Cache
// =============================================================================

/**
 * Cached configuration result from hierarchical loading
 */
let cachedConfigResult: ConfigLoadResult | null = null;

/**
 * Set the cached configuration result
 * Called by the config loader after loading hierarchical configs
 */
export function setConfigCache(result: ConfigLoadResult): void {
  cachedConfigResult = result;
}

/**
 * Clear the cached configuration result
 */
export function clearConfigCache(): void {
  cachedConfigResult = null;
}

/**
 * Check if dynamic config is loaded
 */
export function hasConfigCache(): boolean {
  return cachedConfigResult !== null;
}

/**
 * Get the cached config result
 */
export function getConfigCache(): ConfigLoadResult | null {
  return cachedConfigResult;
}

// =============================================================================
// Agent Access Functions
// =============================================================================

/**
 * Get agent configuration by name
 *
 * Returns merged config if available, otherwise builtin config.
 *
 * @param name - Agent name (e.g., "yoyo-ai", "oracle")
 * @returns Agent configuration or undefined if not found
 */
export function getAgent(name: string): AgentConfig | MergedAgentConfig | undefined {
  // Try cached merged config first
  if (cachedConfigResult) {
    const merged = cachedConfigResult.agents[name];
    if (merged) {
      return merged;
    }
  }

  // Fall back to builtin
  return builtinAgents[name];
}

/**
 * Get builtin agent configuration by name (ignores overrides)
 *
 * @param name - Agent name (e.g., "yoyo-ai", "oracle")
 * @returns Builtin agent configuration or undefined if not found
 */
export function getBuiltinAgent(name: string): AgentConfig | undefined {
  return builtinAgents[name];
}

/**
 * Get all registered agent configurations
 *
 * Returns merged configs if available, otherwise builtin configs.
 *
 * @returns Array of all agent configurations
 */
export function getAllAgents(): AgentConfig[] {
  // Return merged configs if available
  if (cachedConfigResult) {
    return Object.values(cachedConfigResult.agents);
  }

  // Fall back to builtins
  return Object.values(builtinAgents);
}

/**
 * Get all builtin agent configurations (ignores overrides)
 *
 * @returns Array of all builtin agent configurations
 */
export function getAllBuiltinAgents(): AgentConfig[] {
  return Object.values(builtinAgents);
}

/**
 * Get only enabled agents
 *
 * @returns Array of enabled agent configurations
 */
export function getEnabledAgents(): AgentConfig[] {
  return getAllAgents().filter((agent) => agent.enabled !== false);
}

/**
 * Check if an agent exists in the registry
 *
 * Checks both merged configs and builtins.
 *
 * @param name - Agent name to check
 * @returns True if agent exists, false otherwise
 */
export function hasAgent(name: string): boolean {
  if (cachedConfigResult && name in cachedConfigResult.agents) {
    return true;
  }
  return name in builtinAgents;
}

/**
 * Check if an agent exists in builtin registry
 *
 * @param name - Agent name to check
 * @returns True if builtin agent exists, false otherwise
 */
export function hasBuiltinAgent(name: string): boolean {
  return name in builtinAgents;
}

/**
 * Validate agent configuration
 *
 * @param agent - Agent configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateAgentConfig(agent: AgentConfig): string[] {
  const errors: string[] = [];

  // Required fields
  if (!agent.name || agent.name.trim() === "") {
    errors.push("Agent name is required");
  }

  if (!agent.role || agent.role.trim() === "") {
    errors.push("Agent role is required");
  }

  if (!agent.model || agent.model.trim() === "") {
    errors.push("Agent model is required");
  }

  if (!agent.mode) {
    errors.push("Agent mode is required");
  } else if (agent.mode !== "primary" && agent.mode !== "subagent") {
    errors.push("Agent mode must be 'primary' or 'subagent'");
  }

  if (!agent.systemPromptPath || agent.systemPromptPath.trim() === "") {
    errors.push("Agent systemPromptPath is required");
  }

  if (!Array.isArray(agent.tools)) {
    errors.push("Agent tools must be an array");
  } else if (agent.tools.length === 0) {
    errors.push("Agent tools cannot be empty");
  }

  // Temperature validation
  if (typeof agent.temperature !== "number") {
    errors.push("Agent temperature must be a number");
  } else if (agent.temperature < 0 || agent.temperature > 1) {
    errors.push("Agent temperature must be between 0 and 1");
  }

  // Model format validation
  if (agent.model && !agent.model.includes("/")) {
    errors.push("Agent model must be in format 'provider/model-name'");
  }

  if (agent.fallbackModel && !agent.fallbackModel.includes("/")) {
    errors.push(
      "Agent fallbackModel must be in format 'provider/model-name'"
    );
  }

  return errors;
}

/**
 * Get agents that prefer fallback model by default
 * (Cost optimization agents)
 *
 * @returns Array of agent names that prefer Sonnet
 */
export function getPreferFallbackAgents(): string[] {
  const agents = getAllAgents();
  return agents
    .filter((agent) => agent.preferFallback === true)
    .map((agent) => agent.name.toLowerCase().replace(/\s+/g, "-"));
}

/**
 * Get agents by mode
 *
 * @param mode - Agent mode to filter by
 * @returns Array of agents matching the specified mode
 */
export function getAgentsByMode(
  mode: "primary" | "subagent"
): AgentConfig[] {
  return getAllAgents().filter((agent) => agent.mode === mode);
}

/**
 * Get the primary orchestrator agent
 *
 * @returns Primary agent configuration (Yoyo-AI)
 */
export function getPrimaryAgent(): AgentConfig | undefined {
  return getAgentsByMode("primary")[0];
}

/**
 * Get custom agents (not in builtin registry)
 *
 * @returns Array of custom agent configurations
 */
export function getCustomAgents(): MergedAgentConfig[] {
  if (!cachedConfigResult) {
    return [];
  }

  return Object.values(cachedConfigResult.agents).filter(
    (agent) => agent.isCustom
  );
}

/**
 * Get agent configuration sources
 *
 * @param name - Agent name
 * @returns Array of config sources that contributed to this agent
 */
export function getAgentSources(name: string): string[] {
  if (cachedConfigResult) {
    const merged = cachedConfigResult.agents[name];
    if (merged) {
      return merged.sources;
    }
  }

  // Builtin only
  if (builtinAgents[name]) {
    return ["builtin"];
  }

  return [];
}
