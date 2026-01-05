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
// Enhanced Store Exports (v2)
// =============================================================================
export { 
// Schema migration
ensureEnhancedSchema, 
// Enhanced block operations
saveEnhancedBlock, getEnhancedBlock, getAllEnhancedBlocks, 
// Embeddings operations
updateBlockEmbeddings, 
// Relevance operations
updateBlockRelevance, getBlocksByRelevance, 
// Tagging operations
updateBlockTags, getBlocksByTags, 
// Access tracking
incrementAccessCount, } from './enhanced-store.js';
// =============================================================================
// Auto-Tagger Exports
// =============================================================================
export { extractTags, suggestTags, mergeTags, filterTagsByCategory, } from './auto-tagger.js';
// =============================================================================
// Embeddings Exports
// =============================================================================
export { 
// Vector operations
cosineSimilarity, euclideanDistance, normalizeVector, 
// Embedding generation
generateEmbedding, generateEmbeddings, 
// Content preparation
prepareContentForEmbedding, 
// Configuration
configFromEnv, getDefaultConfig, } from './embeddings.js';
// =============================================================================
// Semantic Search Exports
// =============================================================================
export { 
// Search functions
search, semanticSearch, keywordSearch, hybridSearch, 
// Embedding management
generateBlockEmbeddings, generateMissingEmbeddings, findSimilarBlocks, } from './semantic-search.js';
// =============================================================================
// Search Engine Exports
// =============================================================================
export { 
// SearchEngine class
SearchEngine, createSearchEngine, } from './search-engine.js';
// =============================================================================
// Migration Exports
// =============================================================================
export { 
// Migration metadata
MIGRATION_VERSION, MIGRATION_NAME, MIGRATION_DESCRIPTION, 
// Migration functions
isMigrationApplied, hasEnhancedColumns, applyMigration, rollbackMigration, getMigrationStatus, } from './migrations/v2-enhanced-schema.js';
// =============================================================================
// Pattern Detector Exports
// =============================================================================
export { 
// Pattern detection functions
detectConversationPatterns, analyzeConversation, detectWorkflowPatterns, inferPreferences, } from './pattern-detector.js';
// =============================================================================
// Learning Engine Exports
// =============================================================================
export { 
// LearningEngine class
LearningEngine, createLearningEngine, } from './learning-engine.js';
// =============================================================================
// Access Control Exports
// =============================================================================
export { 
// Constants
DEFAULT_ROLES, 
// AccessControl class
AccessControl, createAccessControl, getAccessControl, resetAccessControl, } from './access-control.js';
// =============================================================================
// Audit Logger Exports
// =============================================================================
export { 
// AuditLogger class
AuditLogger, createAuditLogger, getAuditLogger, resetAuditLogger, } from './audit-logger.js';
// =============================================================================
// Health Monitor Exports
// =============================================================================
export { 
// HealthMonitor class
HealthMonitor, createHealthMonitor, getHealthMonitor, resetHealthMonitor, } from './health-monitor.js';
// =============================================================================
// Backup Manager Exports
// =============================================================================
export { 
// BackupManager class
BackupManager, createBackupManager, getBackupManager, resetBackupManager, } from './backup-manager.js';
// =============================================================================
// Attachments Exports
// =============================================================================
export { 
// AttachmentManager class
AttachmentManager, createAttachmentManager, getAttachmentManager, resetAttachmentManager, } from './attachments.js';
// =============================================================================
// Code Snippets Exports
// =============================================================================
export { 
// SnippetManager class
SnippetManager, createSnippetManager, getSnippetManager, resetSnippetManager, } from './code-snippets.js';
// =============================================================================
// Visual Memory Exports
// =============================================================================
export { 
// VisualMemoryManager class
VisualMemoryManager, createVisualMemoryManager, getVisualMemoryManager, resetVisualMemoryManager, } from './visual-memory.js';
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
//# sourceMappingURL=index.js.map