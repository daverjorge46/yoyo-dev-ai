# CLAUDE.md

This file provides guidance to Claude Code when working on the **Yoyo Dev framework** itself.

> **Note:** This is the BASE installation documentation. Project-specific CLAUDE.md files are generated during `install.sh` and contain project-tailored instructions.

## Repository Overview

**Yoyo Dev AI** is a platform with two subsystems:
- **yoyo-dev** - Development environment (Wave Terminal, Claude Code, GUI, orchestration)
- **yoyo-ai** - Personal AI assistant (OpenClaw daemon, messaging, skills)

Providing:
- Structured workflows for product planning, specification, and task execution
- Multi-agent orchestration system with specialized agents
- Claude Code and Cursor IDE integration
- Persistent memory and skill learning systems
- Personal AI assistant via OpenClaw

## Framework Architecture

### Directory Structure

```
yoyo-dev-ai/                      # Framework root (this repository)
├── CLAUDE.md                     # This file - framework development context
├── README.md                     # User-facing documentation
├── setup/                        # Installation and launcher scripts
│   ├── install.sh                # Project installation
│   ├── yoyo.sh                   # Dev environment launcher (yoyo-dev)
│   ├── yoyo-ai.sh                # Personal AI assistant manager (yoyo-ai)
│   ├── yoyo-compat.sh            # Deprecated `yoyo` compatibility shim
│   ├── yoyo-gui.sh               # Browser GUI launcher
│   ├── yoyo-update.sh            # Update script
│   └── templates/                # Generated file templates
│       └── PROJECT-CLAUDE.md     # Template for project CLAUDE.md
├── instructions/                 # AI workflow instructions
│   ├── core/                     # Primary workflows
│   │   ├── create-spec.md
│   │   ├── create-tasks.md
│   │   ├── execute-tasks.md
│   │   └── ...
│   └── meta/                     # Pre/post flight checks
├── standards/                    # Development standards
│   ├── best-practices.md
│   ├── personas.md
│   ├── tech-stack.md
│   └── code-style/
├── .claude/                      # Claude Code integration
│   ├── commands/                 # Slash commands (*.md)
│   ├── agents/                   # Agent definitions
│   ├── hooks/                    # Orchestration hooks
│   │   └── orchestrate.cjs       # Intent classification hook
│   ├── skills/                   # Learned skills
│   └── settings.json             # Claude Code settings
├── src/                          # TypeScript source
│   ├── orchestration/            # Orchestration system
│   ├── memory/                   # Memory system
│   └── ...
├── gui/                          # Browser GUI (React + Vite)
└── tests/                        # Test suites
```

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| CLI Launcher | Bash | `yoyo-dev`, `yoyo-ai`, `yoyo-gui`, `yoyo-update` commands |
| Orchestration | TypeScript | Intent classification, agent routing |
| Browser GUI | React + Vite | Dashboard on port 5173 |
| Memory System | SQLite + JSON | Persistent context storage |
| Personal AI | OpenClaw (npm) | Daemon-based AI assistant on port 18789 |

## Global Orchestration Mode

**All user interactions are automatically classified and routed to specialized agents.**

### How It Works

1. **Intent Classification** (<10ms, keyword-based):
   - Research → alma-librarian (background)
   - Codebase → alvaro-explore (blocking)
   - Frontend → dave-engineer (auto-delegate)
   - Debug → arthas-oracle (escalation)
   - Documentation → angeles-writer
   - Planning/Implementation → yoyo-ai (primary)

2. **Agent Delegation**:
   - Confidence threshold: 0.6 (configurable)
   - Below threshold: No delegation, handle directly
   - Above threshold: Route to specialized agent

3. **Output Prefixing**:
   - All responses prefixed with agent name: `[agent-name]`
   - Example: `[alvaro-explore] Found 15 matching files...`

### MANDATORY Orchestration Rules

When you see `ORCHESTRATION INSTRUCTIONS:` in a system-reminder:

1. **Follow delegation instructions exactly** - Do not handle yourself if told to delegate
2. **Use specified subagent_type** - The decision is already made
3. **Always prefix responses** - Use `[agent-name]` format
4. **Report agent results** - Summarize with agent prefix after Task tool completes

### Agent Definitions

Located in `.claude/agents/`:

| Agent | File | Role | Temperature |
|-------|------|------|-------------|
| yoyo-ai | `yoyo-ai.md` | Primary orchestrator | 1.0 |
| arthas-oracle | `arthas-oracle.md` | Strategic advisor, debugging | 0.1 |
| alma-librarian | `alma-librarian.md` | External research | 0.3 |
| alvaro-explore | `alvaro-explore.md` | Codebase search | 0.5 |
| dave-engineer | `dave-engineer.md` | Frontend/UI specialist | 0.7 |
| angeles-writer | `angeles-writer.md` | Documentation | 0.5 |

## Core Workflows

### Workflow Instructions

Located in `instructions/core/`:

| Workflow | File | Purpose |
|----------|------|---------|
| `/plan-product` | `plan-product.md` | Create product mission & roadmap |
| `/analyze-product` | `analyze-product.md` | Analyze existing codebase |
| `/create-new` | `create-new.md` | Feature with spec + tasks |
| `/create-spec` | `create-spec.md` | Detailed specification |
| `/create-tasks` | `create-tasks.md` | Task breakdown from spec |
| `/execute-tasks` | `execute-tasks.md` | TDD implementation |
| `/create-fix` | `create-fix.md` | Bug fix workflow |

### Slash Commands

Located in `.claude/commands/`:
- Each `.md` file becomes a `/command` in Claude Code
- Commands reference instructions via `@.yoyo-dev/instructions/...`

### Process Flow Execution

When instructions contain `<process_flow>` blocks:
- Execute every numbered `<step>` sequentially
- Execute pre-flight checks before starting
- Execute post-flight checks after completing
- Use exact templates from instructions

### Subagent Usage

When instructions specify `subagent="X"`:
```xml
<step number="2" subagent="context-fetcher" name="context_analysis">
```
Use Task tool with appropriate `subagent_type` parameter.

## Development Guidelines

### Code Conventions

**TypeScript (src/):**
- Strict mode enabled
- Zod for runtime validation
- ESM modules

**Shell Scripts (setup/):**
- Bash 4.0+
- Use `ui-library.sh` for consistent output
- Always validate syntax with `bash -n`

### Testing

```bash
# TypeScript tests
npm test

# Shell script syntax
bash -n setup/*.sh
```

### Git Conventions

- Yoyo Dev does NOT create branches automatically
- All commits made to current active branch
- Use git-workflow agent for commits
- Commit message format per repository standards

## File Organization

### Specs (created by workflows)

```
.yoyo-dev/specs/YYYY-MM-DD-feature-name/
├── spec.md           # Full requirements
├── spec-lite.md      # Condensed for AI context
├── tasks.md          # Task breakdown
├── state.json        # Workflow state
├── decisions.md      # Technical decisions
└── sub-specs/        # Technical details
    ├── technical-spec.md
    ├── api-spec.md       # (if needed)
    └── database-schema.md # (if needed)
```

### Fixes (created by /create-fix)

```
.yoyo-dev/fixes/YYYY-MM-DD-fix-name/
├── analysis.md       # Problem analysis
├── solution-lite.md  # Condensed summary
├── tasks.md          # Fix tasks
└── state.json        # State tracking
```

## Configuration

### Main Config (`.yoyo-dev/config.yml`)

```yaml
yoyo_dev_version: "7.0.0"

orchestration:
  enabled: true
  global_mode: true
  confidence_threshold: 0.6

agents:
  claude_code:
    enabled: true

tech_stack:
  framework: "react-typescript"
  database: "convex"
  styling: "tailwindcss"

# Yoyo AI (OpenClaw Personal Assistant)
yoyo_ai:
  enabled: true
  openclaw:
    installed: true
    port: 18789
    daemon:
      auto_start: false
      service_type: "auto"
    update:
      auto_check: true
```

### Claude Settings (`.claude/settings.json`)

Contains hook configuration for orchestration system.

## Important Notes for Framework Development

1. **Changes go in yoyo-dev-ai root** - Not in `.yoyo-dev/` (that's the installed framework)

2. **Test installation scripts** - After modifying `setup/*.sh`, test with:
   ```bash
   bash -n setup/install.sh
   bash -n setup/yoyo-update.sh
   ```

3. **Template changes** - `setup/templates/PROJECT-CLAUDE.md` affects all new project installations

4. **Hook changes** - `.claude/hooks/orchestrate.cjs` is the bundled orchestration hook

5. **Version updates** - Update VERSION in: `setup/install.sh`, `setup/yoyo-update.sh`, `setup/yoyo.sh`, and all other `setup/*.sh` scripts

## Quick Reference

### Installation Scripts

| Script | Purpose |
|--------|---------|
| `setup/install.sh` | Install Yoyo Dev in a project |
| `setup/yoyo-update.sh` | Update existing installation |
| `setup/yoyo.sh` | Launch dev environment (`yoyo-dev` command) |
| `setup/yoyo-ai.sh` | Manage personal AI assistant (`yoyo-ai` command) |
| `setup/yoyo-compat.sh` | Deprecated `yoyo` compatibility shim |
| `setup/yoyo-gui.sh` | Launch browser GUI only |

### Key Flags

**install.sh:**
- `--claude-code` - Enable Claude Code integration
- `--no-claude-md` - Skip CLAUDE.md generation
- `--no-auto-mcp` - Skip MCP server setup
- `--no-openclaw` - Skip OpenClaw AI assistant installation

**yoyo-update.sh:**
- `--no-overwrite` - Keep all customizations
- `--regenerate-claude` - Regenerate project CLAUDE.md
- `--skip-mcp-check` - Skip MCP verification
- `--skip-openclaw` - Skip OpenClaw update

---

*For user-facing documentation (installation, MCP setup, troubleshooting), see README.md*
