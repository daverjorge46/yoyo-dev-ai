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
// Enhanced Store Exports (v2)
// =============================================================================

export {
  // Enhanced block types
  type EnhancedMemoryBlock,
  type SaveEnhancedBlockInput,

  // Schema migration
  ensureEnhancedSchema,

  // Enhanced block operations
  saveEnhancedBlock,
  getEnhancedBlock,
  getAllEnhancedBlocks,

  // Embeddings operations
  updateBlockEmbeddings,

  // Relevance operations
  updateBlockRelevance,
  getBlocksByRelevance,

  // Tagging operations
  updateBlockTags,
  getBlocksByTags,

  // Access tracking
  incrementAccessCount,
} from './enhanced-store.js';

// =============================================================================
// Auto-Tagger Exports
// =============================================================================

export {
  // Tag extraction
  type TagExtractionResult,
  extractTags,
  suggestTags,
  mergeTags,
  filterTagsByCategory,
} from './auto-tagger.js';

// =============================================================================
// Embeddings Exports
// =============================================================================

export {
  // Types
  type EmbeddingProvider,
  type EmbeddingConfig,
  type EmbeddingResult,

  // Vector operations
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,

  // Embedding generation
  generateEmbedding,
  generateEmbeddings,

  // Content preparation
  prepareContentForEmbedding,

  // Configuration
  configFromEnv,
  getDefaultConfig,
} from './embeddings.js';

// =============================================================================
// Semantic Search Exports
// =============================================================================

export {
  // Search types
  type SearchResult,
  type SearchOptions,
  type SearchResponse,

  // Search functions
  search,
  semanticSearch,
  keywordSearch,
  hybridSearch,

  // Embedding management
  generateBlockEmbeddings,
  generateMissingEmbeddings,
  findSimilarBlocks,
} from './semantic-search.js';

// =============================================================================
// Search Engine Exports
// =============================================================================

export {
  // Types
  type ParsedQuery,
  type QueryIntent,
  type SearchEngineConfig,
  type SearchAnalytics,
  type SearchStats,

  // SearchEngine class
  SearchEngine,
  createSearchEngine,
} from './search-engine.js';

// =============================================================================
// Migration Exports
// =============================================================================

export {
  // Migration metadata
  MIGRATION_VERSION,
  MIGRATION_NAME,
  MIGRATION_DESCRIPTION,

  // Migration functions
  isMigrationApplied,
  hasEnhancedColumns,
  applyMigration,
  rollbackMigration,
  getMigrationStatus,
} from './migrations/v2-enhanced-schema.js';

// =============================================================================
// Pattern Detector Exports
// =============================================================================

export {
  // Types
  type PatternType,
  type DetectedPattern,
  type PatternDetectionOptions,
  type ConversationAnalysis,

  // Pattern detection functions
  detectConversationPatterns,
  analyzeConversation,
  detectWorkflowPatterns,
  inferPreferences,
} from './pattern-detector.js';

// =============================================================================
// Learning Engine Exports
// =============================================================================

export {
  // Types
  type LearningSource,
  type LearningResult,
  type LearningDetail,
  type LearningContext,
  type LearningEngineConfig,
  type ConsolidationResult,

  // LearningEngine class
  LearningEngine,
  createLearningEngine,
} from './learning-engine.js';

// =============================================================================
// Access Control Exports
// =============================================================================

export {
  // Types
  type Role,
  type Operation,
  type Permission,
  type RoleDefinition,
  type User,
  type AccessCheckResult,

  // Constants
  DEFAULT_ROLES,

  // AccessControl class
  AccessControl,
  createAccessControl,
  getAccessControl,
  resetAccessControl,
} from './access-control.js';

// =============================================================================
// Audit Logger Exports
// =============================================================================

export {
  // Types
  type AuditEventType,
  type AuditSeverity,
  type AuditEntry,
  type AuditQueryOptions,
  type AuditStats,
  type AuditLoggerConfig,

  // AuditLogger class
  AuditLogger,
  createAuditLogger,
  getAuditLogger,
  resetAuditLogger,
} from './audit-logger.js';

// =============================================================================
// Health Monitor Exports
// =============================================================================

export {
  // Types
  type HealthStatus,
  type ComponentHealth,
  type HealthReport,
  type SystemMetrics,
  type OperationMetrics,
  type HealthMonitorConfig,

  // HealthMonitor class
  HealthMonitor,
  createHealthMonitor,
  getHealthMonitor,
  resetHealthMonitor,
} from './health-monitor.js';

// =============================================================================
// Backup Manager Exports
// =============================================================================

export {
  // Types
  type BackupMetadata,
  type BackupOptions,
  type RestoreOptions,
  type BackupResult,
  type RestoreResult,
  type VerificationResult,
  type BackupManagerConfig,

  // BackupManager class
  BackupManager,
  createBackupManager,
  getBackupManager,
  resetBackupManager,
} from './backup-manager.js';

// =============================================================================
// Attachments Exports
// =============================================================================

export {
  // Types
  type AttachmentType,
  type AttachmentMetadata,
  type AttachmentInput,
  type AttachmentManagerConfig,
  type StorageStats,

  // AttachmentManager class
  AttachmentManager,
  createAttachmentManager,
  getAttachmentManager,
  resetAttachmentManager,
} from './attachments.js';

// =============================================================================
// Code Snippets Exports
// =============================================================================

export {
  // Types
  type Language,
  type CodeSnippet,
  type SyntaxHighlighting,
  type TokenType,
  type SnippetInput,
  type SnippetManagerConfig,

  // SnippetManager class
  SnippetManager,
  createSnippetManager,
  getSnippetManager,
  resetSnippetManager,
} from './code-snippets.js';

// =============================================================================
// Visual Memory Exports
// =============================================================================

export {
  // Types
  type VisualType,
  type VisualMemory,
  type VisualAnnotation,
  type VisualInput,
  type VisualMemoryConfig,

  // VisualMemoryManager class
  VisualMemoryManager,
  createVisualMemoryManager,
  getVisualMemoryManager,
  resetVisualMemoryManager,
} from './visual-memory.js';

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
export const MEMORY_SCHEMA_VERSION = 2;
