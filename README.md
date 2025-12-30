# Yoyo Dev v5.0 - AI-Assisted Development Framework

**"Powerful when you need it. Invisible when you don't."**

Multi-agent orchestration system for AI-assisted software development with Claude Code.

---

## 🎯 What's New in v5.0

### Multi-Agent Orchestration System

**Yoyo-AI Primary Orchestrator**
- Intelligent task delegation to specialized agents
- Automatic intent classification (Planning, Implementation, Research, Debug)
- Parallel background task execution
- Failure recovery with automatic Oracle escalation
- Todo-driven workflow with progress tracking

**Specialized Agents**
- **Oracle** - Strategic advisor for architecture and debugging (0.1 temperature)
- **Librarian** - External research specialist (documentation, GitHub, web)
- **Explore** - Internal codebase search and pattern matching
- **Frontend Engineer** - UI/UX specialist with automatic delegation
- **Document Writer** - Technical documentation specialist
- **Implementer** - TDD-based code implementation

**New Commands**
- `/research <topic>` - Background research with librarian agent
- `/consult-oracle <question>` - Strategic guidance from Oracle
- `/execute-tasks --orchestrator yoyo-ai` - Multi-agent task execution (default)

**Intelligent Features**
- 🤖 Auto-detect frontend work → delegate to frontend-engineer
- 🔄 Parallel research while you continue working
- 📊 Todo-driven workflow with immediate completion tracking
- 🚨 3-failure escalation to Oracle for debugging
- ⚡ 60% faster feature creation with parallel execution

### Previous Features (v3.1-v4.0)

**Split View Mode**
- Integrated Claude Code CLI + TUI dashboard
- 40/60 split ratio (configurable)
- Independent pane operation

**Performance & Design**
- 97% faster startup (9ms vs 300ms)
- WCAG AA accessibility compliance
- Professional design system
- Smart caching

---

## 📦 Installation

### Prerequisites

- **Docker Desktop 4.32+** with MCP Toolkit enabled
- **Claude Code CLI** installed and configured
- **Node.js 22 LTS**
- **Python 3.10+**

### Quick Install

```bash
# Install from GitHub
curl -L https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/install.sh | bash -s -- --claude-code

# OR if you have base installation
~/.yoyo-dev/setup/install.sh --claude-code
```

This automatically:
- Installs Yoyo Dev framework
- Sets up Claude Code integration
- Configures MCP servers (playwright, github-official, duckduckgo, filesystem)
- Installs global `yoyo` command

### Verify Installation

```bash
# Check MCP servers (should show 4 servers)
docker mcp server ls

# Launch Yoyo Dev
yoyo

# Should show TUI + Claude + GUI
```

📖 **Full Installation Guide:** [docs/INSTALLATION.md](docs/INSTALLATION.md)

---

## 🚀 Getting Started

### Launch Dashboard

**v5.0 Default Mode** (TUI + Claude + GUI):

```bash
# Launch all three interfaces
yoyo

# Left pane: Claude Code CLI
# Right pane: TUI dashboard
# Browser: GUI at http://localhost:3456
```

**Other Launch Modes:**

```bash
# Without GUI
yoyo --no-gui

# TUI only (no Claude, no GUI)
yoyo --no-split

# Stop GUI server
yoyo --stop-gui

# GUI standalone
yoyo-gui
```

### 5-Minute Tutorial

**1. Initialize Memory**
```bash
/init
```

**2. Create Product Mission**
```bash
/plan-product
```

**3. Create Your First Feature**
```bash
/create-new "Add user authentication"
```

**4. Execute with Yoyo-AI (Multi-Agent Orchestration)**
```bash
/execute-tasks
```

Yoyo-AI automatically:
- Classifies intent (Planning/Implementation/Research/Debug)
- Fires background research with librarian agent
- Auto-delegates frontend work to frontend-engineer
- Implements with TDD approach
- Escalates to Oracle after 3 failures
- Creates PR when done

**5. Review & Merge**
```
Open PR link → Review code → Merge
```

📖 **Full Tutorial:** [docs/QUICK-START.md](docs/QUICK-START.md)

---

## 📚 Core Workflows

### Product Setup

```bash
# New product - set mission & roadmap
/plan-product

# Existing product - analyze codebase
/analyze-product
```

### Feature Development (v5.0)

```bash
# Create feature with Yoyo-AI orchestration (default)
/create-new "Add user profile"

# Execute with multi-agent orchestration
/execute-tasks                           # Yoyo-AI (default)
/execute-tasks --orchestrator legacy     # v4.0 workflow

# Execute specific task
/execute-tasks --task=2

# Execute with review mode
/execute-tasks --security --devil

# Disable auto-delegation
/execute-tasks --no-delegation
```

### Research & Strategic Guidance (v5.0)

```bash
# Background research (runs in parallel)
/research "Convex authentication best practices"
# → Librarian agent searches docs, GitHub, web
# → Results delivered as notification
# → Continue working immediately

# Strategic architecture guidance
/consult-oracle "Should we use microservices or monolith for MVP?"
# → Oracle provides: Essential | Expanded | Edge Cases
# → Synchronous response with structured advice
```

### Bug Fixes

```bash
# Systematic fix with Yoyo-AI
/create-fix "Login button returns 401 error"
# → Explore agent finds related code (background)
# → Oracle analyzes root cause if complex
# → Creates TDD-based fix tasks

# Execute fix
/execute-tasks
# → Auto-escalates to Oracle after 3 failures
```

### Design System

```bash
# Initialize design system
/design-init

# Audit compliance
/design-audit

# Fix violations
/design-fix --colors --spacing

# Create component with validation
/design-component "User profile card"
```

### Advanced

```bash
# Manual multi-agent orchestration (power users)
/orchestrate-tasks

# Code review modes
/review --devil "Authentication flow"
/review --security "Payment processing"
/review --performance "Dashboard rendering"

# Containerization
/containerize-application --node --multi-stage
```

---

## 🤖 Multi-Agent System (v5.0)

### Yoyo-AI Orchestrator

**Primary agent that coordinates all work:**

**Phase 0: Intent Classification**
- Automatically classifies: Planning | Implementation | Research | Debug
- Routes to appropriate workflow

**Phase 1: Codebase Assessment**
- Analyzes complexity (simple/medium/complex)
- Detects frontend keywords → auto-delegate
- Checks for research needs → background librarian

**Phase 2A: Research & Exploration (Parallel)**
- Fires background tasks for research
- Searches codebase with explore agent
- Continues working while tasks run

**Phase 2B: Implementation (Todo-Driven)**
- Creates todos BEFORE implementation
- Marks in_progress immediately
- Marks completed IMMEDIATELY (not batched)
- Only ONE todo in_progress at a time

**Phase 3: Verification & Completion**
- Runs all tests
- Quality gates (functionality, types, tests, a11y, security)
- Git workflow (commit, PR)
- Creates recap

### Specialized Agents

| Agent | Role | Temperature | When Used |
|-------|------|-------------|-----------|
| **Oracle** | Strategic advisor | 0.1 | Architecture decisions, 3+ failures |
| **Librarian** | External research | 0.3 | Documentation, GitHub examples, web search |
| **Explore** | Codebase search | 0.5 | Internal pattern matching, file discovery |
| **Frontend Engineer** | UI/UX specialist | 0.7 | Auto-detected UI work (style, layout, components) |
| **Document Writer** | Technical writing | 0.5 | README, docs, guides |
| **Implementer** | Code implementation | 0.3 | TDD-based feature development |

### Delegation Examples

**Automatic Frontend Delegation:**
```
Task: "Update button styling to match design system"
→ Yoyo-AI detects: "style", "button" keywords
→ Auto-delegates to frontend-engineer
→ Frontend-engineer: implements + tests + a11y check
```

**Background Research:**
```
Task: "Add Convex authentication"
→ Yoyo-AI fires: background_task(agent="librarian", prompt="Research Convex auth...")
→ Continue working on other subtasks
→ Retrieve results when needed
```

**Oracle Escalation:**
```
Attempt 1: Test fails → Retry with improved approach
Attempt 2: Test fails → Try completely different approach
Attempt 3: Test fails → call_agent(agent="oracle", prompt="Debug failure...")
→ Oracle analyzes root cause
→ Apply Oracle's recommendation
```

📖 **Full Documentation:** See [Multi-Agent System Guide](docs/features/multi-agent-system.md)

---

## 🏗️ Project Structure

```
your-project/
├── .yoyo-dev/                  # Framework files
│   ├── product/                # Product docs (mission, roadmap, tech-stack)
│   ├── specs/                  # Feature specifications
│   │   └── YYYY-MM-DD-name/
│   │       ├── spec.md
│   │       ├── spec-lite.md    # Condensed for AI
│   │       ├── tasks.md
│   │       ├── state.json
│   │       └── sub-specs/
│   ├── fixes/                  # Bug fix documentation
│   ├── recaps/                 # Development recaps
│   ├── patterns/               # Saved patterns library
│   ├── instructions/core/      # AI workflow instructions
│   │   ├── yoyo-ai-orchestration.md  # NEW v5.0
│   │   ├── execute-tasks.md
│   │   ├── create-new.md
│   │   └── ...
│   ├── standards/              # Development standards
│   └── setup/                  # Installation scripts
│
├── .claude/                    # Claude Code integration
│   ├── commands/               # Slash commands
│   │   ├── research.md         # NEW v5.0
│   │   ├── consult-oracle.md   # NEW v5.0
│   │   └── ...
│   └── agents/                 # Agent configurations
│       ├── yoyo-ai.md          # NEW v5.0
│       ├── oracle.md           # NEW v5.0
│       ├── librarian.md        # NEW v5.0
│       ├── explore.md          # NEW v5.0
│       ├── frontend-engineer.md # NEW v5.0
│       └── document-writer.md  # NEW v5.0
│
├── .yoyo-ai/                   # Memory system (v4.0+)
│   └── memory/
│       └── memory.db           # SQLite memory store
│
└── .mcp.json                   # MCP server configuration
```

---

## 🔧 Configuration

### Yoyo-AI Orchestrator

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
      cooldown: 3000           # milliseconds
```

### Split View

```yaml
split_view:
  enabled: true
  ratio: 0.4
  active_pane: claude
  border_style:
    active: bright_cyan
    inactive: dim_white
```

### Parallel Execution

```yaml
parallel_execution:
  enabled: true
  max_concurrency: 5
  auto_analyze: true
  ask_confirmation: true
```

📖 **Full Config Reference:** See [Configuration Guide](docs/configuration.md)

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Setup
/plan-product                      # New product mission & roadmap
/analyze-product                   # Existing product setup

# Development (v5.0 with Yoyo-AI)
/create-new "feature"              # Feature creation
/create-fix "problem"              # Bug fix workflow
/execute-tasks                     # Multi-agent execution (default)
/execute-tasks --orchestrator legacy  # v4.0 workflow

# Research & Guidance (v5.0)
/research "topic"                  # Background research
/consult-oracle "question"         # Strategic guidance

# Spec Management
/create-spec "feature"             # Create spec only
/create-tasks                      # Create tasks from spec

# Design
/design-init                       # Initialize design system
/design-audit                      # Check compliance
/design-fix                        # Fix violations

# Advanced
/orchestrate-tasks                 # Manual orchestration
/review --devil "scope"            # Devil's advocate review
/improve-skills                    # Optimize agent skills

# TUI
yoyo                              # Launch split view
yoyo --no-gui                     # Without browser GUI
yoyo --no-split                   # TUI only
```

### Keyboard Shortcuts (TUI)

```
?     Help              r     Refresh
/     Commands          g     Git menu
t     Focus tasks       s     Focus specs
h     Focus history     q     Quit
```

### Split View Shortcuts

```
Ctrl+B →    Switch focus
Ctrl+B <    Resize left larger
Ctrl+B >    Resize right larger
```

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Test categories
pytest tests/widgets/ -v       # UI components (209 tests)
pytest tests/screens/ -v       # Screens (82 tests)
pytest tests/services/ -v      # Services (80 tests)
pytest tests/integration/ -v   # Integration tests

# With coverage
pytest tests/ --cov=lib/yoyo_tui_v3 --cov-report=html

# Test TypeScript (memory, skills, agents)
cd src && npm test
```

**Test Results:** 414+ tests passing (94.5% pass rate)

---

## 🔄 Updating

```bash
# Update to latest version
bash .yoyo-dev/setup/yoyo-update.sh

# Preserve customizations
bash .yoyo-dev/setup/yoyo-update.sh --no-overwrite

# Skip MCP check during update
bash .yoyo-dev/setup/yoyo-update.sh --skip-mcp-check
```

**Protected Files** (never overwritten):
- Product docs, specs, fixes, recaps, patterns

---

## 📖 Documentation

### Getting Started

- **[Installation Guide](docs/INSTALLATION.md)** - Prerequisites, MCP setup, verification
- **[Quick Start](docs/QUICK-START.md)** - 5-minute tutorial
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture overview
- **[Directory Structure](docs/directory-structure.md)** - File organization

### Core Features

- **[Command Reference](docs/commands.md)** - Complete slash command reference
- **[Multi-Agent Orchestration](docs/multi-agent-orchestration.md)** - v5.0 agent system
- **[GUI Dashboard](docs/gui-dashboard.md)** - Browser-based dashboard
- **[Memory System](docs/memory-system.md)** - Persistent context management

### In-Project Docs

- `.yoyo-dev/standards/best-practices.md` - Development guidelines
- `.yoyo-dev/standards/tech-stack.md` - Technology decisions
- `.yoyo-dev/standards/design-system.md` - Design philosophy
- `.yoyo-dev/instructions/core/yoyo-ai-orchestration.md` - Orchestrator details

### Online Resources

- **Claude Code**: https://docs.claude.com/en/docs/claude-code
- **GitHub**: https://github.com/daverjorge46/yoyo-dev-ai
- **Issues**: https://github.com/daverjorge46/yoyo-dev-ai/issues

---

## 🏆 Best Practices

### v5.0 Workflow

1. **Let Yoyo-AI orchestrate** - Use `/execute-tasks` (default orchestrator)
2. **Research early** - Fire `/research` at start, results ready when needed
3. **Consult Oracle** - Use `/consult-oracle` for architecture decisions
4. **Trust delegation** - Frontend work auto-delegated to specialist
5. **Watch todos** - Track progress in real-time via TUI

### Code Quality

- **TDD approach** - Tests first, implementation second
- **Persona-driven** - Let specialized agents handle their domains
- **Keep it simple** - Fewest lines possible
- **DRY principle** - Extract repeated logic
- **Type safety** - Zero TypeScript errors

---

## 🐛 Troubleshooting

### Quick Fixes

**TUI won't launch:**
```bash
pip3 install --user textual watchdog pyyaml
python3 -c "from yoyo_tui_v3.app import create_app; create_app()"
```

**Global command not found:**
```bash
bash .yoyo-dev/setup/install-global-command.sh
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
```

**Split view issues:**
```bash
# Check Claude installed
which claude

# Use TUI-only mode
yoyo --no-split
```

**MCP servers not working:**
```bash
# Verify Docker Desktop running
docker info

# Check MCP servers
docker mcp server ls

# Reconnect Claude
docker mcp client connect claude-code
```

📖 **Full Troubleshooting:** See [Troubleshooting Guide](docs/installation/troubleshooting.md)

---

## 🤝 Contributing

```bash
# Clone & setup
git clone https://github.com/daverjorge46/yoyo-dev-ai.git
cd yoyo-dev-ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest tests/ -v

# Submit PR
# 1. Create feature branch
# 2. Make changes + tests
# 3. Update docs
# 4. Submit pull request
```

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Claude Code](https://claude.com/claude-code) - AI-assisted development
- [Textual](https://textual.textualize.io/) - TUI framework
- [Rich](https://rich.readthedocs.io/) - Terminal formatting

---

## 📬 Support

- **Issues**: https://github.com/daverjorge46/yoyo-dev-ai/issues
- **Discussions**: https://github.com/daverjorge46/yoyo-dev-ai/discussions
- **Docs**: https://docs.claude.com/en/docs/claude-code

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
