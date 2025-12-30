/**
 * Agent Loader
 *
 * Loads agent configurations and system prompts from files.
 * Handles tool access control resolution (wildcards and negations).
 * Supports hierarchical configuration loading with merged configs.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AgentConfig, LoadedAgent } from "./types.js";
import type { MergedAgentConfig, ConfigLoaderOptions } from "../config/types.js";
import {
  getAgent,
  getBuiltinAgent,
  validateAgentConfig,
  setConfigCache,
  hasConfigCache,
} from "./registry.js";
import { loadAgentConfigs } from "../config/loader.js";

// =============================================================================
// Configuration Initialization
// =============================================================================

/**
 * Initialize the hierarchical configuration system
 *
 * Loads configs from all sources and caches them in the registry.
 * Should be called once at application startup.
 *
 * @param options - Configuration loader options
 * @returns Config load result with any errors/warnings
 */
export async function initializeConfig(
  options: ConfigLoaderOptions = {}
): Promise<void> {
  const result = await loadAgentConfigs({
    ...options,
    enableCache: true,
  });

  // Set the cache in the registry
  setConfigCache(result);

  // Log any errors
  if (result.errors.length > 0) {
    console.warn(
      `Config loading completed with ${result.errors.length} error(s):`
    );
    for (const error of result.errors) {
      console.warn(`  - ${error.file ?? "unknown"}: ${error.message}`);
    }
  }
}

/**
 * Ensure configuration is initialized
 *
 * Initializes config if not already done.
 * Safe to call multiple times.
 */
export async function ensureConfigInitialized(
  options: ConfigLoaderOptions = {}
): Promise<void> {
  if (!hasConfigCache()) {
    await initializeConfig(options);
  }
}

// =============================================================================
// Agent Loading
// =============================================================================

/**
 * Load an agent configuration with system prompt
 *
 * @param name - Agent name (e.g., "yoyo-ai", "oracle")
 * @param overrides - Optional config overrides (applied on top of merged config)
 * @returns Loaded agent with system prompt
 * @throws Error if agent not found or system prompt missing
 */
export async function loadAgent(
  name: string,
  overrides?: Partial<AgentConfig>
): Promise<LoadedAgent> {
  // Ensure config is initialized
  await ensureConfigInitialized();

  // Get agent config (may be merged or builtin)
  const baseConfig = getAgent(name);
  if (!baseConfig) {
    throw new Error(`Agent not found: ${name}`);
  }

  // Merge with overrides
  const config: AgentConfig = {
    ...baseConfig,
    ...overrides,
  };

  // Validate merged config
  const errors = validateAgentConfig(config);
  if (errors.length > 0) {
    throw new Error(
      `Invalid agent configuration for ${name}:\n${errors.join("\n")}`
    );
  }

  // Load system prompt
  const systemPrompt = loadSystemPrompt(config.systemPromptPath);

  // Resolve tool access (wildcards and negations)
  const resolvedTools = resolveToolAccess(config.tools);

  // Return loaded agent
  const loadedAgent: LoadedAgent = {
    ...config,
    systemPrompt,
    resolvedTools,
  };

  return loadedAgent;
}

/**
 * Load an agent using only builtin config (ignores overrides)
 *
 * @param name - Agent name
 * @param overrides - Optional config overrides
 * @returns Loaded agent with system prompt
 */
export async function loadBuiltinAgent(
  name: string,
  overrides?: Partial<AgentConfig>
): Promise<LoadedAgent> {
  const baseConfig = getBuiltinAgent(name);
  if (!baseConfig) {
    throw new Error(`Builtin agent not found: ${name}`);
  }

  const config: AgentConfig = {
    ...baseConfig,
    ...overrides,
  };

  const errors = validateAgentConfig(config);
  if (errors.length > 0) {
    throw new Error(
      `Invalid agent configuration for ${name}:\n${errors.join("\n")}`
    );
  }

  const systemPrompt = loadSystemPrompt(config.systemPromptPath);
  const resolvedTools = resolveToolAccess(config.tools);

  return {
    ...config,
    systemPrompt,
    resolvedTools,
  };
}

/**
 * Load system prompt from file
 *
 * @param path - Path to system prompt markdown file
 * @returns System prompt content
 * @throws Error if file not found or unreadable
 */
function loadSystemPrompt(path: string): string {
  const absolutePath = resolve(process.cwd(), path);

  if (!existsSync(absolutePath)) {
    throw new Error(`System prompt file not found: ${path}`);
  }

  try {
    const content = readFileSync(absolutePath, "utf-8");
    if (!content || content.trim() === "") {
      throw new Error(`System prompt file is empty: ${path}`);
    }
    return content;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`System prompt file not found: ${path}`);
    }
    throw new Error(
      `Failed to load system prompt from ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Resolve tool access with wildcards and negations
 *
 * @param tools - Tool access list (supports wildcards and negations)
 * @returns Resolved tool list
 *
 * @example
 * resolveToolAccess(["*"]) // All tools
 * resolveToolAccess(["Read", "Write", "Grep"]) // Specific tools
 * resolveToolAccess(["*", "!Bash", "!Write"]) // All except Bash and Write
 * resolveToolAccess(["mcp__playwright__*"]) // All playwright tools
 */
function resolveToolAccess(tools: string[]): string[] {
  // If wildcard "*" is present, it means all tools
  const hasWildcard = tools.includes("*");

  // Extract negations (tools starting with "!")
  const negations = tools
    .filter((tool) => tool.startsWith("!"))
    .map((tool) => tool.substring(1));

  // Extract positive tools (not starting with "!")
  const positiveTool = tools.filter((tool) => !tool.startsWith("!"));

  if (hasWildcard) {
    // "*" means all tools, but we return ["*"] with negations applied
    // The actual tool resolution happens at runtime
    return ["*", ...negations.map((n) => `!${n}`)];
  }

  // Return positive tools (negations don't apply without wildcard)
  return positiveTool;
}

/**
 * Check if a tool is allowed based on resolved tool access
 *
 * @param toolName - Tool name to check
 * @param resolvedTools - Resolved tool access list from loadAgent
 * @returns True if tool is allowed, false otherwise
 *
 * @example
 * isToolAllowed("Read", ["*", "!Bash"]) // true
 * isToolAllowed("Bash", ["*", "!Bash"]) // false
 * isToolAllowed("Read", ["Read", "Write"]) // true
 * isToolAllowed("Bash", ["Read", "Write"]) // false
 */
export function isToolAllowed(
  toolName: string,
  resolvedTools: string[]
): boolean {
  const hasWildcard = resolvedTools.includes("*");
  const negations = resolvedTools
    .filter((tool) => tool.startsWith("!"))
    .map((tool) => tool.substring(1));

  if (hasWildcard) {
    // Check if tool is in negations
    if (negations.includes(toolName)) {
      return false;
    }

    // Check if tool matches any negation pattern (e.g., mcp__*)
    for (const negation of negations) {
      if (negation.includes("*")) {
        const pattern = negation.replace(/\*/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(toolName)) {
          return false;
        }
      }
    }

    // Tool is allowed (wildcard and not negated)
    return true;
  }

  // No wildcard: check if tool is explicitly listed
  const positiveTools = resolvedTools.filter((tool) => !tool.startsWith("!"));

  // Exact match
  if (positiveTools.includes(toolName)) {
    return true;
  }

  // Pattern match (e.g., mcp__playwright__*)
  for (const tool of positiveTools) {
    if (tool.includes("*")) {
      const pattern = tool.replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(toolName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Load all enabled agents
 *
 * @returns Array of loaded agents
 */
export async function loadAllAgents(): Promise<LoadedAgent[]> {
  // Ensure config is initialized
  await ensureConfigInitialized();

  const { getEnabledAgents } = await import("./registry.js");
  const enabledAgents = getEnabledAgents();

  const loadedAgents: LoadedAgent[] = [];

  for (const agent of enabledAgents) {
    try {
      const loaded = await loadAgent(
        agent.name.toLowerCase().replace(/\s+/g, "-")
      );
      loadedAgents.push(loaded);
    } catch (error) {
      // Log error but continue with other agents
      console.warn(
        `Failed to load agent ${agent.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return loadedAgents;
}

/**
 * Preload an agent's system prompt into memory
 * Useful for reducing latency on first agent call
 *
 * @param name - Agent name to preload
 */
export async function preloadAgent(name: string): Promise<void> {
  await loadAgent(name);
}

/**
 * Preload all enabled agents
 * Useful for reducing latency on first agent calls
 */
export async function preloadAllAgents(): Promise<void> {
  await loadAllAgents();
}

// =============================================================================
// Merged Config Utilities
// =============================================================================

/**
 * Check if an agent config is a merged config
 */
export function isMergedConfig(
  config: AgentConfig | MergedAgentConfig
): config is MergedAgentConfig {
  return "sources" in config && Array.isArray(config.sources);
}

/**
 * Get the source of a specific property in a merged config
 *
 * @param config - Merged agent config
 * @param property - Property name
 * @returns Source of the property value
 */
export function getPropertySource(
  config: MergedAgentConfig,
  property: keyof AgentConfig
): string {
  return config.propertySource[property] ?? "unknown";
}
