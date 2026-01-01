# Installation Guide

> Yoyo Dev v5.0.0 Installation & Setup

This guide covers the complete installation process for Yoyo Dev, including prerequisites, MCP server setup, and verification steps.

---

## Prerequisites

Before installing Yoyo Dev, ensure you have the following:

### Required Software

1. **Docker Desktop 4.32+** with MCP Toolkit enabled
   - Download: https://www.docker.com/products/docker-desktop/
   - Required for containerized MCP servers

2. **Claude Code CLI**
   - Download: https://claude.ai/download
   - Required for AI-assisted development

3. **Node.js 22 LTS**
   - Download: https://nodejs.org/
   - Required for GUI dashboard and memory system

4. **Python 3.10+**
   - Required for TUI dashboard
   - Usually pre-installed on Linux/macOS

5. **Git**
   - Required for version control workflows
   - Usually pre-installed on Linux/macOS

### Verify Prerequisites

```bash
# Check Docker Desktop (must be 4.32+)
docker --version
# Output: Docker version 4.32.0 or higher

# Check Docker is running
docker info
# Should show server information (not an error)

# Check MCP Toolkit is available
docker mcp --help
# Should show MCP commands (not "not a docker command")

# Check Claude Code CLI
claude --version
# Output: claude-code version X.X.X

# Check Node.js (must be 22+)
node --version
# Output: v22.x.x

# Check Python (must be 3.10+)
python3 --version
# Output: Python 3.10.x or higher

# Check Git
git --version
# Output: git version X.X.X
```

### Enable Docker MCP Toolkit

If `docker mcp --help` fails, enable MCP Toolkit:

1. Open Docker Desktop application
2. Go to **Settings** → **Beta features**
3. Enable **"MCP Toolkit"**
4. Click **Apply & Restart**
5. Wait for Docker Desktop to restart
6. Verify: `docker mcp --help` now works

---

## Installation Methods

### Method 1: Quick Install (Recommended)

Install directly from GitHub without base installation:

```bash
curl -L https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/install.sh | bash -s -- --claude-code
```

This will:
1. Clone Yoyo Dev to `~/.yoyo-dev/`
2. Install required dependencies
3. Set up Claude Code integration
4. Install global `yoyo` command
5. Configure MCP servers automatically

### Method 2: Base Installation + Project Setup

If you want to reuse the framework across multiple projects:

**Step 1: Install base framework**

```bash
# Clone to ~/.yoyo-dev/
git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev

# Install dependencies
cd ~/.yoyo-dev
bash setup/install-deps.sh
```

**Step 2: Install in your project**

```bash
cd /path/to/your/project
~/.yoyo-dev/setup/install.sh --claude-code
```

### Installation Flags

| Flag | Description |
|------|-------------|
| `--claude-code` | Install Claude Code integration (required) |
| `--cursor` | Also install Cursor IDE support |
| `--no-auto-mcp` | Skip automatic MCP server installation |
| `--project-type=TYPE` | Use specific project configuration |
| `--overwrite-instructions` | Overwrite existing instructions |
| `--overwrite-standards` | Overwrite existing standards |

**Examples:**

```bash
# Install with Cursor support
~/.yoyo-dev/setup/install.sh --claude-code --cursor

# Install without automatic MCP setup
~/.yoyo-dev/setup/install.sh --claude-code --no-auto-mcp

# Install with custom project type
~/.yoyo-dev/setup/install.sh --claude-code --project-type=backend
```

---

## MCP Server Setup

Yoyo Dev uses Docker MCP Gateway to provide containerized MCP servers.

### Automatic MCP Installation (Default)

MCP servers are installed automatically during Yoyo Dev setup:

```bash
~/.yoyo-dev/setup/install.sh --claude-code
# Automatically installs: playwright, github-official, duckduckgo, filesystem
```

The installer will:
1. Verify Docker Desktop is running
2. Check MCP Toolkit is enabled
3. Connect Claude Code as MCP client
4. Enable recommended MCP servers
5. Report installation status

### Manual MCP Installation

If you need to set up MCP servers manually or troubleshoot:

```bash
# Run MCP setup script
~/.yoyo-dev/setup/docker-mcp-setup.sh

# Skip if Docker not available (optional)
~/.yoyo-dev/setup/docker-mcp-setup.sh --skip-if-no-docker

# Verbose output for debugging
~/.yoyo-dev/setup/docker-mcp-setup.sh --verbose
```

### Supported MCP Servers

Yoyo Dev enables these MCP servers by default:

| Server | Purpose | Container |
|--------|---------|-----------|
| **playwright** | Browser automation, E2E testing, screenshots | Isolated browser environment |
| **github-official** | Repository operations, issues, PRs | GitHub API access |
| **duckduckgo** | Web search for research | Isolated search environment |
| **filesystem** | File system access | Configured mount points |

### GitHub OAuth Authorization

The GitHub MCP server requires OAuth authorization to access repositories:

```bash
# Authorize GitHub access
docker mcp oauth authorize github-official

# This opens a browser for GitHub OAuth flow
# Grant access to repositories you want Claude to manage
```

**Note:** You'll need to authorize access to each repository you want Yoyo Dev to access.

### Individual MCP Server Commands

```bash
# List enabled servers
docker mcp server ls

# Enable specific server
docker mcp server enable playwright
docker mcp server enable github-official
docker mcp server enable duckduckgo
docker mcp server enable filesystem

# Disable server
docker mcp server disable playwright

# Inspect server details
docker mcp server inspect playwright

# Connect Claude Code as client
docker mcp client connect claude-code

# List connected clients
docker mcp client list

# Check MCP Gateway status
docker mcp gateway status
```

---

## Verify Installation

### Method 1: Check MCP Server List

```bash
docker mcp server ls
```

**Expected output (tabular format):**

```
NAME              IMAGE                    TAG
playwright        docker/mcp-playwright    latest
github-official   docker/mcp-github        latest
duckduckgo        docker/mcp-duckduckgo    latest
filesystem        docker/mcp-filesystem    latest
```

### Method 2: Check Project Configuration

```bash
# Verify .mcp.json exists in your project
cat .mcp.json
```

**Expected output:**

```json
{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"],
      "type": "stdio"
    }
  }
}
```

### Method 3: Launch TUI Dashboard

```bash
# Launch Yoyo TUI
yoyo --no-split
```

Check the Project Overview panel for:
- **MCP Status**: Should show "Docker MCP Gateway: 4 servers"
- No connection errors

### Method 4: Verify Global Command

```bash
# Check global yoyo command works
which yoyo
# Output: /home/username/bin/yoyo

yoyo --version
# Output: Yoyo Dev v5.0.0
```

---

## Post-Installation Setup

### Install Global Command (Optional)

If the `yoyo` command isn't globally available:

```bash
bash .yoyo-dev/setup/install-global-command.sh

# Add to PATH if needed
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Initialize Project Memory

```bash
# Initialize memory system for your project
claude /init
```

This scans your codebase and creates project-specific memory blocks.

### Launch Dashboard

```bash
# Launch TUI + Claude + GUI (default in v5.0)
yoyo

# Launch TUI + Claude without GUI
yoyo --no-gui

# Launch TUI only (no Claude, no GUI)
yoyo --no-split
```

### Verify GUI Dashboard

If GUI is enabled, it should be accessible at:

```
http://localhost:3456
```

Open in any modern browser (Chrome, Firefox, Safari, Edge).

---

## Troubleshooting

### Issue: "Docker not found"

**Symptoms:** Installation fails with "docker: command not found"

**Solution:**

```bash
# Install Docker Desktop from:
# https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version
```

### Issue: "Docker not running"

**Symptoms:** `docker info` returns an error

**Solution:**

```bash
# Start Docker Desktop application (GUI)
# Or on Linux:
systemctl start docker

# Verify Docker is running
docker info
```

### Issue: "MCP Toolkit not enabled"

**Symptoms:** `docker mcp --help` returns "not a docker command"

**Solution:**

1. Open Docker Desktop
2. Go to Settings → Beta features
3. Enable "MCP Toolkit"
4. Restart Docker Desktop
5. Verify: `docker mcp --help` now works

### Issue: "Claude Code not found"

**Symptoms:** Installation fails with "claude: command not found"

**Solution:**

```bash
# Install Claude Code CLI from:
# https://claude.ai/download

# Verify installation
claude --version
```

### Issue: "MCP servers not starting"

**Symptoms:** `docker mcp server ls` shows no servers or errors

**Solution:**

```bash
# Check Docker MCP Gateway status
docker mcp gateway status

# Restart specific server
docker mcp server disable playwright
docker mcp server enable playwright

# Re-run MCP setup
~/.yoyo-dev/setup/docker-mcp-setup.sh --verbose
```

### Issue: "Claude can't access MCP servers"

**Symptoms:** Claude Code doesn't see MCP tools

**Solution:**

```bash
# Verify Claude is connected as client
docker mcp client list

# If claude-code not listed, connect it
docker mcp client connect claude-code

# Verify .mcp.json exists in project
cat .mcp.json

# Restart Claude Code to reload MCP configuration
```

### Issue: "GitHub OAuth failed"

**Symptoms:** GitHub MCP server returns authorization errors

**Solution:**

```bash
# Clear existing authorization
docker mcp oauth revoke github-official

# Re-authorize
docker mcp oauth authorize github-official

# Follow browser flow to grant access
```

### Issue: "TUI won't launch"

**Symptoms:** `yoyo` command fails with Python errors

**Solution:**

```bash
# Install TUI dependencies
pip3 install --user textual watchdog pyyaml

# Test TUI directly
python3 -c "from lib.yoyo_tui_v3.app import create_app; create_app()"

# If still fails, check Python version
python3 --version  # Should be 3.10+
```

### Issue: "Global command not found"

**Symptoms:** `yoyo` command returns "command not found"

**Solution:**

```bash
# Re-install global command
bash .yoyo-dev/setup/install-global-command.sh

# Ensure ~/bin is in PATH
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
which yoyo
```

---

## Uninstallation

To completely remove Yoyo Dev:

```bash
# Remove global command
rm ~/bin/yoyo
rm ~/bin/yoyo-gui
rm ~/bin/yoyo-update

# Remove base installation
rm -rf ~/.yoyo-dev

# Remove project files
rm -rf .yoyo-dev
rm -rf .yoyo-dev/memory
rm -f .mcp.json

# Remove global memory (optional)
rm -rf ~/.yoyo-dev

# Disconnect Claude from MCP Gateway
docker mcp client disconnect claude-code

# Disable MCP servers (optional)
docker mcp server disable playwright
docker mcp server disable github-official
docker mcp server disable duckduckgo
docker mcp server disable filesystem
```

---

## Next Steps

- **[Quick Start Guide](QUICK-START.md)** - 5-minute tutorial
- **[Command Reference](commands.md)** - All slash commands
- **[Multi-Agent System](multi-agent-orchestration.md)** - Agent overview
- **[Architecture](ARCHITECTURE.md)** - System architecture

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
