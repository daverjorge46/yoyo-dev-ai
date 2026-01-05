/**
 * Error Message Catalog
 *
 * User-friendly error messages and utilities for execution errors.
 * Re-exports types from execution-errors.ts for convenience.
 */

import {
  ExecutionErrorCode,
  EXECUTION_ERROR_CODES,
  ExecutionErrorResponse,
  CheckResult,
  ValidationResult,
} from '../types/execution-errors.js';

// Re-export types for convenience
export {
  ExecutionErrorCode,
  EXECUTION_ERROR_CODES,
  ExecutionErrorResponse,
  CheckResult,
  ValidationResult,
};

/**
 * User-friendly error messages for each error code.
 * These are shown to users in the UI.
 */
const ERROR_MESSAGES: Record<ExecutionErrorCode, string> = {
  RALPH_NOT_FOUND: 'Ralph CLI not installed. Run: pip install ralph-cli',
  PROJECT_NOT_INITIALIZED: 'Project not set up for Ralph execution. Run: yoyo --ralph init',
  PROMPT_GENERATION_FAILED: 'Failed to generate execution prompt. Check spec configuration.',
  SPAWN_FAILED: 'Failed to start Ralph process. Check system resources.',
  PROCESS_CRASHED: 'Ralph exited unexpectedly. Check logs for details.',
  EXECUTION_NOT_RUNNING: 'No execution in progress.',
  ALREADY_RUNNING: 'Execution already in progress. Stop current execution first.',
};

/**
 * Technical details for each error code.
 * These provide additional context for debugging.
 */
const ERROR_DETAILS: Record<ExecutionErrorCode, string> = {
  RALPH_NOT_FOUND: 'which ralph command failed - Ralph binary not in PATH',
  PROJECT_NOT_INITIALIZED: 'Missing .yoyo-dev directory or ralph-prompt-generator.sh',
  PROMPT_GENERATION_FAILED: 'ralph-prompt-generator.sh failed or PROMPT.md not created',
  SPAWN_FAILED: 'child_process.spawn() threw an error',
  PROCESS_CRASHED: 'Ralph process exited with non-zero exit code',
  EXECUTION_NOT_RUNNING: 'Control command called when no execution is active',
  ALREADY_RUNNING: 'Start command called when execution is already in progress',
};

/**
 * Get user-friendly message for an error code
 */
export function getErrorMessage(code: ExecutionErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'An unexpected error occurred.';
}

/**
 * Get technical details for an error code
 */
export function getErrorDetails(code: ExecutionErrorCode): string {
  return ERROR_DETAILS[code] ?? '';
}

/**
 * Type guard to check if a string is a valid ExecutionErrorCode
 */
export function isExecutionErrorCode(value: unknown): value is ExecutionErrorCode {
  if (typeof value !== 'string') {
    return false;
  }
  return EXECUTION_ERROR_CODES.includes(value as ExecutionErrorCode);
}

/**
 * Custom Error class for execution errors
 */
export class ExecutionError extends Error {
  public readonly code: ExecutionErrorCode;
  public readonly details?: string;

  constructor(code: ExecutionErrorCode, details?: string) {
    super(getErrorMessage(code));
    this.name = 'ExecutionError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionError);
    }
  }

  /**
   * Serialize error to JSON-friendly format
   */
  toJSON(): { code: ExecutionErrorCode; message: string; details?: string } {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Factory function to create an ExecutionError
 */
export function createExecutionError(
  code: ExecutionErrorCode,
  details?: string
): ExecutionError {
  return new ExecutionError(code, details);
}

/**
 * Create an error response object for API responses
 */
export function createErrorResponse(
  code: ExecutionErrorCode,
  details?: string
): ExecutionErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: getErrorMessage(code),
      details,
    },
  };
}
