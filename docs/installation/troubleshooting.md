# Yoyo Dev Troubleshooting Guide

Comprehensive solutions to common issues.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [TUI Dashboard Issues](#tui-dashboard-issues)
3. [Split View Issues](#split-view-issues)
4. [MCP Server Issues](#mcp-server-issues)
5. [Multi-Agent Issues (v5.0)](#multi-agent-issues-v50)
6. [Performance Issues](#performance-issues)
7. [Git & GitHub Issues](#git--github-issues)
8. [General Issues](#general-issues)

---

## Installation Issues

### Installation Script Fails

**Symptom:** `project.sh` fails with errors

**Solutions:**

1. **Check internet connection:**
   ```bash
   curl -I https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/project.sh
   ```

2. **Try manual download:**
   ```bash
   # Download script
   wget https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main/setup/project.sh

   # Make executable
   chmod +x project.sh

   # Run
   bash project.sh --no-base --claude-code
   ```

3. **Check permissions:**
   ```bash
   # Ensure you have write access to current directory
   ls -ld .
   ```

### Global Command Not Installing

**Symptom:** `yoyo` command not found after installation

**Solutions:**

1. **Reinstall global command:**
   ```bash
   bash .yoyo-dev/setup/install-global-command.sh
   ```

2. **Check if created:**
   ```bash
   ls -la ~/bin/yoyo
   ls -la ~/.local/bin/yoyo
   ```

3. **Add to PATH:**
   ```bash
   # Add to ~/.bashrc
   echo 'export PATH="$HOME/bin:$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. **Verify PATH:**
   ```bash
   echo $PATH | grep -o "$HOME/bin"
   ```

### Dependencies Missing

**Symptom:** Python/Node errors during installation

**Solutions:**

1. **Install Python dependencies:**
   ```bash
   pip3 install --user textual watchdog pyyaml
   ```

2. **Install Node dependencies (for GUI):**
   ```bash
   cd .yoyo-dev/gui
   npm install
   ```

3. **Check versions:**
   ```bash
   python3 --version  # Should be 3.8+
   node --version     # Should be 18+
   npm --version      # Should be 9+
   ```

---

## TUI Dashboard Issues

### TUI Won't Launch

**Symptom:** Error when running `yoyo` or `python3 lib/yoyo-tui.py`

**Solutions:**

1. **Check Python dependencies:**
   ```bash
   python3 -c "import textual; import watchdog; import yaml"
   ```

2. **Reinstall dependencies:**
   ```bash
   pip3 install --user --force-reinstall textual watchdog pyyaml
   ```

3. **Test TUI instantiation:**
   ```bash
   python3 -c "
   import sys
   sys.path.insert(0, 'lib')
   from yoyo_tui_v3.app import create_app
   app = create_app()
   print('✅ TUI OK')
   "
   ```

4. **Check terminal compatibility:**
   ```bash
   # Yoyo TUI requires Unicode support
   locale | grep UTF-8

   # If not UTF-8, add to ~/.bashrc:
   export LC_ALL=en_US.UTF-8
   export LANG=en_US.UTF-8
   ```

### TUI Crashes on Launch

**Symptom:** TUI starts then immediately crashes

**Solutions:**

1. **Check terminal size:**
   ```bash
   # TUI requires minimum 80x24, Split View requires 120x30
   tput cols  # Should be >= 80 (120 for split view)
   tput lines # Should be >= 24 (30 for split view)
   ```

2. **Clear cache:**
   ```bash
   rm -rf ~/.cache/yoyo-dev
   rm -rf .yoyo-dev/.cache
   ```

3. **Check for corrupt config:**
   ```bash
   # Backup and reset config
   mv .yoyo-dev/config.yml .yoyo-dev/config.yml.backup
   yoyo  # Will regenerate default config
   ```

4. **Run in debug mode:**
   ```bash
   TEXTUAL_DEBUG=1 yoyo 2>&1 | tee debug.log
   ```

### TUI Data Not Updating

**Symptom:** Dashboard shows stale data

**Solutions:**

1. **Manual refresh:**
   ```bash
   # Press 'r' in TUI to force refresh
   ```

2. **Check file watcher:**
   ```bash
   # Verify watchdog is working
   python3 -c "from watchdog.observers import Observer; print('✅ Watchdog OK')"
   ```

3. **Restart TUI:**
   ```bash
   # Quit (q) and relaunch
   yoyo
   ```

---

## Split View Issues

### Split View Not Launching

**Symptom:** Only TUI launches, no Claude pane

**Solutions:**

1. **Check if Claude Code installed:**
   ```bash
   which claude
   # If not found, install from https://claude.ai/download
   ```

2. **Check split view enabled:**
   ```bash
   grep -A 5 "split_view:" .yoyo-dev/config.yml
   # Verify enabled: true
   ```

3. **Use TUI-only mode:**
   ```bash
   yoyo --no-split
   ```

4. **Check fallback delay:**
   ```yaml
   # In .yoyo-dev/config.yml
   split_view:
     claude:
       fallback_delay: 3  # Try increasing to 5
   ```

### Terminal Too Small Error

**Symptom:** "Terminal too small for split view"

**Solutions:**

1. **Resize terminal:**
   - Minimum: 120 columns x 30 lines
   - Check current: `tput cols && tput lines`

2. **Use smaller split ratio:**
   ```bash
   yoyo --split-ratio 0.3  # 30/70 split instead of 40/60
   ```

3. **Use TUI-only:**
   ```bash
   yoyo --no-split
   ```

### Pane Borders Not Rendering

**Symptom:** Borders are broken characters or missing

**Solutions:**

1. **Check terminal Unicode support:**
   ```bash
   locale | grep UTF-8
   ```

2. **Set UTF-8 locale:**
   ```bash
   # Add to ~/.bashrc
   export LC_ALL=en_US.UTF-8
   export LANG=en_US.UTF-8
   export LANGUAGE=en_US.UTF-8
   ```

3. **Try different terminal:**
   - ✅ GNOME Terminal
   - ✅ Konsole
   - ✅ Alacritty
   - ✅ Kitty
   - ✅ Terminator

### Keyboard Shortcuts Not Working

**Symptom:** `Ctrl+B →` doesn't switch panes

**Solutions:**

1. **Check if bound elsewhere:**
   ```bash
   # Try alternative: use mouse to click on pane
   ```

2. **Remap shortcuts:**
   ```yaml
   # In .yoyo-dev/config.yml
   split_view:
     shortcuts:
       switch_focus: alt+arrow  # Change from ctrl+b+arrow
   ```

3. **Use `--no-split` and separate terminals:**
   ```bash
   # Terminal 1
   claude

   # Terminal 2
   yoyo --no-split
   ```

---

## MCP Server Issues

### Docker Not Found

**Symptom:** "docker: command not found"

**Solutions:**

1. **Install Docker Desktop:**
   ```bash
   # Download from https://www.docker.com/products/docker-desktop/
   # Follow installation instructions for your OS
   ```

2. **Verify installation:**
   ```bash
   docker --version  # Should be 4.32+
   ```

### Docker Not Running

**Symptom:** "Cannot connect to Docker daemon"

**Solutions:**

1. **Start Docker Desktop:**
   ```bash
   # On Linux
   systemctl start docker

   # On macOS/Windows
   # Open Docker Desktop application
   ```

2. **Verify Docker is running:**
   ```bash
   docker info
   ```

3. **Check Docker daemon:**
   ```bash
   sudo systemctl status docker  # Linux only
   ```

### MCP Toolkit Not Enabled

**Symptom:** "docker mcp: not a docker command"

**Solutions:**

1. **Enable MCP Toolkit:**
   - Open Docker Desktop
   - Go to Settings → Beta features
   - Enable "MCP Toolkit"
   - Restart Docker Desktop

2. **Verify MCP commands:**
   ```bash
   docker mcp --help
   ```

### MCP Servers Not Starting

**Symptom:** `docker mcp server ls` shows empty or errors

**Solutions:**

1. **Enable servers manually:**
   ```bash
   docker mcp server enable playwright
   docker mcp server enable github-official
   docker mcp server enable duckduckgo
   docker mcp server enable filesystem
   ```

2. **Check server status:**
   ```bash
   docker mcp server inspect playwright
   ```

3. **Restart Docker MCP Gateway:**
   ```bash
   docker mcp gateway restart
   ```

### Claude Not Connected to MCP Gateway

**Symptom:** MCP tools not available in Claude

**Solutions:**

1. **Verify Claude connected:**
   ```bash
   docker mcp client list
   # Should show "claude-code"
   ```

2. **Reconnect Claude:**
   ```bash
   docker mcp client connect claude-code
   ```

3. **Check `.mcp.json`:**
   ```bash
   cat .mcp.json
   # Should have MCP_DOCKER entry
   ```

4. **Regenerate `.mcp.json`:**
   ```bash
   bash .yoyo-dev/setup/docker-mcp-setup.sh
   ```

### GitHub OAuth Failing

**Symptom:** Cannot authorize github-official MCP server

**Solutions:**

1. **Clear existing authorization:**
   ```bash
   docker mcp oauth revoke github-official
   ```

2. **Re-authorize:**
   ```bash
   docker mcp oauth authorize github-official
   # Follow browser OAuth flow
   ```

3. **Check scopes granted:**
   - Ensure you grant access to necessary repositories
   - May need to authorize for organization repos separately

---

## Multi-Agent Issues (v5.0)

### Yoyo-AI Not Orchestrating

**Symptom:** Tasks execute with legacy workflow instead of Yoyo-AI

**Solutions:**

1. **Check orchestrator setting:**
   ```bash
   grep -A 5 "task_execution:" .yoyo-dev/config.yml
   # Should show orchestrator: yoyo-ai
   ```

2. **Explicitly use Yoyo-AI:**
   ```bash
   /execute-tasks --orchestrator yoyo-ai
   ```

3. **Verify agent files exist:**
   ```bash
   ls .claude/agents/yoyo-ai.md
   ls .claude/agents/oracle.md
   ls .claude/agents/librarian.md
   ```

### Background Tasks Not Running

**Symptom:** Research tasks don't fire or complete

**Solutions:**

1. **Check background tasks enabled:**
   ```yaml
   # In .yoyo-dev/config.yml
   background_tasks:
     enabled: true
   ```

2. **Increase timeout:**
   ```yaml
   background_tasks:
     idle_timeout: 600000  # 10 minutes
   ```

3. **Check task status:**
   - Use `/tasks` command in Claude to see running background tasks

### Oracle Not Being Consulted

**Symptom:** No Oracle escalation after 3 failures

**Solutions:**

1. **Check failure recovery enabled:**
   ```yaml
   # In .yoyo-dev/config.yml
   workflows:
     failure_recovery:
       enabled: true
       max_attempts: 3
       escalate_to: oracle
   ```

2. **Manually consult Oracle:**
   ```bash
   /consult-oracle "Explain the root cause of [issue]"
   ```

### Frontend Delegation Not Working

**Symptom:** Frontend tasks not auto-delegated

**Solutions:**

1. **Check delegation enabled:**
   ```yaml
   # In .yoyo-dev/config.yml
   workflows:
     frontend_delegation:
       enabled: true
   ```

2. **Use keywords:** Ensure task description contains frontend keywords (style, css, tailwind, button, etc.)

3. **Manually delegate:**
   - Yoyo-AI will still implement if delegation fails

4. **Disable if unwanted:**
   ```bash
   /execute-tasks --no-delegation
   ```

---

## Performance Issues

### Slow Startup

**Symptom:** TUI takes >5 seconds to launch

**Solutions:**

1. **Clear cache:**
   ```bash
   rm -rf ~/.cache/yoyo-dev
   rm -rf .yoyo-dev/.cache
   ```

2. **Disable GUI:**
   ```bash
   yoyo --no-gui
   ```

3. **Check specs/fixes count:**
   ```bash
   # Too many specs can slow down parsing
   ls -1 .yoyo-dev/specs/ | wc -l
   ls -1 .yoyo-dev/fixes/ | wc -l
   ```

4. **Archive old specs:**
   ```bash
   mkdir -p .yoyo-dev/specs-archive
   mv .yoyo-dev/specs/2024-* .yoyo-dev/specs-archive/
   ```

### Slow Refresh

**Symptom:** TUI takes long to update after file changes

**Solutions:**

1. **Reduce refresh interval:**
   ```yaml
   # In .yoyo-dev/config.yml (if option exists)
   refresh_interval: 5000  # milliseconds
   ```

2. **Manual refresh:**
   - Press `r` in TUI

3. **Check file watcher:**
   ```bash
   # Too many files can slow down watchdog
   find . -type f | wc -l
   ```

---

## Git & GitHub Issues

### Git Commands Failing

**Symptom:** Git workflow errors in `/execute-tasks`

**Solutions:**

1. **Check git configured:**
   ```bash
   git config user.name
   git config user.email
   ```

2. **Configure git:**
   ```bash
   git config user.name "Your Name"
   git config user.email "your@email.com"
   ```

3. **Check remote:**
   ```bash
   git remote -v
   ```

### PR Creation Failing

**Symptom:** Cannot create PR via git-workflow agent

**Solutions:**

1. **Check GitHub CLI installed:**
   ```bash
   gh --version
   ```

2. **Authenticate GitHub CLI:**
   ```bash
   gh auth login
   ```

3. **Check permissions:**
   ```bash
   gh auth status
   ```

---

## General Issues

### Command Not Found: `/create-new`

**Symptom:** Slash commands don't work in Claude

**Solutions:**

1. **Verify files exist:**
   ```bash
   ls .claude/commands/create-new.md
   ```

2. **Reload Claude:**
   - Quit and restart Claude Code CLI

3. **Check Claude Code version:**
   ```bash
   claude --version
   # Update if needed
   ```

### Tests Failing

**Symptom:** `pytest` fails or shows errors

**Solutions:**

1. **Install test dependencies:**
   ```bash
   pip3 install pytest pytest-cov
   ```

2. **Run specific test:**
   ```bash
   pytest tests/widgets/test_status_bar.py -v
   ```

3. **Check Python version:**
   ```bash
   python3 --version  # Should be 3.8+
   ```

4. **Recreate virtual environment:**
   ```bash
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pytest tests/ -v
   ```

---

## Getting Help

**Still having issues?**

1. **Check logs:**
   ```bash
   # TUI logs
   cat ~/.cache/yoyo-dev/tui.log

   # GUI logs (if applicable)
   cat ~/.cache/yoyo-dev/gui.log
   ```

2. **Create issue:**
   - https://github.com/daverjorge46/yoyo-dev-ai/issues
   - Include: OS, versions, error messages, steps to reproduce

3. **Check discussions:**
   - https://github.com/daverjorge46/yoyo-dev-ai/discussions

4. **Read docs:**
   - [README](../../README.md)
   - [CLAUDE.md](../../CLAUDE.md)
   - [Quick Start](quick-start.md)

---

**Last Updated:** 2025-12-29
**Version:** 5.0.0
