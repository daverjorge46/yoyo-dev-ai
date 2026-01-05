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
export { type EnhancedMemoryBlock, type SaveEnhancedBlockInput, ensureEnhancedSchema, saveEnhancedBlock, getEnhancedBlock, getAllEnhancedBlocks, updateBlockEmbeddings, updateBlockRelevance, getBlocksByRelevance, updateBlockTags, getBlocksByTags, incrementAccessCount, } from './enhanced-store.js';
export { type TagExtractionResult, extractTags, suggestTags, mergeTags, filterTagsByCategory, } from './auto-tagger.js';
export { type EmbeddingProvider, type EmbeddingConfig, type EmbeddingResult, cosineSimilarity, euclideanDistance, normalizeVector, generateEmbedding, generateEmbeddings, prepareContentForEmbedding, configFromEnv, getDefaultConfig, } from './embeddings.js';
export { type SearchResult, type SearchOptions, type SearchResponse, search, semanticSearch, keywordSearch, hybridSearch, generateBlockEmbeddings, generateMissingEmbeddings, findSimilarBlocks, } from './semantic-search.js';
export { type ParsedQuery, type QueryIntent, type SearchEngineConfig, type SearchAnalytics, type SearchStats, SearchEngine, createSearchEngine, } from './search-engine.js';
export { MIGRATION_VERSION, MIGRATION_NAME, MIGRATION_DESCRIPTION, isMigrationApplied, hasEnhancedColumns, applyMigration, rollbackMigration, getMigrationStatus, } from './migrations/v2-enhanced-schema.js';
export { type PatternType, type DetectedPattern, type PatternDetectionOptions, type ConversationAnalysis, detectConversationPatterns, analyzeConversation, detectWorkflowPatterns, inferPreferences, } from './pattern-detector.js';
export { type LearningSource, type LearningResult, type LearningDetail, type LearningContext, type LearningEngineConfig, type ConsolidationResult, LearningEngine, createLearningEngine, } from './learning-engine.js';
export { type Role, type Operation, type Permission, type RoleDefinition, type User, type AccessCheckResult, DEFAULT_ROLES, AccessControl, createAccessControl, getAccessControl, resetAccessControl, } from './access-control.js';
export { type AuditEventType, type AuditSeverity, type AuditEntry, type AuditQueryOptions, type AuditStats, type AuditLoggerConfig, AuditLogger, createAuditLogger, getAuditLogger, resetAuditLogger, } from './audit-logger.js';
export { type HealthStatus, type ComponentHealth, type HealthReport, type SystemMetrics, type OperationMetrics, type HealthMonitorConfig, HealthMonitor, createHealthMonitor, getHealthMonitor, resetHealthMonitor, } from './health-monitor.js';
export { type BackupMetadata, type BackupOptions, type RestoreOptions, type BackupResult, type RestoreResult, type VerificationResult, type BackupManagerConfig, BackupManager, createBackupManager, getBackupManager, resetBackupManager, } from './backup-manager.js';
export { type AttachmentType, type AttachmentMetadata, type AttachmentInput, type AttachmentManagerConfig, type StorageStats, AttachmentManager, createAttachmentManager, getAttachmentManager, resetAttachmentManager, } from './attachments.js';
export { type Language, type CodeSnippet, type SyntaxHighlighting, type TokenType, type SnippetInput, type SnippetManagerConfig, SnippetManager, createSnippetManager, getSnippetManager, resetSnippetManager, } from './code-snippets.js';
export { type VisualType, type VisualMemory, type VisualAnnotation, type VisualInput, type VisualMemoryConfig, VisualMemoryManager, createVisualMemoryManager, getVisualMemoryManager, resetVisualMemoryManager, } from './visual-memory.js';
/**
 * Memory system version.
 * Follows semver, aligned with yoyo-ai version.
 */
export declare const MEMORY_VERSION = "4.0.0-alpha.1";
/**
 * Memory system schema version.
 * Increment when database schema changes.
 */
export declare const MEMORY_SCHEMA_VERSION = 2;
//# sourceMappingURL=index.d.ts.map