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
export { type MemoryBlockType, type MemoryScope, type MessageRole, type PersonaContent, type ProjectContent, type UserContent, type CorrectionEntry, type CorrectionsContent, type MemoryBlockContent, type MemoryBlock, type PersonaBlock, type ProjectBlock, type UserBlock, type CorrectionsBlock, type ConversationMessage, type Agent, type MemoryBlockInput, type InitOptions, type RememberOptions, type ClearOptions, type MemoryErrorCode, MemoryError, type MemoryBlockRow, type ConversationRow, type AgentRow, } from './types.js';
export { type MemoryStore, type SaveBlockInput, type ImportBlockInput, type CreateAgentInput, type Migration, SCHEMA_VERSION, initializeDatabase, closeDatabase, getSchemaVersion, migrateDatabase, saveBlock, importBlock, getBlock, getAllBlocks, deleteBlock, addMessage, getHistory, clearHistory, createAgent, getAgent, updateAgentLastUsed, } from './store.js';
export { getGlobalMemoryPath, getProjectMemoryPath, detectProjectRoot, ensureMemoryDirectory, getDatabasePath, type ScopeManagerOptions, ScopeManager, getScopeManager, resetScopeManager, } from './scopes.js';
export { type MemoryServiceOptions, type MemoryExport, type LoadedMemory, type MemoryServiceEvents, MemoryService, getMemoryService, resetMemoryService, } from './service.js';
export { type MemoryLoadedPayload, type MemoryUpdatedPayload, type MemoryDeletedPayload, type MemoryErrorPayload, type MemoryInitProgressPayload, type MemoryInitCompletePayload, type MemoryScopeChangedPayload, type MemoryEventMap, type MemoryEventName, MemoryEventEmitter, createLoadedPayload, createUpdatedPayload, createDeletedPayload, createErrorPayload, createInitProgressPayload, createInitCompletePayload, memoryEventBus, getMemoryEventBus, } from './events.js';
export { scanProjectStructure, detectTechStack, detectPatterns, createInitialMemory, initCommand, type ProjectStructure, type TechStack, type InitResult, } from './commands/init.js';
export { parseInstruction, detectTargetBlock, updateMemoryFromInstruction, rememberCommand, type ParsedInstruction, type UpdateResult, type RememberResult, } from './commands/remember.js';
export { clearSession, verifyMemoryIntact, clearCommand, type ClearSessionResult, type MemoryVerifyResult, type ClearResult, } from './commands/clear.js';
/**
 * Memory system version.
 * Follows semver, aligned with yoyo-ai version.
 */
export declare const MEMORY_VERSION = "4.0.0-alpha.1";
/**
 * Memory system schema version.
 * Increment when database schema changes.
 */
export declare const MEMORY_SCHEMA_VERSION = 1;
//# sourceMappingURL=index.d.ts.map