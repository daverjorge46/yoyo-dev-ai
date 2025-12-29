/**
 * Agent Loader
 *
 * Loads agent configurations and system prompts from files.
 * Handles tool access control resolution (wildcards and negations).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { AgentConfig, LoadedAgent } from "./types.js";
import { getAgent, validateAgentConfig } from "./registry.js";

/**
 * Load an agent configuration with system prompt
 *
 * @param name - Agent name (e.g., "yoyo-ai", "oracle")
 * @param overrides - Optional config overrides
 * @returns Loaded agent with system prompt
 * @throws Error if agent not found or system prompt missing
 */
export async function loadAgent(
  name: string,
  overrides?: Partial<AgentConfig>
): Promise<LoadedAgent> {
  // Get base agent config from registry
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
 * @param availableTools - List of all available tools in the system
 * @returns True if tool is allowed, false otherwise
 *
 * @example
 * isToolAllowed("Read", ["*", "!Bash"], allTools) // true
 * isToolAllowed("Bash", ["*", "!Bash"], allTools) // false
 * isToolAllowed("Read", ["Read", "Write"], allTools) // true
 * isToolAllowed("Bash", ["Read", "Write"], allTools) // false
 */
export function isToolAllowed(
  toolName: string,
  resolvedTools: string[],
  availableTools: string[]
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
  const { getEnabledAgents } = await import("./registry.js");
  const enabledAgents = getEnabledAgents();

  const loadedAgents = await Promise.all(
    enabledAgents.map((agent) => loadAgent(agent.name))
  );

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
