/**
 * Memory Store - SQLite Database Layer
 *
 * Provides persistent storage for memory blocks, conversations, and agents
 * using better-sqlite3 for synchronous, fast local storage.
 */
import Database from 'better-sqlite3';
import type { MemoryBlock, MemoryBlockType, MemoryScope, MemoryBlockContent, ConversationMessage, Agent, MessageRole } from './types.js';
/**
 * Memory store instance wrapping the database connection.
 */
export interface MemoryStore {
    db: Database.Database;
    path: string;
}
/**
 * Input for saving a memory block.
 */
export interface SaveBlockInput {
    type: MemoryBlockType;
    scope: MemoryScope;
    content: MemoryBlockContent;
}
/**
 * Input for importing a memory block with existing metadata.
 */
export interface ImportBlockInput {
    id: string;
    type: MemoryBlockType;
    scope: MemoryScope;
    content: MemoryBlockContent;
    version: number;
    createdAt: string;
    updatedAt: string;
}
/**
 * Input for creating an agent.
 */
export interface CreateAgentInput {
    name?: string;
    model: string;
    memoryBlockIds?: string[];
    settings?: Record<string, unknown>;
}
/**
 * Migration definition for schema updates.
 */
export interface Migration {
    version: number;
    up: string;
    down: string;
}
/**
 * Current schema version.
 */
export declare const SCHEMA_VERSION = 1;
/**
 * Initialize the database with full schema.
 *
 * @param dbPath - Path to the SQLite database file
 * @returns MemoryStore instance
 */
export declare function initializeDatabase(dbPath: string): MemoryStore;
/**
 * Close the database connection.
 *
 * @param store - MemoryStore instance to close
 */
export declare function closeDatabase(store: MemoryStore): void;
/**
 * Get the current schema version.
 *
 * @param store - MemoryStore instance
 * @returns Current schema version number
 */
export declare function getSchemaVersion(store: MemoryStore): number;
/**
 * Run pending database migrations.
 *
 * @param store - MemoryStore instance
 */
export declare function migrateDatabase(store: MemoryStore): void;
/**
 * Save a memory block to the database.
 * Creates a new block or updates existing one (matched by type + scope).
 *
 * @param store - MemoryStore instance
 * @param input - Block data to save
 * @returns The saved MemoryBlock
 */
export declare function saveBlock(store: MemoryStore, input: SaveBlockInput): MemoryBlock;
/**
 * Import a memory block preserving its original metadata.
 * Replaces any existing block with the same type/scope to keep IDs aligned.
 *
 * @param store - MemoryStore instance
 * @param input - Block data with metadata to import
 * @returns The imported MemoryBlock
 */
export declare function importBlock(store: MemoryStore, input: ImportBlockInput): MemoryBlock;
/**
 * Get a memory block by type and scope.
 *
 * @param store - MemoryStore instance
 * @param type - Block type
 * @param scope - Block scope
 * @returns MemoryBlock or null if not found
 */
export declare function getBlock(store: MemoryStore, id: string): MemoryBlock | null;
export declare function getBlock(store: MemoryStore, type: MemoryBlockType, scope: MemoryScope): MemoryBlock | null;
/**
 * Get all memory blocks for a scope.
 *
 * @param store - MemoryStore instance
 * @param scope - Block scope to filter by (optional, returns all if omitted)
 * @returns Array of MemoryBlocks
 */
export declare function getAllBlocks(store: MemoryStore, scope?: MemoryScope): MemoryBlock[];
/**
 * Delete a memory block by ID.
 *
 * @param store - MemoryStore instance
 * @param id - Block ID to delete
 */
export declare function deleteBlock(store: MemoryStore, id: string): void;
/**
 * Add a message to conversation history.
 *
 * @param store - MemoryStore instance
 * @param agentId - Agent ID for the conversation
 * @param role - Message role (user, assistant, system)
 * @param content - Message content
 * @param metadata - Optional metadata (tool calls, etc.)
 */
export declare function addMessage(store: MemoryStore, agentId: string, role: MessageRole, content: string, metadata?: Record<string, unknown>): void;
/**
 * Get conversation history for an agent.
 * Returns messages in chronological order (oldest first).
 *
 * @param store - MemoryStore instance
 * @param agentId - Agent ID to get history for
 * @param limit - Maximum number of messages to return (default: 100)
 * @returns Array of ConversationMessages
 */
export declare function getHistory(store: MemoryStore, agentId: string, limit?: number): ConversationMessage[];
/**
 * Clear all conversation history for an agent.
 *
 * @param store - MemoryStore instance
 * @param agentId - Agent ID to clear history for
 */
export declare function clearHistory(store: MemoryStore, agentId: string): void;
/**
 * Create a new agent.
 *
 * @param store - MemoryStore instance
 * @param input - Agent creation data
 * @returns The created Agent
 */
export declare function createAgent(store: MemoryStore, input: CreateAgentInput): Agent;
/**
 * Get an agent by ID.
 *
 * @param store - MemoryStore instance
 * @param id - Agent ID
 * @returns Agent or null if not found
 */
export declare function getAgent(store: MemoryStore, id: string): Agent | null;
/**
 * Update an agent's last_used timestamp.
 *
 * @param store - MemoryStore instance
 * @param id - Agent ID
 */
export declare function updateAgentLastUsed(store: MemoryStore, id: string): void;
//# sourceMappingURL=store.d.ts.map