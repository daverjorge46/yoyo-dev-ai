/**
 * background_output Tool
 *
 * Retrieve output from background tasks.
 * Supports both blocking (wait for completion) and non-blocking (current status) modes.
 */

import { backgroundManager } from "../services/background/manager.js";
import { formatTaskProgress } from "../services/background/polling.js";
import type { BackgroundTask } from "../services/background/task.js";

/**
 * Background output input
 */
export interface BackgroundOutputInput {
  /** Task ID to retrieve output from */
  task_id: string;

  /** Whether to block until task completes (default: true) */
  block?: boolean;

  /** Timeout for blocking mode in milliseconds (default: 60000) */
  timeout?: number;
}

/**
 * Background output result
 */
export interface BackgroundOutputResult {
  /** Task ID */
  taskId: string;

  /** Task name */
  name: string;

  /** Current status */
  status: "queued" | "running" | "idle" | "completed" | "error";

  /** Task progress information */
  progress: {
    /** Number of tool calls made */
    toolCalls: number;

    /** Last tool that was called */
    lastTool: string;

    /** Last message from agent */
    lastMessage: string;

    /** Last update time (ISO string) */
    lastUpdate: string;
  };

  /** Task result (when completed) */
  result?: string;

  /** Error message (when failed) */
  error?: string;

  /** Whether task is still running */
  isRunning: boolean;

  /** Whether task is complete */
  isComplete: boolean;

  /** Duration in seconds */
  duration: number;
}

/**
 * Retrieve background task output
 *
 * @param input - Background output input
 * @returns Task output result
 * @throws Error if task not found or timeout exceeded
 */
export async function backgroundOutput(
  input: BackgroundOutputInput
): Promise<BackgroundOutputResult> {
  // 1. Validate input
  if (!input.task_id || input.task_id.trim() === "") {
    throw new Error("Task ID is required");
  }

  // 2. Get task status
  const taskStatus = backgroundManager.getTaskStatus(input.task_id);
  if (!taskStatus) {
    throw new Error(`Task '${input.task_id}' not found`);
  }

  const { task } = taskStatus;

  // 3. Blocking mode: wait for completion
  const block = input.block !== false; // Default true
  if (block && !taskStatus.isComplete && !taskStatus.isFailed) {
    const timeout = input.timeout || 60000; // Default 60s
    await waitForTaskCompletion(task, timeout);

    // Refresh task status after waiting
    const updatedStatus = backgroundManager.getTaskStatus(
      input.task_id
    );
    if (updatedStatus) {
      return formatTaskOutput(updatedStatus.task);
    }
  }

  // 4. Return current status
  return formatTaskOutput(task);
}

/**
 * Wait for task to complete
 *
 * @param task - Task to wait for
 * @param timeout - Timeout in milliseconds
 * @throws Error if timeout exceeded
 */
async function waitForTaskCompletion(
  task: BackgroundTask,
  timeout: number
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 1000; // Poll every 1 second

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      // Check if task is complete
      if (
        task.status === "completed" ||
        task.status === "error"
      ) {
        clearInterval(interval);
        resolve();
        return;
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        clearInterval(interval);
        reject(
          new Error(
            `Timeout waiting for task '${task.name}' to complete (${timeout}ms)`
          )
        );
        return;
      }
    }, pollInterval);
  });
}

/**
 * Format task output for response
 *
 * @param task - Background task
 * @returns Formatted output result
 */
function formatTaskOutput(
  task: BackgroundTask
): BackgroundOutputResult {
  const duration = Date.now() - task.startTime.getTime();
  const durationSeconds = Math.floor(duration / 1000);

  return {
    taskId: task.id,
    name: task.name,
    status: task.status,
    progress: {
      toolCalls: task.progress.toolCalls,
      lastTool: task.progress.lastTool,
      lastMessage: task.progress.lastMessage,
      lastUpdate: task.progress.lastUpdate.toISOString(),
    },
    result: task.result,
    error: task.error,
    isRunning:
      task.status === "running" || task.status === "queued",
    isComplete: task.status === "completed",
    duration: durationSeconds,
  };
}

/**
 * Get output from multiple background tasks
 *
 * @param taskIds - Array of task IDs
 * @param block - Whether to block for all tasks
 * @param timeout - Timeout per task in milliseconds
 * @returns Array of task output results
 */
export async function backgroundOutputBatch(
  taskIds: string[],
  block: boolean = false,
  timeout: number = 60000
): Promise<BackgroundOutputResult[]> {
  return Promise.all(
    taskIds.map((taskId) =>
      backgroundOutput({ task_id: taskId, block, timeout })
    )
  );
}

/**
 * Get all background task statuses
 *
 * @returns Array of all task outputs
 */
export function getAllBackgroundOutputs(): BackgroundOutputResult[] {
  const allTasks = backgroundManager.getAllTasks();
  return allTasks.map((task) => formatTaskOutput(task));
}

/**
 * Get active background task statuses
 *
 * @returns Array of active task outputs
 */
export function getActiveBackgroundOutputs(): BackgroundOutputResult[] {
  const activeTasks = backgroundManager.getActiveTasks();
  return activeTasks.map((task) => formatTaskOutput(task));
}

/**
 * Format task output as human-readable string
 *
 * @param output - Task output result
 * @returns Formatted string
 */
export function formatBackgroundOutput(
  output: BackgroundOutputResult
): string {
  const lines: string[] = [];

  lines.push(`Task: ${output.name} (${output.taskId})`);
  lines.push(`Status: ${output.status}`);
  lines.push(`Duration: ${output.duration}s`);

  if (output.progress.toolCalls > 0) {
    lines.push(`Tool calls: ${output.progress.toolCalls}`);
    if (output.progress.lastTool) {
      lines.push(`Last tool: ${output.progress.lastTool}`);
    }
  }

  if (output.isComplete && output.result) {
    lines.push("");
    lines.push("Result:");
    lines.push(output.result);
  }

  if (output.error) {
    lines.push("");
    lines.push(`Error: ${output.error}`);
  }

  if (output.isRunning) {
    lines.push("");
    lines.push("Task is still running. Use block=true to wait for completion.");
  }

  return lines.join("\n");
}
