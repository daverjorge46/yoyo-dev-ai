/**
 * background_task Tool
 *
 * Launch background tasks for parallel agent execution.
 * Returns immediately with task ID while agent executes in background.
 */

import { backgroundManager } from "../services/background/manager.js";
import { hasAgent } from "../agents/registry.js";

/**
 * Background task input
 */
export interface BackgroundTaskInput {
  /** Agent to execute task */
  agent: string;

  /** Task prompt/instruction */
  prompt: string;

  /** Display name for task */
  name: string;

  /** Parent session ID (automatically provided by runtime) */
  parentSessionId?: string;

  /** Whether to send notification on completion (default: true) */
  notify?: boolean;
}

/**
 * Background task output
 */
export interface BackgroundTaskOutput {
  /** Task ID for tracking */
  taskId: string;

  /** Task display name */
  name: string;

  /** Message to user */
  message: string;
}

/**
 * Launch a background task
 *
 * @param input - Background task input
 * @returns Task ID and status message
 * @throws Error if validation fails
 */
export async function backgroundTask(
  input: BackgroundTaskInput
): Promise<BackgroundTaskOutput> {
  // 1. Validate input
  validateInput(input);

  // 2. Check agent exists
  if (!hasAgent(input.agent)) {
    throw new Error(
      `Agent '${input.agent}' not found. Available agents: yoyo-ai, oracle, librarian, explore, frontend-engineer, document-writer`
    );
  }

  // 3. Validate parent session ID
  const parentSessionId =
    input.parentSessionId || getCurrentSessionId();
  if (!parentSessionId) {
    throw new Error(
      "Parent session ID required but not provided"
    );
  }

  // 4. Launch background task
  const taskId = await backgroundManager.launch({
    agent: input.agent,
    prompt: input.prompt,
    name: input.name,
    parentSessionId,
    notify: input.notify !== false, // Default true
  });

  // 5. Return task ID immediately
  return {
    taskId,
    name: input.name,
    message: `Background task "${input.name}" launched successfully. Task ID: ${taskId}\n\nYou can continue working while the agent executes in the background. You will be notified when complete.`,
  };
}

/**
 * Validate background task input
 *
 * @param input - Input to validate
 * @throws Error if validation fails
 */
function validateInput(input: BackgroundTaskInput): void {
  const errors: string[] = [];

  if (!input.agent || input.agent.trim() === "") {
    errors.push("Agent name is required");
  }

  if (!input.prompt || input.prompt.trim() === "") {
    errors.push("Prompt is required");
  }

  if (!input.name || input.name.trim() === "") {
    errors.push("Task name is required");
  }

  if (input.name && input.name.length > 100) {
    errors.push("Task name must be 100 characters or less");
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid background task input:\n${errors.join("\n")}`
    );
  }
}

/**
 * Get current session ID (placeholder for runtime integration)
 *
 * @returns Current session ID
 */
function getCurrentSessionId(): string | null {
  // TODO: Integrate with Claude Code SDK to get current session ID
  // return claudeCode.getCurrentSessionId()

  return null; // Placeholder
}

/**
 * Launch multiple background tasks in parallel
 *
 * @param tasks - Array of background task inputs
 * @returns Array of task outputs
 */
export async function backgroundTaskBatch(
  tasks: BackgroundTaskInput[]
): Promise<BackgroundTaskOutput[]> {
  return Promise.all(tasks.map((task) => backgroundTask(task)));
}

/**
 * Get background task launch examples
 *
 * @returns Example usage strings
 */
export function getBackgroundTaskExamples(): string[] {
  return [
    // Research example
    `backgroundTask({
  agent: "librarian",
  name: "Research Convex Auth",
  prompt: "Research Convex authentication best practices and Clerk integration examples"
})`,

    // Exploration example
    `backgroundTask({
  agent: "explore",
  name: "Find Auth Patterns",
  prompt: "Find all authentication patterns in the codebase, including middleware, protected routes, and session handling"
})`,

    // Documentation example
    `backgroundTask({
  agent: "document-writer",
  name: "Update Auth Docs",
  prompt: "Create comprehensive README for the authentication module in src/auth/ with setup instructions and examples"
})`,
  ];
}
