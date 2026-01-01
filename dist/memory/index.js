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
saveBlock, importBlock, getBlock, getAllBlocks, deleteBlock, 
// Conversation operations
addMessage, getHistory, clearHistory, 
// Agent operations
createAgent, getAgent, updateAgentLastUsed, } from './store.js';
// =============================================================================
// Scope Exports
// =============================================================================
export { 
// Path resolution
getGlobalMemoryPath, getProjectMemoryPath, detectProjectRoot, 
// Directory management
ensureMemoryDirectory, getDatabasePath, ScopeManager, getScopeManager, resetScopeManager, } from './scopes.js';
// =============================================================================
// Service Exports
// =============================================================================
export { 
// MemoryService class
MemoryService, getMemoryService, resetMemoryService, } from './service.js';
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
// Command Exports
// =============================================================================
export { 
// Init command
scanProjectStructure, detectTechStack, detectPatterns, createInitialMemory, initCommand, } from './commands/init.js';
export { 
// Remember command
parseInstruction, detectTargetBlock, updateMemoryFromInstruction, rememberCommand, } from './commands/remember.js';
export { 
// Clear command
clearSession, verifyMemoryIntact, clearCommand, } from './commands/clear.js';
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