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

export {
  // Core types
  type MemoryBlockType,
  type MemoryScope,
  type MessageRole,

  // Content schemas
  type PersonaContent,
  type ProjectContent,
  type UserContent,
  type CorrectionEntry,
  type CorrectionsContent,
  type MemoryBlockContent,

  // Memory block
  type MemoryBlock,
  type PersonaBlock,
  type ProjectBlock,
  type UserBlock,
  type CorrectionsBlock,

  // Conversation types
  type ConversationMessage,

  // Agent types
  type Agent,

  // Operation types
  type MemoryBlockInput,
  type InitOptions,
  type RememberOptions,
  type ClearOptions,

  // Error types
  type MemoryErrorCode,
  MemoryError,

  // Database row types (for internal use)
  type MemoryBlockRow,
  type ConversationRow,
  type AgentRow,
} from './types.js';

// =============================================================================
// Store Exports
// =============================================================================

export {
  // Store types
  type MemoryStore,
  type SaveBlockInput,
  type ImportBlockInput,
  type CreateAgentInput,
  type Migration,

  // Constants
  SCHEMA_VERSION,

  // Database lifecycle
  initializeDatabase,
  closeDatabase,
  getSchemaVersion,
  migrateDatabase,

  // Memory block operations
  saveBlock,
  importBlock,
  getBlock,
  getAllBlocks,
  deleteBlock,

  // Conversation operations
  addMessage,
  getHistory,
  clearHistory,

  // Agent operations
  createAgent,
  getAgent,
  updateAgentLastUsed,
} from './store.js';

// =============================================================================
// Scope Exports
// =============================================================================

export {
  // Path resolution
  getGlobalMemoryPath,
  getProjectMemoryPath,
  detectProjectRoot,

  // Directory management
  ensureMemoryDirectory,
  getDatabasePath,

  // ScopeManager
  type ScopeManagerOptions,
  ScopeManager,
  getScopeManager,
  resetScopeManager,
} from './scopes.js';

// =============================================================================
// Service Exports
// =============================================================================

export {
  // Service types
  type MemoryServiceOptions,
  type MemoryExport,
  type LoadedMemory,
  type MemoryServiceEvents,

  // MemoryService class
  MemoryService,
  getMemoryService,
  resetMemoryService,
} from './service.js';

// =============================================================================
// Event Exports
// =============================================================================

export {
  // Event payload types
  type MemoryLoadedPayload,
  type MemoryUpdatedPayload,
  type MemoryDeletedPayload,
  type MemoryErrorPayload,
  type MemoryInitProgressPayload,
  type MemoryInitCompletePayload,
  type MemoryScopeChangedPayload,

  // Event type map and names
  type MemoryEventMap,
  type MemoryEventName,

  // Event emitter class
  MemoryEventEmitter,

  // Helper functions
  createLoadedPayload,
  createUpdatedPayload,
  createDeletedPayload,
  createErrorPayload,
  createInitProgressPayload,
  createInitCompletePayload,

  // Global event bus
  memoryEventBus,
  getMemoryEventBus,
} from './events.js';

// =============================================================================
// Command Exports
// =============================================================================

export {
  // Init command
  scanProjectStructure,
  detectTechStack,
  detectPatterns,
  createInitialMemory,
  initCommand,
  type ProjectStructure,
  type TechStack,
  type InitResult,
} from './commands/init.js';

export {
  // Remember command
  parseInstruction,
  detectTargetBlock,
  updateMemoryFromInstruction,
  rememberCommand,
  type ParsedInstruction,
  type UpdateResult,
  type RememberResult,
} from './commands/remember.js';

export {
  // Clear command
  clearSession,
  verifyMemoryIntact,
  clearCommand,
  type ClearSessionResult,
  type MemoryVerifyResult,
  type ClearResult,
} from './commands/clear.js';

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
