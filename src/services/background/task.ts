/**
 * Background Task Types
 *
 * Type definitions for background task management system.
 */

/**
 * Background task status
 */
export type BackgroundTaskStatus =
  | "queued" // Waiting to start
  | "running" // Currently executing
  | "idle" // Idle (no activity for polling interval)
  | "completed" // Finished successfully
  | "error"; // Failed with error

/**
 * Background task progress information
 */
export interface BackgroundTaskProgress {
  /** Number of tool calls made */
  toolCalls: number;

  /** Last tool that was called */
  lastTool: string;

  /** Last message from agent */
  lastMessage: string;

  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Background task configuration
 */
export interface BackgroundTask {
  /** Unique task ID (session ID) */
  id: string;

  /** Display name for task */
  name: string;

  /** Agent executing the task */
  agent: string;

  /** Task prompt/instruction */
  prompt: string;

  /** Current task status */
  status: BackgroundTaskStatus;

  /** Parent session ID (session that launched this task) */
  parentSessionId: string;

  /** Task start time */
  startTime: Date;

  /** Last update time */
  lastUpdate: Date;

  /** Task progress information */
  progress: BackgroundTaskProgress;

  /** Task result (when completed) */
  result?: string;

  /** Error message (when failed) */
  error?: string;

  /** Whether notification was sent */
  notified?: boolean;
}

/**
 * Background task launch options
 */
export interface LaunchBackgroundTaskOptions {
  /** Agent to execute task */
  agent: string;

  /** Task prompt/instruction */
  prompt: string;

  /** Display name for task */
  name: string;

  /** Parent session ID */
  parentSessionId: string;

  /** Whether to send notification on completion */
  notify?: boolean;
}

/**
 * Background task query result
 */
export interface BackgroundTaskResult {
  /** Task information */
  task: BackgroundTask;

  /** Whether task is complete */
  isComplete: boolean;

  /** Whether task failed */
  isFailed: boolean;
}
