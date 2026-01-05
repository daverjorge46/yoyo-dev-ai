# Memory System Documentation

> Yoyo Dev v6.2 Enhanced Memory System

The Memory System provides persistent, intelligent context management for AI-assisted development. It stores project knowledge, user preferences, and conversation history across sessions with **semantic search**, **auto-learning**, and **enterprise features**.

## What's New in V2

- **Semantic Search**: Vector embeddings for natural language queries
- **Auto-Learning**: Pattern detection from conversations and workflows
- **Enterprise Features**: RBAC, audit logging, health monitoring
- **Multi-Modal Support**: Attachments, code snippets, visual memory

## Overview

The memory system uses a dual-scope architecture:
- **Project scope** (`.yoyo-dev/memory/`): Project-specific context
- **Global scope** (`~/.yoyo-dev/memory/`): User preferences across all projects

Project scope takes precedence when loading memory, allowing project-specific overrides.

## Memory Block Types

### Persona Block
Stores AI assistant personality and capabilities.

```typescript
interface PersonaContent {
  name: string;                    // Assistant name
  traits: string[];                // Personality traits
  communication_style: string;     // How to communicate
  expertise_areas: string[];       // Areas of expertise
}
```

### Project Block
Stores project-specific knowledge and context.

```typescript
interface ProjectContent {
  name: string;                    // Project name
  description: string;             // Project description
  tech_stack: Record<string, any>; // Technology stack
  architecture: string;            // Architecture pattern
  patterns: string[];              // Coding patterns
  key_directories: Record<string, string>; // Important directories
}
```

### User Block
Stores user preferences and interaction patterns.

```typescript
interface UserContent {
  name: string;                    // User name
  preferences: Record<string, any>;// User preferences
  interaction_patterns: string[];  // How user prefers to interact
}
```

### Corrections Block
Stores learned corrections from past interactions.

```typescript
interface CorrectionsContent {
  entries: Array<{
    date: string;     // When correction was made
    wrong: string;    // What was incorrect
    right: string;    // What was correct
    context: string;  // Context of correction
  }>;
}
```

## Slash Commands

### `/init` - Initialize Memory

Scans your codebase and creates initial memory blocks.

**What it does:**
1. Scans project structure for directories and key files
2. Detects tech stack from `package.json`, `tsconfig.json`, etc.
3. Identifies coding patterns from sample files
4. Creates project block with detected information
5. Creates persona block tuned to project needs

**Usage:**
```bash
/init
```

**Example output:**
```
Memory initialized successfully!

Project Block:
- Name: my-react-app
- Tech Stack: TypeScript, React 18, Vite
- Architecture: component-based
- Patterns: TDD, functional components

Persona Block:
- Name: Yoyo
- Expertise: TypeScript, React, Frontend Development
```

### `/remember` - Store Information

Stores user preferences or project knowledge in memory.

**What it does:**
1. Analyzes your instruction to determine target block type
2. Updates or creates the appropriate memory block
3. Confirms what was stored and where

**Usage:**
```bash
/remember I prefer functional programming style with TypeScript
/remember Project uses Convex for the backend database
/remember Always use 2-space indentation in this project
```

**Target detection:**
- User preferences → `user` block
- Project details → `project` block
- Coding patterns → `project.patterns`
- Corrections → `corrections` block

**Example output:**
```
Remembered! Updated user block:
- Preference: functional programming style with TypeScript
```

### `/clear` - Clear Session

Clears conversation history while preserving memory blocks.

**What it does:**
1. Clears all conversation messages for the current agent
2. Preserves all memory blocks (persona, project, user, corrections)
3. Reports what was cleared vs. preserved

**Usage:**
```bash
/clear
```

**Options:**
- `--include-memory` - Also clear memory blocks (use with caution)

**Example output:**
```
Session cleared!
- 15 messages cleared
- Memory preserved: 4 blocks (persona, project, user, corrections)
```

## Programmatic Usage

### TypeScript API

```typescript
import { MemoryService } from 'yoyo-dev/memory';

// Create service
const service = new MemoryService({
  projectRoot: process.cwd(),
  globalPath: '~/.yoyo-dev/memory'
});
service.initialize();

// Save blocks
service.saveBlock('persona', {
  name: 'Yoyo',
  traits: ['helpful', 'thorough'],
  communication_style: 'technical',
  expertise_areas: ['TypeScript', 'React']
});

// Load memory (project overrides global)
const memory = service.loadAllMemory();
console.log(memory.persona?.content.name); // 'Yoyo'

// Convenience methods
const project = service.getProject();
const user = service.getUser();

// Export/Import
const backup = service.exportMemory();
service.importMemory(backup);

// Cleanup
service.close();
```

### Event System

The service emits events for GUI integration:

```typescript
service.on('memory:updated', ({ block, isNew }) => {
  console.log(`Block ${block.type} ${isNew ? 'created' : 'updated'}`);
});

service.on('memory:loaded', ({ scope, blocks }) => {
  console.log(`Loaded ${blocks.length} blocks from ${scope}`);
});

service.on('memory:deleted', ({ id, type }) => {
  console.log(`Deleted ${type} block: ${id}`);
});

service.on('memory:error', ({ error, operation }) => {
  console.error(`Error during ${operation}: ${error.message}`);
});
```

## Database Schema

The memory system uses SQLite with WAL mode for concurrent access.

### Schema V2 (Enhanced)

The enhanced schema adds vector embeddings, relevance scoring, and auto-tagging:

**memory_blocks** (V2 columns)
```sql
CREATE TABLE memory_blocks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    scope TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    -- V2 Enhanced Columns --
    embeddings TEXT,              -- JSON array of float vectors
    relevance_score REAL DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    context_tags TEXT,            -- JSON array of tags
    auto_generated INTEGER DEFAULT 0,
    confidence_level REAL DEFAULT 1.0,
    source_context TEXT
);
```

**memory_attachments** (V2)
```sql
CREATE TABLE memory_attachments (
    id TEXT PRIMARY KEY,
    block_id TEXT NOT NULL,
    type TEXT NOT NULL,           -- file, code, image, link
    name TEXT,
    content TEXT NOT NULL,        -- base64 for binary, text for code
    mime_type TEXT,
    metadata TEXT,                -- JSON
    created_at TEXT NOT NULL,
    FOREIGN KEY (block_id) REFERENCES memory_blocks(id)
);
```

**memory_audit_log** (V2 Enterprise)
```sql
CREATE TABLE memory_audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,         -- create, update, delete, access
    block_id TEXT,
    details TEXT                  -- JSON
);
```

**memory_users** (V2 Enterprise)
```sql
CREATE TABLE memory_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',     -- admin, manager, user, viewer
    permissions TEXT,             -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Schema V1 (Legacy)

**memory_blocks**
```sql
CREATE TABLE memory_blocks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,        -- persona, project, user, corrections
    scope TEXT NOT NULL,       -- global, project
    content TEXT NOT NULL,     -- JSON content
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

**conversations**
```sql
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL,        -- user, assistant, system
    content TEXT NOT NULL,
    metadata TEXT,             -- JSON metadata
    timestamp TEXT NOT NULL
);
```

**agents**
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    config TEXT,               -- JSON config
    created_at TEXT NOT NULL,
    last_used TEXT NOT NULL
);
```

## File Locations

```
~/.yoyo-dev/
└── memory/
    └── memory.db          # Global memory database

project/
└── .yoyo-dev/
    └── memory/
        └── memory.db      # Project memory database
```

## Best Practices

1. **Run `/init` first** - Always initialize memory when starting a new project
2. **Use `/remember` often** - Store preferences and corrections as you work
3. **Use `/clear` between tasks** - Start fresh conversations without losing context
4. **Keep project memory specific** - Store only project-relevant information locally
5. **Use global memory for preferences** - Store user preferences that apply everywhere

## Troubleshooting

### Memory not loading
- Verify `.yoyo-dev/memory/` directory exists
- Check file permissions on `memory.db`
- Run `/init` to create initial memory

### Blocks not persisting
- Ensure service is properly closed (`service.close()`)
- Check SQLite WAL files (`.db-wal`, `.db-shm`) are writable

---

## Enhanced Features (V2)

### Semantic Search

Search memory using natural language queries with vector embeddings.

```typescript
import { search, hybridSearch } from 'yoyo-dev/memory/semantic-search';

// Natural language search
const results = await search(store, 'TypeScript preferences');

// Hybrid search (semantic + keyword)
const results = await hybridSearch(store, 'React components styling');
```

**API Endpoints:**
- `GET /api/memory/search?q=query` - Semantic search
- `GET /api/memory/search?q=query&type=keyword` - Keyword search
- `GET /api/memory/search?q=query&type=hybrid` - Hybrid search
- `GET /api/memory/search/suggestions` - Search suggestions

### Auto-Learning

Automatically learn from conversations and workflows.

```typescript
import { createLearningEngine } from 'yoyo-dev/memory/learning-engine';

const engine = createLearningEngine({ autoApplyThreshold: 0.7, store });

// Learn from conversation
const result = engine.learnFromConversation(messages);
console.log(`Extracted ${result.learningsExtracted} patterns`);

// Learn explicit instruction
engine.learnFromInstruction('Prefer async/await over callbacks', 'corrections');

// Consolidate learnings
await engine.consolidateMemory();
```

**API Endpoints:**
- `POST /api/memory/learn/conversation` - Learn from messages
- `POST /api/memory/learn/instruction` - Learn explicit instruction
- `POST /api/memory/learn/consolidate` - Trigger consolidation
- `GET /api/memory/learn/patterns` - View detected patterns

### Enterprise Features

Role-based access control, audit logging, and health monitoring.

```typescript
import { AccessControl } from 'yoyo-dev/memory/access-control';
import { AuditLogger } from 'yoyo-dev/memory/audit-logger';
import { HealthMonitor } from 'yoyo-dev/memory/health-monitor';

// Access control
const ac = new AccessControl(store);
ac.createUser('user123', 'John', 'manager');
ac.checkPermission('user123', 'write'); // true

// Audit logging
const logger = new AuditLogger(store);
logger.log('create', blockId, { user: 'user123' });
const logs = logger.getRecentLogs(100);

// Health monitoring
const monitor = new HealthMonitor(store);
const health = await monitor.checkHealth();
console.log(health.overall); // 'healthy' | 'degraded' | 'unhealthy'
```

**API Endpoints:**
- `GET /api/memory/admin/health` - System health status
- `GET /api/memory/admin/audit` - Audit log entries
- `GET/POST/DELETE /api/memory/admin/users` - User management
- `GET/POST/DELETE /api/memory/admin/backups` - Backup management

### Multi-Modal Support

Store code snippets, files, and visual references.

```typescript
import { AttachmentManager } from 'yoyo-dev/memory/attachments';

const attachments = new AttachmentManager(store);

// Attach code snippet
attachments.attachCode(blockId, 'Example React component', `
  function Button({ label }) {
    return <button>{label}</button>;
  }
`, 'tsx');

// Attach file
await attachments.attachFile(blockId, '/path/to/image.png');

// Get attachments for block
const files = attachments.getAttachments(blockId);
```

### Migration from V1 to V2

Use `/yoyo-ai-memory` to upgrade existing memory databases:

```bash
# Run in project directory
/yoyo-ai-memory

# The command will:
# 1. Detect existing v1 schema
# 2. Add v2 enhanced columns
# 3. Preserve all existing data
# 4. Initialize embeddings for existing blocks
```

Manual migration:
```typescript
import { applyMigration, getMigrationStatus } from 'yoyo-dev/memory/migrations/v2-enhanced-schema';

const status = getMigrationStatus(store);
if (status.needsMigration) {
  const result = applyMigration(store);
  console.log(`Migrated to ${result.toVersion}`);
}
```

## Performance

The enhanced memory system is optimized for performance:

| Operation | Target | Measured |
|-----------|--------|----------|
| Keyword Search | <500ms | ~10ms |
| Hybrid Search | <1000ms | ~50ms |
| Learning (10 msgs) | <200ms | ~15ms |
| Embedding Generation | <500ms | ~30ms |
| Bulk Insert (100 blocks) | >50/sec | ~200/sec |

## API Reference

### Search Routes (`/api/memory/search`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Search memory blocks |
| GET | `/suggestions` | Get search suggestions |
| GET | `/similar/:id` | Find similar blocks |
| POST | `/batch` | Batch search queries |

### Learning Routes (`/api/memory/learn`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/conversation` | Learn from conversation |
| POST | `/instruction` | Learn explicit instruction |
| POST | `/consolidate` | Trigger memory consolidation |
| GET | `/patterns` | List detected patterns |
| GET | `/stats` | Learning statistics |

### Admin Routes (`/api/memory/admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | System health status |
| GET | `/audit` | Audit log entries |
| GET/POST/DELETE | `/users` | User CRUD |
| GET/POST/DELETE | `/backups` | Backup management |
| GET | `/analytics` | Usage analytics |
