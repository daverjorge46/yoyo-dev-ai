---
description: Initialize Yoyo Dev in current project (framework + memory system)
---

# Initialize Yoyo Dev Framework

This command initializes the complete Yoyo Dev system in the current project.

## Step 1: Check Current State

Run these checks:
```bash
# Check if .yoyo-dev already exists
ls -la .yoyo-dev/ 2>/dev/null && echo "YOYO_DEV_EXISTS" || echo "YOYO_DEV_NOT_EXISTS"

# Check if .yoyo-ai memory system exists
ls -la .yoyo-ai/memory/memory.db 2>/dev/null && echo "MEMORY_EXISTS" || echo "MEMORY_NOT_EXISTS"

# Check for deprecated .yoyo/ directory
ls -la .yoyo/ 2>/dev/null && echo "OLD_YOYO_EXISTS" || echo "NO_OLD_YOYO"
```

## Step 2: Handle Deprecated Directory

**If `.yoyo/` exists:**
Tell user: "Found deprecated `.yoyo/` directory from an old Yoyo version."

The current Yoyo Dev uses:
- `.yoyo-dev/` for framework files (instructions, standards, specs)
- `.yoyo-ai/` for memory system (SQLite database)

Ask if they want to:
1. Delete the old `.yoyo/` directory
2. Keep it (not recommended - may cause confusion)

## Step 3: Handle Different States

### If `.yoyo-dev/` does NOT exist:

The Yoyo Dev framework is not installed. Guide the user through installation:

1. Ask: "What are you building?"
2. After they respond, run `/plan-product` to set up the product mission and roadmap
3. Then initialize the memory system with `/yoyo-ai-memory`

### If `.yoyo-dev/` EXISTS:

Report the current state:

```bash
# Check product docs
ls .yoyo-dev/product/mission.md 2>/dev/null && echo "MISSION_EXISTS" || echo "NO_MISSION"

# Count specs
ls -d .yoyo-dev/specs/*/ 2>/dev/null | wc -l || echo "0"

# Check memory
ls .yoyo-ai/memory/memory.db 2>/dev/null && echo "MEMORY_OK" || echo "NO_MEMORY"
```

Show status report:
```
Yoyo Dev Status
===============

Framework (.yoyo-dev/):
  Product docs: [Found/Not found]
  Specifications: [N] specs

Memory System (.yoyo-ai/):
  Status: [Initialized/Not initialized]

Available Commands:
  /plan-product    - Set up product mission and roadmap
  /create-new      - Start a new feature specification
  /execute-tasks   - Build and ship code from tasks
  /yoyo-ai-memory  - Initialize memory system only
```

### If `.yoyo-dev/` EXISTS but NO Memory System:

Tell user:
```
Framework is installed but memory system is missing.

To initialize the memory system, run: /yoyo-ai-memory

The memory system provides:
  - Project context persistence
  - Tech stack detection
  - Pattern learning
  - Conversation history
```

## Directory Reference

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `.yoyo-dev/` | Framework | Instructions, standards, specs, product docs |
| `.yoyo-ai/` | Memory | SQLite database (`memory.db`), skills |
| `.yoyo/` | **DEPRECATED** | Old format - should be deleted |

## Quick Setup Commands

**Full setup (new project):**
1. Run `/plan-product` to define product mission
2. Run `/yoyo-ai-memory` to initialize memory

**Memory only (existing project with framework):**
- Run `/yoyo-ai-memory`

**Check status:**
```bash
# Framework
ls -la .yoyo-dev/

# Memory
ls -la .yoyo-ai/memory/

# Full tree
tree -L 2 .yoyo-dev .yoyo-ai 2>/dev/null || find .yoyo-dev .yoyo-ai -maxdepth 2 -type f 2>/dev/null
```
