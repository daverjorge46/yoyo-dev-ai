/**
 * Yoyo AI Memory System
 *
 * Memory-first architecture for persistent AI context across sessions.
 * This module provides the foundation for storing and managing:
 * - Persona blocks (agent behavior and personality)
 * - Project blocks (codebase context and architecture)
 * - User blocks (preferences and interaction patterns)
 * - Corrections blocks (learnings from feedback)
 *
 * @module memory
 */
// =============================================================================
// Type Exports
// =============================================================================
export { MemoryError, } from './types.js';
// =============================================================================
// Store Exports
// =============================================================================
export { 
// Constants
SCHEMA_VERSION, 
// Database lifecycle
initializeDatabase, closeDatabase, getSchemaVersion, migrateDatabase, 
// Memory block operations
saveBlock, getBlock, getAllBlocks, deleteBlock, 
// Conversation operations
addMessage, getHistory, clearHistory, 
// Agent operations
createAgent, getAgent, updateAgentLastUsed, } from './store.js';
// =============================================================================
// Event Exports
// =============================================================================
export { 
// Event emitter class
MemoryEventEmitter, 
// Helper functions
createLoadedPayload, createUpdatedPayload, createDeletedPayload, createErrorPayload, createInitProgressPayload, createInitCompletePayload, 
// Global event bus
memoryEventBus, getMemoryEventBus, } from './events.js';
// =============================================================================
// Version
// =============================================================================
/**
 * Memory system version.
 * Follows semver, aligned with yoyo-ai version.
 */
export const MEMORY_VERSION = '4.0.0-alpha.1';
/**
 * Memory system schema version.
 * Increment when database schema changes.
 */
export const MEMORY_SCHEMA_VERSION = 1;
//# sourceMappingURL=index.js.map