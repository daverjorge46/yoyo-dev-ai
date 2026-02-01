<div align="center">

```
██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗      █████╗ ██╗
╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗    ██╔══██╗██║
 ╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║    ███████║██║
  ╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║    ██╔══██║██║
   ██║   ╚██████╔╝   ██║   ╚██████╔╝    ██║  ██║██║
   ╚═╝    ╚═════╝    ╚═╝    ╚═════╝     ╚═╝  ╚═╝╚═╝
```

### **Your AI learns. Your AI remembers. Your AI evolves.**

*AI-assisted development platform with Business and Personal AI Assistant*

[![Version](https://img.shields.io/badge/version-7.0.0-D29922?style=flat-square)](https://github.com/daverjorge46/yoyo-dev-ai)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude-Code-8B5CF6?style=flat-square)](https://claude.com/claude-code)

[Quick Start](#-quick-start) · [Commands](#-commands) · [Yoyo AI](#-yoyo-ai-business-and-personal-ai-assistant) · [Multi-Agent System](#-multi-agent-system) · [GUI Dashboard](#-gui-dashboard)

</div>

---

## Overview

**Yoyo Dev AI** is a platform with two subsystems:

| Subsystem | Command | Description |
|-----------|---------|-------------|
| **yoyo-dev** | `yoyo-dev` | Development environment -- Wave Terminal, Claude Code, multi-agent orchestration, GUI dashboard |
| **yoyo-ai** | `yoyo-ai` | Business and Personal AI Assistant -- OpenClaw daemon, messaging, skills, always-on intelligence |

| Feature | Description |
|---------|-------------|
| **Multi-Agent Orchestration** | Specialized agents for research, code exploration, frontend, documentation |
| **Structured Workflows** | Consistent processes for planning, specification, and execution |
| **Persistent Memory** | Context preservation across sessions |
| **Browser GUI** | Real-time dashboard at `localhost:5173` |
| **Business and Personal AI Assistant** | OpenClaw-powered daemon with messaging channels and learned skills |

---

## What's New in v7.0

<table>
<tr>
<td width="50%">

### Yoyo AI (Business and Personal AI Assistant)

- **OpenClaw integration** -- always-on AI daemon
- Messaging channels (CLI, API, webhooks)
- Learned skills and persistent memory
- Managed via `yoyo-ai` command
- New `--start`, `--stop`, `--status`, `--doctor` subcommands

</td>
<td width="50%">

### Platform Unification

- **`yoyo-dev`** -- primary command (replaces `yoyo`)
- **`yoyo-ai`** -- Business and Personal AI Assistant daemon
- **`yoyo`** -- deprecated alias for `yoyo-dev`
- Multi-agent orchestration (Oracle, Librarian, Explore, Frontend, Writer)
- Mandatory yoyo-ai (OpenClaw) in all installations

</td>
</tr>
</table>

---

## Quick Start

### Prerequisites

```
 Docker Desktop 4.32+ with MCP Toolkit enabled
 Claude Code CLI installed and configured
 Node.js 22 LTS
```

### Installation

Yoyo Dev uses a **two-phase installation** model:

| Phase | Location | Purpose |
|-------|----------|---------|
| **BASE** | `~/.yoyo-dev-base` | Framework source (shared across projects) |
| **PROJECT** | `.yoyo-dev/` | Project-specific data (specs, fixes, memory) |

```bash
# Step 1: Install BASE (one-time)
git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev-base
~/.yoyo-dev-base/setup/install-global-command.sh

# Step 2: Initialize in your project
cd /path/to/your-project
yoyo-init --claude-code
```

> **Note:** The `.yoyo-dev/` directory is created during project initialization. Each project gets its own isolated workspace.

### Launch

```bash
# Development environment (Claude Code + Wave Terminal + GUI)
yoyo-dev

# Without GUI
yoyo-dev --no-gui

# GUI standalone
yoyo-gui

# Business and Personal AI Assistant
yoyo-ai --start

# Diagnose issues
yoyo-doctor
```

> **Note:** `yoyo` still works as a deprecated alias for `yoyo-dev`.

### Verify Installation

```bash
# Run diagnostic
yoyo-doctor

# Check MCP servers
docker mcp server ls

# Launch dev environment
yoyo-dev

# Check AI Assistant status
yoyo-ai --status
```

> **Full Installation Guide:** [docs/INSTALLATION.md](docs/INSTALLATION.md)

---

## 5-Minute Tutorial

<table>
<tr>
<td width="50%">

### 1. Initialize Memory
```bash
/init
```

### 2. Create Product Mission
```bash
/plan-product
```

### 3. Create Your First Feature
```bash
/create-new "Add user authentication"
```

</td>
<td width="50%">

### 4. Execute with Multi-Agent Orchestration
```bash
/execute-tasks
```

Yoyo-AI automatically:
- Classifies intent (Planning/Implementation/Research/Debug)
- Fires background research with librarian agent
- Auto-delegates frontend work
- Implements with TDD approach
- Creates PR when done

### 5. Review & Merge
```
Open PR link -> Review code -> Merge
```

</td>
</tr>
</table>

> **Full Tutorial:** [docs/QUICK-START.md](docs/QUICK-START.md)

---

## Commands

### Product Setup

| Command | Description |
|---------|-------------|
| `/plan-product` | Create product mission, roadmap, and tech-stack |
| `/analyze-product` | Analyze existing codebase and generate docs |

### Feature Development

| Command | Description |
|---------|-------------|
| `/create-new "feature"` | Full workflow: spec + tasks + execution |
| `/create-spec "feature"` | Create detailed specification only |
| `/create-tasks` | Generate task breakdown from spec |
| `/execute-tasks` | Multi-agent task execution |
| `/execute-tasks --orchestrator legacy` | v4.0 workflow mode |

### Research & Strategic Guidance

| Command | Description |
|---------|-------------|
| `/research "topic"` | Background research (runs in parallel) |
| `/consult-oracle "question"` | Strategic architecture guidance |

### Bug Fixes

| Command | Description |
|---------|-------------|
| `/create-fix "problem"` | Systematic fix with root cause analysis |
| `/yoyo-fixes` | List all bug fix records |

### Design System

| Command | Description |
|---------|-------------|
| `/design-init` | Initialize design system |
| `/design-audit` | Check design compliance |
| `/design-fix` | Fix design violations |
| `/design-component "name"` | Create validated component |

### Code Review

| Command | Description |
|---------|-------------|
| `/yoyo-review --devil "scope"` | Devil's advocate review |
| `/yoyo-review --security "scope"` | Security-focused review |
| `/yoyo-review --performance "scope"` | Performance review |

### Status & Help

| Command | Description |
|---------|-------------|
| `/yoyo-status` | Project status dashboard |
| `/yoyo-help` | Display all commands and usage |

---

## Yoyo AI (Business and Personal AI Assistant)

**Yoyo AI** is a Business and Personal AI Assistant powered by [OpenClaw](https://github.com/openclaw). It runs as a background daemon alongside your development environment.

### Commands

**YoYo Commands** (Custom functionality):
```bash
yoyo-ai --start         # Start the OpenClaw daemon
yoyo-ai --stop          # Stop the daemon
yoyo-ai --status        # Check daemon health and port
yoyo-ai --update        # Update OpenClaw to latest version
yoyo-ai --doctor        # Diagnose OpenClaw issues
yoyo-ai --theme-apply   # Apply YoYo branding to dashboard
yoyo-ai --theme-remove  # Restore OpenClaw defaults
yoyo-ai --help          # Show all available commands
```

**OpenClaw Commands** (Pass-through to OpenClaw):
```bash
yoyo-ai onboard         # Interactive setup wizard
yoyo-ai config          # Configure credentials & settings
yoyo-ai models          # Manage AI models
yoyo-ai channels        # Manage messaging channels
yoyo-ai skills          # Manage AI skills
yoyo-ai message         # Send messages via channels
yoyo-ai dashboard       # Open web control panel
yoyo-ai logs            # View gateway logs
yoyo-ai agent           # Run agent commands

# All OpenClaw commands work with yoyo-ai
# Run 'yoyo-ai --help' for full list
```

**Examples:**
```bash
# Configure WhatsApp channel
yoyo-ai channels login

# Send a message
yoyo-ai message send --target +1234567890 --message "Hello from YoYo AI"

# Manage AI models
yoyo-ai models

# View logs
yoyo-ai logs --follow
```

### Configuration

Yoyo AI config is stored in `.yoyo-dev/config.yml` under the `yoyo_ai` key:

```yaml
yoyo_ai:
  enabled: true
  openclaw:
    installed: true
    port: 18789
    daemon:
      auto_start: false
      service_type: "auto"
    update:
      auto_check: true
```

### Installation

OpenClaw is installed automatically during `yoyo-init` (step 9) as a mandatory component. If installation fails (e.g., Node.js < 22), install manually:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### Dashboard Customization

The YoYo Dev AI theme is automatically applied to the OpenClaw dashboard during installation, giving it an orange/gold color scheme and YoYo branding to match the rest of the platform.

**Theme Management:**

```bash
# Re-apply YoYo theme (after OpenClaw updates)
yoyo-ai --theme-apply

# Restore original OpenClaw branding
yoyo-ai --theme-remove

# Check theme status
yoyo-ai --doctor
```

The theme customization:
- Updates colors to match YoYo's orange/gold palette (`#E85D04`, `#D29922`)
- Applies JetBrains Mono typography
- Changes page title to "YoYo Dev AI"
- Replaces favicon with YoYo logo
- Persists across OpenClaw updates (auto-reapplied)
- Non-invasive (doesn't modify OpenClaw source)
- Fully reversible

**Technical Details:**

The theme works by injecting a custom CSS file (`yoyo-theme.css`) into OpenClaw's control panel HTML. The original `index.html` is backed up before modification. Theme files are located in `setup/openclaw-theme/`.

---

## Multi-Agent System

### How It Works

```
User Request
     │
     ▼
┌────────────────┐
│ Intent         │ Classifies: Planning │ Implementation │ Research │ Debug
│ Classification │
└────────────────┘
     │
     ▼
┌────────────────┐
│ Yoyo-AI        │ Primary orchestrator - coordinates all agents
│ Orchestrator   │
└────────────────┘
     │
     ├──────────────────────────────────────────────────────┐
     ▼                    ▼                    ▼            ▼
┌─────────┐        ┌───────────┐        ┌─────────┐   ┌──────────┐
│ Oracle  │        │ Librarian │        │ Explore │   │ Frontend │
│ (0.1°)  │        │ (0.3°)    │        │ (0.5°)  │   │ (0.7°)   │
└─────────┘        └───────────┘        └─────────┘   └──────────┘
 Strategy           Research             Codebase      UI/UX
 Debugging          Docs/GitHub          Search        Components
```

### Agents

| Agent | Description | When Used |
|-------|-------------|-----------|
| **Oracle** | Strategic advisor for architecture decisions | 3+ failures, complex debugging |
| **Librarian** | External research (docs, GitHub, web) | Background research tasks |
| **Explore** | Internal codebase search | File discovery, pattern matching |
| **Frontend Engineer** | UI/UX specialist with auto-delegation | Detected UI work (style, layout) |
| **Document Writer** | Technical writing | README, docs, guides |
| **Implementer** | TDD-based code implementation | Feature development |

### Auto-Delegation Examples

**Frontend Work Detection:**
```
Task: "Update button styling to match design system"
-> Detects: "style", "button" keywords
-> Auto-delegates to Frontend Engineer
-> Implements + tests + a11y check
```

**Background Research:**
```
Task: "Add Convex authentication"
-> Fires: background research with Librarian
-> Continue working on other subtasks
-> Retrieve results when needed
```

**Oracle Escalation:**
```
Attempt 1: Test fails -> Retry with improved approach
Attempt 2: Test fails -> Try different approach
Attempt 3: Test fails -> Escalate to Oracle
-> Oracle analyzes root cause
-> Apply Oracle's recommendation
```

---

## GUI Dashboard

Launch the browser GUI:

```bash
yoyo-dev    # Claude Code + GUI
yoyo-gui    # GUI standalone
```

**Dashboard URL:** `http://localhost:5173`

### Features

| Section | Description |
|---------|-------------|
| **Dashboard** | Project status, task progress, system health |
| **Specifications** | Browse and manage feature specs |
| **Tasks** | Kanban board with task status |
| **Fixes** | Bug fix records and analysis |
| **Memory** | Persistent context browser |
| **Agents** | Agent configurations and status |
| **Help** | Interactive documentation |

---

## Project Structure

```
your-project/
├── .yoyo-dev/                  # Framework files
│   ├── product/                # Mission, roadmap, tech-stack
│   ├── specs/                  # Feature specifications
│   │   └── YYYY-MM-DD-name/
│   │       ├── spec.md         # Full requirements
│   │       ├── spec-lite.md    # Condensed for AI
│   │       ├── tasks.md        # Task breakdown
│   │       └── state.json      # Workflow state
│   ├── fixes/                  # Bug fix documentation
│   ├── recaps/                 # Development recaps
│   ├── patterns/               # Saved patterns library
│   ├── memory/                 # Persistent memory blocks
│   ├── instructions/core/      # AI workflow instructions
│   └── standards/              # Development standards
│
├── .claude/                    # Claude Code integration
│   ├── commands/               # Slash commands (*.md)
│   └── agents/                 # Agent configurations
│
└── .mcp.json                   # MCP server configuration
```

---

## Configuration

### Main Config: `.yoyo-dev/config.yml`

```yaml
yoyo_dev_version: 7.0.0

orchestration:
  enabled: true
  global_mode: true
  confidence_threshold: 0.6

agents:
  default_model: anthropic/claude-opus-4-5

  yoyo_ai:
    enabled: true
    temperature: 1.0

  oracle:
    enabled: true
    temperature: 0.1

  librarian:
    enabled: true
    temperature: 0.3

  frontend_engineer:
    enabled: true
    temperature: 0.7

workflows:
  task_execution:
    orchestrator: yoyo-ai
    failure_recovery:
      max_attempts: 3
      escalate_to: oracle
    frontend_delegation:
      enabled: true

# Yoyo AI (OpenClaw Business and Personal AI Assistant)
yoyo_ai:
  enabled: true
  openclaw:
    installed: true
    port: 18789
    daemon:
      auto_start: false
      service_type: "auto"
    update:
      auto_check: true
```

> **Full Config Reference:** [docs/configuration.md](docs/configuration.md)

---

## Updating

```bash
# Update to latest version
yoyo-update

# Preserve customizations
yoyo-update --no-overwrite

# Skip MCP check
yoyo-update --skip-mcp-check

```

**Protected Files** (never overwritten):
- Product docs, specs, fixes, recaps, patterns

---

## Testing

```bash
# TypeScript tests
npm test

# With coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

---

## Troubleshooting

<details>
<summary><strong>Global command not found</strong></summary>

```bash
# Reinstall global commands
~/.yoyo-dev-base/setup/install-global-command.sh

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```
</details>

<details>
<summary><strong>Full diagnostic</strong></summary>

```bash
yoyo-doctor --verbose
```
</details>

<details>
<summary><strong>MCP servers not working</strong></summary>

```bash
# Verify Docker Desktop running
docker info

# Check MCP servers
docker mcp server ls

# Reconnect Claude
docker mcp client connect claude-code
```
</details>

<details>
<summary><strong>GUI not starting</strong></summary>

```bash
# Check if port is in use
lsof -i :5173

# Kill orphaned process
pkill -f "vite"

# Restart
yoyo-dev
```
</details>

> **Full Troubleshooting:** [docs/installation/troubleshooting.md](docs/installation/troubleshooting.md)

---

## Documentation

### Getting Started
- [Installation Guide](docs/INSTALLATION.md)
- [Quick Start](docs/QUICK-START.md)
- [Architecture](docs/ARCHITECTURE.md)

### Core Features
- [Command Reference](docs/commands.md)
- [Multi-Agent Orchestration](docs/multi-agent-orchestration.md)
- [GUI Dashboard](docs/gui-dashboard.md)
- [Memory System](docs/memory-system.md)

### In-Project Docs
- `.yoyo-dev/standards/best-practices.md`
- `.yoyo-dev/standards/tech-stack.md`
- `.yoyo-dev/standards/design-system.md`

---

## Best Practices

| Category | Recommendation |
|----------|----------------|
| **Workflow** | Let Yoyo-AI orchestrate - use `/execute-tasks` |
| **Research** | Fire `/research` early - results ready when needed |
| **Architecture** | Use `/consult-oracle` for decisions |
| **Delegation** | Trust auto-delegation for frontend work |
| **Progress** | Monitor todos via browser GUI |
| **Quality** | TDD approach - tests first |
| **Code Style** | Keep it simple - fewest lines possible |

---

## Contributing

```bash
# Clone & setup
git clone https://github.com/daverjorge46/yoyo-dev-ai.git
cd yoyo-dev-ai
npm install

# Run tests
npm test

# Submit PR
# 1. Create feature branch
# 2. Make changes + tests
# 3. Update docs
# 4. Submit pull request
```

---

## Support

| Resource | Link |
|----------|------|
| **GitHub Issues** | [yoyo-dev-ai/issues](https://github.com/daverjorge46/yoyo-dev-ai/issues) |
| **Discussions** | [yoyo-dev-ai/discussions](https://github.com/daverjorge46/yoyo-dev-ai/discussions) |
| **Claude Code Docs** | [docs.claude.com](https://docs.claude.com/en/docs/claude-code) |

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

<div align="center">

### Built with

[![Claude Code](https://img.shields.io/badge/Claude-Code-8B5CF6?style=for-the-badge)](https://claude.com/claude-code)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

**Version:** 7.0.0 · **Status:** Production Ready · **Last Updated:** 2026-01-31

*Your AI learns. Your AI remembers. Your AI evolves.*

</div>
