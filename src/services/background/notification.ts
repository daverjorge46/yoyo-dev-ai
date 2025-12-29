/**
 * Background Task Notification System
 *
 * Handles notifications for background task completion.
 * Supports both TUI toasts and message injection to parent sessions.
 */

import type { BackgroundTask } from "./task.js";

/**
 * Notification configuration
 */
export interface NotificationConfig {
  /** Show toast in TUI */
  showToast: boolean;

  /** Inject message into parent session */
  injectMessage: boolean;

  /** Include detailed results in notification */
  includeResults: boolean;

  /** Include token usage in notification */
  includeTokens: boolean;
}

/**
 * Default notification configuration
 */
const DEFAULT_CONFIG: NotificationConfig = {
  showToast: true,
  injectMessage: true,
  includeResults: true,
  includeTokens: true,
};

/**
 * Notification message
 */
export interface NotificationMessage {
  /** Notification title */
  title: string;

  /** Notification body */
  body: string;

  /** Notification type */
  type: "success" | "error" | "info";

  /** Parent session ID to notify */
  sessionId: string;
}

/**
 * Notify parent session about background task completion
 *
 * @param task - Completed background task
 * @param config - Notification configuration
 */
export async function notifyTaskCompletion(
  task: BackgroundTask,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  // Skip if already notified
  if (task.notified) {
    return;
  }

  // Create notification message
  const message = formatNotificationMessage(task, config);

  // Send notification
  if (config.showToast) {
    await showToast(task.parentSessionId, message);
  }

  if (config.injectMessage) {
    await injectMessage(task.parentSessionId, message);
  }

  // Mark as notified
  task.notified = true;
}

/**
 * Format notification message for background task
 *
 * @param task - Background task
 * @param config - Notification configuration
 * @returns Formatted notification message
 */
export function formatNotificationMessage(
  task: BackgroundTask,
  config: NotificationConfig = DEFAULT_CONFIG
): NotificationMessage {
  const isSuccess = task.status === "completed";
  const isError = task.status === "error";

  // Determine notification type
  const type = isError ? "error" : isSuccess ? "success" : "info";

  // Build title
  const emoji = isError ? "❌" : isSuccess ? "🔔" : "ℹ️";
  const statusText = isError
    ? "failed"
    : isSuccess
      ? "completed"
      : "updated";
  const title = `${emoji} Background task "${task.name}" ${statusText}`;

  // Build body
  const bodyLines: string[] = [];

  // Add results (if completed)
  if (isSuccess && task.result && config.includeResults) {
    bodyLines.push("Results:");
    const resultLines = task.result
      .split("\n")
      .slice(0, 3)
      .map((line) => `- ${line}`);
    bodyLines.push(...resultLines);

    if (task.result.split("\n").length > 3) {
      bodyLines.push("- ...");
    }

    bodyLines.push("");
  }

  // Add error (if failed)
  if (isError && task.error) {
    bodyLines.push(`Error: ${task.error}`);
    bodyLines.push("");
  }

  // Add metadata
  const duration =
    Date.now() - task.startTime.getTime();
  const durationSeconds = Math.floor(duration / 1000);

  const metadata: string[] = [];
  metadata.push(`Duration: ${durationSeconds}s`);

  if (config.includeTokens && task.progress.toolCalls > 0) {
    metadata.push(`Tool calls: ${task.progress.toolCalls}`);
  }

  bodyLines.push(metadata.join(" | "));

  const body = bodyLines.join("\n");

  return {
    title,
    body,
    type,
    sessionId: task.parentSessionId,
  };
}

/**
 * Show toast notification in TUI
 *
 * @param sessionId - Parent session ID
 * @param message - Notification message
 */
async function showToast(
  sessionId: string,
  message: NotificationMessage
): Promise<void> {
  // TODO: Integrate with TUI system
  // await tui.showToast({
  //   title: message.title,
  //   body: message.body,
  //   type: message.type,
  //   duration: 5000
  // })

  console.log(`[Toast] ${message.title}\n${message.body}`);
}

/**
 * Inject notification message into parent session
 *
 * @param sessionId - Parent session ID
 * @param message - Notification message
 */
async function injectMessage(
  sessionId: string,
  message: NotificationMessage
): Promise<void> {
  // TODO: Integrate with Claude Code SDK
  // await claudeCode.injectMessage(sessionId, {
  //   role: "system",
  //   content: `${message.title}\n\n${message.body}`
  // })

  console.log(
    `[Message Injection] Session ${sessionId}: ${message.title}\n${message.body}`
  );
}

/**
 * Notify about task failure
 *
 * @param task - Failed background task
 * @param config - Notification configuration
 */
export async function notifyTaskFailure(
  task: BackgroundTask,
  config: NotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  if (task.status !== "error") {
    return;
  }

  await notifyTaskCompletion(task, config);
}

/**
 * Notify about task idle (no activity)
 *
 * @param task - Idle background task
 */
export async function notifyTaskIdle(
  task: BackgroundTask
): Promise<void> {
  const message: NotificationMessage = {
    title: `⚠️ Background task "${task.name}" is idle`,
    body: `Task has been inactive for ${Math.floor((Date.now() - task.progress.lastUpdate.getTime()) / 60000)} minutes.\n\nLast activity: ${task.progress.lastTool || "None"}`,
    type: "info",
    sessionId: task.parentSessionId,
  };

  await showToast(task.parentSessionId, message);
}

/**
 * Get notification summary for multiple tasks
 *
 * @param tasks - Background tasks to summarize
 * @returns Summary string
 */
export function getNotificationSummary(
  tasks: BackgroundTask[]
): string {
  const completed = tasks.filter((t) => t.status === "completed");
  const errors = tasks.filter((t) => t.status === "error");
  const running = tasks.filter((t) => t.status === "running");

  const parts: string[] = [];

  if (completed.length > 0) {
    parts.push(`${completed.length} completed`);
  }

  if (errors.length > 0) {
    parts.push(`${errors.length} failed`);
  }

  if (running.length > 0) {
    parts.push(`${running.length} running`);
  }

  return parts.join(", ") || "No background tasks";
}

/**
 * Create notification preferences from config
 *
 * @param config - Raw configuration object
 * @returns Notification configuration
 */
export function createNotificationConfig(
  config: Record<string, unknown>
): NotificationConfig {
  return {
    showToast:
      typeof config.toast === "boolean" ? config.toast : true,
    injectMessage:
      typeof config.message_injection === "boolean"
        ? config.message_injection
        : true,
    includeResults: true,
    includeTokens: true,
  };
}
