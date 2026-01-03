# Command Reference

> Complete slash command reference for Yoyo Dev v5.0

This document provides a comprehensive reference for all available slash commands.

---

## Command Categories

- [Product Setup](#product-setup)
- [Feature Development](#feature-development)
- [Research & Guidance](#research--guidance)
- [Bug Fixes](#bug-fixes)
- [Design System](#design-system)
- [Memory System](#memory-system)
- [Advanced](#advanced)

---

## Product Setup

### `/plan-product`

Create product mission and roadmap for a new project.

**Usage:**
```bash
/plan-product
```

**What it does:**
1. Gathers product vision from user
2. Creates `.yoyo-dev/product/` directory structure
3. Generates:
   - `mission.md` - Full product vision
   - `mission-lite.md` - Condensed for AI
   - `tech-stack.md` - Technology decisions
   - `roadmap.md` - Development phases

**When to use:**
- Starting a new project
- Defining product direction
- Creating initial roadmap

**See also:**
- `/analyze-product` - For existing projects

---

### `/analyze-product`

Set up product documentation for an existing codebase.

**Usage:**
```bash
/analyze-product
```

**What it does:**
1. Analyzes existing codebase
2. Detects tech stack and architecture
3. Gathers product context from user
4. Creates same output as `/plan-product`

**When to use:**
- Adding Yoyo Dev to existing project
- Documenting existing product
- Reverse-engineering product vision

**See also:**
- `/plan-product` - For new projects

---

## Feature Development

### `/create-new`

Create a new feature with full spec workflow.

**Usage:**
```bash
/create-new "Feature description"

# Examples
/create-new "Add user authentication"
/create-new "Implement CSV export"
/create-new "Add dark mode toggle"
```

**What it does:**
1. **Discovery** - Clarifies requirements with questions
2. **Spec Creation** - Executes spec-shaper agent
3. **Task Generation** - Creates hierarchical task breakdown
4. **Execution Ready** - Prepares for `/execute-tasks`

**Output:**
- `.yoyo-dev/specs/YYYY-MM-DD-feature-name/`
  - `spec.md` - Full requirements
  - `spec-lite.md` - Condensed summary
  - `tasks.md` - Task breakdown
  - `sub-specs/technical-spec.md` - Implementation details
  - `decisions.md` - Technical decisions
  - `state.json` - Workflow state

**When to use:**
- Creating new features
- Starting from roadmap item
- Any new development work

**See also:**
- `/create-spec` - Spec only
- `/create-tasks` - Tasks only
- `/execute-tasks` - Execute tasks

---

### `/create-spec`

Create feature specification without task generation.

**Usage:**
```bash
/create-spec "Feature description"

# Examples
/create-spec "User profile management"
```

**What it does:**
1. Gathers requirements
2. Creates specification documents
3. Stops before task generation

**When to use:**
- Planning phase only
- Need spec review before tasks
- Iterating on requirements

**See also:**
- `/create-tasks` - Generate tasks from spec
- `/create-new` - Full workflow

---

### `/create-tasks`

Generate task breakdown from existing specification.

**Usage:**
```bash
/create-tasks

# Assumes spec exists in current context
```

**What it does:**
1. Reads spec.md and technical-spec.md
2. Executes tasks-list-creator agent
3. Creates hierarchical tasks.md
4. Updates state.json

**When to use:**
- After spec review and approval
- Regenerating tasks
- Breaking down complex specs

**See also:**
- `/create-spec` - Create spec first
- `/execute-tasks` - Execute tasks

---

### `/execute-tasks`

Execute tasks with Yoyo-AI multi-agent orchestration.

**Usage:**
```bash
# Default: Execute all uncompleted tasks with Yoyo-AI
/execute-tasks

# Execute specific task
/execute-tasks --task=2

# Use legacy (v4.0) orchestrator
/execute-tasks --orchestrator legacy

# Disable auto-delegation
/execute-tasks --no-delegation

# Apply review mode
/execute-tasks --security
/execute-tasks --devil --security
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--task=N` | Execute specific task number |
| `--orchestrator yoyo-ai` | Use Yoyo-AI orchestration (default) |
| `--orchestrator legacy` | Use v4.0 single-agent workflow |
| `--no-delegation` | Disable automatic agent delegation |
| `--devil` | Apply devil's advocate review mode |
| `--security` | Apply security review mode |
| `--performance` | Apply performance review mode |
| `--production` | Apply production code review mode |
| `--implementation-reports` | Generate detailed per-task reports |
| `--sequential` | Force sequential execution |
| `--parallel` | Force parallel execution (where safe) |

**What it does:**

**Phase 0: Intent Classification**
- Classifies as Implementation intent
- Routes to Yoyo-AI orchestrator

**Phase 1: Codebase Assessment**
- Analyzes complexity
- Detects frontend work
- Identifies research needs

**Phase 2A: Research & Exploration (Parallel)**
- Fires background librarian tasks
- Searches codebase with explore agent

**Phase 2B: Implementation (Todo-Driven)**
- Creates todos BEFORE implementation
- Marks `in_progress` immediately
- Auto-delegates frontend work
- Implements with TDD
- Marks `completed` immediately
- Escalates to Oracle after 3 failures

**Phase 3: Verification & Completion**
- Runs all tests
- Passes quality gates
- Creates git commit & PR
- Creates recap
- Updates roadmap (if needed)

**When to use:**
- Implementing features
- Executing bug fixes
- Any code implementation work

**See also:**
- `/orchestrate-tasks` - Manual orchestration
- `/create-new` - Create feature first
- `/create-fix` - Bug fix workflow

---

## Research & Guidance

### `/research` (NEW v5.0)

Fire background research task with librarian agent.

**Usage:**
```bash
/research "Research topic"

# Examples
/research "Convex authentication best practices"
/research "Next.js 15 app router patterns"
/research "React 18 concurrent rendering"
```

**What it does:**
1. Fires background task with librarian agent
2. Returns immediately (non-blocking)
3. Searches:
   - Official documentation (Context7)
   - GitHub code examples
   - Web resources (current year: 2025)
4. Delivers results as notification when ready

**When to use:**
- Learning new technologies
- Finding best practices
- Discovering code examples
- Background knowledge gathering

**Execution Mode:** Asynchronous (parallel)

**See also:**
- `/consult-oracle` - Strategic guidance

---

### `/consult-oracle` (NEW v5.0)

Get strategic architecture guidance from Oracle agent.

**Usage:**
```bash
/consult-oracle "Your question"

# Examples
/consult-oracle "Should we use microservices or monolith for MVP?"
/consult-oracle "How to structure this authentication system?"
/consult-oracle "What's causing these N+1 database queries?"
```

**What it does:**
1. Routes question to Oracle agent (temp: 0.1)
2. Oracle provides structured response:
   - **Essential:** Core answer
   - **Expanded:** Detailed explanation
   - **Edge Cases:** Important caveats
   - **Recommendation:** Action items
3. Returns synchronous response

**When to use:**
- Architecture decisions
- Complex debugging
- Strategic technical questions
- Root cause analysis

**Execution Mode:** Synchronous (blocking)

**See also:**
- `/research` - Background research

---

## Bug Fixes

### `/create-fix`

Analyze and fix bugs with systematic problem analysis.

**Usage:**
```bash
/create-fix "Problem description"

# Examples
/create-fix "Login button returns 401 error"
/create-fix "Search returns duplicate results"
/create-fix "Dashboard crashes on mobile"
```

**What it does:**
1. **Investigation** - Explore agent searches codebase (background)
2. **Root Cause Analysis** - Analyzes error, code, logs
3. **Solution Documentation** - Creates fix plan
4. **Task Creation** - TDD-based fix tasks
5. **Execution Ready** - Prepares for `/execute-tasks`

**Output:**
- `.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`
  - `analysis.md` - Problem analysis
  - `solution-lite.md` - Condensed summary
  - `tasks.md` - Fix tasks
  - `state.json` - State tracking

**Auto-escalation:**
- If 3+ failures during fix → escalates to Oracle
- Oracle provides root cause analysis

**When to use:**
- Fixing bugs
- Investigating errors
- Debugging issues

**See also:**
- `/execute-tasks` - Execute fix
- `/consult-oracle` - Strategic debugging

---

## Design System

### `/design-init`

Initialize design system with tokens and patterns.

**Usage:**
```bash
/design-init
```

**What it does:**
1. Creates design token files
2. Configures Tailwind CSS
3. Sets up component patterns
4. Defines accessibility standards

**When to use:**
- Starting UI-heavy project
- Establishing design consistency
- Building component library

**See also:**
- `/design-audit` - Check compliance
- `/design-fix` - Fix violations

---

### `/design-audit`

Audit codebase for design system compliance.

**Usage:**
```bash
/design-audit
```

**What it does:**
1. Scans components for violations
2. Checks:
   - Design token usage
   - Color contrast (WCAG)
   - Spacing consistency
   - Focus states
3. Generates audit report

**When to use:**
- Before releases
- Checking design consistency
- Finding violations

**See also:**
- `/design-fix` - Fix violations
- `/design-component` - Create compliant components

---

### `/design-fix`

Fix design system violations systematically.

**Usage:**
```bash
# Fix all violations
/design-fix

# Fix specific categories
/design-fix --colors
/design-fix --spacing
/design-fix --colors --spacing
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--colors` | Fix color violations only |
| `--spacing` | Fix spacing violations only |
| `--typography` | Fix typography violations only |
| `--accessibility` | Fix a11y violations only |

**When to use:**
- After design audit
- Fixing violations
- Ensuring consistency

**See also:**
- `/design-audit` - Find violations
- `/design-component` - Create components

---

### `/design-component`

Create UI component with design system validation.

**Usage:**
```bash
/design-component "Component description"

# Examples
/design-component "User profile card"
/design-component "Navigation sidebar"
```

**What it does:**
1. Creates component with design tokens
2. Validates against design system
3. Ensures accessibility
4. Generates tests

**When to use:**
- Creating new components
- Ensuring design compliance
- Building UI library

**See also:**
- `/design-init` - Initialize design system

---

## Memory System

### `/init`

Initialize memory system by scanning codebase.

**Usage:**
```bash
/init
```

**What it does:**
1. Scans project structure
2. Detects tech stack (package.json, tsconfig.json, etc.)
3. Identifies coding patterns
4. Creates memory blocks:
   - **Project block** - Tech stack, architecture, patterns
   - **Persona block** - AI assistant configuration

**Output:**
- `.yoyo-dev/memory/memory/memory.db` (SQLite database)

**When to use:**
- First time in project
- After major tech stack changes
- Resetting project memory

**See also:**
- `/remember` - Store preferences
- `/clear` - Clear session

---

### `/remember`

Store user preferences or project knowledge.

**Usage:**
```bash
/remember <what to remember>

# Examples
/remember I prefer functional programming with TypeScript
/remember This project uses Convex for the backend
/remember Always use 2-space indentation
/remember User authentication handled by Clerk
```

**What it does:**
1. Analyzes instruction
2. Determines target block type:
   - User preferences → `user` block
   - Project details → `project` block
   - Patterns → `project.patterns`
   - Corrections → `corrections` block
3. Updates or creates memory block
4. Confirms what was stored

**When to use:**
- Storing preferences
- Recording project knowledge
- Saving patterns
- Correcting mistakes

**See also:**
- `/init` - Initialize memory
- `/clear` - Clear session

---

### `/clear`

Clear conversation history while preserving memory.

**Usage:**
```bash
# Clear conversation only
/clear

# Clear conversation AND memory (use with caution)
/clear --include-memory
```

**What it does:**
1. Clears all conversation messages
2. Preserves memory blocks (default)
3. Reports what was cleared/preserved

**When to use:**
- Between tasks
- Starting fresh conversation
- Removing context clutter

**See also:**
- `/init` - Initialize memory
- `/remember` - Store preferences

---

## Advanced

### `/orchestrate-tasks`

Manual multi-agent orchestration for complex features.

**Usage:**
```bash
/orchestrate-tasks
```

**What it does:**
1. Prompts for orchestration plan
2. Allows custom agent assignment per task group
3. Allows custom standards per task group
4. Manual execution order control

**When to use:**
- Complex features requiring fine control
- Different agents for different task groups
- Specific standards per task group
- Power users only (90% use `/execute-tasks` instead)

**See also:**
- `/execute-tasks` - Automatic orchestration

---

### `/yoyo-review`

Critical code review with specialized review modes.

**Usage:**
```bash
/yoyo-review "Scope description"

# With review modes
/yoyo-review --devil "Authentication flow"
/yoyo-review --security "Payment processing"
/yoyo-review --performance "Dashboard rendering"
/yoyo-review --production "API endpoints"
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--devil` | Devil's advocate mode (find weaknesses) |
| `--security` | Security review (vulnerabilities, threats) |
| `--performance` | Performance review (bottlenecks, optimization) |
| `--production` | Production readiness review |
| `--premortem` | Pre-mortem analysis (why will this fail?) |
| `--quality` | Code quality review (maintainability) |

**When to use:**
- Pre-production reviews
- Security audits
- Performance optimization
- Finding weaknesses

**See also:**
- `/execute-tasks` - Can apply review modes during execution

---

### `/improve-skills`

Optimize agent skills based on usage patterns.

**Usage:**
```bash
/improve-skills
```

**What it does:**
1. Analyzes agent performance
2. Identifies optimization opportunities
3. Updates agent configurations
4. Generates optimization report

**When to use:**
- After multiple projects
- Tuning agent performance
- Customizing workflows

---

## Command Flags Reference

### Global Flags

Available across multiple commands:

| Flag | Commands | Description |
|------|----------|-------------|
| `--devil` | `/yoyo-review`, `/execute-tasks` | Apply devil's advocate review |
| `--security` | `/yoyo-review`, `/execute-tasks` | Apply security review |
| `--performance` | `/yoyo-review`, `/execute-tasks` | Apply performance review |
| `--production` | `/yoyo-review`, `/execute-tasks` | Apply production review |

### Execution Flags

Available for `/execute-tasks`:

| Flag | Description |
|------|-------------|
| `--task=N` | Execute specific task number |
| `--orchestrator yoyo-ai` | Use Yoyo-AI orchestration (default) |
| `--orchestrator legacy` | Use v4.0 workflow |
| `--no-delegation` | Disable auto-delegation |
| `--implementation-reports` | Generate detailed reports |
| `--sequential` | Force sequential execution |
| `--parallel` | Force parallel execution |

### Design Flags

Available for `/design-fix`:

| Flag | Description |
|------|-------------|
| `--colors` | Fix color violations only |
| `--spacing` | Fix spacing violations only |
| `--typography` | Fix typography violations only |
| `--accessibility` | Fix a11y violations only |

---

## See Also

- **[Quick Start](QUICK-START.md)** - Getting started tutorial
- **[Multi-Agent System](multi-agent-orchestration.md)** - Agent details
- **[Architecture](ARCHITECTURE.md)** - System architecture
- **[Installation](INSTALLATION.md)** - Setup guide

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
