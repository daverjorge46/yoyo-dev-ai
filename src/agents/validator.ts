/**
 * Agent Validator
 *
 * Comprehensive validation for agent configurations, including:
 * - Cycle detection (A→B→A prevention)
 * - Tool access conflict detection
 * - System prompt file existence
 * - Configuration consistency checks
 */

import { existsSync } from "fs";
import { resolve } from "path";
import type { AgentConfig, ValidationResult } from "./types.js";
import { validateAgentConfig } from "./registry.js";

/**
 * Validate a single agent configuration comprehensively
 *
 * @param agent - Agent configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateAgent(agent: AgentConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation from registry
  const basicErrors = validateAgentConfig(agent);
  errors.push(...basicErrors);

  // System prompt file existence
  const promptPath = resolve(process.cwd(), agent.systemPromptPath);
  if (!existsSync(promptPath)) {
    errors.push(`System prompt file not found: ${agent.systemPromptPath}`);
  }

  // Tool access validation
  const toolValidation = validateToolAccess(agent.tools);
  errors.push(...(toolValidation.errors || []));
  warnings.push(...(toolValidation.warnings || []));

  // Model configuration validation
  if (agent.preferFallback && !agent.fallbackModel) {
    warnings.push(
      `Agent '${agent.name}' prefers fallback but no fallbackModel specified`
    );
  }

  if (agent.fallbackOnRateLimit && !agent.fallbackModel) {
    warnings.push(
      `Agent '${agent.name}' has fallbackOnRateLimit enabled but no fallbackModel specified`
    );
  }

  // Primary agent validation
  if (agent.mode === "primary") {
    if (agent.tools[0] !== "*") {
      warnings.push(
        `Primary agent '${agent.name}' should have full tool access ("*")`
      );
    }
  }

  // Subagent validation
  if (agent.mode === "subagent") {
    if (agent.tools.includes("*") && agent.tools.length === 1) {
      warnings.push(
        `Subagent '${agent.name}' has unrestricted tool access - consider limiting tools for security`
      );
    }
  }

  // Temperature sanity checks
  if (agent.temperature === 0) {
    warnings.push(
      `Agent '${agent.name}' has temperature 0 - may produce very deterministic outputs`
    );
  }

  if (agent.temperature === 1.0 && agent.mode === "subagent") {
    warnings.push(
      `Subagent '${agent.name}' has temperature 1.0 - high creativity may reduce reliability`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate tool access configuration
 *
 * @param tools - Tool access list
 * @returns Validation result
 */
function validateToolAccess(tools: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty tools
  if (tools.length === 0) {
    errors.push("Tool access list cannot be empty");
    return { valid: false, errors, warnings };
  }

  // Check for contradictions
  const hasWildcard = tools.includes("*");
  const positiveTools = tools.filter((tool) => !tool.startsWith("!"));
  const negations = tools
    .filter((tool) => tool.startsWith("!"))
    .map((tool) => tool.substring(1));

  // Wildcard with positive tools is redundant
  if (hasWildcard && positiveTools.length > 1) {
    warnings.push(
      'Wildcard "*" makes other positive tool grants redundant - use negations instead'
    );
  }

  // Negations without wildcard are useless
  if (!hasWildcard && negations.length > 0) {
    warnings.push(
      "Tool negations (!) are only effective with wildcard (*) access"
    );
  }

  // Check for duplicate tools
  const toolSet = new Set(tools);
  if (toolSet.size !== tools.length) {
    warnings.push("Duplicate tools in access list");
  }

  // Check for conflicting grants
  for (const negation of negations) {
    if (positiveTools.includes(negation)) {
      errors.push(
        `Tool '${negation}' is both granted and negated - conflicting access`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Detect cycles in agent delegation graph
 *
 * @param agents - All agent configurations
 * @returns Validation result with detected cycles
 */
export function detectAgentCycles(
  agents: AgentConfig[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build adjacency list of agent calls
  const graph = new Map<string, Set<string>>();

  for (const agent of agents) {
    graph.set(agent.name, new Set());

    // Check if agent has call_agent tool access
    const canCallAgents =
      agent.tools.includes("*") ||
      agent.tools.includes("call_agent") ||
      agent.tools.some((tool) => tool.includes("call_agent"));

    if (canCallAgents) {
      // Agent can potentially call other agents
      // We can't detect exact calls without runtime analysis,
      // but we can warn about potential cycles
      const otherAgents = agents.filter((a) => a.name !== agent.name);
      for (const other of otherAgents) {
        graph.get(agent.name)?.add(other.name);
      }
    }
  }

  // Perform cycle detection using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string, path: string[] = []): string[] | null {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = hasCycle(neighbor, [...path]);
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        return [...path, neighbor];
      }
    }

    recursionStack.delete(node);
    return null;
  }

  for (const agent of agents) {
    if (!visited.has(agent.name)) {
      const cycle = hasCycle(agent.name);
      if (cycle) {
        const cycleStr = cycle.join(" → ");
        errors.push(`Agent delegation cycle detected: ${cycleStr}`);
      }
    }
  }

  // Check for agents that can call themselves
  for (const agent of agents) {
    const canCallAgents =
      agent.tools.includes("*") || agent.tools.includes("call_agent");

    if (canCallAgents && !agent.tools.includes("!call_agent")) {
      warnings.push(
        `Agent '${agent.name}' can call agents - ensure no self-delegation in system prompt`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate multiple agents together (cross-agent validation)
 *
 * @param agents - Array of agent configurations to validate
 * @returns Combined validation result
 */
export function validateAgents(agents: AgentConfig[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each agent individually
  for (const agent of agents) {
    const result = validateAgent(agent);
    if (!result.valid) {
      errors.push(
        `Agent '${agent.name}': ${result.errors.join(", ")}`
      );
    }
    if (result.warnings && result.warnings.length > 0) {
      warnings.push(
        `Agent '${agent.name}': ${result.warnings.join(", ")}`
      );
    }
  }

  // Check for duplicate agent names
  const names = agents.map((a) => a.name);
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    errors.push("Duplicate agent names detected");
  }

  // Check for exactly one primary agent
  const primaryAgents = agents.filter((a) => a.mode === "primary");
  if (primaryAgents.length === 0) {
    errors.push("No primary agent defined - at least one required");
  } else if (primaryAgents.length > 1) {
    const primaryNames = primaryAgents.map((a) => a.name).join(", ");
    errors.push(
      `Multiple primary agents defined: ${primaryNames} - only one allowed`
    );
  }

  // Detect cycles in agent delegation
  const cycleResult = detectAgentCycles(agents);
  errors.push(...cycleResult.errors);
  if (cycleResult.warnings) {
    warnings.push(...cycleResult.warnings);
  }

  // Check model consistency
  const models = new Set(agents.map((a) => a.model));
  const fallbackModels = new Set(
    agents.map((a) => a.fallbackModel).filter(Boolean)
  );

  if (models.size > 2) {
    warnings.push(
      `Multiple primary models in use: ${Array.from(models).join(", ")} - consider standardizing`
    );
  }

  if (fallbackModels.size > 1) {
    warnings.push(
      `Multiple fallback models in use: ${Array.from(fallbackModels).join(", ")} - consider standardizing`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate agent system at startup
 * Checks all enabled agents for configuration issues
 *
 * @param agents - All enabled agent configurations
 * @throws Error if validation fails with critical errors
 */
export function validateAgentSystem(agents: AgentConfig[]): void {
  const result = validateAgents(agents);

  if (!result.valid) {
    const errorMessage = [
      "Agent system validation failed:",
      ...result.errors.map((e) => `  - ${e}`),
    ].join("\n");

    throw new Error(errorMessage);
  }

  // Log warnings if present
  if (result.warnings && result.warnings.length > 0) {
    console.warn("Agent system validation warnings:");
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }
}
