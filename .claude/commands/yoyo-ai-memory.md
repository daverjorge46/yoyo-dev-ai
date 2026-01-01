---
description: Initialize Yoyo AI Memory System in current project (memory system)
---

# Initialize Yoyo AI Memory System

This command sets up the memory system inside `.yoyo-dev/` for the current project.

## Step 1: Check Current State

Run these checks:
```bash
# Check if .yoyo-dev exists (framework must be installed first)
ls -la .yoyo-dev/ 2>/dev/null && echo "YOYO_DEV_EXISTS" || echo "YOYO_DEV_NOT_EXISTS"

# Check if memory database exists (new location)
ls -la .yoyo-dev/memory/memory.db 2>/dev/null && echo "MEMORY_DB_EXISTS" || echo "MEMORY_DB_NOT_EXISTS"

# Check for OLD .yoyo-dev/memory/ directory (needs migration)
ls -la .yoyo-dev/memory/memory/memory.db 2>/dev/null && echo "OLD_YOYO_AI_EXISTS" || echo "NO_OLD_YOYO_AI"

# Check for deprecated .yoyo/ directory
ls -la .yoyo/ 2>/dev/null && echo "OLD_YOYO_EXISTS" || echo "NO_OLD_YOYO"
```

## Step 2: Handle Results

### If `.yoyo-dev/` does NOT exist:
Tell user: "Yoyo Dev framework is not installed. Run `/yoyo-init` first to set up the project."
Exit without proceeding.

### If `.yoyo/` exists (deprecated v1-v3):
Tell user: "Found deprecated `.yoyo/` directory from Yoyo v1-v3. This should be deleted."
Ask if they want to delete it.

### If `.yoyo-dev/memory/` exists (deprecated v4-v5):
Tell user: "Found `.yoyo-dev/memory/` directory from Yoyo v4-v5. Memory is now stored in `.yoyo-dev/memory/`."

**Migrate automatically:**
```bash
# Create new memory directory
mkdir -p .yoyo-dev/memory
mkdir -p .yoyo-dev/skills

# Move memory database if exists
if [ -f ".yoyo-dev/memory/memory/memory.db" ]; then
    mv .yoyo-dev/memory/memory/memory.db .yoyo-dev/memory/
    mv .yoyo-dev/memory/memory/memory.db-wal .yoyo-dev/memory/ 2>/dev/null || true
    mv .yoyo-dev/memory/memory/memory.db-shm .yoyo-dev/memory/ 2>/dev/null || true
fi

# Move skills if exist
if [ -d ".yoyo-dev/memory/.skills" ]; then
    mv .yoyo-dev/memory/.skills/* .yoyo-dev/skills/ 2>/dev/null || true
fi

# Remove old directory
rm -rf .yoyo-dev/memory/
```

Report: "Migrated memory from `.yoyo-dev/memory/` to `.yoyo-dev/memory/`"

### If `.yoyo-dev/memory/memory.db` already exists:
Report:
```
✓ Yoyo AI Memory System is already initialized!

Memory Location: .yoyo-dev/memory/memory.db

To check memory status, use the yoyo TUI or query the database directly.
```

### If memory does NOT exist:
Proceed to Step 3 to initialize.

## Step 3: Create Memory System

**IMPORTANT:** The memory system uses SQLite with a specific schema. Follow these steps exactly.

### 3.1 Create Directory Structure
```bash
mkdir -p .yoyo-dev/memory
mkdir -p .yoyo-dev/skills
```

### 3.2 Create SQLite Database with Schema

Create the database using Python (available on most systems):

```bash
python3 << 'INIT_MEMORY_DB'
import sqlite3
import os
from datetime import datetime

db_path = '.yoyo-dev/memory/memory.db'
os.makedirs(os.path.dirname(db_path), exist_ok=True)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Enable WAL mode for better concurrency
cursor.execute("PRAGMA journal_mode = WAL")

# Create memory_blocks table
cursor.execute("""
CREATE TABLE IF NOT EXISTS memory_blocks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('persona', 'project', 'user', 'corrections')),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'project')),
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_blocks_type ON memory_blocks(type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_blocks_scope ON memory_blocks(scope)")
cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_blocks_type_scope ON memory_blocks(type, scope)")

# Create conversations table
cursor.execute("""
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)")

# Create agents table
cursor.execute("""
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    model TEXT NOT NULL,
    memory_block_ids TEXT,
    settings TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
""")

# Create schema_metadata table
cursor.execute("""
CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
""")

# Set schema version
cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('version', '1')")

conn.commit()
conn.close()

print("✓ Memory database initialized successfully!")
print(f"  Location: {db_path}")
INIT_MEMORY_DB
```

### 3.3 Detect Project and Create Initial Memory

Now scan the project and create initial memory blocks:

```bash
python3 << 'CREATE_INITIAL_MEMORY'
import sqlite3
import json
import os
import uuid
from datetime import datetime

db_path = '.yoyo-dev/memory/memory.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Detect project info
project_name = os.path.basename(os.getcwd())
tech_stack = {"language": "Unknown", "framework": "None"}
patterns = []

# Check package.json for Node.js/TypeScript projects
if os.path.exists('package.json'):
    try:
        with open('package.json', 'r') as f:
            pkg = json.load(f)
            project_name = pkg.get('name', project_name)
            deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}

            # Detect language
            if 'typescript' in deps or os.path.exists('tsconfig.json'):
                tech_stack['language'] = 'TypeScript'
            else:
                tech_stack['language'] = 'JavaScript'

            # Detect framework
            if 'next' in deps:
                tech_stack['framework'] = 'Next.js'
            elif 'react' in deps:
                tech_stack['framework'] = 'React'
            elif 'vue' in deps:
                tech_stack['framework'] = 'Vue'
            elif 'express' in deps:
                tech_stack['framework'] = 'Express'

            # Detect other tech
            if 'vitest' in deps:
                tech_stack['testing'] = 'Vitest'
            elif 'jest' in deps:
                tech_stack['testing'] = 'Jest'
            if 'tailwindcss' in deps:
                tech_stack['styling'] = 'Tailwind CSS'
    except:
        pass

# Check pyproject.toml for Python projects
elif os.path.exists('pyproject.toml'):
    tech_stack['language'] = 'Python'
    try:
        with open('pyproject.toml', 'r') as f:
            content = f.read()
            if 'fastapi' in content.lower():
                tech_stack['framework'] = 'FastAPI'
            elif 'django' in content.lower():
                tech_stack['framework'] = 'Django'
            elif 'flask' in content.lower():
                tech_stack['framework'] = 'Flask'
            if 'pytest' in content.lower():
                tech_stack['testing'] = 'pytest'
    except:
        pass

# Detect patterns from directory structure
if os.path.exists('src/components') or os.path.exists('components'):
    patterns.append('component-based')
if os.path.exists('tests') or os.path.exists('__tests__'):
    patterns.append('TDD')
if os.path.exists('src/services') or os.path.exists('services'):
    patterns.append('service-layer')
if os.path.exists('src/hooks'):
    patterns.append('custom-hooks')

# Create project memory block
project_content = {
    "name": project_name,
    "description": f"{tech_stack['language']} project" + (f" using {tech_stack['framework']}" if tech_stack.get('framework') != 'None' else ""),
    "tech_stack": tech_stack,
    "architecture": "component-based" if 'component-based' in patterns else "modular",
    "patterns": patterns,
    "key_directories": {},
    "key_files": []
}

now = datetime.now().isoformat()
project_id = str(uuid.uuid4())

cursor.execute("""
INSERT OR REPLACE INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
VALUES (?, 'project', 'project', ?, 1, ?, ?)
""", (project_id, json.dumps(project_content), now, now))

# Create persona memory block
persona_content = {
    "name": "Yoyo",
    "traits": ["helpful", "thorough", "context-aware"],
    "communication_style": "technical",
    "expertise_areas": [tech_stack['language']] + ([tech_stack['framework']] if tech_stack.get('framework') != 'None' else [])
}

persona_id = str(uuid.uuid4())
cursor.execute("""
INSERT OR REPLACE INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
VALUES (?, 'persona', 'project', ?, 1, ?, ?)
""", (persona_id, json.dumps(persona_content), now, now))

conn.commit()
conn.close()

print("✓ Initial memory blocks created!")
print(f"  Project: {project_name}")
print(f"  Tech Stack: {tech_stack['language']}" + (f" + {tech_stack['framework']}" if tech_stack.get('framework') != 'None' else ""))
print(f"  Patterns: {', '.join(patterns) if patterns else 'None detected'}")
CREATE_INITIAL_MEMORY
```

## Step 4: Verify Installation

```bash
# Check database was created
ls -la .yoyo-dev/memory/

# Query the database to verify
python3 -c "
import sqlite3
conn = sqlite3.connect('.yoyo-dev/memory/memory.db')
cursor = conn.cursor()

# Count memory blocks
cursor.execute('SELECT COUNT(*) FROM memory_blocks')
block_count = cursor.fetchone()[0]

# Get project info
cursor.execute(\"SELECT content FROM memory_blocks WHERE type='project' LIMIT 1\")
row = cursor.fetchone()
project = row[0] if row else 'None'

print(f'Memory blocks: {block_count}')
print(f'Project data: {project[:100]}...' if project else 'No project data')
conn.close()
"
```

## Step 5: Report Success

Show the user:
```
✓ Yoyo AI Memory System Initialized!

Directory Structure:
  .yoyo-dev/
  ├── memory/
  │   └── memory.db      # SQLite database
  ├── skills/            # Skills system
  ├── instructions/      # AI workflow instructions
  ├── standards/         # Development standards
  ├── specs/             # Feature specifications
  └── ...

Memory Blocks Created:
  • project - Project context and tech stack
  • persona - AI assistant configuration

The memory system will:
  • Store project context across sessions
  • Track conversation history
  • Learn patterns and preferences

To view memory status, launch the Yoyo TUI:
  $ yoyo
```

## Directory Reference

**Everything is consolidated in `.yoyo-dev/`:**

| Directory | Purpose |
|-----------|---------|
| `.yoyo-dev/memory/` | SQLite database for memory system |
| `.yoyo-dev/skills/` | Skills system |
| `.yoyo-dev/instructions/` | AI workflow instructions |
| `.yoyo-dev/standards/` | Development standards |
| `.yoyo-dev/specs/` | Feature specifications |
| `.yoyo-dev/product/` | Product docs (mission, roadmap) |

**Deprecated directories (will be auto-migrated):**

| Directory | Status |
|-----------|--------|
| `.yoyo-dev/memory/` | **DEPRECATED v4-v5** - auto-migrated to `.yoyo-dev/memory/` |
| `.yoyo/` | **DEPRECATED v1-v3** - should be deleted |
