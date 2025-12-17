/**
 * MemoryService - Main Public API
 *
 * High-level service for memory operations with:
 * - Scope-aware block operations
 * - Convenience methods for typed access
 * - Scope merging (project overrides global)
 * - Event emission for GUI integration
 * - Import/export functionality
 */
import { EventEmitter } from 'node:events';
import type { MemoryBlock, MemoryBlockType, MemoryScope, MemoryBlockContent, PersonaContent, ProjectContent, UserContent, CorrectionsContent, ConversationMessage, MessageRole } from './types.js';
import { type ScopeManagerOptions } from './scopes.js';
/**
 * Options for creating a MemoryService.
 */
export interface MemoryServiceOptions extends ScopeManagerOptions {
}
/**
 * Export format for memory blocks.
 */
export interface MemoryExport {
    version: number;
    exportedAt: string;
    blocks: Array<{
        id: string;
        type: MemoryBlockType;
        scope: MemoryScope;
        content: MemoryBlockContent;
        version: number;
        createdAt: string;
        updatedAt: string;
    }>;
}
/**
 * Loaded memory with all block types.
 */
export interface LoadedMemory {
    persona?: MemoryBlock<PersonaContent>;
    project?: MemoryBlock<ProjectContent>;
    user?: MemoryBlock<UserContent>;
    corrections?: MemoryBlock<CorrectionsContent>;
}
export interface MemoryServiceEvents {
    'memory:loaded': {
        scope: MemoryScope;
        blocks: MemoryBlock[];
    };
    'memory:updated': {
        block: MemoryBlock;
        previousVersion: number;
        isNew: boolean;
    };
    'memory:deleted': {
        id: string;
        type: MemoryBlockType;
        scope: MemoryScope;
    };
    'memory:error': {
        error: Error;
        operation: string;
    };
    'memory:scope:changed': {
        previousScope: MemoryScope;
        newScope: MemoryScope;
    };
    'memory:cleared': {
        agentId: string;
    };
}
/**
 * Main service for memory operations.
 *
 * Provides a high-level API for working with memory blocks,
 * handling scope management, and emitting events for GUI integration.
 */
export declare class MemoryService extends EventEmitter {
    private scopeManager;
    private initialized;
    constructor(options?: MemoryServiceOptions);
    /**
     * Initialize the service.
     * Creates directories and opens database connections.
     */
    initialize(): void;
    /**
     * Close the service.
     * Closes database connections.
     */
    close(): void;
    /**
     * Check if the service is initialized.
     */
    isInitialized(): boolean;
    /**
     * Get the current scope.
     */
    getCurrentScope(): MemoryScope;
    /**
     * Set the current scope.
     * Emits memory:scope:changed event.
     */
    setScope(scope: MemoryScope): void;
    /**
     * Save a memory block.
     * Emits memory:updated event.
     *
     * @param type - Block type
     * @param content - Block content
     * @param scope - Target scope (defaults to current scope)
     * @returns The saved block
     */
    saveBlock(type: MemoryBlockType, content: MemoryBlockContent, scope?: MemoryScope): MemoryBlock;
    /**
     * Get a memory block by type.
     *
     * @param type - Block type
     * @param scope - Scope to search (defaults to current scope)
     * @returns The block or null
     */
    getBlock(type: MemoryBlockType, scope?: MemoryScope): MemoryBlock | null;
    /**
     * Get all memory blocks for a scope.
     *
     * @param scope - Scope to search (defaults to current scope)
     * @returns Array of blocks
     */
    getAllBlocks(scope?: MemoryScope): MemoryBlock[];
    /**
     * Delete a memory block by ID.
     * Emits memory:deleted event.
     *
     * @param id - Block ID
     * @param scope - Scope to delete from (defaults to current scope)
     */
    deleteBlock(id: string, scope?: MemoryScope): void;
    /**
     * Get persona content from project scope (with global fallback).
     */
    getPersona(): PersonaContent | null;
    /**
     * Get project content from project scope (with global fallback).
     */
    getProject(): ProjectContent | null;
    /**
     * Get user content from project scope (with global fallback).
     */
    getUser(): UserContent | null;
    /**
     * Get corrections content from project scope (with global fallback).
     */
    getCorrections(): CorrectionsContent | null;
    /**
     * Load all memory blocks with scope merging.
     * Project scope overrides global scope for same block types.
     * Emits memory:loaded event.
     *
     * @returns Merged memory with all block types
     */
    loadAllMemory(): LoadedMemory;
    /**
     * Export all memory blocks to JSON.
     * Optionally writes to file.
     *
     * @param filePath - Optional file path to write to
     * @returns Export data
     */
    exportMemory(filePath?: string): MemoryExport;
    /**
     * Import memory blocks from export data or file.
     *
     * @param dataOrPath - Export data object or file path
     */
    importMemory(dataOrPath: MemoryExport | string): void;
    /**
     * Add a message to conversation history.
     *
     * @param agentId - Agent ID
     * @param role - Message role
     * @param content - Message content
     * @param metadata - Optional metadata
     */
    addConversationMessage(agentId: string, role: MessageRole, content: string, metadata?: Record<string, unknown>): void;
    /**
     * Get conversation history for an agent.
     *
     * @param agentId - Agent ID
     * @param limit - Maximum messages to return
     * @returns Array of messages
     */
    getConversationHistory(agentId: string, limit?: number): ConversationMessage[];
    /**
     * Clear conversation history for an agent.
     * Emits memory:cleared event.
     *
     * @param agentId - Agent ID
     */
    clearConversation(agentId: string): void;
}
/**
 * Get or create the global MemoryService singleton.
 *
 * @param options - Options for creating the service (only used on first call)
 * @returns The global MemoryService instance
 */
export declare function getMemoryService(options?: MemoryServiceOptions): MemoryService;
/**
 * Reset the global MemoryService (for testing).
 */
export declare function resetMemoryService(): void;
//# sourceMappingURL=service.d.ts.map