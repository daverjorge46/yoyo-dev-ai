/**
 * Execution Error Types
 *
 * Shared type definitions for execution error handling across
 * frontend and backend.
 */

/**
 * All possible execution error codes.
 * Using string literals for self-documenting, TypeScript-friendly errors.
 */
export type ExecutionErrorCode =
  | 'RALPH_NOT_FOUND'
  | 'PROJECT_NOT_INITIALIZED'
  | 'PROMPT_GENERATION_FAILED'
  | 'SPAWN_FAILED'
  | 'PROCESS_CRASHED'
  | 'EXECUTION_NOT_RUNNING'
  | 'ALREADY_RUNNING';

/**
 * Array of all valid error codes for runtime validation
 */
export const EXECUTION_ERROR_CODES: readonly ExecutionErrorCode[] = [
  'RALPH_NOT_FOUND',
  'PROJECT_NOT_INITIALIZED',
  'PROMPT_GENERATION_FAILED',
  'SPAWN_FAILED',
  'PROCESS_CRASHED',
  'EXECUTION_NOT_RUNNING',
  'ALREADY_RUNNING',
] as const;

/**
 * Error response structure for API responses
 */
export interface ExecutionErrorResponse {
  success: false;
  error: {
    code: ExecutionErrorCode;
    message: string;
    details?: string;
  };
}

/**
 * Validation check result
 */
export interface CheckResult {
  success: boolean;
  check: string;
  errorCode?: ExecutionErrorCode;
  message?: string;
  details?: string;
}

/**
 * Full validation result
 */
export interface ValidationResult {
  success: boolean;
  errorCode?: ExecutionErrorCode;
  message?: string;
  checks: CheckResult[];
  durationMs: number;
}
