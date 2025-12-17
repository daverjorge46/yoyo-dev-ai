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

import { readFileSync, writeFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import type {
  MemoryBlock,
  MemoryBlockType,
  MemoryScope,
  MemoryBlockContent,
  PersonaContent,
  ProjectContent,
  UserContent,
  CorrectionsContent,
  ConversationMessage,
  MessageRole,
} from './types.js';
import {
  saveBlock as storeSaveBlock,
  getBlock as storeGetBlock,
  getAllBlocks as storeGetAllBlocks,
  deleteBlock as storeDeleteBlock,
  addMessage,
  getHistory,
  clearHistory,
} from './store.js';
import { ScopeManager, type ScopeManagerOptions } from './scopes.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a MemoryService.
 */
export interface MemoryServiceOptions extends ScopeManagerOptions {}

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

// =============================================================================
// Event Types (re-exported for convenience)
// =============================================================================

export interface MemoryServiceEvents {
  'memory:loaded': { scope: MemoryScope; blocks: MemoryBlock[] };
  'memory:updated': { block: MemoryBlock; previousVersion: number; isNew: boolean };
  'memory:deleted': { id: string; type: MemoryBlockType; scope: MemoryScope };
  'memory:error': { error: Error; operation: string };
  'memory:scope:changed': { previousScope: MemoryScope; newScope: MemoryScope };
  'memory:cleared': { agentId: string };
}

// =============================================================================
// MemoryService Class
// =============================================================================

/**
 * Main service for memory operations.
 *
 * Provides a high-level API for working with memory blocks,
 * handling scope management, and emitting events for GUI integration.
 */
export class MemoryService extends EventEmitter {
  private scopeManager: ScopeManager;
  private initialized = false;

  constructor(options: MemoryServiceOptions = {}) {
    super();
    this.scopeManager = new ScopeManager(options);
  }

  /**
   * Initialize the service.
   * Creates directories and opens database connections.
   */
  initialize(): void {
    this.scopeManager.initialize();
    this.initialized = true;
  }

  /**
   * Close the service.
   * Closes database connections.
   */
  close(): void {
    this.scopeManager.close();
    this.initialized = false;
  }

  /**
   * Check if the service is initialized.
   */
  isInitialized(): boolean {
    return this.initialized && this.scopeManager.isInitialized();
  }

  // ===========================================================================
  // Scope Management
  // ===========================================================================

  /**
   * Get the current scope.
   */
  getCurrentScope(): MemoryScope {
    return this.scopeManager.getCurrentScope();
  }

  /**
   * Set the current scope.
   * Emits memory:scope:changed event.
   */
  setScope(scope: MemoryScope): void {
    const previousScope = this.scopeManager.getCurrentScope();
    if (previousScope === scope) return;

    this.scopeManager.setScope(scope);

    this.emit('memory:scope:changed', {
      previousScope,
      newScope: scope,
    });
  }

  // ===========================================================================
  // Block Operations
  // ===========================================================================

  /**
   * Save a memory block.
   * Emits memory:updated event.
   *
   * @param type - Block type
   * @param content - Block content
   * @param scope - Target scope (defaults to current scope)
   * @returns The saved block
   */
  saveBlock(
    type: MemoryBlockType,
    content: MemoryBlockContent,
    scope?: MemoryScope
  ): MemoryBlock {
    const targetScope = scope ?? this.scopeManager.getCurrentScope();
    const store =
      targetScope === 'global'
        ? this.scopeManager.getGlobalStore()
        : this.scopeManager.getProjectStore();

    // Check if block exists (for version tracking)
    const existing = storeGetBlock(store, type, targetScope);
    const previousVersion = existing?.version ?? 0;

    const block = storeSaveBlock(store, {
      type,
      scope: targetScope,
      content,
    });

    this.emit('memory:updated', {
      block,
      previousVersion,
      isNew: previousVersion === 0,
    });

    return block;
  }

  /**
   * Get a memory block by type.
   *
   * @param type - Block type
   * @param scope - Scope to search (defaults to current scope)
   * @returns The block or null
   */
  getBlock(type: MemoryBlockType, scope?: MemoryScope): MemoryBlock | null {
    const targetScope = scope ?? this.scopeManager.getCurrentScope();
    const store =
      targetScope === 'global'
        ? this.scopeManager.getGlobalStore()
        : this.scopeManager.getProjectStore();

    return storeGetBlock(store, type, targetScope);
  }

  /**
   * Get all memory blocks for a scope.
   *
   * @param scope - Scope to search (defaults to current scope)
   * @returns Array of blocks
   */
  getAllBlocks(scope?: MemoryScope): MemoryBlock[] {
    const targetScope = scope ?? this.scopeManager.getCurrentScope();
    const store =
      targetScope === 'global'
        ? this.scopeManager.getGlobalStore()
        : this.scopeManager.getProjectStore();

    return storeGetAllBlocks(store, targetScope);
  }

  /**
   * Delete a memory block by ID.
   * Emits memory:deleted event.
   *
   * @param id - Block ID
   * @param scope - Scope to delete from (defaults to current scope)
   */
  deleteBlock(id: string, scope?: MemoryScope): void {
    const targetScope = scope ?? this.scopeManager.getCurrentScope();
    const store =
      targetScope === 'global'
        ? this.scopeManager.getGlobalStore()
        : this.scopeManager.getProjectStore();

    // Get block info before deleting for event
    const blocks = storeGetAllBlocks(store, targetScope);
    const block = blocks.find((b) => b.id === id);

    storeDeleteBlock(store, id);

    if (block) {
      this.emit('memory:deleted', {
        id,
        type: block.type,
        scope: targetScope,
      });
    }
  }

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  /**
   * Get persona content from project scope (with global fallback).
   */
  getPersona(): PersonaContent | null {
    const memory = this.loadAllMemory();
    return (memory.persona?.content as PersonaContent) ?? null;
  }

  /**
   * Get project content from project scope (with global fallback).
   */
  getProject(): ProjectContent | null {
    const memory = this.loadAllMemory();
    return (memory.project?.content as ProjectContent) ?? null;
  }

  /**
   * Get user content from project scope (with global fallback).
   */
  getUser(): UserContent | null {
    const memory = this.loadAllMemory();
    return (memory.user?.content as UserContent) ?? null;
  }

  /**
   * Get corrections content from project scope (with global fallback).
   */
  getCorrections(): CorrectionsContent | null {
    const memory = this.loadAllMemory();
    return (memory.corrections?.content as CorrectionsContent) ?? null;
  }

  // ===========================================================================
  // Scope Merging
  // ===========================================================================

  /**
   * Load all memory blocks with scope merging.
   * Project scope overrides global scope for same block types.
   * Emits memory:loaded event.
   *
   * @returns Merged memory with all block types
   */
  loadAllMemory(): LoadedMemory {
    const projectStore = this.scopeManager.getProjectStore();
    const globalStore = this.scopeManager.getGlobalStore();

    // Get blocks from both scopes
    const projectBlocks = storeGetAllBlocks(projectStore, 'project');
    const globalBlocks = storeGetAllBlocks(globalStore, 'global');

    // Create merged memory (project overrides global)
    const memory: LoadedMemory = {};
    const allBlocks: MemoryBlock[] = [];

    // First, add global blocks
    for (const block of globalBlocks) {
      if (block.type === 'persona') {
        memory.persona = block as MemoryBlock<PersonaContent>;
      } else if (block.type === 'project') {
        memory.project = block as MemoryBlock<ProjectContent>;
      } else if (block.type === 'user') {
        memory.user = block as MemoryBlock<UserContent>;
      } else if (block.type === 'corrections') {
        memory.corrections = block as MemoryBlock<CorrectionsContent>;
      }
    }

    // Then, override with project blocks
    for (const block of projectBlocks) {
      if (block.type === 'persona') {
        memory.persona = block as MemoryBlock<PersonaContent>;
      } else if (block.type === 'project') {
        memory.project = block as MemoryBlock<ProjectContent>;
      } else if (block.type === 'user') {
        memory.user = block as MemoryBlock<UserContent>;
      } else if (block.type === 'corrections') {
        memory.corrections = block as MemoryBlock<CorrectionsContent>;
      }
    }

    // Collect all resulting blocks for event
    if (memory.persona) allBlocks.push(memory.persona);
    if (memory.project) allBlocks.push(memory.project);
    if (memory.user) allBlocks.push(memory.user);
    if (memory.corrections) allBlocks.push(memory.corrections);

    this.emit('memory:loaded', {
      scope: 'project', // Indicates project scope was used for merging
      blocks: allBlocks,
    });

    return memory;
  }

  // ===========================================================================
  // Import/Export
  // ===========================================================================

  /**
   * Export all memory blocks to JSON.
   * Optionally writes to file.
   *
   * @param filePath - Optional file path to write to
   * @returns Export data
   */
  exportMemory(filePath?: string): MemoryExport {
    const blocks = this.getAllBlocks();

    const exportData: MemoryExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      blocks: blocks.map((block) => ({
        id: block.id,
        type: block.type,
        scope: block.scope,
        content: block.content,
        version: block.version,
        createdAt: block.createdAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
      })),
    };

    if (filePath) {
      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    }

    return exportData;
  }

  /**
   * Import memory blocks from export data or file.
   *
   * @param dataOrPath - Export data object or file path
   */
  importMemory(dataOrPath: MemoryExport | string): void {
    let data: MemoryExport;

    if (typeof dataOrPath === 'string') {
      const content = readFileSync(dataOrPath, 'utf-8');
      data = JSON.parse(content) as MemoryExport;
    } else {
      data = dataOrPath;
    }

    for (const block of data.blocks) {
      this.saveBlock(block.type, block.content, block.scope);
    }
  }

  // ===========================================================================
  // Conversation Operations
  // ===========================================================================

  /**
   * Add a message to conversation history.
   *
   * @param agentId - Agent ID
   * @param role - Message role
   * @param content - Message content
   * @param metadata - Optional metadata
   */
  addConversationMessage(
    agentId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    const store = this.scopeManager.getProjectStore();
    addMessage(store, agentId, role, content, metadata);
  }

  /**
   * Get conversation history for an agent.
   *
   * @param agentId - Agent ID
   * @param limit - Maximum messages to return
   * @returns Array of messages
   */
  getConversationHistory(agentId: string, limit = 100): ConversationMessage[] {
    const store = this.scopeManager.getProjectStore();
    return getHistory(store, agentId, limit);
  }

  /**
   * Clear conversation history for an agent.
   * Emits memory:cleared event.
   *
   * @param agentId - Agent ID
   */
  clearConversation(agentId: string): void {
    const store = this.scopeManager.getProjectStore();
    clearHistory(store, agentId);

    this.emit('memory:cleared', { agentId });
  }
}

// =============================================================================
// Global Service Instance
// =============================================================================

let globalService: MemoryService | null = null;

/**
 * Get or create the global MemoryService singleton.
 *
 * @param options - Options for creating the service (only used on first call)
 * @returns The global MemoryService instance
 */
export function getMemoryService(options?: MemoryServiceOptions): MemoryService {
  if (!globalService) {
    globalService = new MemoryService(options);
  }
  return globalService;
}

/**
 * Reset the global MemoryService (for testing).
 */
export function resetMemoryService(): void {
  if (globalService) {
    globalService.close();
    globalService = null;
  }
}
