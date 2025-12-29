# Yoyo Dev Quick Start Guide

Get up and running with Yoyo Dev in 5 minutes.

---

## Prerequisites

- **Claude Code CLI** installed ([Download](https://claude.ai/download))
- **Docker Desktop 4.32+** with MCP Toolkit enabled ([Download](https://www.docker.com/products/docker-desktop/))
- **Linux** system (macOS/Windows support coming soon)

---

## Step 1: Install Yoyo Dev (2 minutes)

### Option A: Direct from GitHub (Recommended)

```bash
# Navigate to your project
cd /path/to/your/project

# Install Yoyo Dev
curl -L https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/project.sh | bash -s -- --no-base --claude-code
```

### Option B: From Base Installation

```bash
# If you have ~/.yoyo-dev/ base installation
~/.yoyo-dev/setup/project.sh --claude-code
```

**Installation creates:**
- `.yoyo-dev/` - Framework files (instructions, standards, setup)
- `.claude/` - Claude Code integration (commands, agents)
- `.mcp.json` - MCP server configuration

---

## Step 2: Install Global Command (30 seconds)

```bash
# From your project directory
bash .yoyo-dev/setup/install-global-command.sh
```

This creates a global `yoyo` command that works from any Yoyo Dev project.

**Verify:**
```bash
yoyo --help
```

---

## Step 3: Setup MCP Servers (Automatic)

### Enable Docker MCP Toolkit (One-Time Setup)

1. Open **Docker Desktop**
2. Go to **Settings → Beta features**
3. Enable **"MCP Toolkit"**
4. **Restart Docker Desktop**

### MCP Servers Install Automatically

**Good news!** MCP servers are now installed automatically during project setup.

The installation script automatically enables:
- `playwright` - Browser automation
- `github-official` - GitHub integration
- `duckduckgo` - Web search
- `filesystem` - File system access

**To skip automatic installation** (optional):
```bash
curl -L https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/project.sh | bash -s -- --no-base --claude-code --no-auto-mcp
```

**Verify installation:**
```bash
docker mcp server ls
```

**Manual installation** (if skipped):
```bash
bash .yoyo-dev/setup/docker-mcp-setup.sh
```

---

## Step 4: Launch Yoyo Dev (10 seconds)

```bash
# Launch TUI + Claude + GUI (full experience)
yoyo

# OR TUI + Claude without browser GUI
yoyo --no-gui

# OR TUI only (no Claude, no GUI)
yoyo --no-split
```

**You should see:**
- **Left**: Claude Code CLI (40% width)
- **Right**: Yoyo TUI Dashboard (60% width)

**Keyboard shortcuts:**
- `Ctrl+B →` - Switch focus between panes
- `?` - Help (in TUI)
- `q` - Quit (in TUI)

---

## Step 5: Create Your First Feature (2 minutes)

### Initialize Product

In Claude Code pane:
```
/plan-product
```

Answer the questions to set up your product mission and roadmap.

### Create a Feature

```
/create-new "Add user authentication"
```

Yoyo-AI will:
1. Fire background research on authentication best practices
2. Ask clarifying questions via spec-shaper
3. Create comprehensive specification
4. Generate strategic task breakdown

### Execute the Feature

```
/execute-tasks
```

Yoyo-AI orchestrates:
- ✅ Research results (from librarian agent)
- ✅ Auto-delegate UI work to frontend-engineer
- ✅ Implement with TDD approach
- ✅ Auto-escalate to Oracle if 3+ failures
- ✅ Run all tests
- ✅ Create PR

**Watch progress in real-time** in the TUI dashboard!

---

## Quick Command Reference

```bash
# Product setup
/plan-product              # New product
/analyze-product           # Existing product

# Development
/create-new "feature"      # Create + execute
/execute-tasks             # Multi-agent execution (v5.0)
/create-fix "bug"          # Systematic bug fix

# Research & guidance (v5.0)
/research "topic"          # Background research
/consult-oracle "question" # Strategic advice

# TUI dashboard
yoyo                       # Launch full experience
yoyo --no-gui              # Without browser GUI
yoyo --no-split            # TUI only
```

---

## Next Steps

1. **Read the full guide:** [README.md](../../README.md)
2. **Explore multi-agent system:** [Multi-Agent Guide](../features/multi-agent-system.md)
3. **Configure settings:** `.yoyo-dev/config.yml`
4. **Check troubleshooting:** [Troubleshooting Guide](troubleshooting.md)

---

## Common Issues

### Claude Code not installed
```bash
# Download from
https://claude.ai/download

# Verify
claude --version
```

### Docker not running
```bash
# Check status
docker info

# Start Docker Desktop app
```

### MCP Toolkit not enabled
```bash
# Verify MCP commands work
docker mcp --help

# If error, enable in Docker Desktop:
# Settings → Beta features → MCP Toolkit
```

### Global command not found
```bash
# Reinstall
bash .yoyo-dev/setup/install-global-command.sh

# Add to PATH
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

**Total Time:** ~5 minutes
**Status:** Ready to build features!

📖 **Full Documentation:** [Yoyo Dev README](../../README.md)
