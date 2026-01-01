# Yoyo AI Memory System Setup Guide

This document provides detailed instructions for setting up the Yoyo AI Memory System.

## Overview

The Yoyo AI Memory System provides persistent storage for:
- **Project context** - Tech stack, architecture, patterns
- **Persona configuration** - AI assistant traits and expertise
- **User preferences** - Communication style, workflow preferences
- **Conversation history** - Track interactions across sessions
- **Corrections** - Learn from mistakes

## Directory Structure

**Everything is consolidated in `.yoyo-dev/`:**

```
Project Root/
└── .yoyo-dev/               # All Yoyo Dev files
    ├── memory/              # Memory System
    │   └── memory.db        # SQLite database
    ├── skills/              # Skills tracking
    │   └── skills.db        # Skills database (optional)
    ├── instructions/        # AI workflow instructions
    ├── standards/           # Development standards
    ├── product/             # Product docs
    └── specs/               # Feature specifications
```

**Deprecated directories (auto-migrated):**
- `.yoyo-dev/memory/` - v4-v5 memory location (migrated to `.yoyo-dev/memory/`)
- `.yoyo/` - v1-v3 format (should be deleted)

## Database Schema

### Tables

#### `memory_blocks`
Stores memory content by type and scope.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| type | TEXT | 'persona', 'project', 'user', or 'corrections' |
| scope | TEXT | 'global' or 'project' |
| content | TEXT | JSON content |
| version | INTEGER | Version number for updates |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**Constraints:**
- `type` must be one of: `persona`, `project`, `user`, `corrections`
- `scope` must be one of: `global`, `project`
- Unique constraint on `(type, scope)` - only one block per type per scope

#### `conversations`
Tracks conversation history.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| agent_id | TEXT | Agent that participated |
| role | TEXT | 'user', 'assistant', or 'system' |
| content | TEXT | Message content |
| timestamp | TEXT | ISO timestamp |
| metadata | TEXT | Optional JSON metadata |

#### `agents`
Stores agent configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| name | TEXT | Agent name (optional) |
| model | TEXT | Model identifier |
| memory_block_ids | TEXT | JSON array of block IDs |
| settings | TEXT | JSON settings |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

#### `schema_metadata`
Tracks schema version for migrations.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Metadata key |
| value | TEXT | Metadata value |

## Memory Block Content Schemas

### Project Block
```json
{
  "name": "project-name",
  "description": "TypeScript project using React",
  "tech_stack": {
    "language": "TypeScript",
    "framework": "React",
    "testing": "Vitest",
    "styling": "Tailwind CSS",
    "database": "SQLite",
    "build_tool": "Vite"
  },
  "architecture": "component-based",
  "patterns": ["TDD", "service-layer", "custom-hooks"],
  "key_directories": {
    "src": "Source code",
    "src/components": "UI components",
    "tests": "Test files"
  },
  "key_files": ["package.json", "tsconfig.json"]
}
```

### Persona Block
```json
{
  "name": "Yoyo",
  "traits": ["helpful", "thorough", "context-aware"],
  "communication_style": "technical",
  "expertise_areas": ["TypeScript", "React", "Vitest"]
}
```

### User Block
```json
{
  "preferences": {
    "verbosity": "concise",
    "code_style": "functional",
    "testing_approach": "TDD"
  },
  "known_concepts": ["React hooks", "TypeScript generics"],
  "working_hours": "9-5 EST"
}
```

### Corrections Block
```json
{
  "corrections": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "original": "Used class component",
      "corrected": "Use functional component with hooks",
      "context": "React development"
    }
  ]
}
```

## Dual Scope Architecture

The memory system supports two scopes:

### Global Scope (`~/.yoyo-dev/memory/`)
- User preferences that apply to all projects
- Default persona configuration
- Cross-project patterns

### Project Scope (`.yoyo-dev/memory/`)
- Project-specific context
- Project-specific persona adjustments
- Project patterns and conventions

**Resolution Order:** Project scope overrides global scope when blocks of the same type exist.

## Initialization Script

Use this Python script to initialize the memory system:

```python
#!/usr/bin/env python3
"""
Initialize Yoyo AI Memory System

Creates:
- .yoyo-dev/memory/memory.db - SQLite database with schema
- Initial project and persona memory blocks
"""

import sqlite3
import json
import os
import uuid
from datetime import datetime

def init_memory_database(project_root: str = ".") -> str:
    """Initialize the memory database with schema."""

    db_dir = os.path.join(project_root, ".yoyo-dev", "memory")
    os.makedirs(db_dir, exist_ok=True)

    db_path = os.path.join(db_dir, "memory.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Enable WAL mode
    cursor.execute("PRAGMA journal_mode = WAL")

    # Create tables
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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schema_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute("INSERT OR REPLACE INTO schema_metadata (key, value) VALUES ('version', '1')")

    conn.commit()
    conn.close()

    return db_path


def detect_tech_stack(project_root: str = ".") -> dict:
    """Detect technology stack from project files."""

    tech_stack = {"language": "Unknown", "framework": "None"}

    # Check package.json
    pkg_path = os.path.join(project_root, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

                # Language
                if "typescript" in deps or os.path.exists(os.path.join(project_root, "tsconfig.json")):
                    tech_stack["language"] = "TypeScript"
                else:
                    tech_stack["language"] = "JavaScript"

                # Framework
                if "next" in deps: tech_stack["framework"] = "Next.js"
                elif "react" in deps: tech_stack["framework"] = "React"
                elif "vue" in deps: tech_stack["framework"] = "Vue"
                elif "express" in deps: tech_stack["framework"] = "Express"

                # Testing
                if "vitest" in deps: tech_stack["testing"] = "Vitest"
                elif "jest" in deps: tech_stack["testing"] = "Jest"

                # Styling
                if "tailwindcss" in deps: tech_stack["styling"] = "Tailwind CSS"
        except:
            pass

    # Check pyproject.toml
    elif os.path.exists(os.path.join(project_root, "pyproject.toml")):
        tech_stack["language"] = "Python"
        try:
            with open(os.path.join(project_root, "pyproject.toml")) as f:
                content = f.read().lower()
                if "fastapi" in content: tech_stack["framework"] = "FastAPI"
                elif "django" in content: tech_stack["framework"] = "Django"
                if "pytest" in content: tech_stack["testing"] = "pytest"
        except:
            pass

    return tech_stack


def detect_patterns(project_root: str = ".") -> list:
    """Detect coding patterns from directory structure."""

    patterns = []

    dirs_to_check = [
        ("src/components", "component-based"),
        ("components", "component-based"),
        ("tests", "TDD"),
        ("__tests__", "TDD"),
        ("src/services", "service-layer"),
        ("services", "service-layer"),
        ("src/hooks", "custom-hooks"),
        ("src/utils", "utility-functions"),
        ("src/api", "REST-API"),
    ]

    for path, pattern in dirs_to_check:
        if os.path.exists(os.path.join(project_root, path)):
            if pattern not in patterns:
                patterns.append(pattern)

    return patterns


def create_initial_memory(db_path: str, project_root: str = "."):
    """Create initial project and persona memory blocks."""

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get project name
    project_name = os.path.basename(os.path.abspath(project_root))
    pkg_path = os.path.join(project_root, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path) as f:
                project_name = json.load(f).get("name", project_name)
        except:
            pass

    tech_stack = detect_tech_stack(project_root)
    patterns = detect_patterns(project_root)

    now = datetime.now().isoformat()

    # Project block
    project_content = {
        "name": project_name,
        "description": f"{tech_stack['language']} project" +
                      (f" using {tech_stack['framework']}" if tech_stack.get('framework') != 'None' else ""),
        "tech_stack": tech_stack,
        "architecture": "component-based" if "component-based" in patterns else "modular",
        "patterns": patterns,
        "key_directories": {},
        "key_files": []
    }

    cursor.execute("""
    INSERT OR REPLACE INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
    VALUES (?, 'project', 'project', ?, 1, ?, ?)
    """, (str(uuid.uuid4()), json.dumps(project_content), now, now))

    # Persona block
    expertise = [tech_stack['language']]
    if tech_stack.get('framework') and tech_stack['framework'] != 'None':
        expertise.append(tech_stack['framework'])

    persona_content = {
        "name": "Yoyo",
        "traits": ["helpful", "thorough", "context-aware"],
        "communication_style": "technical",
        "expertise_areas": expertise
    }

    cursor.execute("""
    INSERT OR REPLACE INTO memory_blocks (id, type, scope, content, version, created_at, updated_at)
    VALUES (?, 'persona', 'project', ?, 1, ?, ?)
    """, (str(uuid.uuid4()), json.dumps(persona_content), now, now))

    conn.commit()
    conn.close()

    return project_content, persona_content


if __name__ == "__main__":
    import sys

    project_root = sys.argv[1] if len(sys.argv) > 1 else "."

    print("Initializing Yoyo AI Memory System...")
    db_path = init_memory_database(project_root)
    print(f"  Database: {db_path}")

    project, persona = create_initial_memory(db_path, project_root)
    print(f"  Project: {project['name']}")
    print(f"  Tech: {project['tech_stack']['language']}")
    print("  Done!")
```

## Verification

After initialization, verify with:

```bash
# Check directory structure
ls -la .yoyo-dev/memory/

# Query database
sqlite3 .yoyo-dev/memory/memory.db "SELECT type, scope, json_extract(content, '$.name') FROM memory_blocks"
```

Expected output:
```
project|project|your-project-name
persona|project|Yoyo
```

## Integration with Claude Code

The memory system integrates with Claude Code via:
- Custom status line showing memory status
- `/status` command displays memory block count
- `/yoyo-ai-memory` command initializes the memory system

## Troubleshooting

### "Database is locked"
The database uses WAL mode which should prevent most locking issues. If you see lock errors:
1. Close any other processes accessing the database
2. Check for stale `.db-wal` or `.db-shm` files

### "No such table: memory_blocks"
The database wasn't initialized properly. Run the initialization script again.

### Memory not showing in status
1. Check the database exists: `ls .yoyo-dev/memory/memory.db`
2. Check the schema: `sqlite3 .yoyo-dev/memory/memory.db ".schema"`
3. Check for data: `sqlite3 .yoyo-dev/memory/memory.db "SELECT COUNT(*) FROM memory_blocks"`

## Migration from v4-v5

If you have an existing `.yoyo-dev/memory/` directory, it will be automatically migrated:

```bash
# Manual migration if needed
mkdir -p .yoyo-dev/memory
mkdir -p .yoyo-dev/skills
mv .yoyo-dev/memory/memory/memory.db .yoyo-dev/memory/
mv .yoyo-dev/memory/.skills/* .yoyo-dev/skills/ 2>/dev/null || true
rm -rf .yoyo-dev/memory/
```
