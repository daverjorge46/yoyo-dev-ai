# Directory Structure Guide

> Yoyo Dev v5.0 File Organization

This guide explains the directory structure of Yoyo Dev, the purpose of each directory, and where different types of files belong.

---

## Overview

Yoyo Dev uses a unified directory:

- **`.yoyo-dev/`** - All framework files (instructions, standards, specs, fixes, product docs, memory)

---

## Framework Directory: `.yoyo-dev/`

Contains all framework-related files, workflow instructions, and development artifacts.

### Complete Structure

```
.yoyo-dev/
├── product/                    # Product documentation
│   ├── mission.md              # Full product vision
│   ├── mission-lite.md         # Condensed for AI
│   ├── tech-stack.md           # Technology decisions
│   └── roadmap.md              # Development phases
│
├── specs/                      # Feature specifications
│   └── YYYY-MM-DD-feature-name/
│       ├── spec.md             # Full requirements
│       ├── spec-lite.md        # Condensed summary
│       ├── tasks.md            # Task breakdown
│       ├── decisions.md        # Technical decisions
│       ├── state.json          # Workflow state
│       └── sub-specs/
│           ├── technical-spec.md      # Implementation details
│           ├── database-schema.md     # Schema changes (conditional)
│           └── api-spec.md            # API spec (conditional)
│
├── fixes/                      # Bug fix documentation
│   └── YYYY-MM-DD-fix-name/
│       ├── analysis.md         # Problem analysis
│       ├── solution-lite.md    # Condensed summary
│       ├── tasks.md            # Fix tasks
│       └── state.json          # State tracking
│
├── recaps/                     # Development recaps
│   └── YYYY-MM-DD-feature-name.md
│
├── patterns/                   # Saved patterns library
│   ├── authentication-patterns.md
│   ├── database-patterns.md
│   └── ui-patterns.md
│
├── instructions/               # AI workflow instructions
│   ├── core/                   # Core workflows
│   │   ├── yoyo-ai-orchestration.md   # v5.0 orchestrator
│   │   ├── plan-product.md
│   │   ├── analyze-product.md
│   │   ├── create-new.md
│   │   ├── create-spec.md
│   │   ├── create-tasks.md
│   │   ├── create-fix.md
│   │   ├── execute-tasks.md
│   │   ├── orchestrate-tasks.md
│   │   ├── review.md
│   │   └── post-execution-tasks.md
│   │
│   └── meta/                   # Meta instructions
│       ├── pre-flight.md       # Pre-execution checks
│       └── post-flight.md      # Post-execution checks
│
├── standards/                  # Development standards
│   ├── best-practices.md
│   ├── personas.md
│   ├── tech-stack.md
│   ├── design-system.md
│   ├── output-formatting.md
│   ├── parallel-execution.md
│   ├── review-modes.md
│   └── code-style/
│       ├── javascript-style.md
│       ├── css-style.md
│       └── html-style.md
│
├── claude-code/                # Claude Code integration
│   └── agents/                 # Specialized agents
│       ├── context-fetcher.md
│       ├── file-creator.md
│       ├── git-workflow.md
│       ├── project-manager.md
│       ├── test-runner.md
│       ├── implementer.md
│       ├── implementation-verifier.md
│       ├── spec-shaper.md
│       ├── tasks-list-creator.md
│       └── product-planner.md
│
├── setup/                      # Installation scripts
│   ├── install.sh              # Main installation script
│   ├── yoyo.sh                 # TUI launcher
│   ├── yoyo-gui.sh             # GUI launcher
│   ├── yoyo-update.sh          # Update script
│   ├── docker-mcp-setup.sh     # MCP server setup
│   ├── install-global-command.sh
│   └── install-deps.sh
│
└── config.yml                  # Main configuration
```

### Protected Files

These files are **NEVER overwritten** during updates:

```
.yoyo-dev/product/              # Product docs
.yoyo-dev/specs/                # Specifications
.yoyo-dev/fixes/                # Bug fixes
.yoyo-dev/recaps/               # Recaps
.yoyo-dev/patterns/             # Saved patterns
```

### Overwritable Files

These files **ARE overwritten** during updates (use `--no-overwrite` to preserve):

```
.yoyo-dev/instructions/         # Workflow instructions
.yoyo-dev/standards/            # Development standards
.yoyo-dev/setup/                # Installation scripts
.yoyo-dev/config.yml            # Configuration
```

---

## Memory System

Memory is now consolidated within `.yoyo-dev/`:

### Project Memory

```
.yoyo-dev/
└── memory/
    ├── memory.db               # SQLite database (project scope)
    ├── memory.db-wal           # Write-Ahead Log (SQLite)
    └── memory.db-shm           # Shared memory (SQLite)
```

### Global Memory

User-wide memory stored in home directory:

```
~/.yoyo-dev/
└── memory/
    └── memory.db               # SQLite database (global scope)
```

**Loading Priority:**
1. Project scope (`.yoyo-dev/memory/`)
2. Merge with global scope (`~/.yoyo-dev/memory/`)
3. Project overrides global

---

## Claude Code Configuration: `.claude/`

Claude Code integration files (symlinked from `.yoyo-dev/`).

### Complete Structure

```
.claude/
├── commands/                   # Slash commands
│   ├── plan-product.md
│   ├── analyze-product.md
│   ├── create-new.md
│   ├── create-spec.md
│   ├── create-tasks.md
│   ├── create-fix.md
│   ├── execute-tasks.md
│   ├── orchestrate-tasks.md
│   ├── research.md             # NEW v5.0
│   ├── consult-oracle.md       # NEW v5.0
│   ├── review.md
│   ├── design-init.md
│   ├── design-audit.md
│   ├── design-fix.md
│   ├── design-component.md
│   ├── init.md                 # Memory: Initialize
│   ├── remember.md             # Memory: Store
│   └── clear.md                # Memory: Clear session
│
└── agents/                     # Agent configurations
    ├── yoyo-ai.md              # NEW v5.0 Orchestrator
    ├── oracle.md               # NEW v5.0 Strategic advisor
    ├── librarian.md            # NEW v5.0 Research specialist
    ├── explore.md              # NEW v5.0 Codebase search
    ├── frontend-engineer.md    # NEW v5.0 UI/UX specialist
    ├── document-writer.md      # NEW v5.0 Technical writing
    ├── implementer.md          # TDD-based implementation
    ├── context-fetcher.md
    ├── file-creator.md
    ├── git-workflow.md
    ├── project-manager.md
    └── test-runner.md
```

**Note:** `.claude/` files are symlinks to `.yoyo-dev/` files.

---

## Workflows Directory: `workflows/`

Reusable workflow components (optional, v1.6.0+).

### Complete Structure

```
workflows/
├── planning/
│   ├── gather-requirements.md
│   └── create-roadmap.md
│
├── specification/
│   ├── create-spec.md
│   └── create-technical-spec.md
│
├── implementation/
│   ├── implement-tasks.md
│   ├── verification/
│   │   ├── verify-functionality.md
│   │   ├── verify-tests.md
│   │   ├── verify-accessibility.md
│   │   ├── verify-performance.md
│   │   ├── verify-security.md
│   │   └── verify-documentation.md
│   └── run-all-tests.md
│
└── README.md
```

**Usage in agents:**

```yaml
---
name: implementer
tools: [Write, Read, Bash]
---

{{workflows/implementation/implement-tasks.md}}

## Additional Instructions
- Always write tests first
```

---

## MCP Configuration: `.mcp.json`

Docker MCP Gateway configuration.

```json
{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"],
      "type": "stdio"
    }
  }
}
```

**Note:** This single entry routes all MCP requests through Docker MCP Gateway.

---

## File Naming Conventions

### Date Prefixes

All specs, fixes, and recaps use ISO date prefix:

**Format:** `YYYY-MM-DD-name`

**Examples:**
```
.yoyo-dev/specs/2025-12-29-user-authentication/
.yoyo-dev/fixes/2025-12-29-login-401-error/
.yoyo-dev/recaps/2025-12-29-user-authentication.md
```

**Benefits:**
- Chronological sorting
- Easy to find recent work
- Clear timeline of development

### File Suffixes

Different file types use consistent suffixes:

| Suffix | Purpose | Example |
|--------|---------|---------|
| `.md` | Full documentation | `spec.md`, `mission.md` |
| `-lite.md` | Condensed for AI | `spec-lite.md`, `mission-lite.md` |
| `.json` | State tracking | `state.json` |
| `.yml` | Configuration | `config.yml` |

---

## File Path Prefixes

When referencing files in documentation, use these prefixes:

### Framework Files

```
@.yoyo-dev/product/mission.md
@.yoyo-dev/specs/2025-12-29-auth/spec.md
@.yoyo-dev/instructions/core/execute-tasks.md
@.yoyo-dev/config.yml
```

### Memory Files

```
@.yoyo-dev/memory/memory.db
```

### Benefits

- Clear distinction between framework and memory
- Easy to identify file locations
- Consistent across documentation

---

## Where Files Belong

### Product Documentation

**Location:** `.yoyo-dev/product/`

**Files:**
- `mission.md` - Full product vision and goals
- `mission-lite.md` - Condensed for AI agents
- `tech-stack.md` - Technology decisions and rationale
- `roadmap.md` - Development phases and milestones

**When to create:**
- `/plan-product` command
- `/analyze-product` command

---

### Feature Specifications

**Location:** `.yoyo-dev/specs/YYYY-MM-DD-feature-name/`

**Files:**
- `spec.md` - Full requirements and user stories
- `spec-lite.md` - Condensed summary for AI
- `tasks.md` - Hierarchical task breakdown
- `decisions.md` - Technical decisions and rationale
- `state.json` - Workflow state tracking
- `sub-specs/technical-spec.md` - Implementation details
- `sub-specs/database-schema.md` - Schema changes (if needed)
- `sub-specs/api-spec.md` - API specification (if needed)

**When to create:**
- `/create-new` command
- `/create-spec` command

---

### Bug Fixes

**Location:** `.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`

**Files:**
- `analysis.md` - Problem analysis and root cause
- `solution-lite.md` - Condensed solution summary
- `tasks.md` - Fix task breakdown
- `state.json` - State tracking

**When to create:**
- `/create-fix` command

---

### Development Recaps

**Location:** `.yoyo-dev/recaps/YYYY-MM-DD-feature-name.md`

**Contents:**
- Feature summary
- Tasks completed
- Files modified
- Tests added
- PR link
- Duration

**When to create:**
- After `/execute-tasks` completes
- Automatically generated

---

### Saved Patterns

**Location:** `.yoyo-dev/patterns/`

**Files:**
- `authentication-patterns.md`
- `database-patterns.md`
- `ui-patterns.md`
- Custom pattern files

**When to create:**
- After successful implementations
- Optionally saved during `/execute-tasks`

---

### Memory Blocks

**Location (Project):** `.yoyo-dev/memory/memory.db`
**Location (Global):** `~/.yoyo-dev/memory/memory.db`

**Block Types:**
- Persona blocks - AI assistant configuration
- Project blocks - Tech stack, architecture, patterns
- User blocks - User preferences
- Corrections blocks - Learned corrections

**When to create:**
- `/init` command
- `/remember` command

---

## Hidden Files

Yoyo Dev uses dotfile directories to keep project root clean:

```
your-project/
├── .yoyo-dev/          # Hidden: Framework files
├── .yoyo-dev/memory/   # Hidden: Memory system
├── .claude/            # Hidden: Claude Code config
├── .mcp.json           # Hidden: MCP configuration
├── src/                # Visible: Your source code
├── tests/              # Visible: Your tests
├── package.json        # Visible: Your package config
└── README.md           # Visible: Your README
```

**Benefits:**
- Clean project root
- Framework files out of the way
- Easy to `.gitignore` if needed

---

## Cleanup

### Safe to Delete

These can be safely deleted to start fresh:

```bash
# Delete all specs (keeps product docs)
rm -rf .yoyo-dev/specs/

# Delete all fixes
rm -rf .yoyo-dev/fixes/

# Delete all recaps
rm -rf .yoyo-dev/recaps/

# Delete project memory (keeps global)
rm -rf .yoyo-dev/memory/

# Delete MCP config (will be regenerated)
rm -f .mcp.json
```

### Never Delete

These should never be deleted:

```bash
# Product documentation (your product vision)
.yoyo-dev/product/

# Configuration (your custom settings)
.yoyo-dev/config.yml

# Global memory (user preferences)
~/.yoyo-dev/
```

---

## Git Integration

### Recommended `.gitignore`

```gitignore
# Yoyo Dev - Optional (commit framework files)
# .yoyo-dev/
# .claude/

# Yoyo Dev - Memory (usually ignore)
.yoyo-dev/memory/

# Yoyo Dev - MCP config (commit for team)
# .mcp.json

# Yoyo Dev - SQLite
*.db-wal
*.db-shm
```

**Recommendation:**
- **Commit** `.yoyo-dev/` (specs, fixes, product docs useful for team)
- **Ignore** `.yoyo-dev/memory/` (project-specific memory, not needed in repo)
- **Commit** `.mcp.json` (MCP config useful for team)

---

## See Also

- **[Installation](INSTALLATION.md)** - Setup guide
- **[Quick Start](QUICK-START.md)** - Getting started
- **[Architecture](ARCHITECTURE.md)** - System architecture
- **[Command Reference](commands.md)** - All commands

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
