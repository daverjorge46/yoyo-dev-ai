/**
 * Context Injector
 *
 * Automatically injects AGENTS.md files when reading source files.
 * Walks directory tree from file location to project root, collecting
 * context files. Uses per-session caching to prevent token bloat.
 *
 * Injection Flow:
 * 1. Agent calls Read("src/components/Button/Button.tsx")
 * 2. ContextInjector intercepts
 * 3. Walk: src/components/Button/ -> src/components/ -> src/ -> project root
 * 4. Collect AGENTS.md files (deepest first, then prepend so project-level is first)
 * 5. Check injection cache (per session + directory)
 * 6. If not cached: inject context before file content
 * 7. Cache directory as "injected for this session"
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import type {
  InjectionCache,
  InjectionResult,
  InjectionOptions,
  FormattedContext,
  ProjectRootResult,
  ProjectRootMarker,
  ContextFileInfo,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Default context file name */
const DEFAULT_CONTEXT_FILE = 'AGENTS.md';

/** Project root markers in priority order */
const PROJECT_ROOT_MARKERS: ProjectRootMarker[] = [
  '.git',
  '.yoyo-dev',
  '.yoyo-ai',
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'go.mod',
];

// =============================================================================
// Cache Management
// =============================================================================

/** Global cache storage - maps sessionId to InjectionCache */
const sessionCaches = new Map<string, InjectionCache>();

/**
 * Get or create cache for a session
 */
function getSessionCache(sessionId: string): InjectionCache {
  let cache = sessionCaches.get(sessionId);
  if (!cache) {
    cache = {
      sessionId,
      injectedDirectories: new Set<string>(),
      createdAt: new Date(),
    };
    sessionCaches.set(sessionId, cache);
  }
  return cache;
}

/**
 * Reset injection cache for a specific session
 *
 * @param sessionId - Session ID to reset
 */
export function resetInjectionCache(sessionId: string): void {
  sessionCaches.delete(sessionId);
}

/**
 * Reset all caches (useful for testing)
 */
export function resetAllCaches(): void {
  sessionCaches.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { sessionCount: number; totalDirectories: number } {
  let totalDirectories = 0;
  for (const cache of sessionCaches.values()) {
    totalDirectories += cache.injectedDirectories.size;
  }
  return {
    sessionCount: sessionCaches.size,
    totalDirectories,
  };
}

// =============================================================================
// Project Root Detection
// =============================================================================

/**
 * Find project root by walking up from a file path
 *
 * Checks for common project root markers in priority order:
 * .git > .yoyo-dev > .yoyo-ai > package.json > Cargo.toml > pyproject.toml > go.mod
 *
 * @param filePath - Absolute path to start searching from
 * @returns Project root result with path and detection method
 */
export async function findProjectRoot(filePath: string): Promise<ProjectRootResult> {
  const absolutePath = resolve(filePath);
  let currentDir = statSync(absolutePath).isDirectory()
    ? absolutePath
    : dirname(absolutePath);

  const root = currentDir.split(sep)[0] || sep;

  while (currentDir !== root && currentDir !== dirname(currentDir)) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      const markerPath = join(currentDir, marker);
      if (existsSync(markerPath)) {
        return {
          path: currentDir,
          detectedBy: marker,
        };
      }
    }
    currentDir = dirname(currentDir);
  }

  // Check root directory as last resort
  for (const marker of PROJECT_ROOT_MARKERS) {
    const markerPath = join(currentDir, marker);
    if (existsSync(markerPath)) {
      return {
        path: currentDir,
        detectedBy: marker,
      };
    }
  }

  // Fallback: use the original file's directory
  return {
    path: statSync(absolutePath).isDirectory()
      ? absolutePath
      : dirname(absolutePath),
    detectedBy: 'fallback',
  };
}

// =============================================================================
// Context Collection
// =============================================================================

/**
 * Collect AGENTS.md files walking up from a directory to project root
 *
 * @param startDir - Directory to start walking from
 * @param projectRoot - Project root to stop at
 * @param contextFileName - Name of context file to look for
 * @returns Array of context file info, ordered from project root to deepest directory
 */
function collectContextFiles(
  startDir: string,
  projectRoot: string,
  contextFileName: string
): ContextFileInfo[] {
  const files: ContextFileInfo[] = [];
  let currentDir = resolve(startDir);
  const resolvedRoot = resolve(projectRoot);

  // Walk up from startDir to projectRoot
  while (true) {
    const contextPath = join(currentDir, contextFileName);

    if (existsSync(contextPath)) {
      try {
        const content = readFileSync(contextPath, 'utf-8');
        const stats = statSync(contextPath);
        files.unshift({
          path: contextPath,
          directory: currentDir,
          content,
          size: stats.size,
        });
      } catch {
        // Skip files we can't read
      }
    }

    // Stop if we've reached project root
    if (currentDir === resolvedRoot) {
      break;
    }

    // Move up one directory
    const parentDir = dirname(currentDir);

    // Stop if we can't go up anymore (filesystem root)
    if (parentDir === currentDir) {
      break;
    }

    // Stop if we've gone above project root
    if (!parentDir.startsWith(resolvedRoot)) {
      break;
    }

    currentDir = parentDir;
  }

  return files;
}

/**
 * Filter context files based on cache, returning only uncached directories
 *
 * @param files - All collected context files
 * @param cache - Session cache
 * @returns Files for directories not yet injected this session
 */
function filterCachedDirectories(
  files: ContextFileInfo[],
  cache: InjectionCache
): ContextFileInfo[] {
  return files.filter((file) => !cache.injectedDirectories.has(file.directory));
}

/**
 * Mark directories as injected in the cache
 *
 * @param files - Files that were injected
 * @param cache - Session cache to update
 */
function markDirectoriesAsInjected(
  files: ContextFileInfo[],
  cache: InjectionCache
): void {
  for (const file of files) {
    cache.injectedDirectories.add(file.directory);
  }
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Get context injections for a file path
 *
 * Walks from the file's directory up to project root, collecting AGENTS.md
 * files. Uses session-based caching to prevent injecting the same directory
 * context multiple times in a session.
 *
 * @param filePath - Absolute path to the file being read
 * @param options - Injection options
 * @returns Injection result with context content and metadata
 *
 * @example
 * ```typescript
 * const result = await getContextInjections('/project/src/components/Button.tsx', {
 *   sessionId: 'session-123',
 *   projectRoot: '/project',
 * });
 *
 * if (result.injections.length > 0) {
 *   const formatted = formatInjectedContext(result.injections);
 *   console.log(formatted.content);
 * }
 * ```
 */
export async function getContextInjections(
  filePath: string,
  options: InjectionOptions
): Promise<InjectionResult> {
  const { sessionId, skipCache = false, contextFileName = DEFAULT_CONTEXT_FILE } = options;

  // Resolve paths
  const absolutePath = resolve(filePath);
  const fileDir = existsSync(absolutePath) && statSync(absolutePath).isDirectory()
    ? absolutePath
    : dirname(absolutePath);

  // Determine project root
  let projectRoot = options.projectRoot;
  if (!projectRoot) {
    const rootResult = await findProjectRoot(absolutePath);
    projectRoot = rootResult.path;
  }
  projectRoot = resolve(projectRoot);

  // Collect all context files from file directory to project root
  const allFiles = collectContextFiles(fileDir, projectRoot, contextFileName);

  // Get session cache
  const cache = getSessionCache(sessionId);

  // Determine which files to inject (not already cached)
  let filesToInject: ContextFileInfo[];
  let fromCache: boolean;

  if (skipCache) {
    filesToInject = allFiles;
    fromCache = false;
  } else {
    filesToInject = filterCachedDirectories(allFiles, cache);
    fromCache = filesToInject.length === 0 && allFiles.length > 0;
  }

  // Mark injected directories in cache
  if (!skipCache && filesToInject.length > 0) {
    markDirectoriesAsInjected(filesToInject, cache);
  }

  // Build result
  const result: InjectionResult = {
    injections: filesToInject.map((f) => f.content),
    fromCache,
    scannedDirectories: allFiles.map((f) => f.directory),
    foundInDirectories: allFiles.map((f) => f.directory),
  };

  return result;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format injected context with XML tags
 *
 * Wraps context in `<injected-context>` tags with comments indicating
 * the source of each context section.
 *
 * @param injections - Array of context content strings
 * @returns Formatted context with XML tags
 *
 * @example
 * ```typescript
 * const formatted = formatInjectedContext([
 *   '# Project Guidelines\n\nUse TypeScript.',
 *   '# Component Guidelines\n\nUse atomic design.',
 * ]);
 *
 * // Output:
 * // <injected-context>
 * // <!-- Directory context 1 -->
 * // # Project Guidelines
 * //
 * // Use TypeScript.
 * //
 * // <!-- Directory context 2 -->
 * // # Component Guidelines
 * //
 * // Use atomic design.
 * // </injected-context>
 * ```
 */
export function formatInjectedContext(injections: string[]): FormattedContext {
  if (injections.length === 0) {
    return {
      content: '',
      fileCount: 0,
      hasContext: false,
    };
  }

  const sections = injections.map((content, index) => {
    return `<!-- Directory context ${index + 1} -->\n${content}`;
  });

  const content = `<injected-context>\n${sections.join('\n\n')}\n</injected-context>`;

  return {
    content,
    fileCount: injections.length,
    hasContext: true,
  };
}

/**
 * Format injected context with directory paths
 *
 * Similar to formatInjectedContext but includes the source directory
 * path in each section comment.
 *
 * @param files - Array of context file info
 * @returns Formatted context with directory paths
 */
export function formatInjectedContextWithPaths(files: ContextFileInfo[]): FormattedContext {
  if (files.length === 0) {
    return {
      content: '',
      fileCount: 0,
      hasContext: false,
    };
  }

  const sections = files.map((file) => {
    return `<!-- Context from: ${file.directory} -->\n${file.content}`;
  });

  const content = `<injected-context>\n${sections.join('\n\n')}\n</injected-context>`;

  return {
    content,
    fileCount: files.length,
    hasContext: true,
  };
}
