/**
 * call_agent Tool
 *
 * Enables agent-to-agent communication for task delegation.
 * Creates isolated sessions with tool restrictions and timeout handling.
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
 * @param options - Agent call options
 * @returns Agent call result with response and metadata
 * @throws Error if agent not found, invalid config, or execution fails
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
  // TODO: Integrate with Claude Code SDK
  // This is a placeholder implementation showing the expected interface
  //
  // const session = await claudeCode.createSession({
  //   systemPrompt: params.agent.systemPrompt,
  //   model: params.model || params.agent.model,
  //   temperature: params.agent.temperature,
  //   tools: params.agent.resolvedTools,
  //   timeout: params.timeout
  // })
  //
  // const response = await session.execute(params.prompt)
  //
  // return {
  //   response: response.content,
  //   tokenUsage: response.usage,
  //   toolsUsed: response.toolCalls.map(tc => tc.name),
  //   modelUsed: response.model,
  //   usedFallback: response.model !== params.agent.model
  // }

  throw new Error(
    "Claude Code SDK integration not yet implemented. This is a Phase 2 task placeholder."
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
