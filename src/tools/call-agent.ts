/**
 * call_agent Tool
 *
 * @deprecated As of v5.1, use the Task tool with subagent_type instead.
 *
 * This tool was designed for Claude Code SDK integration which is not yet
 * available. Use instruction-based orchestration with the Task tool instead.
 *
 * Migration Guide:
 * ----------------
 * BEFORE (call_agent - DEPRECATED):
 * ```typescript
 * await callAgent({
 *   agent: "arthas-oracle",
 *   prompt: "Debug this failure..."
 * })
 * ```
 *
 * AFTER (Task tool - RECOMMENDED):
 * ```typescript
 * Task({
 *   subagent_type: "general-purpose",
 *   description: "Debug failure",
 *   prompt: `You are Arthas-Oracle, the strategic advisor.
 *     Debug this failure...
 *     Prefix all output with [arthas-oracle]`
 * })
 * ```
 *
 * Available agents and their prefixes:
 * - yoyo-ai [yoyo-ai] - Primary orchestrator
 * - arthas-oracle [arthas-oracle] - Strategic advisor, failure analysis
 * - alma-librarian [alma-librarian] - External research, documentation
 * - alvaro-explore [alvaro-explore] - Codebase search, pattern matching
 * - dave-engineer [dave-engineer] - UI/UX, frontend development
 * - angeles-writer [angeles-writer] - Technical documentation
 *
 * See: .yoyo-dev/instructions/core/yoyo-ai-orchestration.md for full details.
 */

import type {
  CallAgentOptions,
  CallAgentResult,
  AgentError,
  ExecutionMetadata,
} from "../agents/types.js";
import { loadAgent } from "../agents/loader.js";
import { validateAgent } from "../agents/validator.js";

/**
 * Call another agent with a specific task
 *
 * @deprecated Use Task tool with subagent_type instead. See module JSDoc for migration guide.
 *
 * @param options - Agent call options
 * @returns Agent call result with response and metadata
 * @throws Error - Always throws as Claude Code SDK is not available
 */
export async function callAgent(
  options: CallAgentOptions
): Promise<CallAgentResult> {
  const startTime = Date.now();

  try {
    // 1. Load target agent configuration
    const agent = await loadAgent(options.agent, {
      tools: options.tools, // Override tools if specified
    });

    // 2. Validate agent configuration
    const validation = validateAgent(agent);
    if (!validation.valid) {
      throw createAgentError(
        "INVALID_CONFIG",
        `Agent configuration invalid: ${validation.errors.join(", ")}`,
        { agent: options.agent, errors: validation.errors }
      );
    }

    // 3. Apply timeout (default: 120 seconds)
    const timeout = options.timeout || 120000;

    // 4. Create isolated session for agent execution
    // TODO: Integrate with Claude Code SDK to create isolated session
    // For now, this is a placeholder that shows the intended structure
    const sessionResult = await executeAgentSession({
      agent,
      prompt: options.prompt,
      timeout,
      format: options.format,
      model: options.model,
    });

    // 5. Collect execution metadata
    const endTime = Date.now();
    const metadata: ExecutionMetadata = {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: endTime - startTime,
      tokenUsage: sessionResult.tokenUsage,
      toolsUsed: sessionResult.toolsUsed,
      modelUsed: sessionResult.modelUsed,
      usedFallback: sessionResult.usedFallback,
    };

    // 6. Return structured result
    return {
      agent: options.agent,
      response: sessionResult.response,
      metadata,
    };
  } catch (error) {
    // Handle errors gracefully
    const endTime = Date.now();
    const metadata: ExecutionMetadata = {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: endTime - startTime,
    };

    const agentError = isAgentError(error)
      ? error
      : createAgentError(
          "UNKNOWN_ERROR",
          error instanceof Error ? error.message : String(error),
          { originalError: error }
        );

    return {
      agent: options.agent,
      response: "",
      metadata,
      error: agentError,
    };
  }
}

/**
 * Execute agent session (placeholder for Claude Code SDK integration)
 *
 * @param params - Session execution parameters
 * @returns Session execution result
 */
async function executeAgentSession(_params: {
  agent: any;
  prompt: string;
  timeout: number;
  format?: "json" | "markdown";
  model?: string;
}): Promise<{
  response: string;
  tokenUsage?: { input: number; output: number; total: number };
  toolsUsed?: string[];
  modelUsed?: string;
  usedFallback?: boolean;
}> {
  // DEPRECATED: Claude Code SDK is not available
  //
  // Use the Task tool with instruction-based orchestration instead:
  //
  // Task({
  //   subagent_type: "general-purpose",
  //   description: "Agent task description",
  //   prompt: `You are [Agent Name]...
  //     Your task: ${params.prompt}
  //     Prefix all output with [agent-name]`
  // })
  //
  // See .yoyo-dev/instructions/core/yoyo-ai-orchestration.md for details.

  console.warn(
    "\x1b[33m[DEPRECATED] call_agent tool is deprecated.\x1b[0m\n" +
    "Use the Task tool with subagent_type instead.\n" +
    "See: .yoyo-dev/instructions/core/yoyo-ai-orchestration.md\n" +
    "\n" +
    "Example migration:\n" +
    "  Task({\n" +
    "    subagent_type: \"general-purpose\",\n" +
    "    description: \"Agent task\",\n" +
    "    prompt: `You are Arthas-Oracle...\\n" +
    "      Prefix all output with [arthas-oracle]`\n" +
    "  })"
  );

  throw new Error(
    "[DEPRECATED] call_agent tool is deprecated as of v5.1.\n\n" +
    "Claude Code SDK integration is not available.\n" +
    "Use the Task tool with instruction-based orchestration instead.\n\n" +
    "Migration:\n" +
    "  BEFORE: callAgent({ agent: 'arthas-oracle', prompt: '...' })\n" +
    "  AFTER:  Task({ subagent_type: 'general-purpose', prompt: 'You are Arthas-Oracle...' })\n\n" +
    "See: .yoyo-dev/instructions/core/yoyo-ai-orchestration.md"
  );
}

/**
 * Create an agent error
 *
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns Agent error object
 */
function createAgentError(
  code: AgentError["code"],
  message: string,
  details?: Record<string, unknown>
): AgentError {
  return {
    code,
    message,
    details,
  };
}

/**
 * Check if error is an AgentError
 *
 * @param error - Error to check
 * @returns True if AgentError, false otherwise
 */
function isAgentError(error: unknown): error is AgentError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

/**
 * Call agent with automatic retry on rate limit
 *
 * @deprecated Use Task tool with subagent_type instead. See module JSDoc for migration guide.
 *
 * @param options - Agent call options
 * @param maxRetries - Maximum retry attempts (default: 1)
 * @param retryDelay - Delay between retries in ms (default: 2000)
 * @returns Agent call result
 */
export async function callAgentWithRetry(
  options: CallAgentOptions,
  maxRetries: number = 1,
  retryDelay: number = 2000
): Promise<CallAgentResult> {
  let lastError: AgentError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await callAgent(options);

    // If successful, return immediately
    if (!result.error) {
      return result;
    }

    // If rate limited and retries remaining, wait and retry
    if (result.error.code === "RATE_LIMIT" && attempt < maxRetries) {
      lastError = result.error;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      continue;
    }

    // For other errors, return immediately
    return result;
  }

  // All retries exhausted
  throw new Error(
    `Agent call failed after ${maxRetries} retries: ${lastError?.message}`
  );
}

/**
 * Call multiple agents in parallel
 *
 * @deprecated Use multiple Task tool calls in a single message instead.
 *
 * @param calls - Array of agent call options
 * @returns Array of agent call results
 */
export async function callAgentsParallel(
  calls: CallAgentOptions[]
): Promise<CallAgentResult[]> {
  return Promise.all(calls.map((call) => callAgent(call)));
}

/**
 * Call agents sequentially (for dependent operations)
 *
 * @deprecated Use sequential Task tool calls instead.
 *
 * @param calls - Array of agent call options
 * @returns Array of agent call results
 */
export async function callAgentsSequential(
  calls: CallAgentOptions[]
): Promise<CallAgentResult[]> {
  const results: CallAgentResult[] = [];

  for (const call of calls) {
    const result = await callAgent(call);
    results.push(result);

    // Stop if an error occurred
    if (result.error) {
      break;
    }
  }

  return results;
}
