# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Yoyo Dev** is a development workflow framework that provides structured instructions, standards, and tools for AI-assisted software development. It supports both Claude Code and Cursor IDE integration.

The system is designed to guide AI agents through product planning, specification creation, task management, and code execution workflows using a persona-driven development approach.

## Installation & Setup

### Installing Yoyo Dev in a Project

```bash
# From base installation (typical usage)
~/.yoyo-dev/setup/project.sh --claude-code

# From GitHub (no base installation)
~/.yoyo-dev/setup/project.sh --no-base --claude-code

# With specific project type
~/.yoyo-dev/setup/project.sh --claude-code --project-type=default

# With Cursor support
~/.yoyo-dev/setup/project.sh --cursor
```

**Installation flags:**
- `--claude-code`: Install Claude Code commands and agents
- `--cursor`: Install Cursor rules
- `--no-base`: Install directly from GitHub
- `--project-type=TYPE`: Use specific project type configuration
- `--overwrite-instructions`: Overwrite existing instruction files
- `--overwrite-standards`: Overwrite existing standards files

### Updating Yoyo Dev in a Project

```bash
# Update Yoyo Dev to latest version (overwrites framework files by default)
~/.yoyo-dev/setup/yoyo-update.sh

# Preserve customizations with no-overwrite flags
~/.yoyo-dev/setup/yoyo-update.sh --no-overwrite-instructions --no-overwrite-standards
~/.yoyo-dev/setup/yoyo-update.sh --no-overwrite-commands --no-overwrite-agents
~/.yoyo-dev/setup/yoyo-update.sh --no-overwrite
```

**Update flags:**
- `--no-overwrite-instructions`: Keep existing instruction files
- `--no-overwrite-standards`: Keep existing standards files
- `--no-overwrite-commands`: Keep existing command files
- `--no-overwrite-agents`: Keep existing agent files
- `--no-overwrite`: Keep all existing files

**Default behavior:** Framework files (instructions, standards, commands, agents) are overwritten by default to ensure latest improvements are applied.

**Note:** Product docs (`.yoyo-dev/product/`), specs (`.yoyo-dev/specs/`), fixes (`.yoyo-dev/fixes/`), recaps (`.yoyo-dev/recaps/`), and patterns (`.yoyo-dev/patterns/`) are ALWAYS protected and never overwritten during updates.

## Quick Start

### Launching Yoyo Dev

```bash
# Launch full-screen Textual TUI dashboard
yoyo
```

The `yoyo` command displays a branded header with project info, then launches the **Textual TUI dashboard** (full-screen):
- Beautiful ASCII art header with project context
- Project name, location, and mission
- Tech stack summary
- Quick-start guide and command overview
- Link to product documentation

Then launches the full-screen Textual TUI dashboard.

**TUI Dashboard Features:**
- Real-time task and spec tracking
- Live project status updates
- Interactive commands (one-click to copy)
- Press `?` for help and keyboard shortcuts
- Press `q` to quit
- Auto-installs dependencies (textual, watchdog, pyyaml) if needed

**Installation:**
- Auto-detects Yoyo Dev installation (offers install if missing)
- Reads project context from `.yoyo-dev/product/` files
- Shows all available commands with descriptions

## Core Commands

### Claude Code Commands (use with `/` prefix)

**Product Setup:**
- `/plan-product` - Set the mission & roadmap for a new product
- `/analyze-product` - Set up mission and roadmap for an existing product

**Feature Development:**
- `/create-new` - Create a new feature with full spec workflow and task generation (streamlined)
- `/create-spec` - Create a specification for a new feature (detailed spec creation only)
- `/create-tasks` - Create tasks from a specification
- `/execute-tasks` - Build and ship code for a new feature

**Bug Fixes & Issues:**
- `/create-fix` - Analyze and fix bugs, design issues, or layout problems with systematic problem analysis and task generation

**Task Orchestration:**
- `/orchestrate-tasks` - Advanced manual multi-agent orchestration for complex features (assign agents, standards per task group)
- `/improve-skills` - Optimize Claude Code Skills for better discoverability and triggering reliability

**Code Review (Optional):**
- `/review` - Critical code review with specialized modes (devil, security, performance, production)

**Design System:**
- `/design-init` - Initialize comprehensive design system for new or existing projects
- `/design-audit` - Audit codebase for design consistency violations
- `/design-fix` - Systematically fix design system violations
- `/design-component` - Create UI components with enforced design consistency

**How Commands Work:**
Commands in `.claude/commands/` are entry points that reference the detailed instructions in `.yoyo-dev/instructions/core/`. When a command is invoked, it tells Claude to follow the corresponding instruction file.

## Architecture

### Directory Structure

```
.yoyo-dev/
├── instructions/          # AI agent workflow instructions
│   ├── core/             # Core workflow instructions (plan, spec, execute)
│   └── meta/             # Meta instructions (pre-flight, post-flight)
├── standards/            # Development standards and guidelines
│   ├── best-practices.md # Tech stack best practices
│   ├── personas.md       # Persona definitions
│   ├── tech-stack.md     # Default tech stack
│   └── code-style/       # Code style guides
├── claude-code/          # Claude Code specific files
│   └── agents/           # Specialized agents
├── setup/                # Installation scripts
└── config.yml            # Configuration file

workflows/                # Reusable workflow components (NEW v1.6.0)
├── planning/             # Product planning workflows
├── specification/        # Spec creation workflows
└── implementation/       # Task execution and verification workflows

.claude/                  # Claude Code configuration (canonical location)
├── commands/             # Slash commands entry points
└── agents/               # Agent configurations

lib/                      # Library files
├── yoyo_tui_v3/          # Modern TUI implementation
├── yoyo-status.sh        # Bash dashboard fallback
└── archive/              # Historical implementations
```

### Key Files

**Configuration:**
- `config.yml` - Main configuration (agents, project types, paths)

**Core Instructions:**
- `instructions/core/plan-product.md` - Product planning workflow
- `instructions/core/create-new.md` - Streamlined feature creation workflow
- `instructions/core/create-fix.md` - Bug fix and issue resolution workflow
- `instructions/core/review.md` - Critical code review workflow
- `instructions/core/create-spec.md` - Specification creation workflow
- `instructions/core/execute-tasks.md` - Task execution workflow
- `instructions/core/execute-task.md` - Individual task execution
- `instructions/core/post-execution-tasks.md` - Post-execution steps

**Standards:**
- `standards/best-practices.md` - Development best practices
- `standards/personas.md` - Persona-driven development approach
- `standards/tech-stack.md` - Default technology stack
- `standards/review-modes.md` - Critical review modes and checklists
- `standards/parallel-execution.md` - Parallel task execution strategy
- `standards/output-formatting.md` - Rich terminal output formatting guidelines
- `standards/formatting-helpers.md` - Reusable formatting templates
- `standards/design-system.md` - Design system philosophy and patterns (**NEW v1.5.0**)
- `standards/design-validation.md` - Design validation rules (**NEW v1.5.0**)
- `standards/component-patterns.md` - Reusable component patterns (**NEW v1.5.0**)
- `standards/code-style/` - Language-specific style guides

**Agents:**
- `claude-code/agents/context-fetcher.md` - Context gathering agent
- `claude-code/agents/file-creator.md` - File creation agent
- `claude-code/agents/git-workflow.md` - Git operations agent
- `claude-code/agents/project-manager.md` - Task tracking agent
- `claude-code/agents/test-runner.md` - Test execution agent
- `claude-code/agents/date-checker.md` - Date validation agent
- `claude-code/agents/design-analyzer.md` - Design pattern extraction (**NEW v1.5.0**)
- `claude-code/agents/design-validator.md` - Design compliance validation (**NEW v1.5.0**)
- `claude-code/agents/spec-initializer.md` - Spec folder initialization (**NEW v1.6.0**)
- `claude-code/agents/spec-shaper.md` - Requirements gathering (**NEW v1.6.0**)
- `claude-code/agents/spec-writer.md` - Specification document creation (**NEW v1.6.0**)
- `claude-code/agents/tasks-list-creator.md` - Strategic task breakdown (**NEW v1.6.0**)
- `claude-code/agents/implementer.md` - TDD-based task implementation (**NEW v1.6.0**)
- `claude-code/agents/implementation-verifier.md` - Implementation quality verification (**NEW v1.6.0**)
- `claude-code/agents/product-planner.md` - Product documentation creation (**NEW v1.6.0**)

**Workflows:** (**NEW v1.6.0**)
- `workflows/` - Reusable workflow components referenced by agents
  - `planning/` - Product planning workflows (gather-product-info, create-mission, create-roadmap, create-tech-stack)
  - `specification/` - Spec creation workflows (initialize-spec, research-spec, write-spec, verify-spec)
  - `implementation/` - Task execution workflows (create-tasks-list, implement-tasks, compile-standards)
  - `implementation/verification/` - Verification workflows (verify-functionality, verify-tests, verify-accessibility, verify-performance, verify-security, verify-documentation)

### Workflow Reference System (**NEW v1.6.0**)

Agents can now reference reusable workflow components using `{{workflows/*}}` syntax:

```yaml
---
name: implementer
description: Executes task implementation
tools: [Write, Read, Bash]
---

# Implementer Agent

{{workflows/implementation/implement-tasks.md}}

## Additional Instructions
- Always write tests first
- Follow tech stack standards
```

**How it works:**
1. Agent files include YAML frontmatter with metadata (name, description, tools, model)
2. Workflow references using `{{workflows/path/to/workflow.md}}` are expanded inline
3. Nested workflow references supported (max 3 levels deep)
4. Cycle detection prevents infinite loops
5. Workflows are cached for performance (< 100ms overhead)

**Benefits:**
- **Reusable:** Same workflow used by multiple agents
- **Maintainable:** Update workflow once, affects all referencing agents
- **Composable:** Build complex behaviors from simple workflows
- **Testable:** Workflows can be validated independently

See `workflows/README.md` for detailed documentation on creating and composing workflows.

## Workflow System

### Product Planning Workflow (`/plan-product`)

Creates foundational product documentation:
1. Gather user input (idea, features, users, tech stack)
2. Create documentation structure (`.yoyo-dev/product/`)
3. Generate `mission.md` (full product vision)
4. Generate `tech-stack.md` (technical architecture)
5. Generate `mission-lite.md` (condensed AI context)
6. Generate `roadmap.md` (development phases)

### Product Analysis Workflow (`/analyze-product`)

For existing codebases, analyzes current state and installs Yoyo Dev:
1. Analyze existing codebase - Deep analysis of structure, tech stack, features, patterns
2. Gather product context - Ask user for vision, roadmap, preferences
3. Execute plan-product - Run product planning workflow with gathered context
4. Customize generated files - Adjust roadmap with "Phase 0: Already Completed" section
5. Final verification - Verify installation and provide summary

### Create New Feature Workflow (`/create-new`)

Streamlined workflow combining spec creation and task generation:
1. Feature discovery - Understand what to build (roadmap item or user idea)
2. Context gathering - Load mission-lite.md and tech-stack.md (if not in context)
3. Requirements clarification - Ask targeted numbered questions to clarify scope
4. Execute spec creation - Run full spec creation workflow (steps 4-11 from /create-spec)
5. User spec review - Get approval on specification
6. Execute task creation - Automatically create task breakdown
7. Execution readiness - Present first task and prepare for /execute-tasks

**Use this when:** Building new features, components, pages, or functionality

### Specification Workflow (`/create-spec`)

Creates detailed feature specifications:
1. Spec initiation - Identify what to spec (next roadmap item or user idea)
2. Context gathering - Load mission-lite.md and tech-stack.md (if not in context)
3. Requirements clarification - Ask numbered questions to clarify scope
4. Date determination - Get current date using date-checker agent
5. Create spec folder structure (`.yoyo-dev/specs/YYYY-MM-DD-feature-name/`)
6. Generate `spec.md` - Full requirements document
7. Generate `spec-lite.md` - Condensed for AI context
8. Generate `sub-specs/technical-spec.md` - Technical implementation details
9. Generate `sub-specs/database-schema.md` - Database changes (if needed)
10. Generate `sub-specs/api-spec.md` - API changes (if needed)
11. Generate `decisions.md` - Technical decisions log
12. User review and approval

**Use this when:** You want detailed spec creation without automatic task generation

### Create Fix Workflow (`/create-fix`)

Systematic bug fix and issue resolution workflow:
1. Problem identification - Gather complete problem information
2. Code investigation - Use context-fetcher to investigate and find root cause
3. Root cause analysis - Determine underlying cause and present findings
4. Date determination - Get current date for folder naming
5. Create fix folder structure (`.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`)
6. Create analysis document - Comprehensive problem analysis and solution approach
7. Create solution summary - Condensed summary for AI context
8. User solution review - Get approval on fix approach
9. Create fix tasks - Generate TDD-based task breakdown (test first, then fix)
10. Execution readiness - Present task summary and prepare for /execute-tasks

**Use this when:** Fixing bugs, design issues, layout problems, or performance issues

### Task Creation Workflow (`/create-tasks`)

After spec approval, create tasks checklist:
1. Create `tasks.md` - Break down spec into parent tasks (1-5) with subtasks (up to 8 each)
2. Execution readiness check - Present first task summary and ask for confirmation

**Task structure pattern:**
- First subtask: Write tests for [component]
- Middle subtasks: Implementation steps
- Last subtask: Verify all tests pass

### Task Execution Workflow (`/execute-tasks`)

Three-phase execution process:

**Phase 1: Pre-Execution Setup**
1. Task assignment - Identify tasks to execute (defaults to next uncompleted task)
2. Context analysis - Gather necessary context using context-fetcher agent
3. Git status check - Check current branch status (no branch creation/switching)

**Phase 2: Task Execution Loop**
4. Execute all assigned tasks - For each parent task:
   - Task understanding - Read parent task and subtasks
   - Technical spec review - Extract relevant sections
   - Best practices review - Get relevant sections using context-fetcher
   - Code style review - Get style rules using context-fetcher
   - Task execution - Implement using TDD approach
   - Test verification - Run task-specific tests using test-runner
   - Mark complete - Update tasks.md with [x] for completed tasks

**Phase 3: Post-Execution Tasks**
5. Run all tests - Full test suite using test-runner agent
6. Implementation verification - Run systematic quality verification using implementation-verifier agent (functionality, tests, accessibility, performance, security, documentation)
7. Git workflow - Commit, push, create PR using git-workflow agent
8. Verify tasks complete - Check tasks.md using project-manager agent
9. Update roadmap - Mark roadmap items complete (conditional) using project-manager
10. Create recap - Document in `.yoyo-dev/recaps/` using project-manager
11. Update patterns library - Extract successful patterns (optional)
12. Finalize state - Update state.json to mark workflow complete
13. Completion summary - Generate summary with PR link using project-manager
14. Notification - Play completion sound (macOS: `afplay`, Linux: `paplay` or skip if unavailable)

**IMPORTANT:** All three phases MUST be completed. Do not stop after Phase 2.

**Optional Flags:**
- `--implementation-reports` - Generate detailed per-task-group implementation reports in `implementation/` folder
- `--devil`, `--security`, `--performance`, `--production` - Apply critical review modes during implementation
- `--sequential` - Force sequential execution (disable parallel)
- `--parallel` - Force parallel execution

## Parallel Task Execution

**NEW**: Yoyo Dev automatically analyzes task dependencies and executes independent tasks concurrently for 2-3x faster development.

### How It Works

**Phase 1: Dependency Analysis**
1. Extract metadata from each task:
   - Dependencies field
   - Files to Create
   - Files to Modify
   - Parallel Safe flag

2. Build dependency graph:
   - Identify tasks with no dependencies (Group 0)
   - Group tasks by dependency levels
   - Detect file write conflicts

3. Create execution plan:
   - Group independent tasks for parallel execution
   - Order dependent tasks sequentially
   - Calculate estimated time savings

**Phase 2: Parallel Execution**
1. Execute each group:
   - If group has multiple tasks → run in parallel
   - If group has single task → run sequentially
   - Wait for group completion before next group

2. Use Claude Code's parallel tool calls:
   ```
   SEND_MESSAGE:
     - Task tool (agent A) for Task 1
     - Task tool (agent B) for Task 2
     - Task tool (agent C) for Task 3
   ```

3. Collect results:
   - Success/failure status
   - Files created/modified
   - Test results
   - Error messages

### Task Metadata Requirements

Tasks in `tasks.md` should include:

```markdown
## Task 1: Create Database Schema

**Dependencies:** None
**Files to Create:**
  - convex/schema.ts
  - convex/migrations/001_profiles.ts
**Files to Modify:** None
**Parallel Safe:** Yes

**Subtasks:**
- [ ] 1.1 Define schema
- [ ] 1.2 Create migration
- [ ] 1.3 Run tests
```

### Conflict Detection

**File Write Conflicts:**
- Task A modifies `routes.ts`
- Task B modifies `routes.ts`
- **Result:** Sequential execution (conflict)

**Read Dependencies:**
- Task A creates `ProfileCard.tsx`
- Task B uses `ProfileCard` component
- **Result:** Task A → Task B (dependency)

**No Conflicts:**
- Task A creates `ProfileCard.tsx`
- Task B creates `SettingsPage.tsx`
- **Result:** Parallel execution ⚡

### Performance Gains

**Typical speedup:**
- 3 independent tasks: 3x faster
- Mixed dependencies: 2x faster on average
- Sequential tasks: No slowdown (same as before)

**Example timeline:**
```
Sequential:  Task 1 (5min) → Task 2 (5min) → Task 3 (5min) = 15min
Parallel:    [Task 1, 2, 3 concurrent] = 5min
Speedup:     3x faster (10 min saved)
```

### Safety Mechanisms

1. **Conservative defaults** - When in doubt, run sequentially
2. **Pre-execution validation** - Check git status, dependencies
3. **Rollback on failure** - Stop all parallel tasks if one fails
4. **File lock detection** - Prevent concurrent file modifications

### Configuration

Enable/disable in `.yoyo-dev/config.yml`:

```yaml
parallel_execution:
  enabled: true              # Default: true
  max_concurrency: 5         # Max parallel tasks
  auto_analyze: true         # Automatic dependency analysis
  ask_confirmation: true     # Ask before parallel execution
```

### Command Flags

```bash
/execute-tasks              # Auto parallel (default)
/execute-tasks --sequential # Force sequential
/execute-tasks --parallel   # Force parallel
```

---

## Review Modes (Optional)

Review modes provide critical analysis when you need extra scrutiny. They are **opt-in only** and used strategically when projects go sideways.

### Available Review Modes

**`--devil` (Devil's Advocate)**
- Find what will break, edge cases, naive assumptions
- Challenge architectural decisions
- Identify failure modes before they happen

**`--security` (Security Review)**
- Vulnerabilities, auth issues, data leaks
- OWASP Top 10 checks
- Threat modeling for features

**`--performance` (Performance Review)**
- Bottlenecks, N+1 queries, memory leaks
- Algorithm complexity analysis
- Bundle size and render optimization

**`--production` (Production Readiness)**
- Error handling, logging, monitoring
- Rollback procedures, feature flags
- Load testing and health checks

**`--premortem` (Pre-Mortem Analysis)**
- Analyze why feature will fail before building
- Identify external dependency risks
- Plan mitigations upfront

**`--quality` (Code Quality)**
- Maintainability, test coverage, documentation
- Style guide compliance
- Technical debt identification

### Using Review Modes

**Standalone code review:**
```bash
/review --devil "Review authentication flow"
/review --security "Audit payment processing"
/review --performance "Analyze dashboard performance"
```

**During task execution:**
```bash
/execute-tasks --devil        # Apply devil's advocate review
/execute-tasks --security     # Apply security review
/execute-tasks --performance  # Apply performance review
```

**Combining modes:**
```bash
/review --security --performance "Review API endpoints"
```

### When to Use Review Modes

✅ **Use review modes when:**
- Projects have accumulated technical debt
- Bugs keep reappearing in the same area
- Before building complex/risky features
- Performance is degrading
- Security audit needed
- Before production deployment

❌ **Don't use for:**
- Normal feature development (trust the standard workflow)
- Simple tasks and routine work

### Review Mode Output

Creates detailed review reports:
- `.yoyo-dev/reviews/YYYY-MM-DD-[scope]-[mode].md`

Reports include:
- Executive summary with severity counts
- Detailed findings with file locations
- Checklist results
- Concrete fix recommendations
- Integration with `/create-fix` workflow

### The Golden Rule

**Review modes are tools, not defaults.** Use them strategically when you need extra scrutiny. Trust the systematic Yoyo Dev workflow for normal development.

---

## Design System Workflows

**NEW in v1.5.0:** Yoyo Dev now includes a comprehensive design system to ensure visual consistency, accessibility compliance, and design quality across all UI components.

### Design System Philosophy

**The Problem:** AI-assisted development often produces visually inconsistent UIs with:
- Hardcoded colors instead of design tokens
- Arbitrary spacing values (p-[23px])
- Poor color contrast (accessibility violations)
- Missing focus states
- Inconsistent component patterns

**The Solution:** Systematic design enforcement through:
- Design tokens (single source of truth)
- Component pattern library
- Automated validation
- Accessibility compliance (WCAG AA)

### Design System Commands

#### `/design-init` - Initialize Design System

Creates comprehensive design system for new or existing projects:

1. **Analyze existing code** (if existing project)
   - Extract color palettes, spacing patterns, typography
   - Identify component patterns
   - Calculate compliance baseline

2. **Gather design preferences**
   - Primary brand color
   - Color scheme (modern, vibrant, muted)
   - Spacing base (4px or 8px grid)
   - Border radius style
   - Typography scale
   - Dark mode support
   - Accessibility level (WCAG AA/AAA)

3. **Generate design tokens**
   - Colors (brand, semantic, surface, text, border)
   - Spacing scale
   - Typography scale
   - Border radius
   - Elevation (shadows)
   - Animation durations
   - Breakpoints

4. **Create Tailwind configuration**
   - Generated from design tokens
   - Custom color palette
   - Extended spacing/typography
   - Dark mode support

5. **Build component pattern library**
   - Buttons (variants: primary, secondary, ghost, danger)
   - Cards (default, elevated, interactive)
   - Forms (inputs, select, checkbox, radio, toggle)
   - Navigation (header, sidebar, breadcrumbs, tabs)
   - Layouts (containers, grids, sections)

6. **Create documentation**
   - Full design system docs
   - Condensed lite version for AI context
   - Component pattern examples
   - Usage guidelines

**Output:**
```
.yoyo-dev/design/
├── tokens.json              # Design tokens (source of truth)
├── tailwind.config.js       # Generated Tailwind config
├── design-system.md         # Full documentation
├── design-lite.md           # Condensed for AI
├── README.md                # Getting started guide
├── component-patterns/      # Reusable patterns
│   ├── buttons.md
│   ├── cards.md
│   ├── forms.md
│   ├── navigation.md
│   └── layouts.md
└── audits/
    └── baseline-audit.json  # Initial compliance baseline
```

#### `/design-audit` - Audit Design Consistency

Comprehensive audit of design system compliance:

**Checks:**
1. **Design Token Compliance**
   - Color usage (no hardcoded Tailwind colors)
   - Spacing values (only scale values, no arbitrary px)
   - Typography (font sizes from scale)

2. **Accessibility Compliance**
   - Color contrast (WCAG AA: 4.5:1 minimum)
   - Focus states on all interactive elements
   - ARIA labels where needed
   - Semantic HTML usage

3. **Responsive Design**
   - Works across all breakpoints
   - Touch targets ≥ 44px on mobile
   - No horizontal scroll

4. **Dark Mode**
   - All components work in dark mode
   - Contrast maintained in both modes

**Output:**
- Console summary with compliance score
- Detailed report: `.yoyo-dev/design/audits/YYYY-MM-DD-audit.md`
- Violations categorized by severity (critical/medium/minor)
- Fix recommendations with file locations

**Example:**
```
🔍 Design Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: UserProfileCard.tsx
📊 Score: 72/100 ⚠️ ACCEPTABLE

❌ Critical Issues (2):
  1. Color Contrast Failure (line 45)
     • Fix: Use text-text-primary instead of text-text-secondary

  2. Missing Focus State (line 67)
     • Fix: Add focus-visible:ring-2 focus-visible:ring-brand-primary

⚠️  Medium Issues (3):
  3. Hardcoded Color (line 23)
     • Fix: Replace bg-blue-500 with bg-brand-primary
```

#### `/design-fix` - Fix Design Violations

Systematically fix violations found in audit:

1. **Load violations** from latest audit
2. **User selects** which violations to fix
3. **Generate fix tasks** (TDD-based)
4. **Execute fixes** with validation
5. **Re-run audit** to verify

**Usage:**
```bash
/design-fix                 # Fix all violations
/design-fix --colors        # Fix only color violations
/design-fix --spacing       # Fix only spacing violations
/design-fix --contrast      # Fix only contrast violations
/design-fix --focus         # Fix only focus state violations
```

#### `/design-component` - Create Consistent Components

Build new UI components with enforced design consistency:

**Enhanced over `/create-new`:**
- **Zero violations allowed** (stricter validation)
- **All variants required** (sizes, states)
- **Pattern library integration**
- **Accessibility complete** (WCAG AA compliance)

**Validation requirements:**
- ✓ 100% design token compliance
- ✓ WCAG AA contrast ratios
- ✓ Focus states on all interactive elements
- ✓ Semantic HTML
- ✓ ARIA labels
- ✓ Responsive design
- ✓ Dark mode support
- ✓ Keyboard navigation

**Example:**
```bash
/design-component "User profile card"
```

Generates component with all variants, states, and adds to pattern library if reusable.

### Design System Standards

**Key standards files:**

1. **`standards/design-system.md`** - Complete design philosophy
   - Design tokens system
   - Component patterns
   - Layout patterns
   - Accessibility standards
   - Dark mode strategy
   - Performance guidelines

2. **`standards/design-validation.md`** - Validation rules
   - Pre-execution checks
   - During-execution compliance
   - Post-execution validation
   - Automated validation tools

3. **`standards/component-patterns.md`** - Ready-to-use patterns
   - Button patterns (with all variants)
   - Card patterns
   - Form patterns
   - Navigation patterns
   - Layout patterns
   - Usage guidelines

### Design System Agents

**design-analyzer** - Extract design patterns from code
- Color palette extraction
- Spacing pattern detection
- Component pattern identification
- Compliance scoring

**design-validator** - Enforce design system compliance
- Design token validation
- Color contrast checking
- Focus state verification
- Accessibility auditing

### Design Validation Integration

Design validation can be integrated into existing workflows:

**During feature development:**
```bash
/execute-tasks --design-mode
```

Enables:
- Automatic design system loading
- Real-time token compliance checking
- Post-task validation
- Pattern library auto-update

**In create-new workflow:**
When UI components are detected:
- Design system context loaded automatically
- Validation runs before task completion
- Zero violations required for merge

### Design Token Usage

**Colors:**
```tsx
// ✅ CORRECT - Design tokens
<div className="bg-brand-primary text-white">
<div className="bg-surface-card border-border-default">
<p className="text-text-primary">

// ❌ WRONG - Hardcoded
<div className="bg-blue-500 text-white">
<div className="bg-white border-gray-200">
<p className="text-black">
```

**Spacing:**
```tsx
// ✅ CORRECT - Scale values
<div className="p-4 mt-6 gap-2">

// ❌ WRONG - Arbitrary values
<div className="p-[23px] mt-[45px] gap-[9px]">
```

**Typography:**
```tsx
// ✅ CORRECT - Scale values
<h1 className="text-4xl font-bold">
<p className="text-base leading-6">

// ❌ WRONG - Arbitrary values
<h1 className="text-[38px] font-bold">
<p className="text-[15px] leading-[1.75]">
```

### Design System Configuration

Configure in `.yoyo-dev/config.yml`:

```yaml
design_system:
  enabled: true                   # Enable design system
  auto_validate: true             # Auto-validate during workflows
  accessibility_level: WCAG-AA    # WCAG-AA or WCAG-AAA
  dark_mode: true                 # Dark mode support required
  spacing_base: 4                 # 4px or 8px grid
  strict_mode: false              # Block merge on violations
```

### Design System Benefits

**Consistency:**
- Single source of truth for all design values
- Reusable component patterns
- Systematic enforcement

**Accessibility:**
- WCAG AA compliance automated
- Color contrast validation
- Focus states enforced
- Semantic HTML required

**Maintainability:**
- Easy to update design system (change tokens, cascade everywhere)
- Pattern library grows with project
- Living documentation

**Developer Experience:**
- Clear guidelines
- Automated validation
- Actionable error messages
- Fix recommendations

### When to Use Design System Workflows

**Use `/design-init` when:**
- Starting new project with UI
- Inheriting project with inconsistent design
- Want to establish design system

**Use `/design-audit` when:**
- Weekly design consistency check
- Before major releases
- After adding many UI components
- Suspecting design drift

**Use `/design-fix` when:**
- Audit reveals violations
- Cleaning up technical debt
- Migrating to design system

**Use `/design-component` when:**
- Building reusable UI components
- Need strict design compliance
- Creating pattern library entries

### Design System vs Regular Workflows

**Regular `/create-new`:**
- Best for features with mixed UI + logic
- Standard validation
- Faster iteration

**Design-focused `/design-component`:**
- Best for pure UI components
- Strict validation (zero violations)
- All variants required
- Pattern library integration

---

## Persona-Driven Development

Yoyo Dev uses specialized personas to guide development approaches:

- **Architect** - System design, long-term thinking, technical decisions
- **Frontend** - UX, accessibility, performance, mobile-first
- **Backend** - Reliability, performance, scalability, API design
- **Security** - Threat modeling, defense in depth, compliance
- **Performance** - Optimization, profiling, performance budgets
- **QA** - Testing, edge cases, quality gates
- **Refactorer** - Code quality, technical debt, maintainability
- **Analyzer** - Root cause analysis, debugging, investigation
- **Mentor** - Documentation, teaching, knowledge transfer

### When to Apply Personas

- **File Type Detection**: Automatically based on file extensions (tsx/jsx → Frontend, test → QA, etc.)
- **Context Intelligence**: Based on keywords (error/bug → Analyzer, slow/perf → Performance)
- **Explicit Activation**: Apply specific persona for focused work

### Collaboration Patterns

**Sequential:** architect → frontend/backend → qa → security
**Parallel:** frontend & backend & security (concurrent development)

## Tech Stack Defaults

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Backend:** Convex (serverless)
- **Authentication:** Clerk
- **Styling:** Tailwind CSS v4
- **Package Manager:** npm
- **Node Version:** 22 LTS
- **Icons:** Lucide React
- **CI/CD:** GitHub Actions

## Rich Terminal Output

Yoyo Dev provides structured, color-coded terminal output for superior developer experience.

### Formatting System

All commands should use rich formatting from `standards/output-formatting.md` and `standards/formatting-helpers.md`.

**Key features:**
- Color-coded status (green = success, red = error, yellow = warning)
- Progress indicators with visual bars
- Structured tables for data
- Hierarchical task trees
- Clear next-step guidance

### Template Usage

Instructions reference templates by ID:
- **T1**: Command header
- **T2**: Phase progress
- **T3**: Success message
- **T4**: Error message
- **T5**: Warning message
- **T6**: Critical alert
- **T7**: Option menu
- **T8**: Information table
- **T9**: Task hierarchy
- **T10**: Progress bar
- **T11**: File tree
- **T12**: Completion summary

**Example in instructions:**
```xml
<instructions>
  OUTPUT: T1 (Command header)
  \033[1m\033[36m┌────────────────────────────────────────────────┐\033[0m
  \033[1m\033[36m│\033[0m  🚀 \033[1mCOMMAND NAME\033[0m                               \033[1m\033[36m│\033[0m
  \033[1m\033[36m└────────────────────────────────────────────────┘\033[0m
</instructions>
```

### Formatting Guidelines

1. **Always use headers** for command start
2. **Show progress** for multi-step operations
3. **Color semantically** (never decoratively)
4. **Provide next steps** in completion messages
5. **Make errors actionable** with fix instructions
6. **Keep boxes aligned** (60 chars width standard)

---

## Important Conventions

### Subagent Usage

When instructions specify `subagent=""` attribute, you MUST use the Task tool to invoke that specialized agent:

```xml
<step number="2" subagent="context-fetcher" name="context_analysis">
```

Means: Use the Task tool with subagent_type="general-purpose" to run the context-fetcher agent.

### Process Flow Execution

- Read and execute every numbered `<step>` in `<process_flow>` blocks sequentially
- Execute pre-flight checks before starting
- Execute post-flight checks after completing
- Use exact templates as provided in instructions
- If clarification needed, ask specific questions before continuing

### File Organization

**Product files:** `.yoyo-dev/product/`
- `mission.md` - Full product vision
- `mission-lite.md` - Condensed for AI context
- `tech-stack.md` - Technical architecture
- `roadmap.md` - Development phases

**Spec files:** `.yoyo-dev/specs/YYYY-MM-DD-feature-name/`
- `spec.md` - Full requirements document (with overview, user stories, scope, deliverables)
- `spec-lite.md` - Condensed spec for AI context
- `tasks.md` - Task breakdown (created by /create-tasks or /create-new command)
- `decisions.md` - Technical decisions log
- `state.json` - Workflow state tracking
- `sub-specs/technical-spec.md` - Technical implementation details
- `sub-specs/database-schema.md` - Database schema changes (conditional)
- `sub-specs/api-spec.md` - API specification (conditional)

**Fix files:** `.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`
- `analysis.md` - Full problem analysis and solution approach
- `solution-lite.md` - Condensed fix summary for AI context
- `tasks.md` - Task breakdown for fix implementation
- `state.json` - Workflow state tracking

**Recap files:** `.yoyo-dev/recaps/YYYY-MM-DD-feature-name.md`

### Git Branch Management

**IMPORTANT: Yoyo Dev no longer creates or switches branches automatically.**
- All commits are made to the current active branch
- Users must manually create and switch to branches before running workflows
- The git-workflow agent will check and report the current branch status
- No automatic branch creation during `/create-fix`, `/create-new`, or `/execute-tasks`

## Development Best Practices

### Core Principles

1. **Keep It Simple** - Fewest lines possible, avoid over-engineering
2. **Optimize for Readability** - Clear names, self-documenting code
3. **DRY** - Extract repeated logic to utilities/components/hooks
4. **File Structure** - Single responsibility, feature-based organization

### Quality Gates

Before considering any feature complete:
1. Functionality - Works as specified
2. Type Safety - No TypeScript errors
3. Testing - Adequate coverage
4. Accessibility - WCAG compliance
5. Performance - Meets budgets
6. Security - No vulnerabilities
7. Code Quality - Follows style guidelines
8. Documentation - Adequately documented

### React 18 + TypeScript Best Practices

- Use functional components exclusively
- Define prop types with TypeScript interfaces
- Use `useState` for simple state, `useReducer` for complex state
- Prefer Convex queries for server state
- Create custom hooks for reusable logic
- Follow Rules of Hooks
- Use React.memo for expensive components

### Convex Best Practices

- Keep queries focused and efficient
- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Validate inputs comprehensively in mutations
- Always validate authentication server-side
- Handle errors gracefully
- Consider optimistic updates for UX

### Tailwind CSS Best Practices

- Use utility classes exclusively
- Follow multi-line responsive class formatting
- Extend configuration for brand colors
- Define custom breakpoints (including xs: 400px)
- Ensure dark mode support

## Project Type System

Yoyo Dev supports multiple project types configured in `config.yml`:

```yaml
project_types:
  default:
    instructions: ~/.yoyo-dev/instructions
    standards: ~/.yoyo-dev/standards
  custom_type:
    instructions: ~/.yoyo-dev/project_types/custom_type/instructions
    standards: ~/.yoyo-dev/project_types/custom_type/standards
```

The `default_project_type` setting determines which configuration to use during installation.
