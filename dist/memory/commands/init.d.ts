/**
 * /init Command Implementation
 *
 * Performs deep codebase analysis to populate initial memory:
 * - Scans project structure
 * - Detects tech stack from config files
 * - Identifies coding patterns
 * - Creates project and persona memory blocks
 */
import type { MemoryService } from '../service.js';
import type { InitOptions } from '../types.js';
/**
 * Scanned project structure.
 */
export interface ProjectStructure {
    root: string;
    directories: string[];
    keyFiles: string[];
    fileTypes: Record<string, number>;
    totalFiles: number;
}
/**
 * Detected technology stack.
 */
export interface TechStack {
    language: string;
    framework?: string;
    database?: string;
    styling?: string;
    testing?: string;
    buildTool?: string;
}
/**
 * Result of init command execution.
 */
export interface InitResult {
    success: boolean;
    blocksCreated: number;
    message: string;
}
/**
 * Scan project structure to understand layout.
 *
 * @param projectRoot - Project root directory
 * @returns Scanned project structure
 */
export declare function scanProjectStructure(projectRoot: string): ProjectStructure;
/**
 * Detect technology stack from project files.
 *
 * @param projectRoot - Project root directory
 * @returns Detected tech stack
 */
export declare function detectTechStack(projectRoot: string): TechStack;
/**
 * Detect coding patterns from project structure.
 *
 * @param projectRoot - Project root directory
 * @returns Array of detected patterns
 */
export declare function detectPatterns(projectRoot: string): string[];
/**
 * Create initial memory blocks from detected information.
 *
 * @param service - MemoryService instance
 * @param projectRoot - Project root directory
 * @param options - Init options
 */
export declare function createInitialMemory(service: MemoryService, projectRoot: string, _options?: InitOptions): void;
/**
 * Execute the /init command.
 *
 * @param service - MemoryService instance
 * @param projectRoot - Project root directory
 * @param options - Init options
 * @returns Init result
 */
export declare function initCommand(service: MemoryService, projectRoot: string, options?: InitOptions): Promise<InitResult>;
//# sourceMappingURL=init.d.ts.map