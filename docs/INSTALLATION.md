# Installation Guide

> Yoyo Dev v6.2.0 Installation & Setup

This guide covers the complete installation process for Yoyo Dev.

---

## Installation Model

Yoyo Dev uses a **two-phase installation** model:

| Phase | Location | Purpose |
|-------|----------|---------|
| **BASE** | `~/.yoyo-dev-base` | Framework source (shared across all projects) |
| **PROJECT** | `.yoyo-dev/` | Project-specific data (specs, fixes, memory) |

```
~/.yoyo-dev-base/              ← BASE (install once)
├── instructions/
├── standards/
├── claude-code/
├── setup/
└── gui/

/path/to/your-project/
├── .yoyo-dev/                 ← PROJECT (per-project)
│   ├── instructions/          (copied from BASE)
│   ├── standards/             (copied from BASE)
│   ├── specs/                 (project-specific)
│   ├── fixes/                 (project-specific)
│   └── memory/                (project-specific)
├── .claude/                   ← Claude Code integration
│   ├── commands/
│   ├── agents/
│   └── hooks/
└── CLAUDE.md                  ← Project context for AI
```

---

## Quick Start

### Step 1: Install BASE (One-Time)

```bash
# Clone the framework to ~/.yoyo-dev-base
git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev-base

# Install global commands
~/.yoyo-dev-base/setup/install-global-command.sh
```

This creates the following commands:
- `yoyo` - Launch Claude Code + Browser GUI
- `yoyo-init` - Initialize Yoyo Dev in a project
- `yoyo-update` - Update Yoyo Dev installation
- `yoyo-gui` - Launch GUI standalone
- `yoyo-doctor` - Diagnose installation issues

### Step 2: Initialize PROJECT (Per-Project)

```bash
cd /path/to/your-project
yoyo-init --claude-code
```

### Step 3: Launch

```bash
yoyo
```

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Docker Desktop** | 4.32+ | MCP servers for browser automation, GitHub, search |
| **Claude Code CLI** | Latest | AI-assisted development |
| **Node.js** | 22 LTS | GUI dashboard |
| **Git** | Any | Version control |

### Verify Prerequisites

```bash
# Docker (4.32+)
docker --version

# Docker running
docker info

# MCP Toolkit enabled
docker mcp --help

# Claude Code CLI
claude --version

# Node.js (22+)
node --version

# Git
git --version
```

### Enable Docker MCP Toolkit

If `docker mcp --help` fails:

1. Open Docker Desktop
2. Go to **Settings** → **Beta features**
3. Enable **"MCP Toolkit"**
4. Click **Apply & Restart**

---

## Detailed Installation

### Method 1: Standard Installation (Recommended)

**Step 1: Install BASE**

```bash
git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev-base
~/.yoyo-dev-base/setup/install-global-command.sh
```

**Step 2: Initialize Project**

```bash
cd /path/to/your-project
yoyo-init --claude-code
```

**Step 3: Verify**

```bash
yoyo-doctor
```

### Method 2: All-in-One

If you haven't installed BASE yet, `yoyo-init` can do both:

```bash
cd /path/to/your-project
~/.yoyo-dev-base/setup/init.sh --install-base --claude-code
```

Or if you already have the repo cloned somewhere:

```bash
cd /path/to/your-project
/path/to/yoyo-dev-ai/setup/init.sh --install-base --claude-code
```

---

## Global Commands

| Command | Description |
|---------|-------------|
| `yoyo` | Launch Claude Code + Browser GUI |
| `yoyo --no-gui` | Launch Claude Code without GUI |
| `yoyo --help` | Show command reference |
| `yoyo-init` | Initialize Yoyo Dev in current project |
| `yoyo-init --install-base` | Install BASE first, then initialize |
| `yoyo-update` | Update Yoyo Dev installation |
| `yoyo-update --no-overwrite` | Update preserving customizations |
| `yoyo-gui` | Launch browser GUI standalone |
| `yoyo-doctor` | Diagnose installation issues |

### Installation Flags (yoyo-init)

| Flag | Description |
|------|-------------|
| `--claude-code` | Enable Claude Code integration (recommended) |
| `--cursor` | Enable Cursor IDE support |
| `--install-base` | Install BASE first, then initialize |
| `--no-auto-mcp` | Skip automatic MCP server installation |
| `--no-claude-md` | Skip CLAUDE.md generation |
| `--non-interactive` | Run without prompts |

---

## MCP Server Setup

### Automatic Setup (Default)

MCP servers are installed automatically during `yoyo-init`:

```bash
yoyo-init --claude-code
# Automatically configures: playwright, github-official, duckduckgo, filesystem
```

### Manual Setup

```bash
# List enabled servers
docker mcp server ls

# Enable servers
docker mcp server enable playwright
docker mcp server enable github-official
docker mcp server enable duckduckgo
docker mcp server enable filesystem

# Connect Claude Code
docker mcp client connect claude-code
```

### GitHub OAuth

```bash
docker mcp oauth authorize github-official
```

---

## Verify Installation

### Using yoyo-doctor

```bash
yoyo-doctor
```

This checks:
- BASE installation at `~/.yoyo-dev-base`
- PROJECT installation in current directory
- Global commands (yoyo, yoyo-init, etc.)
- Prerequisites (Docker, Claude Code, Node.js)
- MCP server configuration

### Manual Verification

```bash
# Check BASE
ls ~/.yoyo-dev-base/

# Check PROJECT
ls .yoyo-dev/

# Check commands
which yoyo yoyo-init yoyo-update

# Check MCP
docker mcp server ls
```

---

## Post-Installation

### Initialize Memory

In Claude Code:
```
/init
```

### Create Product Mission

```
/plan-product
```

### View All Commands

```
/yoyo-help
```

---

## Updating

### Update BASE

```bash
cd ~/.yoyo-dev-base
git pull
```

### Update PROJECT

```bash
cd /path/to/your-project
yoyo-update
```

### Update Flags

| Flag | Description |
|------|-------------|
| `--no-overwrite` | Preserve all customizations |
| `--no-overwrite-instructions` | Keep custom instructions |
| `--no-overwrite-commands` | Keep custom commands |
| `--regenerate-claude` | Regenerate CLAUDE.md |
| `--skip-mcp-check` | Skip MCP verification |

---

## Troubleshooting

### Issue: "BASE not found"

```bash
# Install BASE
git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev-base
~/.yoyo-dev-base/setup/install-global-command.sh
```

### Issue: "Command not found"

```bash
# Reinstall global commands
~/.yoyo-dev-base/setup/install-global-command.sh

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: "MCP Toolkit not enabled"

1. Open Docker Desktop
2. Settings → Beta features
3. Enable "MCP Toolkit"
4. Restart Docker

### Issue: "Claude Code not found"

Download from: https://claude.ai/download

### Issue: "GUI not starting"

```bash
# Check port
lsof -i :5173

# Kill orphaned process
pkill -f "vite"

# Restart
yoyo
```

### Full Diagnostic

```bash
yoyo-doctor --verbose
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `YOYO_BASE_DIR` | `~/.yoyo-dev-base` | Override BASE installation location |
| `YOYO_ORCHESTRATION` | `true` | Enable/disable global orchestration |

---

## Uninstallation

### Remove Global Commands

```bash
rm ~/.local/bin/yoyo
rm ~/.local/bin/yoyo-init
rm ~/.local/bin/yoyo-update
rm ~/.local/bin/yoyo-gui
rm ~/.local/bin/yoyo-doctor
```

### Remove BASE Installation

```bash
rm -rf ~/.yoyo-dev-base
```

### Remove PROJECT Installation

```bash
rm -rf .yoyo-dev
rm -rf .claude
rm -f .mcp.json
rm -f CLAUDE.md
```

### Disconnect MCP

```bash
docker mcp client disconnect claude-code
```

---

## Next Steps

- [Quick Start Guide](QUICK-START.md) - 5-minute tutorial
- [Command Reference](commands.md) - All slash commands
- [Multi-Agent System](multi-agent-orchestration.md) - Agent overview
- [Architecture](ARCHITECTURE.md) - System architecture

---

**Version:** 6.2.0
**Last Updated:** 2026-01-10
**Status:** Production Ready
