/**
 * Background Task Manager
 *
 * Manages background task execution, polling, and lifecycle.
 * Enables parallel agent execution while primary agent continues working.
 */

import type {
  BackgroundTask,
  LaunchBackgroundTaskOptions,
  BackgroundTaskResult,
} from "./task.js";
import { loadAgent } from "../../agents/loader.js";

/**
 * Background task manager (singleton)
 */
class BackgroundManager {
  /** Running background tasks */
  private tasks: Map<string, BackgroundTask> = new Map();

  /** Polling interval ID */
  private pollingInterval: NodeJS.Timeout | null = null;

  /** Polling interval in milliseconds */
  private readonly POLLING_INTERVAL = 2000; // 2 seconds

  /** Idle timeout in milliseconds */
  private readonly IDLE_TIMEOUT = 300000; // 5 minutes

  /** Maximum concurrent tasks */
  private readonly MAX_CONCURRENT_TASKS = 5;

  /**
   * Launch a background task
   *
   * @param options - Task launch options
   * @returns Task ID
   * @throws Error if max concurrent tasks reached or agent invalid
   */
  async launch(options: LaunchBackgroundTaskOptions): Promise<string> {
    // 1. Check concurrent task limit
    const runningTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "running" || t.status === "queued"
    );

    if (runningTasks.length >= this.MAX_CONCURRENT_TASKS) {
      throw new Error(
        `Maximum concurrent background tasks (${this.MAX_CONCURRENT_TASKS}) reached. Cancel or wait for existing tasks to complete.`
      );
    }

    // 2. Validate agent exists
    const agent = await loadAgent(options.agent);
    if (!agent) {
      throw new Error(`Agent '${options.agent}' not found`);
    }

    // 3. Generate task ID (using timestamp + random for uniqueness)
    const taskId = `bg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 4. Create background task
    const task: BackgroundTask = {
      id: taskId,
      name: options.name,
      agent: options.agent,
      prompt: options.prompt,
      status: "queued",
      parentSessionId: options.parentSessionId,
      startTime: new Date(),
      lastUpdate: new Date(),
      progress: {
        toolCalls: 0,
        lastTool: "",
        lastMessage: "",
        lastUpdate: new Date(),
      },
      notified: false,
    };

    // 5. Track task
    this.tasks.set(taskId, task);

    // 6. Execute task asynchronously
    // TODO: Integrate with Claude Code SDK to create isolated session
    // This is a placeholder showing the intended flow
    this.executeTaskAsync(task).catch((error) => {
      // Handle async errors
      task.status = "error";
      task.error =
        error instanceof Error ? error.message : String(error);
      task.lastUpdate = new Date();
    });

    // 7. Start polling if not already running
    if (!this.pollingInterval) {
      this.startPolling();
    }

    return taskId;
  }

  /**
   * Execute background task asynchronously
   *
   * @param task - Task to execute
   */
  private async executeTaskAsync(task: BackgroundTask): Promise<void> {
    try {
      // Update status to running
      task.status = "running";
      task.lastUpdate = new Date();

      // TODO: Integrate with Claude Code SDK
      // const session = await claudeCode.createSession({
      //   systemPrompt: agent.systemPrompt,
      //   model: agent.model,
      //   temperature: agent.temperature,
      //   tools: agent.resolvedTools,
      //   parentSessionId: task.parentSessionId
      // })
      //
      // const response = await session.executeAsync(task.prompt)
      //
      // task.result = response.content
      // task.status = "completed"
      // task.lastUpdate = new Date()

      // Placeholder: Simulate async execution
      throw new Error(
        "Claude Code SDK integration not yet implemented. Background task execution pending."
      );
    } catch (error) {
      task.status = "error";
      task.error =
        error instanceof Error ? error.message : String(error);
      task.lastUpdate = new Date();
    }
  }

  /**
   * Get task status
   *
   * @param taskId - Task ID to query
   * @returns Task result or null if not found
   */
  getTaskStatus(taskId: string): BackgroundTaskResult | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      task,
      isComplete: task.status === "completed",
      isFailed: task.status === "error",
    };
  }

  /**
   * Get all active tasks
   *
   * @returns Array of active background tasks
   */
  getActiveTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) =>
        t.status === "running" ||
        t.status === "queued" ||
        t.status === "idle"
    );
  }

  /**
   * Get all tasks
   *
   * @returns Array of all background tasks
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Complete a task (mark as done, cleanup)
   *
   * @param taskId - Task ID to complete
   */
  completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = "completed";
    task.lastUpdate = new Date();
  }

  /**
   * Cancel a background task
   *
   * @param taskId - Task ID to cancel, or "all" to cancel all
   * @returns Success status
   */
  async cancelTask(taskId: string): Promise<boolean> {
    if (taskId === "all") {
      // Cancel all running tasks
      const activeTasks = this.getActiveTasks();
      for (const task of activeTasks) {
        await this.cancelSingleTask(task.id);
      }
      return true;
    }

    return this.cancelSingleTask(taskId);
  }

  /**
   * Cancel a single task
   *
   * @param taskId - Task ID to cancel
   * @returns Success status
   */
  private async cancelSingleTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // TODO: Integrate with Claude Code SDK to terminate session
    // await claudeCode.terminateSession(task.id)

    task.status = "error";
    task.error = "Task cancelled by user";
    task.lastUpdate = new Date();

    return true;
  }

  /**
   * Start polling for task updates
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    this.pollingInterval = setInterval(() => {
      this.pollRunningTasks();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop polling for task updates
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Poll all running tasks for status updates
   */
  private pollRunningTasks(): void {
    const activeTasks = this.getActiveTasks();

    if (activeTasks.length === 0) {
      // No active tasks, stop polling
      this.stopPolling();
      return;
    }

    for (const task of activeTasks) {
      this.pollTask(task.id);
    }

    // Cleanup idle tasks
    this.cleanIdleTasks();
  }

  /**
   * Poll a single task for status update
   *
   * @param taskId - Task ID to poll
   */
  private pollTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // TODO: Integrate with Claude Code SDK to query session status
    // const status = await claudeCode.getSessionStatus(task.id)
    //
    // task.progress.toolCalls = status.toolCalls.length
    // task.progress.lastTool = status.lastTool
    // task.progress.lastMessage = status.lastMessage
    // task.progress.lastUpdate = new Date()
    // task.lastUpdate = new Date()
    //
    // if (status.isIdle) {
    //   task.status = "idle"
    // }

    // Check for idle timeout
    const idleTime = Date.now() - task.lastUpdate.getTime();
    if (
      idleTime > this.IDLE_TIMEOUT &&
      task.status === "running"
    ) {
      task.status = "idle";
    }
  }

  /**
   * Clean up idle tasks (remove after timeout)
   */
  private cleanIdleTasks(): void {
    const now = Date.now();

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === "idle") {
        const idleTime = now - task.lastUpdate.getTime();

        if (idleTime > this.IDLE_TIMEOUT) {
          // Task has been idle too long, clean it up
          this.tasks.delete(taskId);
        }
      }
    }
  }

  /**
   * Remove completed tasks from memory
   */
  cleanupCompletedTasks(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === "completed" || task.status === "error") {
        this.tasks.delete(taskId);
      }
    }
  }

  /**
   * Get statistics about background tasks
   *
   * @returns Task statistics
   */
  getStats(): {
    total: number;
    queued: number;
    running: number;
    idle: number;
    completed: number;
    errors: number;
  } {
    const tasks = Array.from(this.tasks.values());

    return {
      total: tasks.length,
      queued: tasks.filter((t) => t.status === "queued").length,
      running: tasks.filter((t) => t.status === "running").length,
      idle: tasks.filter((t) => t.status === "idle").length,
      completed: tasks.filter((t) => t.status === "completed")
        .length,
      errors: tasks.filter((t) => t.status === "error").length,
    };
  }
}

// Export singleton instance
export const backgroundManager = new BackgroundManager();
