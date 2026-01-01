# Memory System Documentation

> Yoyo Dev v4.0 Memory-First Architecture

The Memory System provides persistent, intelligent context management for AI-assisted development. It stores project knowledge, user preferences, and conversation history across sessions.

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

### Tables

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
