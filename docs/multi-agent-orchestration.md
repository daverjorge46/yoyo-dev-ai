# Multi-Agent Orchestration Guide

> Yoyo Dev v5.0 Intelligent Multi-Agent System

This guide provides a comprehensive overview of Yoyo Dev's multi-agent orchestration system, introduced in v5.0.

---

## Table of Contents

- [Overview](#overview)
- [Yoyo-AI Orchestrator](#yoyo-ai-orchestrator)
- [Specialized Agents](#specialized-agents)
- [Delegation Rules](#delegation-rules)
- [Workflow Examples](#workflow-examples)
- [Configuration](#configuration)

---

## Overview

Yoyo Dev v5.0 replaces linear instruction execution with **intelligent multi-agent orchestration**. Instead of following rigid workflows, Yoyo-AI classifies intent, assesses complexity, delegates to specialized agents, and recovers from failures automatically.

### Key Improvements Over v4.0

**v4.0 (Legacy Orchestrator):**
- Single-agent linear execution
- Manual research steps
- No failure recovery
- Frontend work not specialized
- Sequential todo completion

**v5.0 (Yoyo-AI Orchestrator):**
- Multi-agent intelligent delegation
- Parallel background research
- 3-attempt escalation to Oracle
- Auto-delegation to frontend-engineer
- Real-time todo tracking
- **60% faster** feature creation

### Core Principles

1. **Classify First** - Understand intent before acting
2. **Delegate Intelligently** - Use specialized agents for their strengths
3. **Execute in Parallel** - Fire background tasks, continue working
4. **Recover Gracefully** - Escalate failures to Oracle after 3 attempts
5. **Complete Thoroughly** - Every todo marked, every test passing

---

## Yoyo-AI Orchestrator

**Primary agent** that coordinates all development work.

### Configuration

**Model:** Claude Opus 4.5
**Temperature:** 1.0 (creative problem-solving)
**Tool Access:** All tools (`*`)

### Workflow Phases

**Phase 0: Intent Classification**

Classifies every user request into one of four categories:

| Intent | Triggers | Agent Strategy | Next Phase |
|--------|----------|----------------|------------|
| **Planning** | "create product", "plan", "roadmap", "new feature" | Use spec-shaper for requirements | Discovery |
| **Implementation** | "build", "implement", "code", "execute tasks" | Assess codebase, delegate if needed | Assessment |
| **Research** | "find", "search", "how does", "what is", "examples" | Fire librarian (background), continue work | Research |
| **Debug** | "fix", "error", "bug", "failing", "broken" | Investigate, escalate to Oracle if needed | Investigation |

**Examples:**

```
User: "Create authentication system"
→ Intent: Planning
→ Strategy: spec-shaper gathers requirements, then delegate to implementer
→ Next: Discovery workflow

User: "Fix login button not working"
→ Intent: Debug
→ Strategy: Investigate code, run tests, escalate to Oracle if 3+ failures
→ Next: Investigation workflow

User: "Find Convex auth examples"
→ Intent: Research
→ Strategy: Fire librarian (background: "Find Convex auth examples")
→ Next: Continue with user's next request

User: "Build the authentication feature"
→ Intent: Implementation
→ Strategy: Assess tasks.md, delegate frontend work if UI-heavy
→ Next: Assessment workflow
```

**Phase 1: Codebase Assessment**

Analyzes complexity and identifies specialized work:

**Complexity Levels:**

- **Simple (0-2 files):**
  - Direct implementation
  - No delegation needed
  - Example: "Add validation to existing function"

- **Medium (3-5 files):**
  - May require specialized agent
  - Check for frontend keywords → frontend-engineer
  - Example: "Update auth flow with new endpoint"

- **Complex (6+ files):**
  - Definitely delegate
  - Break into smaller subtasks
  - Use multiple agents in parallel
  - Example: "Refactor entire authentication system"

**Delegation Detection:**

**Frontend Keywords:**
```
style, css, tailwind, layout, visual, ui, ux, component,
button, form, input, responsive, design, animation, transition,
color, spacing, padding, margin, flexbox, grid, hover, focus, active
```

**Research Keywords:**
```
find, search, how, what, why, examples, documentation,
best practice, pattern, library, framework
```

**Phase 2A: Research & Exploration (Parallel)**

Fires background tasks without blocking:

```typescript
// Fire librarian research (background)
background_task({
  agent: "librarian",
  prompt: "Research Convex authentication best practices...",
  name: "Research: Convex Auth"
})

// Continue working immediately (non-blocking)
// Retrieve results later when needed
```

**Phase 2B: Implementation (Todo-Driven)**

**1. Create Todos BEFORE Implementation**

```typescript
TodoWrite([
  {
    content: "Extract auth logic into service",
    activeForm: "Extracting auth logic into service",
    status: "pending"
  },
  {
    content: "Add comprehensive tests",
    activeForm: "Adding comprehensive tests",
    status: "pending"
  },
  {
    content: "Update API routes",
    activeForm: "Updating API routes",
    status: "pending"
  }
])
```

**2. Mark In Progress IMMEDIATELY**

```typescript
// Before starting task
TodoWrite([
  {
    content: "Extract auth logic into service",
    activeForm: "Extracting auth logic into service",
    status: "in_progress"  // ← Mark BEFORE writing code
  },
  // ... other todos
])
```

**3. Implement with TDD**

```
1. Write test first
2. Implement code
3. Run test
4. If passes: Mark complete, move to next
5. If fails: Apply failure recovery
```

**4. Mark Complete IMMEDIATELY**

```
// ✓ CORRECT - immediate completion
Complete task 1 → Mark complete → Complete task 2 → Mark complete

// ❌ WRONG - batching completions
Complete tasks 1, 2, 3 → Then mark all complete at once
```

**5. Failure Recovery Protocol**

**1st Failure:**
```
1. Analyze error message
2. Review code
3. Try improved approach
4. Run test again
```

**2nd Failure:**
```
1. Try completely different approach
2. Check documentation
3. Review similar code in codebase
4. Run test again
```

**3rd Failure:**
```typescript
// Escalate to Oracle
const advice = await call_agent({
  agent: "oracle",
  prompt: `Debug implementation failure.

Task: ${currentTodo}

Failure history:
1. ${failure1.error}
   Approach: ${failure1.approach}

2. ${failure2.error}
   Approach: ${failure2.approach}

3. ${failure3.error}
   Approach: ${failure3.approach}

Code context:
${relevantCode}

What is the root cause and correct approach?`
})

// Apply Oracle's recommendation
// If still fails after Oracle: Ask user for guidance
```

**Phase 3: Verification & Completion**

```
1. Run all tests → npm test
2. Quality gates check:
   ✓ Functionality
   ✓ Type Safety
   ✓ Testing (>70% coverage)
   ✓ Accessibility (WCAG 2.1 AA)
   ✓ Performance
   ✓ Security
   ✓ Code Quality
   ✓ Documentation
3. Git workflow:
   - Stage changes
   - Create commit
   - Push to remote
   - Create PR (if on feature branch)
4. Update tracking:
   - Mark all todos complete
   - Update state.json
   - Update tasks.md
   - Create recap
5. Final summary with PR link
```

---

## Specialized Agents

### Oracle (Strategic Advisor)

**Purpose:** Architecture decisions, root cause analysis, strategic guidance

**Configuration:**
- **Model:** Claude Opus 4.5
- **Temperature:** 0.1 (precise, analytical)
- **Tool Access:** Read-only + analysis (no Bash, no Write)

**When Used:**
- Explicit `/consult-oracle` command
- 3+ consecutive implementation failures
- Complex architectural questions

**Response Format:**
```
Essential: <core answer>
Expanded: <detailed explanation>
Edge Cases: <important caveats>
Recommendation: <action items>
```

**Example Usage:**

```bash
/consult-oracle "Should we use microservices or monolith for MVP?"
```

**Response:**
```
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

---

### Librarian (Research Specialist)

**Purpose:** External documentation, GitHub examples, best practices

**Configuration:**
- **Model:** Claude Opus 4.5
- **Temperature:** 0.3 (focused, comprehensive)
- **Tool Access:** External research only (context7, websearch, gh, git, Read)

**When Used:**
- Explicit `/research` command
- Background research during implementation
- Learning new technologies

**Execution Mode:** Asynchronous (background tasks)

**Example Usage:**

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

**Output:**
```
Research Results: Convex Authentication

Official Documentation:
- Convex Auth Setup: https://docs.convex.dev/auth/setup
- Code excerpt: "Use convex.auth() for authentication..."

GitHub Examples:
- https://github.com/get-convex/convex-demos/auth-demo
  Permalink: https://github.com/.../blob/abc123/auth.ts#L45-L67

Best Practices:
1. Store JWT tokens in httpOnly cookies
2. Use Convex Auth middleware for protected routes
3. Implement refresh token rotation

Implementation Pattern:
[Code example provided]
```

---

### Frontend Engineer (UI/UX Specialist)

**Purpose:** UI components, responsive design, accessibility

**Configuration:**
- **Model:** Claude Opus 4.5
- **Temperature:** 0.7 (creative, design-focused)
- **Tool Access:** Write, Read, Playwright (no call_agent to prevent loops)

**When Used:**
- Auto-detected frontend keywords
- Explicit frontend tasks
- Design system work

**Auto-Delegation Keywords:**
```
style, css, tailwind, layout, visual, ui, ux, component,
button, form, input, responsive, design, animation, transition,
color, spacing, padding, margin, flexbox, grid, hover, focus, active
```

**Example:**

```
Task: "Update button styling to match design system"

→ Yoyo-AI detects: "style", "button" keywords
→ Auto-delegates to frontend-engineer
→ Frontend-engineer:
  - Implements styling with Tailwind
  - Adds hover/focus states
  - Tests accessibility (WCAG 2.1 AA)
  - Marks todo complete
```

**Quality Checks:**
- Design system compliance
- Responsive design (mobile/tablet/desktop)
- Accessibility (WCAG 2.1 AA minimum)
- Visual regression prevention

---

### Explore (Codebase Search)

**Purpose:** Internal codebase search, pattern matching

**Configuration:**
- **Model:** Claude Opus 4.5
- **Temperature:** 0.5 (balanced exploration)
- **Tool Access:** Search tools only (Glob, Grep, Read)

**When Used:**
- Background codebase exploration
- Finding related code during bug fixes
- Identifying implementation patterns

**Execution Mode:** Asynchronous (background tasks)

**Example:**

```typescript
background_task({
  agent: "explore",
  prompt: `Find all files related to authentication.

  Search for:
  1. Auth functions/classes
  2. Configuration files
  3. Tests

  Return file paths and relevant excerpts.`,
  name: "Explore: Authentication"
})
```

**Output:**
```
Found 12 files related to authentication:

src/auth/service.ts:
- Function: authenticateUser(credentials)
- Lines 23-45

src/auth/middleware.ts:
- Function: requireAuth()
- Lines 10-28

tests/auth/service.test.ts:
- Test suite: Authentication Service
- 15 tests
```

---

### Implementer (Code Implementation)

**Purpose:** TDD-based implementation, code quality

**Configuration:**
- **Model:** Claude Opus 4.5
- **Temperature:** 0.3 (precise, consistent)
- **Tool Access:** Write, Read, Bash

**When Used:**
- Non-frontend implementation tasks
- Backend logic
- API development

**Process:**
```
1. Read technical spec
2. Write test first
3. Implement code
4. Run test
5. Refactor if needed
6. Mark complete
```

---

### Document Writer (Technical Writing)

**Purpose:** Documentation, README files, guides

**Configuration:**
- **Model:** Claude Opus 4.5
- **Temperature:** 0.5 (clear, structured)
- **Tool Access:** Write, Read

**When Used:**
- Explicit documentation tasks
- Post-implementation documentation
- Spec creation

**Output:**
- Clear, concise technical writing
- Code examples with syntax highlighting
- Tables for reference data
- Cross-references between documents

---

## Delegation Rules

### When to Delegate

| Situation | Agent | Timing | Reason |
|-----------|-------|--------|--------|
| Frontend work detected | frontend-engineer | Synchronous (call_agent) | Specialized in UI/UX |
| External research needed | librarian | Asynchronous (background_task) | Can run in parallel |
| Codebase search needed | explore | Asynchronous (background_task) | Fast pattern matching |
| 3+ consecutive failures | oracle | Synchronous (call_agent) | Strategic debugging |
| Technical writing needed | document-writer | Synchronous (call_agent) | Documentation quality |

### How to Delegate

**Synchronous (wait for result):**

```typescript
const result = await call_agent({
  agent: "oracle",
  prompt: "Detailed question...",
  timeout: 120000  // 2 minutes
})

// Use result immediately
applyRecommendation(result.response)
```

**Asynchronous (fire and forget):**

```typescript
const taskId = await background_task({
  agent: "librarian",
  prompt: "Research topic...",
  name: "Research Task"
})

// Continue working immediately
// Retrieve later when needed
const result = await background_output({
  task_id: taskId,
  block: true,
  timeout: 60000
})
```

### Delegation Gates

**1. Frontend Detection Gate**

```typescript
function isFrontendWork(task: string): boolean {
  const frontendKeywords = [
    "style", "css", "tailwind", "layout", "component"
  ]

  return frontendKeywords.some(kw =>
    task.toLowerCase().includes(kw)
  )
}

if (isFrontendWork(currentTask)) {
  await call_agent({
    agent: "frontend-engineer",
    prompt: `Implement: ${currentTask}...`
  })
}
```

**2. Failure Recovery Gate**

```typescript
let failureCount = 0
const MAX_ATTEMPTS = 3

while (failureCount < MAX_ATTEMPTS) {
  try {
    await implementTask(task)
    break  // Success
  } catch (error) {
    failureCount++

    if (failureCount >= MAX_ATTEMPTS) {
      const advice = await call_agent({
        agent: "oracle",
        prompt: `Debug failure: ${error}...`
      })
      await applyOracleRecommendation(advice)
    }
  }
}
```

**3. Research Gate**

```typescript
function needsResearch(task: string): boolean {
  const researchKeywords = [
    "find", "search", "how", "examples", "best practice"
  ]

  return researchKeywords.some(kw =>
    task.toLowerCase().includes(kw)
  )
}

if (needsResearch(currentTask)) {
  background_task({
    agent: "librarian",
    prompt: `Research: ${topic}...`
  })
  // Continue working
}
```

---

## Workflow Examples

### Example 1: Simple Implementation (No Delegation)

```
User: "Add email validation to the signup form"

Phase 0: Classification
→ Intent: Implementation (simple, 1 file)
→ Strategy: Direct implementation, no delegation

Phase 1: Assessment
→ Read: src/components/SignupForm.tsx
→ Complexity: Simple (1 file)
→ Frontend: No (logic, not styling)

Phase 2B: Implementation
→ Create todos:
  1. Add validation function
  2. Add tests
  3. Update form handler

→ Implement:
  1. Write test
  2. Add validation
  3. Test passes
  4. Mark complete

Phase 3: Verification
→ All tests pass
→ Commit & push
→ Done
```

### Example 2: Frontend Delegation

```
User: "Update the dashboard layout to be responsive"

Phase 0: Classification
→ Intent: Implementation
→ Strategy: Delegate to frontend-engineer

Phase 1: Assessment
→ Read: src/pages/Dashboard.tsx
→ Complexity: Medium (3-4 files)
→ Frontend: YES (layout, responsive, visual)

Phase 2B: Implementation
→ Create todos:
  1. Make dashboard responsive
  2. Test on mobile/tablet/desktop
  3. Update documentation

→ Delegate to frontend-engineer:
  call_agent({
    agent: "frontend-engineer",
    prompt: "Make Dashboard.tsx responsive..."
  })

→ Frontend-engineer handles all todos:
  - Implements flexbox/grid layout
  - Adds media queries
  - Tests on all viewports
  - Checks accessibility
  - Marks todos complete

Phase 3: Verification
→ Visual regression check
→ Accessibility audit
→ Commit & push
→ Done
```

### Example 3: Research + Implementation

```
User: "Add authentication using Convex Auth"

Phase 0: Classification
→ Intent: Implementation (complex, new feature)
→ Strategy: Research first, then implement

Phase 1: Assessment
→ Read: spec-lite.md
→ Complexity: Complex (10+ files)
→ Need research: YES (Convex Auth patterns)

Phase 2A: Research (Parallel)
→ Fire background task:
  background_task({
    agent: "librarian",
    prompt: "Research Convex Auth best practices 2025..."
  })

Phase 2B: Implementation
→ Create todos (while research runs)
→ Retrieve research results when needed
→ Apply patterns from research
→ Implement auth flow
→ If 3 failures: Escalate to Oracle

Phase 3: Verification
→ Auth tests pass
→ Security audit
→ Commit & push
→ Done
```

### Example 4: Debug with Oracle Escalation

```
User: "Fix failing auth tests"

Phase 0: Classification
→ Intent: Debug
→ Strategy: Investigate, escalate if needed

Phase 1: Investigation
→ Run tests: npm test auth
→ 3 failures detected

Phase 2B: Debug
→ Attempt 1: Fix obvious issue
  → Still fails

→ Attempt 2: Different approach
  → Still fails

→ Attempt 3: Oracle escalation
  call_agent({
    agent: "oracle",
    prompt: "Debug 3 test failures..."
  })

  Oracle Response:
  Essential: Clock skew issue in JWT verification
  Expanded: System time differs from token timestamp
  Edge Cases: Can happen in Docker containers
  Recommendation: Add clock skew tolerance (60s)

→ Apply Oracle's recommendation
→ Tests pass

Phase 3: Verification
→ All tests pass
→ Commit & push
→ Done
```

---

## Configuration

Edit `.yoyo-dev/config.yml`:

```yaml
# v5.0 Multi-Agent Configuration
agents:
  default_model: anthropic/claude-opus-4-5

  yoyo_ai:
    enabled: true
    temperature: 1.0
    tools: ["*"]  # All tools

  oracle:
    enabled: true
    temperature: 0.1
    tools: ["Read", "Grep", "Glob", "call_agent", "!Bash", "!Write"]

  librarian:
    enabled: true
    temperature: 0.3
    tools: ["context7", "websearch", "gh", "git", "Read", "!Bash"]

  frontend_engineer:
    enabled: true
    temperature: 0.7
    tools: ["Write", "Read", "mcp__playwright__*", "!call_agent"]

  explore:
    enabled: true
    temperature: 0.5
    tools: ["Glob", "Grep", "Read"]

  implementer:
    enabled: true
    temperature: 0.3
    tools: ["Write", "Read", "Bash"]

  document_writer:
    enabled: true
    temperature: 0.5
    tools: ["Write", "Read"]

# Background Tasks
background_tasks:
  enabled: true
  max_concurrent: 5
  polling_interval: 2000       # milliseconds
  idle_timeout: 300000         # 5 minutes
  notification:
    toast: true
    message_injection: true

# Workflows
workflows:
  task_execution:
    orchestrator: yoyo-ai      # or "legacy" for v4.0

  failure_recovery:
    enabled: true
    max_attempts: 3
    escalate_to: oracle

  frontend_delegation:
    enabled: true
    agent: frontend-engineer

  todo_continuation:
    enabled: true
    cooldown: 3000             # milliseconds
```

---

## See Also

- **[Command Reference](commands.md)** - `/execute-tasks`, `/research`, `/consult-oracle`
- **[Architecture](ARCHITECTURE.md)** - System architecture
- **[Quick Start](QUICK-START.md)** - Getting started
- **[Installation](INSTALLATION.md)** - Setup guide

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
