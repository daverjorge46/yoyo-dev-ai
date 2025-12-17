/**
 * Memory Scopes - Dual Scope Architecture
 *
 * Manages two memory scopes:
 * - Global (~/.yoyo-ai/memory/): User preferences, stored per-user
 * - Project (.yoyo-ai/memory/): Project-specific context, stored per-project
 *
 * Project scope overrides global scope when blocks of the same type exist.
 */
import type { MemoryScope } from './types.js';
import { type MemoryStore } from './store.js';
/**
 * Get the global memory directory path.
 * Located at ~/.yoyo-ai/memory/
 *
 * @returns Absolute path to global memory directory
 */
export declare function getGlobalMemoryPath(): string;
/**
 * Get the project memory directory path.
 * Located at {projectRoot}/.yoyo-ai/memory/
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Absolute path to project memory directory
 */
export declare function getProjectMemoryPath(projectRoot?: string): string;
/**
 * Detect the project root by searching for project markers.
 * Searches from the given directory upward until a marker is found.
 *
 * @param startDir - Directory to start searching from
 * @returns Project root path or null if not found
 */
export declare function detectProjectRoot(startDir: string): string | null;
/**
 * Ensure a memory directory exists, creating it if necessary.
 * Creates parent directories as needed.
 *
 * @param path - Directory path to ensure exists
 */
export declare function ensureMemoryDirectory(path: string): void;
/**
 * Get the database file path within a memory directory.
 *
 * @param memoryDir - Memory directory path
 * @returns Path to the database file
 */
export declare function getDatabasePath(memoryDir: string): string;
/**
 * Options for creating a ScopeManager.
 */
export interface ScopeManagerOptions {
    /** Project root directory */
    projectRoot?: string;
    /** Override global memory path (for testing) */
    globalPath?: string;
}
/**
 * Manages memory scopes and their associated databases.
 *
 * Provides access to both global and project databases,
 * and tracks the currently active scope.
 */
export declare class ScopeManager {
    private currentScope;
    private projectRoot;
    private globalPath;
    private projectStore;
    private globalStore;
    constructor(options?: ScopeManagerOptions);
    /**
     * Initialize both memory databases.
     * Creates directories and initializes SQLite databases.
     */
    initialize(): void;
    /**
     * Close all database connections.
     */
    close(): void;
    /**
     * Get the current scope.
     */
    getCurrentScope(): MemoryScope;
    /**
     * Set the current scope.
     *
     * @param scope - Scope to switch to
     */
    setScope(scope: MemoryScope): void;
    /**
     * Get the store for the current scope.
     *
     * @throws Error if not initialized
     */
    getCurrentStore(): MemoryStore;
    /**
     * Get the project scope store.
     *
     * @throws Error if not initialized
     */
    getProjectStore(): MemoryStore;
    /**
     * Get the global scope store.
     *
     * @throws Error if not initialized
     */
    getGlobalStore(): MemoryStore;
    /**
     * Get the path to the project database file.
     */
    getProjectDatabasePath(): string;
    /**
     * Get the path to the global database file.
     */
    getGlobalDatabasePath(): string;
    /**
     * Get the project root directory.
     */
    getProjectRoot(): string;
    /**
     * Check if both stores are initialized.
     */
    isInitialized(): boolean;
}
/**
 * Get or create the global scope manager singleton.
 *
 * @param options - Options for creating the manager (only used on first call)
 * @returns The global ScopeManager instance
 */
export declare function getScopeManager(options?: ScopeManagerOptions): ScopeManager;
/**
 * Reset the global scope manager (for testing).
 */
export declare function resetScopeManager(): void;
//# sourceMappingURL=scopes.d.ts.map