# Quick Start Guide

> Get started with Yoyo Dev v5.0 in 5 minutes

This guide walks you through your first feature using Yoyo Dev's multi-agent orchestration system.

---

## Prerequisites

Before starting, ensure you have completed:

1. **Installation** - See [Installation Guide](INSTALLATION.md)
2. **MCP Setup** - Docker MCP Gateway with servers enabled
3. **Claude Code** - CLI installed and configured

**Verify setup:**

```bash
# Should show 4 servers
docker mcp server ls

# Should launch successfully
yoyo --version
```

---

## First-Time Setup (5 minutes)

### Step 1: Launch Dashboard

```bash
# Launch TUI + Claude + GUI (default)
yoyo

# Or without GUI
yoyo --no-gui
```

You should see:
- **Left pane**: Claude Code CLI
- **Right pane**: TUI dashboard
- **Browser** (if GUI enabled): http://localhost:3456

**Keyboard shortcuts:**
- `Ctrl+B →` - Switch focus between panes
- `?` - Help menu (in TUI)
- `q` - Quit TUI

### Step 2: Initialize Project Memory

In Claude Code pane, run:

```bash
/init
```

This scans your codebase and creates project memory blocks:
- **Project block** - Tech stack, architecture, patterns
- **Persona block** - AI assistant configuration

**Example output:**

```
Memory initialized successfully!

Project Block:
- Name: my-app
- Tech Stack: TypeScript, React 18, Vite
- Architecture: component-based
- Patterns: TDD, functional components

Persona Block:
- Name: Yoyo
- Expertise: TypeScript, React, Frontend Development
```

### Step 3: Create Product Mission

If starting a new project:

```bash
/plan-product
```

For existing projects:

```bash
/analyze-product
```

This creates:
- `.yoyo-dev/product/mission.md` - Full vision
- `.yoyo-dev/product/mission-lite.md` - Condensed for AI
- `.yoyo-dev/product/tech-stack.md` - Technology decisions
- `.yoyo-dev/product/roadmap.md` - Development phases

**Answer the prompts:**
- What problem does this solve?
- Who are the users?
- Key features?
- Technology preferences?

---

## Create Your First Feature (10 minutes)

### Step 1: Start Feature Creation

```bash
/create-new "Add user authentication"
```

**What happens:**

1. **Phase 0: Intent Classification**
   - Yoyo-AI classifies this as "Planning" intent
   - Routes to discovery workflow

2. **Phase 1: Discovery**
   - Reads mission-lite.md for context
   - Asks clarifying questions (numbered list)
   - Example: "Which auth provider? (Clerk, Auth0, custom?)"

3. **Phase 2: Spec Creation**
   - Executes spec-shaper agent for requirements
   - Creates `.yoyo-dev/specs/YYYY-MM-DD-user-authentication/`
   - Generates:
     - `spec.md` - Full requirements
     - `spec-lite.md` - Condensed summary
     - `sub-specs/technical-spec.md` - Implementation details
     - `decisions.md` - Technical decisions

4. **Phase 3: Task Generation**
   - Executes tasks-list-creator agent
   - Creates `tasks.md` with hierarchical task breakdown
   - Shows execution readiness summary

### Step 2: Review Specification

Open the spec in your editor:

```bash
# View spec
cat .yoyo-dev/specs/$(ls -t .yoyo-dev/specs | head -1)/spec.md

# Or in TUI, press 's' to focus specs panel
```

**Review checklist:**
- Requirements complete?
- Technical approach sound?
- Edge cases covered?

**Make edits if needed:**
- Edit `spec.md` directly
- Edit `tasks.md` to adjust task breakdown
- Save changes

### Step 3: Execute with Yoyo-AI

```bash
/execute-tasks
```

**What happens (Multi-Agent Orchestration):**

**Phase 0: Intent Classification**
- Intent: Implementation
- Strategy: Assess complexity, delegate if needed

**Phase 1: Codebase Assessment**
- Reads spec-lite.md, tasks.md
- Analyzes complexity (simple/medium/complex)
- Detects if frontend work → auto-delegate
- Checks if research needed → fires librarian (background)

**Phase 2A: Research (Parallel)**
```
[Background Task] librarian: "Research Clerk authentication best practices"
→ Continue to Phase 2B immediately
```

**Phase 2B: Implementation (Todo-Driven)**

```
Todos created:
1. Install Clerk SDK
2. Configure Clerk provider
3. Add auth routes
4. Protect API endpoints
5. Add tests

[in_progress] 1. Install Clerk SDK
→ npm install @clerk/clerk-react
→ Tests pass
→ Mark complete
✓ Completed

[in_progress] 2. Configure Clerk provider
→ Create src/providers/AuthProvider.tsx
→ Detect: frontend keywords (component, provider)
→ Auto-delegate to frontend-engineer
→ frontend-engineer implements + tests
→ Mark complete
✓ Completed

... continues for remaining tasks ...
```

**Failure Recovery Example:**

```
[in_progress] 4. Protect API endpoints
→ Attempt 1: Add middleware
→ Test fails: "Token verification failed"
→ Attempt 2: Fix token extraction
→ Test fails: "Invalid signature"
→ Attempt 3: Escalating to Oracle...

[Oracle consulted]
Root cause: Clock skew issue
Recommendation: Add clock skew tolerance to JWT verification

→ Apply recommendation
→ Test passes
✓ Completed
```

**Phase 3: Verification & Completion**

```
Running all tests...
✓ All tests passing

Quality Gates:
✓ Functionality - Works as specified
✓ Type Safety - No TypeScript errors
✓ Testing - 85% coverage
✓ Accessibility - WCAG AA compliant
✓ Performance - No bottlenecks
✓ Security - No vulnerabilities

Git workflow:
✓ Staged changes
✓ Created commit: "feat: add Clerk authentication"
✓ Pushed to origin
✓ Created PR #123

Recap created: .yoyo-dev/recaps/2025-12-29-user-authentication.md
```

### Step 4: Review Pull Request

Open the PR link provided:

```
PR created: https://github.com/user/repo/pull/123
```

**Review:**
- Code changes
- Test coverage
- Documentation updates

**Merge when ready:**

```bash
# Merge via GitHub UI or CLI
gh pr merge 123 --squash
```

---

## Advanced Features

### Background Research

Fire research tasks that run in parallel:

```bash
/research "Convex authentication patterns 2025"
```

**What happens:**

```
[Background Task Started] librarian: "Research Convex auth..."

You can continue working immediately.
Research results will be delivered as notification.

→ Continue with other tasks
→ Results ready in ~30-60 seconds
```

**Retrieve results:**

Results are automatically injected when needed, or you can check:

```bash
# Results appear as notification in Claude
# Or check background task status in TUI
```

### Strategic Guidance

Consult Oracle for architecture decisions:

```bash
/consult-oracle "Should we use microservices or monolith for MVP?"
```

**What you get:**

```
Oracle Response:

Essential:
- For MVP, start with modular monolith
- Split services only when necessary
- Reduces operational complexity

Expanded:
- Microservices add deployment complexity
- Network latency between services
- Data consistency challenges
- Monolith easier to debug and test

Edge Cases:
- If team >10 engineers: Consider microservices
- If domains truly independent: Services make sense
- If scaling needs differ: Split critical paths

Recommendation: Modular monolith with clean boundaries
```

### Bug Fixes

Systematic bug fixing with auto-escalation:

```bash
/create-fix "Login button returns 401 error"
```

**What happens:**

1. **Investigation**
   - Explore agent searches codebase (background)
   - Identifies related files
   - Analyzes error logs

2. **Root Cause Analysis**
   - Creates `.yoyo-dev/fixes/YYYY-MM-DD-login-button-401/`
   - Documents analysis in `analysis.md`
   - Shows proposed solution

3. **Fix Implementation**
   - Creates TDD-based fix tasks
   - Executes with Yoyo-AI orchestration
   - Auto-escalates to Oracle if 3+ failures

4. **Verification**
   - Runs tests
   - Verifies fix works
   - Creates PR

### Design System Workflows

Initialize design system for UI-heavy projects:

```bash
# Initialize design tokens and patterns
/design-init

# Audit design consistency
/design-audit

# Fix violations
/design-fix --colors --spacing

# Create components with validation
/design-component "User profile card"
```

---

## Common Workflows

### Daily Development

```bash
# 1. Launch dashboard
yoyo

# 2. Create feature
/create-new "Add export to CSV"

# 3. Execute (Yoyo-AI orchestration)
/execute-tasks

# 4. Review PR
# Open PR link, review, merge

# 5. Repeat
```

### Bug Fixes

```bash
# 1. Report bug
/create-fix "Search returns duplicate results"

# 2. Review analysis
# Check .yoyo-dev/fixes/YYYY-MM-DD-search-duplicates/analysis.md

# 3. Execute fix
/execute-tasks

# 4. Verify
# Test manually, check PR
```

### Research & Experimentation

```bash
# Fire background research
/research "Next.js 15 app router best practices"

# Continue working
/create-new "Add app router navigation"

# Research results ready when needed
# Yoyo-AI retrieves automatically during implementation
```

### Code Review

```bash
# Critical review modes
/review --devil "Authentication flow"
/review --security "Payment processing"
/review --performance "Dashboard rendering"
```

---

## TUI Dashboard Guide

### Navigation

| Key | Action |
|-----|--------|
| `?` | Show help |
| `/` | Command palette |
| `t` | Focus tasks panel |
| `s` | Focus specs panel |
| `h` | Focus history panel |
| `g` | Git menu |
| `r` | Refresh |
| `q` | Quit |

### Panels

**Project Overview**
- Mission statement
- Tech stack
- Memory status

**Active Tasks**
- Current task list
- Progress tracking
- Real-time updates

**Specs Browser**
- Recent specs
- Spec details
- Quick navigation

**Command History**
- Recent slash commands
- Execution status
- Quick re-run

**Error Detector**
- Real-time error monitoring
- Stack trace analysis
- Quick fixes

### GUI Dashboard

Access at http://localhost:3456 for:
- Visual task tracking
- Spec browser
- Command palette
- Real-time updates via WebSocket

**Browser shortcuts:**
- `Cmd/Ctrl+K` - Command palette
- `Cmd/Ctrl+R` - Refresh
- `ESC` - Close modals

---

## Tips & Best Practices

### Yoyo-AI Orchestration

1. **Let Yoyo-AI orchestrate** - Use `/execute-tasks` (default)
2. **Research early** - Fire `/research` at start
3. **Trust delegation** - Frontend work auto-delegated
4. **Watch todos** - Track progress in TUI
5. **Consult Oracle** - For complex architecture decisions

### Memory System

1. **Initialize first** - Run `/init` for new projects
2. **Store preferences** - Use `/remember` often
3. **Clear sessions** - Use `/clear` between tasks
4. **Check memory** - View in TUI Project Overview

### Git Workflow

1. **Create branches manually** - Yoyo Dev doesn't auto-branch
2. **Review PRs** - Always review before merging
3. **Descriptive commits** - Yoyo-AI creates good commit messages

### Quality

1. **TDD approach** - Tests first, implementation second
2. **Review specs** - Always review before executing
3. **Check quality gates** - All must pass before merge
4. **Update docs** - Keep documentation current

---

## Next Steps

- **[Command Reference](commands.md)** - Complete slash command list
- **[Multi-Agent System](multi-agent-orchestration.md)** - Deep dive into orchestration
- **[Architecture](ARCHITECTURE.md)** - System architecture
- **[GUI Dashboard](gui-dashboard.md)** - Browser GUI features

---

## Troubleshooting

### Claude not responding

```bash
# Check Claude Code is running
which claude

# Restart split view
yoyo --no-split  # TUI only
yoyo              # Restart with Claude
```

### Tasks not executing

```bash
# Check tasks.md exists
ls -la .yoyo-dev/specs/$(ls -t .yoyo-dev/specs | head -1)/tasks.md

# Check state.json
cat .yoyo-dev/specs/$(ls -t .yoyo-dev/specs | head -1)/state.json
```

### MCP servers not working

```bash
# Check servers running
docker mcp server ls

# Restart Claude Code
# Exit and re-launch yoyo
```

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
