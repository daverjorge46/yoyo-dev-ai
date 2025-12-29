/**
 * background_cancel Tool
 *
 * Cancel running background tasks.
 * Supports canceling single tasks or all running tasks at once.
 */

import { backgroundManager } from "../services/background/manager.js";

/**
 * Background cancel input
 */
export interface BackgroundCancelInput {
  /** Task ID to cancel, or "all" to cancel all running tasks */
  task_id: string;
}

/**
 * Background cancel output
 */
export interface BackgroundCancelOutput {
  /** Whether cancellation was successful */
  success: boolean;

  /** Cancellation message */
  message: string;

  /** Number of tasks cancelled */
  tasksCancelled: number;

  /** Task IDs that were cancelled */
  cancelledTaskIds: string[];
}

/**
 * Cancel a background task
 *
 * @param input - Background cancel input
 * @returns Cancellation result
 * @throws Error if validation fails
 */
export async function backgroundCancel(
  input: BackgroundCancelInput
): Promise<BackgroundCancelOutput> {
  // 1. Validate input
  if (!input.task_id || input.task_id.trim() === "") {
    throw new Error("Task ID is required");
  }

  // 2. Handle "all" - cancel all running tasks
  if (input.task_id === "all") {
    return cancelAllTasks();
  }

  // 3. Cancel single task
  return cancelSingleTask(input.task_id);
}

/**
 * Cancel a single background task
 *
 * @param taskId - Task ID to cancel
 * @returns Cancellation result
 */
async function cancelSingleTask(
  taskId: string
): Promise<BackgroundCancelOutput> {
  // Check if task exists
  const taskStatus = backgroundManager.getTaskStatus(taskId);
  if (!taskStatus) {
    throw new Error(`Task '${taskId}' not found`);
  }

  const { task } = taskStatus;

  // Check if task can be cancelled
  if (task.status === "completed") {
    return {
      success: false,
      message: `Task '${task.name}' is already completed and cannot be cancelled`,
      tasksCancelled: 0,
      cancelledTaskIds: [],
    };
  }

  if (task.status === "error") {
    return {
      success: false,
      message: `Task '${task.name}' already failed and cannot be cancelled`,
      tasksCancelled: 0,
      cancelledTaskIds: [],
    };
  }

  // Cancel the task
  const success = await backgroundManager.cancelTask(taskId);

  if (success) {
    return {
      success: true,
      message: `Background task '${task.name}' cancelled successfully`,
      tasksCancelled: 1,
      cancelledTaskIds: [taskId],
    };
  } else {
    return {
      success: false,
      message: `Failed to cancel task '${task.name}'`,
      tasksCancelled: 0,
      cancelledTaskIds: [],
    };
  }
}

/**
 * Cancel all running background tasks
 *
 * @returns Cancellation result
 */
async function cancelAllTasks(): Promise<BackgroundCancelOutput> {
  const activeTasks = backgroundManager.getActiveTasks();

  if (activeTasks.length === 0) {
    return {
      success: true,
      message: "No active background tasks to cancel",
      tasksCancelled: 0,
      cancelledTaskIds: [],
    };
  }

  // Cancel all active tasks
  await backgroundManager.cancelTask("all");

  return {
    success: true,
    message: `Cancelled ${activeTasks.length} background task(s)`,
    tasksCancelled: activeTasks.length,
    cancelledTaskIds: activeTasks.map((task) => task.id),
  };
}

/**
 * Cancel multiple specific background tasks
 *
 * @param taskIds - Array of task IDs to cancel
 * @returns Array of cancellation results
 */
export async function backgroundCancelBatch(
  taskIds: string[]
): Promise<BackgroundCancelOutput[]> {
  return Promise.all(
    taskIds.map((taskId) =>
      backgroundCancel({ task_id: taskId })
    )
  );
}

/**
 * Get cancellable background tasks
 *
 * @returns Array of task IDs that can be cancelled
 */
export function getCancellableTasks(): string[] {
  const activeTasks = backgroundManager.getActiveTasks();
  return activeTasks.map((task) => task.id);
}

/**
 * Check if a task can be cancelled
 *
 * @param taskId - Task ID to check
 * @returns True if task can be cancelled
 */
export function canCancelTask(taskId: string): boolean {
  const taskStatus = backgroundManager.getTaskStatus(taskId);
  if (!taskStatus) {
    return false;
  }

  const { task } = taskStatus;
  return (
    task.status === "queued" ||
    task.status === "running" ||
    task.status === "idle"
  );
}
