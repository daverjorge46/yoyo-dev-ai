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

```bash
# Update to latest (overwrites framework files by default)
~/.yoyo-dev/setup/yoyo-update.sh

# Preserve customizations
~/.yoyo-dev/setup/yoyo-update.sh --no-overwrite
```

**Note:** Product docs (`.yoyo-dev/product/`), specs, fixes, recaps, and patterns are ALWAYS protected during updates.

## Quick Start

```bash
# Launch full-screen Textual TUI dashboard
yoyo
```

Features: Real-time task/spec tracking, live updates, interactive commands (one-click copy), keyboard shortcuts (`?` for help, `q` to quit).

## Core Commands

**Product Setup:**
- `/plan-product` - Set mission & roadmap for new product
- `/analyze-product` - Set up mission/roadmap for existing product

**Feature Development:**
- `/create-new` - Create feature with full spec workflow and task generation
- `/create-spec` - Create detailed specification only
- `/create-tasks` - Create tasks from specification
- `/execute-tasks` - Build and ship code

**Bug Fixes:**
- `/create-fix` - Analyze and fix bugs with systematic problem analysis

**Advanced:**
- `/orchestrate-tasks` - Manual multi-agent orchestration for complex features
- `/review` - Critical code review (modes: `--devil`, `--security`, `--performance`, `--production`)
- `/design-init` - Initialize design system
- `/design-audit` - Audit design consistency
- `/design-fix` - Fix design violations
- `/design-component` - Create UI components with design enforcement

## Architecture

### Directory Structure

```
.yoyo-dev/
├── instructions/          # AI agent workflow instructions
│   ├── core/             # Core workflows (plan, spec, execute)
│   └── meta/             # Meta instructions (pre/post-flight)
├── standards/            # Development standards and guidelines
├── claude-code/agents/   # Specialized agents
├── setup/                # Installation scripts
└── config.yml            # Configuration

workflows/                # Reusable workflow components (v1.6.0+)
├── planning/
├── specification/
└── implementation/

.claude/                  # Claude Code configuration
├── commands/             # Slash commands entry points
└── agents/               # Agent configurations

lib/yoyo_tui_v3/          # Modern TUI implementation
```

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
