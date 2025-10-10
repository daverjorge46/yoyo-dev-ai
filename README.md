# Yoyo Dev - Quick Start Guide

AI-assisted development workflow for building products with Claude Code.

**NEW in v1.5.0:** Comprehensive Design System for professional UI consistency and accessibility compliance.

## Installation

### Install in a New Project

```bash
# Basic installation (Claude Code only)
~/.yoyo-dev/setup/project.sh --claude-code

# With Cursor IDE support
~/.yoyo-dev/setup/project.sh --claude-code --cursor

# With specific project type
~/.yoyo-dev/setup/project.sh --claude-code --project-type=default
```

### Install from GitHub (No Base Installation)

```bash
curl -L https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/project.sh | bash -s -- --no-base --claude-code
```

### Installation Options

- `--claude-code` - Install Claude Code commands and agents
- `--cursor` - Install Cursor rules
- `--no-base` - Install directly from GitHub
- `--project-type=TYPE` - Use specific project configuration
- `--overwrite-instructions` - Overwrite existing instruction files
- `--overwrite-standards` - Overwrite existing standards files

---

## Getting Started

Once installed, launch Yoyo Dev with the `yoyo` command:

```bash
# Standard mode (uses terminal's default colors)
yoyo

# Visual mode (branded grey-blue theme with tmux)
yoyo --visual
```

**Visual Mode** provides a consistent, branded experience with custom colors regardless of your terminal settings. Powered by tmux with mouse support and enhanced controls.

### Standard Mode

You'll see a branded startup screen with your project context:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│ ██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗       ██████╗ ███████╗██╗   ██╗ │
| ╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗      ██╔══██╗██╔════╝██║   ██║ │
|  ╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║█████╗██║  ██║█████╗  ██║   ██║ │
│   ╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║╚════╝██║  ██║██╔══╝  ╚██╗ ██╔╝ │
│    ██║   ╚██████╔╝   ██║   ╚██████╔╝      ██████╔╝███████╗ ╚████╔╝  │
|    ╚═╝    ╚═════╝    ╚═╝    ╚═════╝       ╚═════╝ ╚══════╝  ╚═══╝   │
│                                                                     │
│              v2.0.0 - AI-Assisted Development Framework             │
│          "Powerful when you need it. Invisible when you don't."     │
└─────────────────────────────────────────────────────────────────────┘

📁 Project: bank-statement-app
📍 Location: /home/user/PROJECTS/bank-statement-app
🎯 Mission: AI-assisted development workflow

🛠️  Stack: **React 18.3.1** - Modern React with concurrent features and
           automatic batching + **Convex React SDK 1.26.2** - Real-time
           database with optimistic updates

──────────────────────────────────────────────────────────────────────

Quick Start:
  • /create-new "feature name" --lite --monitor  # Fast feature creation
  • /create-fix "problem" --monitor              # Fix bugs systematically
  • /execute-tasks                               # Build (interactive by default)

New in v2.0:
  ✨  Interactive mode by default (pause after each subtask)
  ✨  MASTER-TASKS.md (single source of truth)
  ✨  Task monitor with tmux split-pane
  ✨  Lite mode for fast iteration
  ✨  Comprehensive flag documentation

Run /yoyo-help for complete command reference
Docs: .yoyo-dev/COMMAND-REFERENCE.md

Launching Claude Code...
```

Then Claude Code launches normally, and you can start using Yoyo Dev commands!

### Visual Mode (NEW!)

For a branded, consistent experience with custom colors:

```bash
yoyo --visual
```

**Features:**
- 🎨 Custom grey-blue color scheme (#2d3748 background)
- 📊 **Auto status monitor** - Shows tasks, progress, or getting started guide
- 🖼️ Branded status bar with project name
- 🖱️ Mouse support (click to switch panes, scroll history)
- 📐 Full tmux capabilities (split panes, detach/reattach)
- ✨ Consistent appearance across all terminal emulators
- ⚡ Real-time progress updates (refreshes every 5 seconds)

**Make it default:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export YOYO_VISUAL_MODE=true
```

**Requirements:** `tmux` (falls back to standard mode if not installed)

See [docs/VISUAL-MODE.md](docs/VISUAL-MODE.md) for complete documentation and customization options.

---

## Core Workflow

### 1. Plan Your Product

**For new products:**
```
/plan-product
```

Creates product documentation:
- Mission statement and product vision
- Target users and problems solved
- Technical stack decisions
- Development roadmap with phases

**For existing codebases:**
```
/analyze-product
```

Analyzes your codebase and creates product docs based on what already exists.

---

### 2. Build Features or Fix Issues

**Streamlined feature creation (recommended):**
```
/create-new
```

All-in-one command that:
- Creates detailed specification with Q&A clarification
- Generates technical specs, database schema, and API design
- Automatically creates task breakdown
- Prepares for execution in one workflow

**Fix bugs and issues:**
```
/create-fix
```

Systematic bug fix workflow:
- Investigates and analyzes the problem
- Identifies root cause with code analysis
- Creates fix analysis document
- Generates TDD-based task breakdown (test first, then fix)
- Prepares for execution

**Advanced: Separate spec and task creation:**
```
/create-spec     # Create detailed spec only
/create-tasks    # Create task breakdown from spec
```

Use these when you want fine-grained control over spec creation and task generation separately.

---

### 3. Execute Tasks

```
/execute-tasks
/execute-tasks --devil        # With critical review mode
/execute-tasks --security     # With security review
```

Implements the feature or fix:
- Runs pre-execution setup (context, git branch)
- Executes all tasks using TDD approach
- Updates implementation context as it works
- Runs full test suite
- Creates git commit and PR
- Updates roadmap if applicable
- Creates recap document
- Extracts successful patterns

**Optional review modes:** Add `--devil`, `--security`, `--performance`, or `--production` flags for extra scrutiny during implementation.

**⚡ NEW: Parallel Execution** - Automatically analyzes task dependencies and executes independent tasks concurrently for 2-3x faster development!

**The command handles everything from code to deployment.**

---

### 4. Design System (NEW v1.5.0)

**Initialize design system:**
```
/design-init
```

Creates comprehensive design system for UI consistency:
- Design tokens (colors, spacing, typography)
- Tailwind configuration
- Component pattern library
- Accessibility guidelines (WCAG AA)
- Dark mode support

**Audit design compliance:**
```
/design-audit
```

Comprehensive design system audit:
- Color token compliance
- Spacing scale adherence
- Typography consistency
- Color contrast validation (WCAG AA)
- Focus state verification
- Responsive design checks

**Fix design violations:**
```
/design-fix
/design-fix --colors      # Fix only color violations
/design-fix --spacing     # Fix only spacing violations
/design-fix --contrast    # Fix only contrast violations
```

Systematically fix design inconsistencies found in audit.

**Create consistent components:**
```
/design-component "User profile card"
```

Build UI components with enforced design consistency:
- Zero violations allowed
- All variants and states required
- WCAG AA compliance enforced
- Pattern library integration

**Use when:**
- Starting new UI project → Run `/design-init` after `/plan-product`
- Building UI components → Use `/design-component` for strict validation
- Weekly consistency check → Run `/design-audit`
- Cleaning up design debt → Use `/design-fix`

---

### 5. Review Code (Optional)

```
/review --devil "Review authentication flow"
/review --security "Audit payment processing"
/review --performance "Analyze dashboard performance"
```

Critical code review when you need extra scrutiny:
- Devil's Advocate: Find what will break
- Security: Vulnerabilities and auth issues
- Performance: Bottlenecks and optimization
- Production: Error handling and monitoring
- Pre-Mortem: Why will this fail?

**Use when:** Projects go sideways, bugs keep appearing, or before risky deployments.

---

## Example Sessions

### Building a New Feature

```bash
# 1. Start a new product
/plan-product
# Answer: task management app for remote teams

# 2. Initialize design system (NEW v1.5.0)
/design-init
# Sets up design tokens, patterns, Tailwind config

# 3. Create and spec the feature
/create-new
# Answer: "what's next?" (picks from roadmap)
# Creates spec + tasks in one workflow

# 4. Build the feature
/execute-tasks
# Everything automated: code, tests, git, PR
# Design validation runs automatically for UI components
```

### Fixing a Bug

```bash
# 1. Analyze and plan the fix
/create-fix
# Describe the problem, let it investigate

# 2. Implement the fix
/execute-tasks
# TDD approach: tests first, then fix
```

---

## Key Files Created

### Product Level (`.yoyo-dev/product/`)
- `mission.md` - Full product vision
- `mission-lite.md` - Condensed for AI context
- `tech-stack.md` - Technical architecture
- `roadmap.md` - Development phases

### Spec Level (`.yoyo-dev/specs/YYYY-MM-DD-feature-name/`)
- `spec.md` - Full requirements
- `spec-lite.md` - Condensed summary
- `tasks.md` - Task breakdown
- `decisions.md` - Technical decisions and rationale
- `context.md` - Implementation progress (living doc)
- `state.json` - Workflow state tracking
- `sub-specs/technical-spec.md` - Implementation details
- `sub-specs/database-schema.md` - DB changes (if needed)
- `sub-specs/api-spec.md` - API design (if needed)

### Fix Level (`.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`)
- `analysis.md` - Full problem analysis and solution approach
- `solution-lite.md` - Condensed fix summary
- `tasks.md` - Task breakdown for fix
- `state.json` - Workflow state tracking

### Design System Level (`.yoyo-dev/design/`) - NEW v1.5.0
- `tokens.json` - Design tokens (colors, spacing, typography)
- `tailwind.config.js` - Generated Tailwind configuration
- `design-system.md` - Full design system documentation
- `design-lite.md` - Condensed for AI context loading
- `README.md` - Getting started guide
- `component-patterns/` - Reusable UI component patterns
  - `buttons.md` - Button variants and states
  - `cards.md` - Card patterns
  - `forms.md` - Form input patterns
  - `navigation.md` - Navigation patterns
  - `layouts.md` - Layout patterns
- `audits/` - Design compliance audit reports

### Project Level
- `.yoyo-dev/recaps/` - Feature completion summaries
- `.yoyo-dev/patterns/successful-approaches.md` - Reusable patterns library

---

## Memory & Consistency Features

**Decision Log** - Captures technical decisions with rationale
**Inline Task Context** - Tasks include context, dependencies, files
**Progressive Context** - Living documentation grows during implementation
**Smart Loading** - Only loads relevant context, saves tokens
**State Tracking** - Resume from any point, no lost progress
**Pattern Library** - Learn from past successes

---

## Tips

✅ **Keep specs focused** - One feature at a time
✅ **Review before executing** - Check tasks.md makes sense
✅ **Let it finish** - `/execute-tasks` runs all post-execution steps automatically
✅ **Check decisions.md** - See why technical choices were made
✅ **Review context.md** - Understand how feature was built
✅ **Reuse patterns** - Check `patterns/successful-approaches.md` for proven approaches
✅ **Initialize design system early** - Run `/design-init` after `/plan-product` for UI projects (NEW v1.5.0)
✅ **Weekly design audits** - Run `/design-audit` weekly to catch design drift (NEW v1.5.0)
✅ **Use design tokens** - Always use `bg-brand-primary` not `bg-blue-500` (NEW v1.5.0)

---

## Troubleshooting

**Can't find yoyo-dev commands?**
- Run installation script again: `~/.yoyo-dev/setup/project.sh --claude-code`

**Tasks seem unclear?**
- Check `decisions.md` for technical context
- Review `context.md` for implementation details

**Want to resume work?**
- Check `state.json` to see current phase and active task
- Run `/execute-tasks` to continue

**Need different tech stack?**
- Edit `.yoyo-dev/product/tech-stack.md` before running `/create-spec`

---

## Default Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Convex (serverless)
- **Auth:** Clerk
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Package Manager:** npm
- **Node:** v22 LTS

Customize in `.yoyo-dev/standards/tech-stack.md`

---

## Support

- Documentation: `/help` in Claude Code
- Issues: Check your project's GitHub issues
- Configuration: `.yoyo-dev/config.yml`

---

## Rich Terminal Output

Yoyo Dev features beautiful, structured terminal output with:

- **Color-coded status** - Green for success, red for errors, yellow for warnings
- **Progress indicators** - Visual progress bars for long operations
- **Structured tables** - Clean data presentation
- **Hierarchical tasks** - Easy-to-scan task trees
- **Clear next steps** - Always know what to do next

Example output:

```
┌────────────────────────────────────────────────┐
│  🚀 YOYO DEV - CREATE NEW FEATURE              │
│  ────────────────────────────────────────────  │
│  Streamlined feature creation workflow         │
└────────────────────────────────────────────────┘

┌─ PHASE 1: SPECIFICATION CREATION ─────────────┐
│                                                │
│  → Step 1: Feature Discovery         ✓        │
│  → Step 2: Requirements Clarification ⟳       │
│  → Step 3: Technical Spec Generation  □       │
│  → Step 4: User Review               □       │
│                                                │
└────────────────────────────────────────────────┘
```

All commands provide rich, scannable output for a superior developer experience.

---

## ⚡ Parallel Task Execution

Yoyo Dev automatically analyzes task dependencies and executes independent tasks concurrently.

**How it works:**
1. Analyzes which tasks can run in parallel (no file conflicts)
2. Groups tasks by dependencies
3. Executes each group's tasks concurrently
4. Shows real-time progress for all parallel tasks

**Example:**
```
Group 1 (Parallel - 3 tasks):
  • Task 1: Database Schema      ⟳
  • Task 2: ProfileCard Component ⟳
  • Task 3: SettingsPage Component ⟳

✓ Group 1 completed in 4 min (vs 12 min sequential = 3x faster)
```

**Benefits:**
- **2-3x faster** development on average
- **Automatic** dependency analysis
- **Safe** - never runs conflicting tasks together
- **Smart** - even single tasks can use parallel agents

**Control:**
```bash
/execute-tasks              # Auto parallel (default)
/execute-tasks --sequential # Force sequential (safe mode)
/execute-tasks --parallel   # Force parallel
```

---

## Updating Yoyo Dev

Keep your Yoyo Dev installation up to date:

```bash
# Update in current project
~/.yoyo-dev/setup/yoyo-update.sh

# Update with specific options
~/.yoyo-dev/setup/yoyo-update.sh --overwrite-instructions --overwrite-standards
```

Updates:
- Core instructions and workflows
- Commands and agents (including design system - NEW v1.5.0)
- Standards and best practices
- Design system capabilities (NEW v1.5.0)
- Preserves your product docs, specs, and design system

**What gets updated in v1.5.0:**
- ✅ Design system standards (3 new files)
- ✅ Design workflows (design-init instruction)
- ✅ Design commands (4 new commands)
- ✅ Design agents (2 new agents)
- ✅ Configuration (design_system settings)

---

## Design System Benefits (NEW v1.5.0)

**The Problem:** AI-assisted development often produces inconsistent UIs with hardcoded colors, arbitrary spacing, poor contrast, and missing accessibility features.

**The Solution:** Systematic design enforcement through:

✅ **Design Tokens** - Single source of truth for all design values
✅ **Component Patterns** - Reusable, professionally-designed UI patterns
✅ **Automated Validation** - Real-time compliance checking during development
✅ **Accessibility Enforcement** - WCAG AA compliance built-in and automated
✅ **Visual Consistency** - Systematic enforcement, not subjective judgment

**Better than manual design review because:**
- Catches violations before merge (automated)
- Provides specific fix recommendations (actionable)
- Maintains design memory (learns your design language)
- Works within your existing workflow (no context switching)

**Guarantees:**
- ✅ Color consistency (only design tokens, no hardcoded values)
- ✅ Spacing consistency (4px/8px grid enforced)
- ✅ Typography consistency (font scale enforced)
- ✅ Component consistency (patterns reused, not reinvented)
- ✅ Accessibility baseline (WCAG AA automated)
- ✅ Dark mode support (required and validated)

---

**That's it. Ship features fast with professional design: plan → design-init → create → execute.**
