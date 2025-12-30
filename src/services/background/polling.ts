/**
 * Background Task Polling
 *
 * Handles periodic polling of background tasks to update status and progress.
 */

import type { BackgroundTask } from "./task.js";

/**
 * Poll result for a single task
 */
export interface PollResult {
  /** Task ID */
  taskId: string;

  /** Whether task status changed */
  statusChanged: boolean;

  /** Whether task is now complete */
  isComplete: boolean;

  /** Whether task is now idle */
  isIdle: boolean;

  /** Whether task has incomplete todos */
  hasIncompleteTodos: boolean;
}

/**
 * Polling configuration
 */
export interface PollingConfig {
  /** Polling interval in milliseconds */
  interval: number;

  /** Idle timeout in milliseconds */
  idleTimeout: number;

  /** Whether to check for incomplete todos */
  checkTodos: boolean;
}

/**
 * Default polling configuration
 */
const DEFAULT_CONFIG: PollingConfig = {
  interval: 2000, // 2 seconds
  idleTimeout: 300000, // 5 minutes
  checkTodos: true,
};

/**
 * Poll a single background task
 *
 * @param task - Task to poll
 * @param config - Polling configuration
 * @returns Poll result
 */
export async function pollTask(
  task: BackgroundTask,
  config: PollingConfig = DEFAULT_CONFIG
): Promise<PollResult> {
  const previousStatus = task.status;

  // TODO: Integrate with Claude Code SDK to query session status
  // const sessionStatus = await claudeCode.getSessionStatus(task.id)
  //
  // // Update task progress
  // task.progress.toolCalls = sessionStatus.toolCalls.length
  // task.progress.lastTool = sessionStatus.lastTool || task.progress.lastTool
  // task.progress.lastMessage = sessionStatus.lastMessage || task.progress.lastMessage
  // task.progress.lastUpdate = new Date()
  //
  // // Update task status based on session
  // if (sessionStatus.isComplete) {
  //   task.status = "completed"
  //   task.result = sessionStatus.result
  // } else if (sessionStatus.hasError) {
  //   task.status = "error"
  //   task.error = sessionStatus.error
  // } else if (sessionStatus.isIdle) {
  //   task.status = "idle"
  // } else {
  //   task.status = "running"
  // }

  // Check for idle timeout
  const idleTime = Date.now() - task.progress.lastUpdate.getTime();
  const isIdle =
    idleTime > config.idleTimeout && task.status === "running";

  if (isIdle) {
    task.status = "idle";
  }

  // Update last update time
  task.lastUpdate = new Date();

  // Check for incomplete todos
  let hasIncompleteTodos = false;
  if (config.checkTodos) {
    hasIncompleteTodos = await checkIncompleteTodos(task);
  }

  return {
    taskId: task.id,
    statusChanged: previousStatus !== task.status,
    isComplete: task.status === "completed",
    isIdle: task.status === "idle",
    hasIncompleteTodos,
  };
}

/**
 * Check if task has incomplete todos
 *
 * @param task - Task to check
 * @returns True if incomplete todos exist
 */
async function checkIncompleteTodos(
  _task: BackgroundTask
): Promise<boolean> {
  // TODO: Integrate with Claude Code SDK to query todo status
  // const todos = await claudeCode.getTodos(task.id)
  // return todos.some(t => t.status === "pending" || t.status === "in_progress")

  return false; // Placeholder
}

/**
 * Poll multiple tasks
 *
 * @param tasks - Tasks to poll
 * @param config - Polling configuration
 * @returns Poll results for all tasks
 */
export async function pollTasks(
  tasks: BackgroundTask[],
  config: PollingConfig = DEFAULT_CONFIG
): Promise<PollResult[]> {
  return Promise.all(
    tasks.map((task) => pollTask(task, config))
  );
}

/**
 * Detect tasks that should be marked as idle
 *
 * @param tasks - Tasks to check
 * @param idleTimeout - Idle timeout in milliseconds
 * @returns Array of task IDs that are idle
 */
export function detectIdleTasks(
  tasks: BackgroundTask[],
  idleTimeout: number = DEFAULT_CONFIG.idleTimeout
): string[] {
  const now = Date.now();
  const idleTaskIds: string[] = [];

  for (const task of tasks) {
    if (task.status !== "running") {
      continue;
    }

    const lastActivity = task.progress.lastUpdate.getTime();
    const idleTime = now - lastActivity;

    if (idleTime > idleTimeout) {
      idleTaskIds.push(task.id);
    }
  }

  return idleTaskIds;
}

/**
 * Get task activity summary
 *
 * @param task - Task to summarize
 * @returns Activity summary string
 */
export function getTaskActivity(task: BackgroundTask): string {
  const { progress } = task;

  if (progress.toolCalls === 0) {
    return "No activity yet";
  }

  const parts: string[] = [];

  if (progress.lastTool) {
    parts.push(`Last tool: ${progress.lastTool}`);
  }

  if (progress.toolCalls > 0) {
    parts.push(`${progress.toolCalls} tool calls`);
  }

  const timeSinceUpdate = Date.now() - progress.lastUpdate.getTime();
  const seconds = Math.floor(timeSinceUpdate / 1000);

  if (seconds < 60) {
    parts.push(`${seconds}s ago`);
  } else {
    const minutes = Math.floor(seconds / 60);
    parts.push(`${minutes}m ago`);
  }

  return parts.join(" • ");
}

/**
 * Format task progress for display
 *
 * @param task - Task to format
 * @returns Formatted progress string
 */
export function formatTaskProgress(task: BackgroundTask): string {
  const lines: string[] = [];

  lines.push(`Task: ${task.name}`);
  lines.push(`Agent: ${task.agent}`);
  lines.push(`Status: ${task.status}`);

  if (task.status === "running" || task.status === "idle") {
    lines.push(`Activity: ${getTaskActivity(task)}`);

    if (task.progress.lastMessage) {
      lines.push(
        `Last message: ${task.progress.lastMessage.substring(0, 80)}${task.progress.lastMessage.length > 80 ? "..." : ""}`
      );
    }
  }

  if (task.status === "completed" && task.result) {
    lines.push(`Result: ${task.result.substring(0, 100)}...`);
  }

  if (task.status === "error" && task.error) {
    lines.push(`Error: ${task.error}`);
  }

  const duration =
    Date.now() - task.startTime.getTime();
  const durationSeconds = Math.floor(duration / 1000);
  lines.push(`Duration: ${durationSeconds}s`);

  return lines.join("\n");
}
