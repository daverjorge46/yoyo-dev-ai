# Architecture Guide

> Yoyo Dev v5.0 System Architecture

This document provides a comprehensive overview of Yoyo Dev's architecture, including the multi-agent orchestration system, memory architecture, and component interactions.

---

## Table of Contents

- [System Overview](#system-overview)
- [Multi-Agent System](#multi-agent-system)
- [Memory Architecture](#memory-architecture)
- [TUI Architecture](#tui-architecture)
- [Component Interactions](#component-interactions)
- [Data Flow](#data-flow)

---

## System Overview

Yoyo Dev is a multi-agent orchestration framework for AI-assisted development. It coordinates specialized agents, manages persistent memory, and provides real-time dashboards for development workflows.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Claude Code  │  │  TUI v4      │  │  GUI Dashboard       │  │
│  │     CLI      │  │ (Terminal)   │  │  (Browser)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Orchestration Layer (v5.0)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Yoyo-AI Orchestrator                  │  │
│  │  (Claude Opus 4.5, temperature: 1.0)                      │  │
│  │                                                             │  │
│  │  • Intent Classification (Planning/Implementation/...)     │  │
│  │  • Codebase Assessment (Complexity analysis)               │  │
│  │  • Delegation Gates (Frontend detection, failure recovery) │  │
│  │  • Todo Management (Progress tracking)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Layer (v5.0)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Oracle     │  │  Librarian   │  │  Frontend Engineer   │  │
│  │  (T: 0.1)    │  │  (T: 0.3)    │  │      (T: 0.7)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Explore    │  │ Implementer  │  │  Document Writer     │  │
│  │  (T: 0.5)    │  │  (T: 0.3)    │  │      (T: 0.5)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Memory DB    │  │  MCP Gateway │  │  File System         │  │
│  │ (SQLite)     │  │  (Docker)    │  │  (.yoyo-dev/)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend (GUI Dashboard)**
- TypeScript
- React 18
- Vite build system
- WebSocket for real-time updates

**Backend (TUI Dashboard)**
- Python 3.10+
- Textual framework
- Rich terminal formatting
- Watchdog file monitoring

**Memory System**
- SQLite with WAL mode
- TypeScript service layer
- Python bridge for TUI

**MCP Integration**
- Docker MCP Gateway
- Containerized MCP servers
- stdio communication protocol

---

## Multi-Agent System

### Yoyo-AI Orchestrator

**Primary agent** that coordinates all development work.

**Model:** Claude Opus 4.5
**Temperature:** 1.0 (creative problem-solving)
**Tool Access:** All tools (`*`)

**Core Responsibilities:**
1. **Intent Classification** - Planning | Implementation | Research | Debug
2. **Complexity Assessment** - Simple | Medium | Complex
3. **Delegation Decisions** - When and to whom
4. **Failure Recovery** - 3-attempt escalation protocol
5. **Progress Tracking** - Todo management

**Workflow Phases:**

```
Phase 0: Intent Classification
    ↓
Phase 1: Codebase Assessment
    ↓
Phase 2A: Research & Exploration (Parallel)
    ↓
Phase 2B: Implementation (Todo-Driven)
    ↓
Phase 3: Verification & Completion
```

### Specialized Agents

#### Oracle (Strategic Advisor)

**Model:** Claude Opus 4.5
**Temperature:** 0.1 (precise, analytical)
**Tool Access:** Read-only + analysis (no Bash, no Write)

**Purpose:**
- Architecture decisions
- Root cause analysis
- Debugging assistance
- Strategic guidance

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

#### Librarian (Research Specialist)

**Model:** Claude Opus 4.5
**Temperature:** 0.3 (focused, comprehensive)
**Tool Access:** External research tools only (context7, websearch, gh, git, Read)

**Purpose:**
- External documentation research
- GitHub example discovery
- Best practices compilation
- Current year (2025) resources

**When Used:**
- Explicit `/research` command
- Background research during implementation
- Learning new technologies

**Execution Mode:** Asynchronous (background tasks)

#### Frontend Engineer (UI/UX Specialist)

**Model:** Claude Opus 4.5
**Temperature:** 0.7 (creative, design-focused)
**Tool Access:** Write, Read, Playwright (no call_agent to prevent loops)

**Purpose:**
- UI component implementation
- Responsive design
- Accessibility (WCAG 2.1 AA)
- Visual consistency

**When Used:**
- Auto-detected frontend keywords (style, css, layout, component, etc.)
- Explicit frontend tasks
- Design system work

**Keywords Triggering Auto-Delegation:**
```
style, css, tailwind, layout, visual, ui, ux, component,
button, form, input, responsive, design, animation, transition,
color, spacing, padding, margin, flexbox, grid, hover, focus
```

#### Explore (Codebase Search)

**Model:** Claude Opus 4.5
**Temperature:** 0.5 (balanced exploration)
**Tool Access:** Search tools only (Glob, Grep, Read)

**Purpose:**
- Internal codebase search
- Pattern matching
- File discovery
- Code excerpt extraction

**When Used:**
- Background codebase exploration
- Finding related code during bug fixes
- Identifying implementation patterns

**Execution Mode:** Asynchronous (background tasks)

#### Implementer (Code Implementation)

**Model:** Claude Opus 4.5
**Temperature:** 0.3 (precise, consistent)
**Tool Access:** Write, Read, Bash

**Purpose:**
- TDD-based implementation
- Code quality enforcement
- Test creation
- Documentation updates

**When Used:**
- Non-frontend implementation tasks
- Backend logic
- API development

#### Document Writer (Technical Writing)

**Model:** Claude Opus 4.5
**Temperature:** 0.5 (clear, structured)
**Tool Access:** Write, Read

**Purpose:**
- Technical documentation
- README files
- API documentation
- Guides and tutorials

**When Used:**
- Explicit documentation tasks
- Post-implementation documentation
- Spec creation

### Agent Communication Patterns

**Synchronous Delegation (wait for result):**

```typescript
const result = await call_agent({
  agent: "oracle",
  prompt: "Detailed question...",
  timeout: 120000  // 2 minutes
})

// Use result immediately
applyRecommendation(result.response)
```

**Asynchronous Delegation (fire and forget):**

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
    "style", "css", "tailwind", "layout", "visual", "ui", "ux",
    "component", "button", "form", "input", "responsive", "design"
  ]

  return frontendKeywords.some(kw =>
    task.toLowerCase().includes(kw)
  )
}

if (isFrontendWork(currentTask)) {
  // Auto-delegate to frontend-engineer
  await call_agent({ agent: "frontend-engineer", ... })
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
      // Escalate to Oracle
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
    "find", "search", "how", "what", "examples",
    "best practice", "documentation"
  ]

  return researchKeywords.some(kw =>
    task.toLowerCase().includes(kw)
  )
}

if (needsResearch(currentTask)) {
  // Fire background research
  background_task({
    agent: "librarian",
    prompt: `Research: ${topic}...`
  })

  // Continue working
}
```

---

## Memory Architecture

### Database Schema

**SQLite with WAL mode** for concurrent access.

```sql
-- Memory Blocks
CREATE TABLE memory_blocks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,        -- persona, project, user, corrections
    scope TEXT NOT NULL,       -- global, project
    content TEXT NOT NULL,     -- JSON content
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Conversations (for future use)
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL,        -- user, assistant, system
    content TEXT NOT NULL,
    metadata TEXT,             -- JSON metadata
    timestamp TEXT NOT NULL
);

-- Agents (for future use)
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    config TEXT,               -- JSON config
    created_at TEXT NOT NULL,
    last_used TEXT NOT NULL
);
```

### Memory Block Types

**1. Persona Block**

```typescript
interface PersonaContent {
  name: string;                    // "Yoyo"
  traits: string[];                // ["helpful", "thorough"]
  communication_style: string;     // "technical"
  expertise_areas: string[];       // ["TypeScript", "React"]
}
```

**2. Project Block**

```typescript
interface ProjectContent {
  name: string;                    // "my-app"
  description: string;
  tech_stack: {
    frontend?: string[];           // ["React 18", "TypeScript"]
    backend?: string[];            // ["Convex"]
    database?: string[];           // ["SQLite"]
    tools?: string[];              // ["Vite", "Playwright"]
  };
  architecture: string;            // "component-based"
  patterns: string[];              // ["TDD", "functional"]
  key_directories: {
    [key: string]: string;         // { "src": "source code", ... }
  };
}
```

**3. User Block**

```typescript
interface UserContent {
  name: string;
  preferences: {
    coding_style?: string;         // "functional"
    indentation?: number;          // 2
    testing?: string;              // "TDD"
    [key: string]: any;
  };
  interaction_patterns: string[];  // ["prefers concise answers"]
}
```

**4. Corrections Block**

```typescript
interface CorrectionsContent {
  entries: Array<{
    date: string;                  // ISO timestamp
    wrong: string;                 // What was incorrect
    right: string;                 // What was correct
    context: string;               // Where it happened
  }>;
}
```

### Dual-Scope System

**Project Scope** (`.yoyo-ai/memory/memory.db`):
- Project-specific memory
- Overrides global memory
- Stored in project directory

**Global Scope** (`~/.yoyo-ai/memory/memory.db`):
- User preferences
- Cross-project patterns
- Stored in home directory

**Loading Priority:**
```typescript
// 1. Try project scope first
const projectMemory = loadMemory('.yoyo-ai/memory/memory.db')

// 2. Merge with global scope
const globalMemory = loadMemory('~/.yoyo-ai/memory/memory.db')

// 3. Project overrides global
const memory = { ...globalMemory, ...projectMemory }
```

### Memory Service Layer

**TypeScript Service** (`src/memory/service.ts`):

```typescript
class MemoryService {
  initialize(): void
  saveBlock(type: BlockType, content: any, scope: 'global' | 'project'): void
  loadBlock(type: BlockType, scope?: 'global' | 'project'): MemoryBlock | null
  loadAllMemory(): { [key in BlockType]?: MemoryBlock }
  deleteBlock(id: string): void
  exportMemory(): string
  importMemory(data: string): void
  close(): void
}
```

**Python Bridge** (`lib/yoyo_tui_v3/services/memory_bridge.py`):

```python
class MemoryBridge:
    def __init__(self, project_root: Path)
    def get_status(self, include_global: bool = False) -> MemoryStatus
    def is_connected(self) -> bool
```

---

## TUI Architecture

### TUI v4 vs TUI v3

**TUI v4 (TypeScript + Ink):**
- Status: Experimental (v4.0+)
- Stack: TypeScript, Ink (React for terminal)
- Features: Component-based, reactive updates
- Performance: Excellent (React rendering)

**TUI v3 (Python + Textual):**
- Status: Stable (default)
- Stack: Python 3.10+, Textual framework
- Features: Rich panels, live updates
- Performance: Very good (async Python)

**Fallback Mechanism:**

```python
try:
    # Try TUI v4 first (TypeScript)
    launch_tui_v4()
except Exception:
    # Fallback to TUI v3 (Python)
    launch_tui_v3()
```

### TUI v3 Component Architecture

```
App (lib/yoyo_tui_v3/app.py)
├── ProjectOverviewWidget
│   ├── Mission display
│   ├── Tech stack
│   └── Memory status
├── ActiveTasksWidget
│   ├── Task list
│   ├── Progress bars
│   └── Real-time updates
├── SpecsBrowserWidget
│   ├── Spec list
│   └── Spec details
├── CommandHistoryWidget
│   └── Recent commands
└── ErrorDetectorWidget
    └── Error monitoring
```

**Screen Management:**

```python
class YoyoTUIApp(App):
    SCREENS = {
        "main": MainScreen,
        "spec_detail": SpecDetailScreen,
        "task_detail": TaskDetailScreen,
    }

    def on_mount(self):
        self.push_screen("main")
```

**Service Layer:**

```python
# Data Services
ProjectService      # Reads .yoyo-dev/product/
SpecsService        # Reads .yoyo-dev/specs/
TasksService        # Reads tasks.md files
MemoryBridge        # Reads .yoyo-ai/memory/

# File Watchers
ProjectWatcher      # Watches product files
SpecsWatcher        # Watches spec files
TasksWatcher        # Watches tasks files
```

**Update Flow:**

```
File Change (e.g., tasks.md updated)
    ↓
Watchdog detects change
    ↓
TasksWatcher.on_modified()
    ↓
TasksService.refresh()
    ↓
ActiveTasksWidget.update()
    ↓
UI re-renders
```

---

## Component Interactions

### Workflow Execution Flow

**User initiates command:**

```
User: /create-new "Add authentication"
    ↓
Claude Code CLI parses command
    ↓
Yoyo-AI orchestrator activated
    ↓
Phase 0: Intent Classification
    → Intent: Planning
    → Route to discovery workflow
    ↓
Phase 1: Discovery
    → spec-shaper agent gathers requirements
    → Creates .yoyo-dev/specs/YYYY-MM-DD-authentication/
    ↓
Spec files written
    ↓
TUI SpecsWatcher detects new files
    ↓
TUI SpecsBrowserWidget updates
    ↓
User sees new spec in TUI
```

**User executes tasks:**

```
User: /execute-tasks
    ↓
Yoyo-AI orchestrator activated
    ↓
Phase 1: Codebase Assessment
    → Reads spec-lite.md
    → Analyzes complexity
    → Detects frontend keywords
    ↓
Phase 2A: Research (Background)
    → background_task(agent="librarian", ...)
    → Continue to Phase 2B
    ↓
Phase 2B: Implementation
    → Create todos
    → Mark in_progress
    → Detect frontend work → delegate to frontend-engineer
    → frontend-engineer implements
    → Mark complete
    ↓
Tasks.md updated
    ↓
TUI TasksWatcher detects change
    ↓
TUI ActiveTasksWidget updates
    ↓
User sees progress in real-time
```

### MCP Integration Flow

```
Claude Code tool invocation
    ↓
MCP client request (stdio)
    ↓
Docker MCP Gateway
    ↓
Route to appropriate MCP server container
    ├── playwright → Browser automation
    ├── github-official → GitHub API
    ├── duckduckgo → Web search
    └── filesystem → File operations
    ↓
MCP server processes request
    ↓
Response back through gateway
    ↓
Claude Code receives result
    ↓
Yoyo-AI uses result
```

### Memory Integration Flow

```
/init command
    ↓
Memory init script (src/memory/commands/init.ts)
    ↓
Scan codebase
    ├── Read package.json → Tech stack
    ├── Read tsconfig.json → TypeScript config
    ├── Analyze directory structure
    └── Sample source files → Patterns
    ↓
Create memory blocks
    ├── Project block
    └── Persona block
    ↓
MemoryService.saveBlock()
    ↓
SQLite write (.yoyo-ai/memory/memory.db)
    ↓
TUI MemoryBridge detects change
    ↓
TUI ProjectOverviewWidget updates
    ↓
User sees memory status
```

---

## Data Flow

### Spec Creation Data Flow

```
┌──────────────┐
│ User Input   │
│ "Add auth"   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ spec-shaper Agent    │
│ - Gather requirements│
│ - Ask questions      │
│ - Draft spec         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ File System                           │
│ .yoyo-dev/specs/YYYY-MM-DD-auth/     │
│ ├── spec.md                          │
│ ├── spec-lite.md                     │
│ ├── sub-specs/technical-spec.md      │
│ └── decisions.md                      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Watchdog File Watch  │
│ SpecsWatcher detects │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ SpecsService.refresh │
│ Load new spec files  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ TUI Update           │
│ SpecsBrowserWidget   │
└──────────────────────┘
```

### Task Execution Data Flow

```
┌──────────────────┐
│ Yoyo-AI          │
│ Read tasks.md    │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Create Todos     │
│ TodoWrite([...]) │
└─────┬────────────┘
      │
      ▼
┌───────────────────────┐
│ Implementation Loop   │
│ For each todo:        │
│ 1. Mark in_progress   │
│ 2. Implement          │
│ 3. Test               │
│ 4. Mark complete      │
└─────┬─────────────────┘
      │
      ▼
┌──────────────────┐
│ Update tasks.md  │
│ Mark complete    │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ Watchdog Detects │
│ TasksWatcher     │
└─────┬────────────┘
      │
      ▼
┌──────────────────┐
│ TUI Update       │
│ ActiveTasks      │
└──────────────────┘
```

---

## Performance Characteristics

### TUI v3 Performance

**Startup Time:** 9ms (97% faster than v2.0)
**Memory Usage:** ~50MB
**File Watch Latency:** <100ms
**UI Update Rate:** 60 FPS
**Panel Rendering:** Async (non-blocking)

### Memory System Performance

**Database Operations:**
- Write: <5ms (WAL mode)
- Read: <1ms (indexed queries)
- Load all memory: <10ms

**Caching:**
- Memory blocks cached in service layer
- Invalidated on file change
- LRU eviction (100 items max)

### Multi-Agent Performance

**Synchronous Delegation:** 2-120s (depends on agent)
**Background Tasks:** 0s blocking (async execution)
**Parallel Execution:** 2-3x faster (independent tasks)

---

## Security Considerations

### Agent Tool Restrictions

Each agent has restricted tool access to prevent security issues:

```yaml
yoyo-ai:
  tools: ["*"]  # All tools (orchestrator privilege)

oracle:
  tools: ["Read", "Grep", "Glob", "call_agent", "!Bash", "!Write"]
  # Read-only + analysis, no code modification

librarian:
  tools: ["context7", "websearch", "gh", "git", "Read", "!Bash"]
  # External research only, no code modification

frontend-engineer:
  tools: ["Write", "Read", "mcp__playwright__*", "!call_agent"]
  # Can modify code, but no delegation loops

explore:
  tools: ["Glob", "Grep", "Read"]
  # Search only, no modifications
```

### MCP Server Isolation

Each MCP server runs in isolated Docker container:
- 1 CPU core limit
- 2GB RAM limit
- Read-only filesystem (except designated volumes)
- Isolated network namespace

### File System Access

Memory database stored in:
- Project: `.yoyo-ai/memory/` (project-specific)
- Global: `~/.yoyo-ai/memory/` (user directory)

Both locations are outside web-accessible directories.

---

## Scalability

### Concurrent Operations

- **TUI:** Handles 1000+ file watches simultaneously
- **Memory:** SQLite WAL mode supports concurrent reads
- **Agents:** Max 5 background tasks simultaneously (configurable)

### Large Codebases

- **Spec scanning:** Lazy loading (on-demand)
- **File watching:** Debounced updates (300ms)
- **Memory cache:** LRU eviction prevents unbounded growth

---

## Extension Points

### Custom Agents

Add custom agents in `.claude/agents/`:

```yaml
---
name: custom-agent
tools: [Write, Read, Bash]
temperature: 0.5
---

Your agent instructions here...
```

### Custom Workflows

Add custom workflows in `workflows/`:

```markdown
# workflows/custom/my-workflow.md

1. Step one
2. Step two
3. Step three
```

Reference in agent:

```yaml
{{workflows/custom/my-workflow.md}}
```

### Custom MCP Servers

Enable additional MCP servers:

```bash
docker mcp server enable my-custom-server
```

Update `.mcp.json` if needed.

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
