# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Yoyo Dev** is a development workflow framework that provides structured instructions, standards, and tools for AI-assisted software development. It supports both Claude Code and Cursor IDE integration.

The system guides AI agents through product planning, specification creation, task management, and code execution workflows using a persona-driven development approach.

## Installation & Setup

### Installing Yoyo Dev in a Project

```bash
# From base installation (typical usage)
~/.yoyo-dev/setup/project.sh --claude-code

# From GitHub (no base installation)
~/.yoyo-dev/setup/project.sh --no-base --claude-code

# With Cursor support
~/.yoyo-dev/setup/project.sh --cursor
```

**Key flags:** `--claude-code`, `--cursor`, `--no-base`, `--project-type=TYPE`, `--overwrite-instructions`, `--overwrite-standards`

### Updating Yoyo Dev

**v6.0 Claude Code Native Interface:**

Yoyo Dev v6.0 launches Claude Code directly with native customization:

1. **`yoyo`** - Launch Claude Code + Browser GUI (default mode)
2. **`yoyo-gui`** - Launch browser GUI standalone
3. **`yoyo-update`** - Update Yoyo Dev to latest version
4. **`install.sh`** - Install/setup Yoyo Dev

```bash
# Update to latest (overwrites framework files by default)
yoyo-update

# Preserve customizations
yoyo-update --no-overwrite

# Skip MCP verification during update
yoyo-update --skip-mcp-check
```

**Note:** Product docs (`.yoyo-dev/product/`), specs, fixes, recaps, and patterns are ALWAYS protected during updates.

**MCP Updates:** The update script automatically checks for missing MCPs and prompts to install them. Use `--skip-mcp-check` to bypass MCP verification.

## Quick Start

```bash
# Launch Claude Code + Browser GUI (default)
yoyo

# Launch Claude Code without browser GUI
yoyo --no-gui

# Open browser GUI only
yoyo --gui-only

# Stop background GUI server
yoyo --stop-gui

# Launch browser GUI standalone
yoyo-gui
```

**Default Mode (v6.0+):**
- Launches Claude Code directly with Yoyo Dev customizations
- Browser GUI runs in background on port 5173
- Access GUI at http://localhost:5173
- Custom status line shows: git branch, active spec, task progress, MCP count
- Custom commands: `/status`, `/specs`, `/tasks`, `/fixes`

**Yoyo Dev Commands in Claude Code:**
- `/status` - Project dashboard with overview, active spec, recent activity
- `/specs` - List all specifications with status and progress
- `/spec <n>` - View detailed specification
- `/tasks` - Show current task breakdown with status indicators
- `/fixes` - List bug fix records
- `/fix <n>` - View bug fix analysis

**Command Flags:**
- `--no-gui` - Launch Claude Code without browser GUI
- `--gui-only` - Open browser GUI only (no Claude Code)
- `--stop-gui` - Stop background GUI server
- `--gui-status` - Check if GUI server is running

## Multi-Agent Orchestration (v5.0)

### Yoyo-AI System

**Version 5.0 introduces intelligent multi-agent orchestration** - Yoyo-AI acts as primary orchestrator that delegates work to specialized agents.

**Key Agents:**
- **Yoyo-AI** - Primary orchestrator (Claude Opus 4.5, temperature: 1.0)
- **Oracle** - Strategic advisor for architecture & debugging (temperature: 0.1)
- **Librarian** - External research specialist (temperature: 0.3)
- **Explore** - Internal codebase search (temperature: 0.5)
- **Frontend Engineer** - UI/UX specialist (temperature: 0.7)
- **Document Writer** - Technical documentation (temperature: 0.5)
- **Implementer** - TDD-based implementation (temperature: 0.3)

**Orchestration Workflow:**

1. **Phase 0: Intent Classification**
   - Automatically classifies: Planning | Implementation | Research | Debug
   - Routes to appropriate workflow

2. **Phase 1: Codebase Assessment**
   - Analyzes complexity (simple/medium/complex)
   - Detects frontend keywords → auto-delegate to frontend-engineer
   - Identifies research needs → background librarian

3. **Phase 2A: Research & Exploration (Parallel)**
   - Fires background tasks for external research
   - Searches codebase with explore agent
   - Continues working while tasks complete

4. **Phase 2B: Implementation (Todo-Driven)**
   - Creates todos BEFORE implementation
   - Marks `in_progress` immediately
   - Marks `completed` IMMEDIATELY (not batched)
   - Only ONE todo `in_progress` at a time

5. **Phase 3: Verification & Completion**
   - Runs all tests
   - Quality gates (functionality, types, tests, a11y, security)
   - Git workflow (commit, PR)
   - Creates recap

**New Commands (v5.0):**

```bash
# Background research (parallel execution)
/research "topic"
# → Librarian agent searches docs, GitHub, web
# → Results delivered as notification
# → Continue working immediately

# Strategic architecture guidance
/consult-oracle "question"
# → Oracle provides: Essential | Expanded | Edge Cases
# → Synchronous response with structured advice

# Multi-agent task execution (default)
/execute-tasks                           # Yoyo-AI orchestrator
/execute-tasks --orchestrator legacy     # v4.0 workflow
/execute-tasks --no-delegation           # Disable auto-delegation
```

**Automatic Delegation:**

- **Frontend work detected** → auto-delegate to frontend-engineer
  - Keywords: style, css, tailwind, layout, button, component, responsive, etc.
  - Example: "Update button styling" → frontend-engineer handles it

- **3+ consecutive failures** → auto-escalate to Oracle
  - Attempt 1: Retry with improved approach
  - Attempt 2: Try different strategy
  - Attempt 3: Consult Oracle for root cause analysis

**Configuration** (`.yoyo-dev/config.yml`):

```yaml
workflows:
  task_execution:
    orchestrator: yoyo-ai  # or "legacy" for v4.0

  failure_recovery:
    enabled: true
    max_attempts: 3
    escalate_to: oracle

  frontend_delegation:
    enabled: true
    agent: frontend-engineer

  todo_continuation:
    enabled: true
    cooldown: 3000  # milliseconds
```

**Agent Tool Access:**

Each agent has restricted tool access for safety:

- **Yoyo-AI**: All tools (`*`)
- **Oracle**: Read-only + analysis tools (no Bash, no Write)
- **Librarian**: External research tools only (no code modification)
- **Frontend Engineer**: Write, Read, Playwright (no call_agent to prevent loops)
- **Explore**: Search tools only (Glob, Grep, Read)

**Detailed Documentation:**
- `.yoyo-dev/instructions/core/yoyo-ai-orchestration.md` - Complete orchestrator workflow
- `docs/multi-agent-orchestration.md` - User-facing guide

## Global Orchestration Mode (v6.1+)

**In v6.1, orchestration is the default for ALL interactions** - not just specific commands like `/execute-tasks`. After running `yoyo`, every user message is automatically classified and routed to specialized agents.

### How It Works

1. **Every user message is classified** into intent categories:
   - **Research** → External docs, GitHub, web search → Alma-Librarian (background)
   - **Codebase** → Find patterns, files, implementations → Alvaro-Explore (blocking)
   - **Frontend** → UI/UX, styling, components → Dave-Engineer (auto-delegate)
   - **Debug** → Error analysis, bug fixing → Alvaro-Explore + Oracle escalation
   - **Documentation** → README, guides, explanations → Angeles-Writer
   - **Planning** → Architecture, feature design → Yoyo-AI + research
   - **Implementation** → Building, coding → Yoyo-AI + codebase context
   - **General** → No specific delegation (below confidence threshold)

2. **Automatic agent delegation** based on intent:
   - Classification takes <10ms (keyword matching, no ML)
   - Confidence threshold: 0.6 (configurable)
   - Background tasks run in parallel without blocking

3. **All orchestrated output is prefixed** with agent name for visibility:
   ```
   [yoyo-ai] Analyzing your request...
   [yoyo-ai] Intent: Research (85% confidence)
   [yoyo-ai] Delegating to alma-librarian...
   [alma-librarian] Searching documentation...
   [yoyo-ai] Here's what I found: ...
   ```

### Agent Prefixes

| Agent | Prefix | Role |
|-------|--------|------|
| Yoyo-AI | `[yoyo-ai]` | Primary orchestrator |
| Arthas-Oracle | `[arthas-oracle]` | Strategic advisor, failure analysis |
| Alma-Librarian | `[alma-librarian]` | External research (background) |
| Alvaro-Explore | `[alvaro-explore]` | Codebase search |
| Dave-Engineer | `[dave-engineer]` | Frontend/UI development |
| Angeles-Writer | `[angeles-writer]` | Documentation |

### Disabling Orchestration

**Per-session (command flag):**
```bash
yoyo --no-orchestration
```

**Per-project (.yoyo-dev/config.yml):**
```yaml
orchestration:
  enabled: false
```

**Per-environment:**
```bash
export YOYO_ORCHESTRATION=false
```

**Per-request (prefix):**
```
directly: What is the difference between let and const?
```

### When Orchestration is Skipped

- Slash commands (`/execute-tasks`, `/research`, etc.) - explicit override
- `directly:` prefixed requests - user bypass
- Confidence score < 0.6 - ambiguous intent
- Orchestration disabled in config

### Configuration

Full control via `.yoyo-dev/config.yml`:

```yaml
orchestration:
  enabled: true           # Master toggle
  global_mode: true       # Apply to ALL interactions
  show_prefixes: true     # Show [agent-name] prefixes
  confidence_threshold: 0.6

  routing:
    frontend_delegation:
      enabled: true
      agent: dave-engineer

    research_delegation:
      enabled: true
      agent: alma-librarian
      background: true    # Non-blocking

    codebase_delegation:
      enabled: true
      agent: alvaro-explore

    failure_escalation:
      enabled: true
      agent: arthas-oracle
      after_failures: 3
```

## MCP Server Installation

Yoyo Dev uses Docker MCP Gateway to provide containerized MCP servers via Docker Desktop's MCP Toolkit.

### Prerequisites

**Required:**
- Docker Desktop 4.32+ with MCP Toolkit enabled
- Claude Code CLI installed and configured

**Installing Docker Desktop:**
```bash
# Download from: https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version  # Should be 4.32+

# Verify Docker is running
docker info
```

**Enabling MCP Toolkit:**
1. Open Docker Desktop
2. Go to Settings → Beta features
3. Enable "MCP Toolkit"
4. Restart Docker Desktop

**Installing Claude Code CLI:**
```bash
# Download from: https://claude.ai/download

# Verify installation
claude --version
```

### Supported MCP Servers

Yoyo Dev enables these containerized MCP servers from the Docker catalog:

1. **playwright** - Browser automation and testing
   - Purpose: Web automation, E2E testing, screenshots
   - Container: Isolated browser environment

2. **github-official** - GitHub repository management
   - Purpose: Repository operations, issues, PRs
   - Note: Requires OAuth authorization (see below)

3. **duckduckgo** - Web search integration
   - Purpose: Search the web for information
   - Container: Isolated search environment

4. **filesystem** - File system access
   - Purpose: Read/write files in specified directories
   - Note: Configured with appropriate mount points

### Automatic Installation (Default Behavior)

**MCP servers are installed automatically** during Yoyo Dev setup without user prompts:

```bash
# During project setup (auto-installs MCPs)
~/.yoyo-dev/setup/project.sh --claude-code
```

**To skip automatic MCP installation:**
```bash
~/.yoyo-dev/setup/project.sh --claude-code --no-auto-mcp
```

The installer automatically:
1. Checks Docker Desktop is installed and running
2. Verifies MCP Toolkit is enabled
3. Connects Claude Code as an MCP client
4. Enables recommended MCP servers (no prompts)
5. Reports installation results

**Similarly, `yoyo-update` auto-enables missing MCP servers** without prompting. Use `--skip-mcp-check` to skip MCP verification during updates.

### Manual Installation

To manually set up Docker MCP or troubleshoot:

```bash
# Run Docker MCP setup
~/.yoyo-dev/setup/docker-mcp-setup.sh

# Skip if Docker not available
~/.yoyo-dev/setup/docker-mcp-setup.sh --skip-if-no-docker

# Verbose output for debugging
~/.yoyo-dev/setup/docker-mcp-setup.sh --verbose
```

**Individual server commands:**

```bash
# List enabled MCP servers
docker mcp server ls

# Enable specific servers
docker mcp server enable playwright
docker mcp server enable github-official
docker mcp server enable duckduckgo
docker mcp server enable filesystem

# Connect Claude Code as client
docker mcp client connect claude-code
```

### OAuth Authorization (GitHub Server)

The `github-official` MCP server requires OAuth authorization:

```bash
# Authorize GitHub access
docker mcp oauth authorize github-official

# This opens a browser for GitHub OAuth flow
# Grant access to repositories you want Claude to access
```

### Verifying MCP Installation

**Method 1: Check Docker MCP server list**

```bash
# View enabled servers
docker mcp server ls
```

Expected output (tabular format):
```
NAME              IMAGE                    TAG
playwright        docker/mcp-playwright    latest
github-official   docker/mcp-github        latest
duckduckgo        docker/mcp-duckduckgo    latest
filesystem        docker/mcp-filesystem    latest
```

**Method 2: Check project .mcp.json**

```bash
# View project MCP configuration
cat .mcp.json
```

Expected:
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

### Troubleshooting MCP Installation

**Issue: "Docker not found"**

```bash
# Verify Docker is installed
docker --version

# If not found, install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop/
```

**Issue: "Docker not running"**

```bash
# Check Docker daemon status
docker info

# If error, start Docker Desktop application
# On Linux: systemctl start docker
```

**Issue: "MCP Toolkit not enabled"**

```bash
# Check if MCP commands are available
docker mcp --help

# If "not a docker command" error:
# 1. Open Docker Desktop
# 2. Go to Settings → Beta features
# 3. Enable "MCP Toolkit"
# 4. Restart Docker Desktop
```

**Issue: "Server not starting"**

```bash
# Check server list
docker mcp server ls

# Inspect server details
docker mcp server inspect playwright

# Restart specific server
docker mcp server disable playwright
docker mcp server enable playwright
```

**Issue: "GitHub OAuth failed"**

```bash
# Re-authorize GitHub
docker mcp oauth authorize github-official

# Clear existing authorization
docker mcp oauth revoke github-official

# Then re-authorize
docker mcp oauth authorize github-official
```

**Issue: "Claude not connected to MCP Gateway"**

```bash
# Verify Claude is connected as client
docker mcp client list

# If claude-code not listed, connect it
docker mcp client connect claude-code

# Verify .mcp.json exists in project
cat .mcp.json
```

**Issue: "Servers running but Claude can't access"**

```bash
# 1. Verify MCP Gateway is running
docker mcp gateway status

# 2. Check .mcp.json has correct configuration
cat .mcp.json | jq '.mcpServers.MCP_DOCKER'

# 3. Restart Claude Code to reload MCP configuration
```

### MCP Configuration

**Project-level configuration (`.mcp.json`):**

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

This single entry routes all MCP requests through Docker MCP Gateway, which manages individual containerized servers.

**Server resource limits:**

Each MCP server container runs with:
- 1 CPU core
- 2GB RAM
- Isolated network namespace
- Read-only filesystem (except designated volumes)

**IMPORTANT:** Do not manually edit `.mcp.json` unless necessary. Use `docker-mcp-setup.sh` to ensure proper configuration.

## Core Commands

**Product Setup:**
- `/plan-product` - Set mission & roadmap for new product
- `/analyze-product` - Set up mission/roadmap for existing product

**Feature Development (v5.0 with Yoyo-AI):**
- `/create-new` - Create feature with full spec workflow and task generation
- `/create-spec` - Create detailed specification only
- `/create-tasks` - Create tasks from specification
- `/execute-tasks` - Build and ship code with multi-agent orchestration (default)
- `/execute-tasks --orchestrator legacy` - Use v4.0 single-agent workflow
- `/execute-tasks --no-delegation` - Disable automatic agent delegation

**Research & Guidance (NEW v5.0):**
- `/research "topic"` - Background research with librarian agent (parallel execution)
- `/consult-oracle "question"` - Strategic architecture guidance from Oracle agent

**Bug Fixes:**
- `/create-fix` - Analyze and fix bugs with systematic problem analysis (auto-escalates to Oracle)

**Advanced:**
- `/orchestrate-tasks` - Manual multi-agent orchestration for complex features
- `/review` - Critical code review (modes: `--devil`, `--security`, `--performance`, `--production`)
- `/design-init` - Initialize design system
- `/design-audit` - Audit design consistency
- `/design-fix` - Fix design violations
- `/design-component` - Create UI components with design enforcement

**Maintenance:**
- `/yoyo-cleanup` - Professional project cleanup with safety validations (deprecated code, docs, files)
- `/yoyo-cleanup --scan` - Analyze only, no changes (default)
- `/yoyo-cleanup --preview` - Show exact planned changes
- `/yoyo-cleanup --execute` - Apply changes with confirmations
- `/yoyo-cleanup --docs` - Documentation cleanup only
- `/yoyo-cleanup --code` - Code cleanup only

**Memory System:**
- `/init` - Scan codebase and initialize memory with project context
- `/remember` - Store user preferences or project knowledge
- `/clear` - Clear conversation history while preserving memory

## Memory System

The memory system provides persistent context management using a dual-scope architecture:

**Scopes:**
- **Project** (`.yoyo-dev/memory/`): Project-specific context, stored locally
- **Global** (`~/.yoyo-dev/memory/`): User preferences across all projects

**Block Types:**
- `persona` - AI assistant personality and capabilities
- `project` - Project knowledge (tech stack, patterns, structure)
- `user` - User preferences and interaction patterns
- `corrections` - Learned corrections from past interactions

**Quick Usage:**
```bash
# Initialize memory for a project
/init

# Store preferences
/remember I prefer functional programming with TypeScript
/remember This project uses Convex for the backend

# Clear conversation but keep memory
/clear
```

**Detailed Documentation:** See `docs/memory-system.md` for full API documentation.

## Architecture

### Directory Structure

**Primary Directory:**

- **`.yoyo-dev/`** - All Yoyo Dev files (instructions, standards, specs, fixes, product, memory)

**Complete Structure:**

```
.yoyo-dev/
├── product/              # Product docs (mission, roadmap, tech-stack)
├── specs/                # Feature specifications
│   └── YYYY-MM-DD-name/
│       ├── spec.md
│       ├── spec-lite.md
│       ├── tasks.md
│       ├── state.json
│       └── sub-specs/
├── fixes/                # Bug fix documentation
├── recaps/               # Development recaps
├── patterns/             # Saved patterns library
├── memory/               # Memory system (SQLite database)
│   └── memory.db
├── instructions/core/    # AI workflow instructions
│   ├── yoyo-ai-orchestration.md  # v5.0 orchestrator
│   ├── execute-tasks.md
│   ├── create-new.md
│   └── ...
├── standards/            # Development standards
├── setup/                # Installation scripts
│   ├── install.sh        # Primary installer
│   ├── yoyo.sh           # Claude Code launcher
│   ├── yoyo-gui.sh       # GUI launcher
│   └── yoyo-update.sh    # Update script
└── config.yml            # Configuration

.claude/                  # Claude Code integration
├── commands/             # Slash commands
│   ├── research.md       # v5.0 research command
│   ├── consult-oracle.md # v5.0 Oracle consultation
│   └── ...
└── agents/               # Agent configurations
    ├── yoyo-ai.md        # v5.0 orchestrator
    ├── oracle.md         # v5.0 strategic advisor
    ├── librarian.md      # v5.0 research specialist
    ├── frontend-engineer.md  # v5.0 UI specialist
    └── ...

workflows/                # Reusable workflow components
├── planning/
├── specification/
└── implementation/

src/memory/               # Memory system (TypeScript)
```

**Detailed Guide:** See `docs/directory-structure.md`

### Key Files

**Configuration:**
- `config.yml` - Main configuration

**Core Instructions:**
- `instructions/core/plan-product.md` - Product planning
- `instructions/core/create-new.md` - Feature creation
- `instructions/core/create-fix.md` - Bug fix workflow
- `instructions/core/execute-tasks.md` - Task execution

**Standards:**
- `standards/best-practices.md` - Development best practices
- `standards/personas.md` - Persona definitions
- `standards/tech-stack.md` - Default tech stack
- `standards/code-style/` - Language-specific guides
- `standards/design-system.md` - Design system patterns
- `standards/output-formatting.md` - Terminal output formatting

**Key Agents:**
- `context-fetcher` - Context gathering
- `file-creator` - File creation
- `git-workflow` - Git operations
- `project-manager` - Task tracking
- `test-runner` - Test execution
- `implementer` - TDD-based implementation
- `implementation-verifier` - Quality verification
- `spec-shaper` - Requirements gathering
- `tasks-list-creator` - Strategic task breakdown

### Workflow Reference System (v1.6.0+)

Agents reference reusable workflows using `{{workflows/*}}` syntax:

```yaml
---
name: implementer
tools: [Write, Read, Bash]
---

{{workflows/implementation/implement-tasks.md}}

## Additional Instructions
- Always write tests first
```

**Benefits:** Reusable, maintainable, composable workflows with cycle detection and caching.

## Core Workflows

### `/plan-product` - Product Planning

Creates foundational product documentation:
1. Gather user input (idea, features, users, tech stack)
2. Create `.yoyo-dev/product/` structure
3. Generate `mission.md`, `tech-stack.md`, `mission-lite.md`, `roadmap.md`

### `/analyze-product` - Existing Product

For existing codebases:
1. Analyze codebase (structure, tech stack, features)
2. Gather product context from user
3. Execute plan-product workflow
4. Customize with "Phase 0: Already Completed" section

### `/create-new` - Feature Creation

Streamlined workflow:
1. Feature discovery (roadmap item or user idea)
2. Context gathering (mission-lite.md, tech-stack.md)
3. Requirements clarification (numbered questions)
4. Execute spec creation
5. User spec review
6. Execute task creation
7. Execution readiness

### `/create-fix` - Bug Fixes

Systematic fix workflow:
1. Problem identification
2. Code investigation (context-fetcher)
3. Root cause analysis
4. Create `.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`
5. Create analysis document
6. User solution review
7. Create TDD-based fix tasks
8. Execution readiness

### `/execute-tasks` - Task Execution

**Three-phase process (ALL phases required):**

**Phase 1: Pre-Execution**
1. Task assignment (defaults to next uncompleted)
2. Context analysis (context-fetcher)
3. Git status check

**Phase 2: Task Execution Loop**
For each parent task:
- Task understanding
- Technical spec review
- Best practices review (context-fetcher)
- Code style review (context-fetcher)
- TDD implementation
- Test verification (test-runner)
- Mark complete in tasks.md

**Phase 3: Post-Execution**
5. Run all tests (test-runner)
6. Implementation verification (implementation-verifier: functionality, tests, accessibility, performance, security, docs)
7. Git workflow (commit, push, PR via git-workflow)
8. Verify tasks complete (project-manager)
9. Update roadmap (project-manager, conditional)
10. Create recap in `.yoyo-dev/recaps/`
11. Update patterns library (optional)
12. Finalize state.json
13. Completion summary with PR link
14. Notification sound (macOS: `afplay`, Linux: `paplay`)

**Flags:**
- `--implementation-reports` - Generate detailed per-task-group reports
- `--devil`, `--security`, `--performance`, `--production` - Apply review modes
- `--sequential` / `--parallel` - Force execution mode

### `/orchestrate-tasks` - Advanced Orchestration

Use when you need:
- Different agents for different task groups
- Specific standards per task group
- Manual execution order control

**90% of use cases:** Use `/execute-tasks` (default)
**10% power users:** Use `/orchestrate-tasks`

## Parallel Execution

Yoyo Dev automatically analyzes task dependencies and executes independent tasks concurrently (2-3x faster).

**How it works:**
1. Extract task metadata (dependencies, files, parallel-safe flag)
2. Build dependency graph
3. Create execution plan with groups
4. Execute groups in parallel where safe

**Configuration (`.yoyo-dev/config.yml`):**
```yaml
parallel_execution:
  enabled: true              # Default: true
  max_concurrency: 5
  auto_analyze: true
  ask_confirmation: true
```

## Review Modes (Optional)

**Available modes:** `--devil`, `--security`, `--performance`, `--production`, `--premortem`, `--quality`

**Usage:**
```bash
/review --devil "Review authentication flow"
/execute-tasks --security
```

**Use when:** Technical debt accumulated, recurring bugs, complex features, performance issues, security audits, pre-production.

**Don't use for:** Normal feature development.

## Design System (Optional)

**Commands:**
- `/design-init` - Initialize design system with tokens, patterns, Tailwind config
- `/design-audit` - Audit design consistency (tokens, contrast, focus states)
- `/design-fix` - Fix violations systematically
- `/design-component` - Create components with strict validation

**Use when:** Starting UI-heavy projects, fixing design inconsistency, building component libraries.

## Important Conventions

### Subagent Usage

When instructions specify `subagent=""` attribute, use Task tool:

```xml
<step number="2" subagent="context-fetcher" name="context_analysis">
```

Means: Use Task tool with subagent_type="general-purpose" to run context-fetcher agent.

### Process Flow Execution

- Execute every numbered `<step>` in `<process_flow>` blocks sequentially
- Execute pre-flight checks before starting
- Execute post-flight checks after completing
- Use exact templates from instructions
- Ask specific questions if clarification needed

### File Organization

**Product:** `.yoyo-dev/product/`
- `mission.md` - Full vision
- `mission-lite.md` - Condensed for AI
- `tech-stack.md` - Technical architecture
- `roadmap.md` - Development phases

**Specs:** `.yoyo-dev/specs/YYYY-MM-DD-feature-name/`
- `spec.md` - Full requirements
- `spec-lite.md` - Condensed for AI
- `tasks.md` - Task breakdown
- `decisions.md` - Technical decisions
- `state.json` - Workflow state
- `sub-specs/technical-spec.md` - Implementation details
- `sub-specs/database-schema.md` - Schema changes (conditional)
- `sub-specs/api-spec.md` - API spec (conditional)

**Fixes:** `.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`
- `analysis.md` - Problem analysis
- `solution-lite.md` - Condensed summary
- `tasks.md` - Fix tasks
- `state.json` - State tracking

**Recaps:** `.yoyo-dev/recaps/YYYY-MM-DD-feature-name.md`

### Git Branch Management

**IMPORTANT:** Yoyo Dev does NOT create or switch branches automatically.
- All commits made to current active branch
- Users must manually create/switch branches before workflows
- git-workflow agent checks and reports current branch status
- No automatic branch creation in any workflow

## Tech Stack Defaults

- **Frontend:** React 18 + TypeScript
- **Build:** Vite
- **Backend:** Convex (serverless)
- **Auth:** Clerk
- **Styling:** Tailwind CSS v4
- **Package Manager:** npm
- **Node:** 22 LTS
- **Icons:** Lucide React
- **CI/CD:** GitHub Actions

## Persona-Driven Development

Specialized personas guide development:
- **Architect** - System design, technical decisions
- **Frontend** - UX, accessibility, performance
- **Backend** - Reliability, scalability, API design
- **Security** - Threat modeling, compliance
- **Performance** - Optimization, profiling
- **QA** - Testing, edge cases
- **Refactorer** - Code quality, maintainability
- **Analyzer** - Root cause analysis, debugging
- **Mentor** - Documentation, knowledge transfer

**Applied via:** File type detection, context intelligence, explicit activation.

## Quality Gates

Before feature completion:
1. Functionality - Works as specified
2. Type Safety - No TypeScript errors
3. Testing - Adequate coverage
4. Accessibility - WCAG compliance
5. Performance - Meets budgets
6. Security - No vulnerabilities
7. Code Quality - Follows style guidelines
8. Documentation - Adequately documented

## Project Type System

Multiple project types in `config.yml`:

```yaml
project_types:
  default:
    instructions: ~/.yoyo-dev/instructions
    standards: ~/.yoyo-dev/standards
  custom_type:
    instructions: ~/.yoyo-dev/project_types/custom_type/instructions
    standards: ~/.yoyo-dev/project_types/custom_type/standards
```

The `default_project_type` setting determines installation configuration.
- Please remmember that any codebase change you should do it at the yoyo-dev root directory, not at the .yoyo-dev directory, witch it's the project framework installed in the yoyo-dev-ai project.