/**
 * Server Type Definitions
 *
 * Hono context variable types and shared interfaces
 */

// Hono context variables
export type Variables = {
  projectRoot: string;
};

// Re-export common types used across routes
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
