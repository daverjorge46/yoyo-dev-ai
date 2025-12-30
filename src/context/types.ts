/**
 * Context Injection Types
 *
 * Defines the type system for automatic AGENTS.md context injection.
 * Context is injected when reading source files to provide per-directory
 * instructions to agents automatically.
 */

/**
 * Injection cache entry
 * Tracks which directories have had their context injected in a session
 */
export interface InjectionCache {
  /** Session identifier */
  sessionId: string;

  /** Set of directories that have been injected for this session */
  injectedDirectories: Set<string>;

  /** Timestamp when cache was created */
  createdAt: Date;
}

/**
 * Result of context injection operation
 */
export interface InjectionResult {
  /** Array of injected context content (in order: project root first, deepest directory last) */
  injections: string[];

  /** Whether result came from cache (directory already injected this session) */
  fromCache: boolean;

  /** Directories that were scanned */
  scannedDirectories: string[];

  /** Directories that contained AGENTS.md files */
  foundInDirectories: string[];
}

/**
 * Context injection options
 */
export interface InjectionOptions {
  /** Session ID for caching */
  sessionId: string;

  /** Project root directory (stops walking here) */
  projectRoot?: string;

  /** Name of context file to look for (default: AGENTS.md) */
  contextFileName?: string;

  /** Whether to skip caching (always return fresh results) */
  skipCache?: boolean;
}

/**
 * Formatted context output with XML tags
 */
export interface FormattedContext {
  /** Full formatted context string with XML tags */
  content: string;

  /** Number of context files included */
  fileCount: number;

  /** Whether any context was found */
  hasContext: boolean;
}

/**
 * Project root detection result
 */
export interface ProjectRootResult {
  /** Absolute path to project root */
  path: string;

  /** How root was detected (git, package.json, .yoyo-dev, etc.) */
  detectedBy: ProjectRootMarker;
}

/**
 * Markers used to detect project root
 */
export type ProjectRootMarker =
  | '.git'
  | 'package.json'
  | '.yoyo-dev'
  | '.yoyo-ai'
  | 'Cargo.toml'
  | 'pyproject.toml'
  | 'go.mod'
  | 'fallback';

/**
 * Context file metadata
 */
export interface ContextFileInfo {
  /** Absolute path to the AGENTS.md file */
  path: string;

  /** Directory containing the file */
  directory: string;

  /** File content */
  content: string;

  /** File size in bytes */
  size: number;
}
