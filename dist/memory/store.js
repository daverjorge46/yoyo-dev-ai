/**
 * Memory Store - SQLite Database Layer
 *
 * Provides persistent storage for memory blocks, conversations, and agents
 * using better-sqlite3 for synchronous, fast local storage.
 */
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// Constants
// =============================================================================
/**
 * Current schema version.
 */
export const SCHEMA_VERSION = 1;
/**
 * SQL to initialize the database schema.
 */
const INIT_SQL = `
  -- Enable WAL mode for better concurrency
  PRAGMA journal_mode = WAL;

  -- Memory blocks table
  CREATE TABLE IF NOT EXISTS memory_blocks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('persona', 'project', 'user', 'corrections')),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_memory_blocks_type ON memory_blocks(type);
  CREATE INDEX IF NOT EXISTS idx_memory_blocks_scope ON memory_blocks(scope);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_blocks_type_scope ON memory_blocks(type, scope);

  -- Conversations table
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
  CREATE INDEX IF NOT EXISTS idx_conversations_agent_time ON conversations(agent_id, timestamp);

  -- Agents table
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    model TEXT NOT NULL,
    memory_block_ids TEXT,
    settings TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_agents_last_used ON agents(last_used DESC);

  -- Schema metadata
  CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
/**
 * Migrations for future schema updates.
 * Each migration should increment the version number.
 */
const MIGRATIONS = [
// Future migrations go here
// Example:
// {
//   version: 2,
//   up: 'ALTER TABLE memory_blocks ADD COLUMN tags TEXT;',
//   down: 'ALTER TABLE memory_blocks DROP COLUMN tags;'
// }
];
// =============================================================================
// Database Initialization
// =============================================================================
/**
 * Initialize the database with full schema.
 *
 * @param dbPath - Path to the SQLite database file
 * @returns MemoryStore instance
 */
export function initializeDatabase(dbPath) {
    const db = new Database(dbPath);
    // Execute schema initialization
    db.exec(INIT_SQL);
    // Set schema version if not exists
    const setMetadata = db.prepare('INSERT OR REPLACE INTO schema_metadata (key, value) VALUES (?, ?)');
    setMetadata.run('version', String(SCHEMA_VERSION));
    setMetadata.run('initialized_at', new Date().toISOString());
    const store = { db, path: dbPath };
    // Run any pending migrations
    migrateDatabase(store);
    return store;
}
/**
 * Close the database connection.
 *
 * @param store - MemoryStore instance to close
 */
export function closeDatabase(store) {
    store.db.close();
}
/**
 * Get the current schema version.
 *
 * @param store - MemoryStore instance
 * @returns Current schema version number
 */
export function getSchemaVersion(store) {
    const result = store.db
        .prepare('SELECT value FROM schema_metadata WHERE key = ?')
        .get('version');
    return result ? Number(result.value) : 0;
}
/**
 * Run pending database migrations.
 *
 * @param store - MemoryStore instance
 */
export function migrateDatabase(store) {
    const currentVersion = getSchemaVersion(store);
    for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
            store.db.exec(migration.up);
            store.db
                .prepare('UPDATE schema_metadata SET value = ? WHERE key = ?')
                .run(String(migration.version), 'version');
        }
    }
}
// =============================================================================
// Memory Block Operations
// =============================================================================
/**
 * Convert a database row to a MemoryBlock.
 */
function rowToBlock(row) {
    return {
        id: row.id,
        type: row.type,
        scope: row.scope,
        content: JSON.parse(row.content),
        version: row.version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
/**
 * Save a memory block to the database.
 * Creates a new block or updates existing one (matched by type + scope).
 *
 * @param store - MemoryStore instance
 * @param input - Block data to save
 * @returns The saved MemoryBlock
 */
export function saveBlock(store, input) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = store.db.prepare(`
    INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
    VALUES (@id, @type, @scope, @content, 1, @now, @now)
    ON CONFLICT(type, scope) DO UPDATE SET
      content = @content,
      version = version + 1,
      updated_at = @now
  `);
    stmt.run({
        id,
        type: input.type,
        scope: input.scope,
        content: JSON.stringify(input.content),
        now,
    });
    // Return the saved block
    const block = getBlock(store, input.type, input.scope);
    if (!block) {
        throw new Error(`Failed to save block: ${input.type}/${input.scope}`);
    }
    return block;
}
/**
 * Import a memory block preserving its original metadata.
 * Replaces any existing block with the same type/scope to keep IDs aligned.
 *
 * @param store - MemoryStore instance
 * @param input - Block data with metadata to import
 * @returns The imported MemoryBlock
 */
export function importBlock(store, input) {
    const stmt = store.db.prepare(`
    INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
    VALUES (@id, @type, @scope, @content, @version, @createdAt, @updatedAt)
    ON CONFLICT(type, scope) DO UPDATE SET
      id = excluded.id,
      content = excluded.content,
      version = excluded.version,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `);
    stmt.run({
        id: input.id,
        type: input.type,
        scope: input.scope,
        content: JSON.stringify(input.content),
        version: input.version,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
    });
    const block = getBlock(store, input.type, input.scope);
    if (!block) {
        throw new Error(`Failed to import block: ${input.type}/${input.scope}`);
    }
    return block;
}
/**
 * Get a memory block by type and scope.
 *
 * @param store - MemoryStore instance
 * @param type - Block type
 * @param scope - Block scope
 * @returns MemoryBlock or null if not found
 */
export function getBlock(store, type, scope) {
    const row = store.db
        .prepare('SELECT * FROM memory_blocks WHERE type = ? AND scope = ?')
        .get(type, scope);
    if (!row)
        return null;
    return rowToBlock(row);
}
/**
 * Get all memory blocks for a scope.
 *
 * @param store - MemoryStore instance
 * @param scope - Block scope to filter by
 * @returns Array of MemoryBlocks
 */
export function getAllBlocks(store, scope) {
    const rows = store.db
        .prepare('SELECT * FROM memory_blocks WHERE scope = ? ORDER BY type')
        .all(scope);
    return rows.map(rowToBlock);
}
/**
 * Delete a memory block by ID.
 *
 * @param store - MemoryStore instance
 * @param id - Block ID to delete
 */
export function deleteBlock(store, id) {
    store.db.prepare('DELETE FROM memory_blocks WHERE id = ?').run(id);
}
// =============================================================================
// Conversation Operations
// =============================================================================
/**
 * Convert a database row to a ConversationMessage.
 */
function rowToMessage(row) {
    const message = {
        id: row.id,
        agentId: row.agent_id,
        role: row.role,
        content: row.content,
        timestamp: new Date(row.timestamp),
    };
    if (row.metadata) {
        message.metadata = JSON.parse(row.metadata);
    }
    return message;
}
/**
 * Add a message to conversation history.
 *
 * @param store - MemoryStore instance
 * @param agentId - Agent ID for the conversation
 * @param role - Message role (user, assistant, system)
 * @param content - Message content
 * @param metadata - Optional metadata (tool calls, etc.)
 */
export function addMessage(store, agentId, role, content, metadata) {
    store.db
        .prepare(`INSERT INTO conversations (id, agent_id, role, content, metadata)
       VALUES (?, ?, ?, ?, ?)`)
        .run(uuidv4(), agentId, role, content, metadata ? JSON.stringify(metadata) : null);
}
/**
 * Get conversation history for an agent.
 * Returns messages in chronological order (oldest first).
 *
 * @param store - MemoryStore instance
 * @param agentId - Agent ID to get history for
 * @param limit - Maximum number of messages to return (default: 100)
 * @returns Array of ConversationMessages
 */
export function getHistory(store, agentId, limit = 100) {
    // Get the last N messages, ordered by timestamp DESC, then reverse
    const rows = store.db
        .prepare(`SELECT * FROM conversations
       WHERE agent_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`)
        .all(agentId, limit);
    // Reverse to get chronological order
    return rows.reverse().map(rowToMessage);
}
/**
 * Clear all conversation history for an agent.
 *
 * @param store - MemoryStore instance
 * @param agentId - Agent ID to clear history for
 */
export function clearHistory(store, agentId) {
    store.db.prepare('DELETE FROM conversations WHERE agent_id = ?').run(agentId);
}
// =============================================================================
// Agent Operations
// =============================================================================
/**
 * Convert a database row to an Agent.
 */
function rowToAgent(row) {
    const agent = {
        id: row.id,
        model: row.model,
        memoryBlockIds: row.memory_block_ids
            ? JSON.parse(row.memory_block_ids)
            : [],
        createdAt: new Date(row.created_at),
        lastUsed: new Date(row.last_used),
    };
    if (row.name) {
        agent.name = row.name;
    }
    if (row.settings) {
        agent.settings = JSON.parse(row.settings);
    }
    return agent;
}
/**
 * Create a new agent.
 *
 * @param store - MemoryStore instance
 * @param input - Agent creation data
 * @returns The created Agent
 */
export function createAgent(store, input) {
    const id = uuidv4();
    const now = new Date().toISOString();
    store.db
        .prepare(`INSERT INTO agents (id, name, model, memory_block_ids, settings, created_at, last_used)
       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(id, input.name ?? null, input.model, input.memoryBlockIds ? JSON.stringify(input.memoryBlockIds) : null, input.settings ? JSON.stringify(input.settings) : null, now, now);
    const agent = getAgent(store, id);
    if (!agent) {
        throw new Error(`Failed to create agent`);
    }
    return agent;
}
/**
 * Get an agent by ID.
 *
 * @param store - MemoryStore instance
 * @param id - Agent ID
 * @returns Agent or null if not found
 */
export function getAgent(store, id) {
    const row = store.db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    if (!row)
        return null;
    return rowToAgent(row);
}
/**
 * Update an agent's last_used timestamp.
 *
 * @param store - MemoryStore instance
 * @param id - Agent ID
 */
export function updateAgentLastUsed(store, id) {
    store.db
        .prepare('UPDATE agents SET last_used = ? WHERE id = ?')
        .run(new Date().toISOString(), id);
}
//# sourceMappingURL=store.js.map