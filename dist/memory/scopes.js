/**
 * Memory Scopes - Dual Scope Architecture
 *
 * Manages two memory scopes:
 * - Global (~/.yoyo-ai/memory/): User preferences, stored per-user
 * - Project (.yoyo-ai/memory/): Project-specific context, stored per-project
 *
 * Project scope overrides global scope when blocks of the same type exist.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { initializeDatabase, closeDatabase, } from './store.js';
// =============================================================================
// Constants
// =============================================================================
/**
 * Name of the yoyo-ai configuration directory.
 */
const YOYO_DIR = '.yoyo-ai';
/**
 * Name of the memory subdirectory.
 */
const MEMORY_DIR = 'memory';
/**
 * Name of the SQLite database file.
 */
const DB_FILE = 'memory.db';
/**
 * Project root markers - files/directories that indicate a project root.
 */
const PROJECT_MARKERS = [
    '.yoyo-ai',
    '.git',
    'package.json',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'setup.py',
    'pom.xml',
    'build.gradle',
];
// =============================================================================
// Path Resolution
// =============================================================================
/**
 * Get the global memory directory path.
 * Located at ~/.yoyo-ai/memory/
 *
 * @returns Absolute path to global memory directory
 */
export function getGlobalMemoryPath() {
    return join(homedir(), YOYO_DIR, MEMORY_DIR);
}
/**
 * Get the project memory directory path.
 * Located at {projectRoot}/.yoyo-ai/memory/
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Absolute path to project memory directory
 */
export function getProjectMemoryPath(projectRoot) {
    const root = projectRoot ?? process.cwd();
    return join(root, YOYO_DIR, MEMORY_DIR);
}
/**
 * Detect the project root by searching for project markers.
 * Searches from the given directory upward until a marker is found.
 *
 * @param startDir - Directory to start searching from
 * @returns Project root path or null if not found
 */
export function detectProjectRoot(startDir) {
    let currentDir = startDir;
    // Prevent infinite loop by tracking visited directories
    const visited = new Set();
    while (currentDir && !visited.has(currentDir)) {
        visited.add(currentDir);
        // Check for project markers
        for (const marker of PROJECT_MARKERS) {
            const markerPath = join(currentDir, marker);
            if (existsSync(markerPath)) {
                return currentDir;
            }
        }
        // Move to parent directory
        const parentDir = dirname(currentDir);
        // Stop if we've reached the root
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }
    return null;
}
// =============================================================================
// Directory Management
// =============================================================================
/**
 * Ensure a memory directory exists, creating it if necessary.
 * Creates parent directories as needed.
 *
 * @param path - Directory path to ensure exists
 */
export function ensureMemoryDirectory(path) {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true, mode: 0o755 });
    }
}
/**
 * Get the database file path within a memory directory.
 *
 * @param memoryDir - Memory directory path
 * @returns Path to the database file
 */
export function getDatabasePath(memoryDir) {
    return join(memoryDir, DB_FILE);
}
/**
 * Manages memory scopes and their associated databases.
 *
 * Provides access to both global and project databases,
 * and tracks the currently active scope.
 */
export class ScopeManager {
    currentScope = 'project';
    projectRoot;
    globalPath;
    projectStore = null;
    globalStore = null;
    constructor(options = {}) {
        this.projectRoot = options.projectRoot ?? process.cwd();
        this.globalPath = options.globalPath ?? getGlobalMemoryPath();
    }
    /**
     * Initialize both memory databases.
     * Creates directories and initializes SQLite databases.
     */
    initialize() {
        // Create memory directories
        const projectMemoryPath = getProjectMemoryPath(this.projectRoot);
        ensureMemoryDirectory(projectMemoryPath);
        ensureMemoryDirectory(this.globalPath);
        // Initialize databases
        this.projectStore = initializeDatabase(getDatabasePath(projectMemoryPath));
        this.globalStore = initializeDatabase(getDatabasePath(this.globalPath));
    }
    /**
     * Close all database connections.
     */
    close() {
        if (this.projectStore) {
            closeDatabase(this.projectStore);
            this.projectStore = null;
        }
        if (this.globalStore) {
            closeDatabase(this.globalStore);
            this.globalStore = null;
        }
    }
    /**
     * Get the current scope.
     */
    getCurrentScope() {
        return this.currentScope;
    }
    /**
     * Set the current scope.
     *
     * @param scope - Scope to switch to
     */
    setScope(scope) {
        this.currentScope = scope;
    }
    /**
     * Get the store for the current scope.
     *
     * @throws Error if not initialized
     */
    getCurrentStore() {
        if (this.currentScope === 'global') {
            return this.getGlobalStore();
        }
        return this.getProjectStore();
    }
    /**
     * Get the project scope store.
     *
     * @throws Error if not initialized
     */
    getProjectStore() {
        if (!this.projectStore) {
            throw new Error('ScopeManager not initialized. Call initialize() first.');
        }
        return this.projectStore;
    }
    /**
     * Get the global scope store.
     *
     * @throws Error if not initialized
     */
    getGlobalStore() {
        if (!this.globalStore) {
            throw new Error('ScopeManager not initialized. Call initialize() first.');
        }
        return this.globalStore;
    }
    /**
     * Get the path to the project database file.
     */
    getProjectDatabasePath() {
        return getDatabasePath(getProjectMemoryPath(this.projectRoot));
    }
    /**
     * Get the path to the global database file.
     */
    getGlobalDatabasePath() {
        return getDatabasePath(this.globalPath);
    }
    /**
     * Get the project root directory.
     */
    getProjectRoot() {
        return this.projectRoot;
    }
    /**
     * Check if both stores are initialized.
     */
    isInitialized() {
        return this.projectStore !== null && this.globalStore !== null;
    }
}
// =============================================================================
// Global Scope Manager (Singleton)
// =============================================================================
let globalScopeManager = null;
/**
 * Get or create the global scope manager singleton.
 *
 * @param options - Options for creating the manager (only used on first call)
 * @returns The global ScopeManager instance
 */
export function getScopeManager(options) {
    if (!globalScopeManager) {
        globalScopeManager = new ScopeManager(options);
    }
    return globalScopeManager;
}
/**
 * Reset the global scope manager (for testing).
 */
export function resetScopeManager() {
    if (globalScopeManager) {
        globalScopeManager.close();
        globalScopeManager = null;
    }
}
//# sourceMappingURL=scopes.js.map