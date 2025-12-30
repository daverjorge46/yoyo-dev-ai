/**
 * Context Injection Module
 *
 * Automatically injects per-directory AGENTS.md context when reading files.
 * This allows agents to receive directory-specific instructions without
 * manual prompting.
 *
 * @module context
 *
 * @example
 * ```typescript
 * import {
 *   getContextInjections,
 *   formatInjectedContext,
 *   resetInjectionCache,
 * } from './context/index.js';
 *
 * // When reading a file, get any AGENTS.md context
 * const result = await getContextInjections('/project/src/Button.tsx', {
 *   sessionId: 'session-123',
 * });
 *
 * if (result.injections.length > 0 && !result.fromCache) {
 *   const formatted = formatInjectedContext(result.injections);
 *   // Prepend formatted.content to the file contents
 * }
 *
 * // Reset cache when session ends
 * resetInjectionCache('session-123');
 * ```
 */

// Types
export type {
  InjectionCache,
  InjectionResult,
  InjectionOptions,
  FormattedContext,
  ProjectRootResult,
  ProjectRootMarker,
  ContextFileInfo,
} from './types.js';

// Core functions
export {
  getContextInjections,
  formatInjectedContext,
  formatInjectedContextWithPaths,
  findProjectRoot,
  resetInjectionCache,
  resetAllCaches,
  getCacheStats,
} from './injector.js';
