# Yoyo Dev Command Reference

Complete reference for all Yoyo Dev commands.

**Version:** 5.0.0
**Last Updated:** 2025-12-29

---

## Table of Contents

1. [Product Setup](#product-setup)
2. [Feature Development](#feature-development)
3. [Research & Guidance (v5.0)](#research--guidance-v50)
4. [Bug Fixes](#bug-fixes)
5. [Spec Management](#spec-management)
6. [Task Execution](#task-execution)
7. [Design System](#design-system)
8. [Code Review](#code-review)
9. [Memory System](#memory-system)
10. [Advanced](#advanced)
11. [Launch Commands](#launch-commands)

---

## Product Setup

### `/plan-product`

**Purpose:** Set up mission and roadmap for a new product

**Usage:**
```bash
/plan-product
```

**Workflow:**
1. Gathers product vision from user
2. Defines target users
3. Creates mission document
4. Generates roadmap with phases
5. Documents tech stack decisions

**Creates:**
- `.yoyo-dev/product/mission.md`
- `.yoyo-dev/product/mission-lite.md`
- `.yoyo-dev/product/roadmap.md`
- `.yoyo-dev/product/tech-stack.md`

**When to use:** Starting a new product from scratch

---

### `/analyze-product`

**Purpose:** Set up mission and roadmap for existing product

**Usage:**
```bash
/analyze-product
```

**Workflow:**
1. Analyzes existing codebase
2. Identifies tech stack
3. Gathers product context from user
4. Creates mission and roadmap
5. Marks existing features as "Phase 0: Already Completed"

**Creates:** Same as `/plan-product`

**When to use:** Adding Yoyo Dev to existing project

---

## Feature Development

### `/create-new`

**Purpose:** Create feature with full spec workflow and task generation

**Usage:**
```bash
/create-new "feature description"
/create-new "Add user authentication"
```

**v5.0 Workflow (Yoyo-AI):**
1. **Intent Classification** - Identifies as "Planning"
2. **Background Research** - Fires librarian agent (parallel)
3. **Requirements** - spec-shaper asks clarifying questions
4. **Spec Creation** - spec-writer generates detailed spec
5. **User Review** - Approve specification
6. **Task Generation** - tasks-list-creator breaks down work
7. **Ready for Execution** - Run `/execute-tasks` to build

**Creates:**
```
.yoyo-dev/specs/YYYY-MM-DD-feature-name/
├── spec.md              # Full specification
├── spec-lite.md         # Condensed for AI
├── tasks.md             # Task breakdown
├── decisions.md         # Technical decisions
├── state.json           # Workflow state
└── sub-specs/
    ├── technical-spec.md
    ├── database-schema.md  # If needed
    └── api-spec.md         # If needed
```

**Flags:** None

**When to use:** Creating new features from idea to implementation

---

## Research & Guidance (v5.0)

### `/research`

**Purpose:** Background research with librarian agent (parallel execution)

**Usage:**
```bash
/research "topic"
/research "Convex authentication best practices"
/research "React Server Components performance optimization"
```

**How it works:**
1. **Launches background task** with librarian agent
2. **You continue working** - no need to wait
3. **Librarian searches:**
   - Official documentation (via context7)
   - GitHub repositories (via gh MCP)
   - Web search (via DuckDuckGo MCP)
4. **Results delivered** as notification when complete

**Returns:**
- Documentation excerpts
- GitHub permalinks (not floating refs)
- Implementation patterns
- Best practices

**Duration:** 30-60 seconds typically

**When to use:**
- Before implementing new features
- Learning library/framework patterns
- Finding code examples
- Researching best practices

---

### `/consult-oracle`

**Purpose:** Strategic architecture guidance from Oracle agent

**Usage:**
```bash
/consult-oracle "question"
/consult-oracle "Should we use microservices or monolith for MVP?"
/consult-oracle "Best state management for React with Convex?"
```

**How it works:**
1. **Synchronous** - waits for Oracle response
2. **Oracle analyzes** question with strategic mindset (temperature: 0.1)
3. **Returns structured advice:**
   - **Essential** - Must-know information
   - **Expanded** - Detailed reasoning
   - **Edge Cases** - What could go wrong

**Duration:** 15-45 seconds

**When to use:**
- Architecture decisions
- Debugging after 3+ failures (auto-escalates)
- Design pattern selection
- Performance optimization strategy
- Trade-off analysis

---

## Bug Fixes

### `/create-fix`

**Purpose:** Analyze and fix bugs with systematic problem analysis

**Usage:**
```bash
/create-fix "problem description"
/create-fix "Login button returns 401 error"
/create-fix "Dashboard layout breaks on mobile"
```

**v5.0 Workflow (Yoyo-AI):**
1. **Intent Classification** - Identifies as "Debug"
2. **Codebase Search** - Fires explore agent (background)
3. **Investigation** - Reads relevant files
4. **Root Cause Analysis** - Oracle consulted if complex
5. **Fix Document** - Creates analysis and solution
6. **User Review** - Approve solution approach
7. **TDD Tasks** - Creates test-first fix tasks
8. **Ready for Execution** - Run `/execute-tasks` to fix

**Creates:**
```
.yoyo-dev/fixes/YYYY-MM-DD-fix-name/
├── analysis.md          # Problem analysis
├── solution-lite.md     # Condensed summary
├── tasks.md             # Fix tasks (TDD)
└── state.json           # State tracking
```

**Flags:**
- `--quick` - Skip investigation, go straight to fix

**When to use:**
- Systematic bug analysis
- Complex debugging
- Test failures
- Design/layout issues

---

## Spec Management

### `/create-spec`

**Purpose:** Create detailed specification only (no tasks)

**Usage:**
```bash
/create-spec "feature description"
```

**Workflow:**
1. Requirements gathering
2. Spec creation
3. User review
4. Stops (doesn't create tasks)

**When to use:**
- Need spec review before task breakdown
- Planning without immediate implementation

---

### `/create-tasks`

**Purpose:** Create tasks from existing specification

**Usage:**
```bash
/create-tasks
```

**Workflow:**
1. Reads `spec.md` in current spec directory
2. Creates strategic task breakdown
3. Groups by phase
4. Analyzes dependencies

**Requirements:** Must be run from active spec directory or after `/create-spec`

**When to use:** After spec approval, before execution

---

## Task Execution

### `/execute-tasks`

**Purpose:** Build and ship code with multi-agent orchestration

**Usage:**
```bash
# Yoyo-AI orchestrator (default in v5.0)
/execute-tasks

# Legacy v4.0 workflow
/execute-tasks --orchestrator legacy

# Specific task
/execute-tasks --task=2

# Disable auto-delegation
/execute-tasks --no-delegation

# With review modes
/execute-tasks --security
/execute-tasks --devil --security
```

**v5.0 Workflow (Yoyo-AI):**
1. **Phase 0:** Intent classification
2. **Phase 1:** Codebase assessment
3. **Phase 2A:** Research & exploration (parallel)
4. **Phase 2B:** Implementation (todo-driven)
   - Auto-delegate frontend work
   - 3-failure Oracle escalation
   - Immediate todo completion
5. **Phase 3:** Verification & completion
   - Run all tests
   - Quality gates
   - Git workflow (commit, PR)
   - Create recap

**Flags:**

| Flag | Description |
|------|-------------|
| `--orchestrator yoyo-ai` | Use multi-agent orchestration (default) |
| `--orchestrator legacy` | Use v4.0 single-agent workflow |
| `--no-delegation` | Disable automatic agent delegation |
| `--sequential` | Force sequential execution |
| `--parallel` | Force parallel execution where possible |
| `--task=N` | Execute specific task number |
| `--all` | Execute all tasks (legacy batch mode) |
| `--devil` | Devil's advocate review mode |
| `--security` | Security-focused review |
| `--performance` | Performance optimization review |
| `--production` | Production-readiness review |

**When to use:** After creating tasks, to implement feature

---

## Design System

### `/design-init`

**Purpose:** Initialize design system with tokens, patterns, and Tailwind config

**Usage:**
```bash
/design-init
```

**Creates:**
```
.yoyo-dev/design/
├── tokens.json
├── tailwind.config.js
├── design-system.md
└── component-patterns/
```

**When to use:** At project start for UI-heavy applications

---

### `/design-audit`

**Purpose:** Audit design consistency and compliance

**Usage:**
```bash
/design-audit               # Full audit
/design-audit --colors      # Color compliance only
/design-audit --contrast    # Contrast ratios only
/design-audit --spacing     # Spacing compliance only
```

**Checks:**
- Color token usage
- Contrast ratios (WCAG AA/AAA)
- Spacing consistency
- Typography compliance
- Component patterns

**When to use:** Weekly audits, before releases

---

### `/design-fix`

**Purpose:** Fix design violations systematically

**Usage:**
```bash
/design-fix                # Fix all violations
/design-fix --colors       # Fix color violations only
/design-fix --spacing      # Fix spacing violations only
```

**When to use:** After design audit, before production deploy

---

### `/design-component`

**Purpose:** Create UI components with design enforcement

**Usage:**
```bash
/design-component "component name"
/design-component "User profile card"
```

**Enforces:**
- 100% design token usage
- WCAG AA accessibility minimum
- Pattern library integration
- Consistent styling

**When to use:** Creating new UI components

---

## Code Review

### `/yoyo-review`

**Purpose:** Critical code review with different modes

**Usage:**
```bash
/yoyo-review --devil "scope"       # Devil's advocate
/yoyo-review --security "scope"    # Security audit
/yoyo-review --performance "scope" # Performance analysis
/yoyo-review --production "scope"  # Production readiness
/yoyo-review --premortem "scope"   # Pre-mortem analysis
/yoyo-review --quality "scope"     # Code quality review
```

**Modes:**

| Mode | Focus | When to Use |
|------|-------|-------------|
| `--devil` | Find flaws and what will break | Complex features, before commit |
| `--security` | OWASP Top 10, vulnerabilities | Auth, payments, data handling |
| `--performance` | Bottlenecks, N+1 queries | Dashboards, large datasets |
| `--production` | Monitoring, rollbacks, health | Before production deploy |
| `--premortem` | Why feature will fail | Before building complex features |
| `--quality` | Code style, maintainability | Refactoring, code reviews |

**When to use:**
- Technical debt accumulated
- Recurring bugs
- Complex features
- Before production
- Security audits

**When NOT to use:** Normal feature development (adds overhead)

---

## Memory System

### `/init`

**Purpose:** Scan codebase and initialize memory with project context

**Usage:**
```bash
/init
```

**Creates:** `.yoyo-dev/memory/memory/memory.db` (SQLite)

**When to use:** First time using Yoyo Dev in a project

---

### `/remember`

**Purpose:** Store user preferences or project knowledge

**Usage:**
```bash
/remember "preference or knowledge"
/remember I prefer functional programming with TypeScript
/remember This project uses Convex for the backend
```

**Stores in:** Project memory (`.yoyo-dev/memory/memory/`)

**When to use:** Saving preferences, patterns, project-specific knowledge

---

### `/clear`

**Purpose:** Clear conversation history while preserving memory

**Usage:**
```bash
/clear
```

**Preserves:** All memory blocks in `.yoyo-dev/memory/memory/`

**When to use:** Starting fresh conversation, context limit reached

---

## Advanced

### `/orchestrate-tasks`

**Purpose:** Manual multi-agent orchestration for complex features

**Usage:**
```bash
/orchestrate-tasks
```

**Allows:**
- Different agents for different task groups
- Specific standards per group
- Manual execution order control

**When to use:** 10% power-user scenarios requiring manual control

**When NOT to use:** 90% of cases - use `/execute-tasks` instead

---

### `/improve-skills`

**Purpose:** Optimize agent skills based on usage patterns

**Usage:**
```bash
/improve-skills
```

**Analyzes:**
- Skill usage frequency
- Success/failure rates
- Performance metrics

**Creates:** Optimized skill configurations

**When to use:** After significant project work to optimize performance

---

### `/containerize-application`

**Purpose:** Docker containerization with multi-stage builds

**Usage:**
```bash
/containerize-application --node
/containerize-application --python --multi-stage
```

**Flags:**
- `--node` - Node.js application
- `--python` - Python application
- `--multi-stage` - Multi-stage build optimization

**Creates:**
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml` (if needed)

**When to use:** Preparing application for deployment

---

## Launch Commands

**Terminal Commands:**
```bash
yoyo                    # Launch Claude Code + Browser GUI
yoyo --no-gui           # Claude Code only (no browser GUI)
yoyo --stop-gui         # Stop background GUI server
yoyo-gui                # Launch browser GUI standalone
```

**Browser GUI:**
Access at http://localhost:5173 for:
- Visual task tracking
- Spec browser
- Command palette
- Real-time updates via WebSocket

---

## Command Chaining

**Common workflows:**

```bash
# Complete feature workflow
/plan-product
/create-new "feature name"
/execute-tasks

# Bug fix workflow
/create-fix "problem"
/execute-tasks

# Research before implementing
/research "topic"
# ... wait for results notification
/create-new "feature using researched topic"

# Get strategic advice then execute
/consult-oracle "architecture question"
# ... review Oracle's advice
/create-new "feature based on Oracle's recommendation"
```

---

## Configuration

Most commands respect settings in `.yoyo-dev/config.yml`:

```yaml
workflows:
  task_execution:
    orchestrator: yoyo-ai  # Default for /execute-tasks

  failure_recovery:
    enabled: true
    max_attempts: 3

  frontend_delegation:
    enabled: true

parallel_execution:
  enabled: true
  max_concurrency: 5

design_system:
  enabled: true
  strict_mode: false
```

---

## Exit Codes

Commands follow standard exit codes:

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Validation error
- `4` - Execution error

---

**Version:** 6.2.0
**Last Updated:** 2026-01-03
**Full Docs:** [README.md](../README.md) | [CLAUDE.md](../CLAUDE.md)
