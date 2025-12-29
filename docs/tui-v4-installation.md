# TUI v4 Installation Guide

This guide covers installing and configuring the new TypeScript/Ink TUI (v4) for Yoyo Dev.

## Overview

TUI v4 is a complete rewrite of the Yoyo Dev terminal interface using TypeScript and Ink (React for CLIs). It offers:

- **60fps rendering** with React/Ink
- **<100MB memory footprint** (vs ~300MB for Python TUI)
- **Session persistence** - Saves your state between sessions
- **Real-time updates** - WebSocket-based state synchronization
- **Graceful fallback** - Auto-falls back to Python TUI v3 on errors

## Prerequisites

### Required

- **Node.js 22+ LTS** - For running TypeScript/Ink
- **npm** - For dependency management
- **Yoyo Dev base installation** - At `~/.yoyo-dev/` or `~/PROJECTS/yoyo-dev/`

### Optional

- **tsx** - For faster TypeScript execution (auto-installed with dependencies)
- **Docker Desktop 4.32+** - For MCP servers (recommended)

## Installation Methods

### Method 1: New Project Installation (Recommended)

When installing Yoyo Dev in a new project, choose TUI v4 during installation:

```bash
# Navigate to your project
cd /path/to/your-project

# Run installation script
~/.yoyo-dev/setup/project.sh --claude-code

# During installation, you'll see:
#
# Which TUI version would you like to use?
#
#   → 1. TUI v4 (TypeScript/Ink) (recommended)
#       Modern, 60fps, <100MB memory
#
#     2. TUI v3 (Python/Textual)
#       Stable, backward compatible
#
#   Choice [1]:
```

Press Enter to select TUI v4 (default), or type `2` for v3.

**Non-interactive installation:**

```bash
~/.yoyo-dev/setup/project.sh --claude-code --tui-v4 --non-interactive
```

### Method 2: Existing Project Upgrade

If you already have Yoyo Dev installed with TUI v3, upgrade to v4:

**Step 1: Edit configuration**

```bash
# Edit .yoyo-dev/config.yml
nano .yoyo-dev/config.yml
```

Find the `tui:` section and change version to `"v4"`:

```yaml
tui:
  version: "v4"  # Change from "v3" to "v4"
  symbols:
    enabled: true
  event_streaming:
    enabled: true
```

**Step 2: Install Node.js dependencies**

```bash
# Navigate to Yoyo Dev installation
cd ~/.yoyo-dev  # or ~/PROJECTS/yoyo-dev

# Install dependencies
npm install

# Verify installation
npx tsx --version
```

**Step 3: Enable backend API** (optional, for advanced features)

Add to `.yoyo-dev/config.yml`:

```yaml
backend:
  enabled: true
  port: 3457
  host: "localhost"
```

**Step 4: Test the installation**

```bash
# Navigate back to your project
cd /path/to/your-project

# Launch TUI v4
yoyo --tui-v4
```

If successful, you'll see the new TypeScript TUI. If it fails, it will automatically fall back to Python TUI v3.

### Method 3: Update Script

Use the update script to automatically configure TUI v4:

```bash
# Update Yoyo Dev to latest version
~/.yoyo-dev/setup/yoyo-update.sh

# During update, if TUI v4 is detected in config:
# - Pulls latest code
# - Updates TUI v4 dependencies (npm update)
# - Verifies installation
```

## Launching TUI v4

### Auto-Detection (Recommended)

The `yoyo` command automatically detects your TUI version from `.yoyo-dev/config.yml`:

```bash
# Launch with auto-detection
yoyo

# If config says "v4" → launches TypeScript TUI
# If config says "v3" → launches Python TUI
# If no config → defaults to Python TUI v3
```

### Force Specific Version

```bash
# Force TUI v4 (ignores config)
yoyo --tui-v4

# Force TUI v3 (ignores config)
yoyo --py
```

### Launch Options

```bash
# TUI v4 with GUI
yoyo                    # Default

# TUI v4 without GUI
yoyo --no-gui

# TUI v4 only (no Claude, no GUI)
yoyo --tui-v4 --no-split
```

## Verifying Installation

### Check TUI Version

```bash
# View configured version
cat .yoyo-dev/config.yml | grep -A2 "^tui:"

# Expected output:
# tui:
#   version: "v4"
#   symbols:
```

### Check Dependencies

```bash
# Navigate to Yoyo Dev installation
cd ~/.yoyo-dev

# Verify Node.js version
node --version  # Should be v22+

# Verify npm packages
npm list --depth=0 | grep -E "ink|zustand|chalk|tsx"

# Expected output:
# ├── ink@5.2.1
# ├── zustand@5.0.9
# ├── chalk@5.4.1
# └── tsx@4.19.2
```

### Check Backend API (Optional)

```bash
# Start backend server
cd ~/.yoyo-dev
npm run dev:server

# In another terminal, check if port 3457 is listening
lsof -i :3457

# Expected output:
# node    <pid>   user   <fd>u  IPv4  <...>  TCP localhost:3457 (LISTEN)
```

## Configuration

### TUI Configuration

Located in `.yoyo-dev/config.yml`:

```yaml
# TUI Configuration
tui:
  version: "v4"              # "v3" or "v4"
  symbols:
    enabled: true            # Use Unicode symbols
  event_streaming:
    enabled: true            # Real-time updates
```

### Backend API Configuration

For advanced features (WebSocket state sync, real-time logs):

```yaml
# Backend API (for TUI v4)
backend:
  enabled: true              # Enable WebSocket backend
  port: 3457                 # Backend port (GUI uses 3456)
  host: "localhost"          # Bind address
```

### User Preferences

Create `~/.yoyo-dev/tui-config.json` for custom settings:

```json
{
  "theme": "catppuccin-mocha",
  "layout": {
    "splitRatio": 0.4
  },
  "keybindings": {
    "help": "?",
    "quit": "q",
    "refresh": "r",
    "commandPalette": "/"
  }
}
```

## Keyboard Shortcuts

### Global Shortcuts

- **?** - Toggle help overlay
- **q** - Quit application
- **r** - Refresh data
- **/** - Open command palette
- **Esc** - Close modals/overlays

### Navigation

- **j/k** - Navigate up/down in task list
- **h/l** or **Tab** - Switch focus between panels
- **g/G** - Jump to top/bottom
- **Enter** - Expand/collapse task group
- **Space** - Select task

### Execution Panel

- **Ctrl+D** - Scroll down (page down)
- **Ctrl+U** - Scroll up (page up)

## Troubleshooting

### Issue: "TUI v4 configured but not available"

**Cause:** Node.js not installed or dependencies missing.

**Solution:**

```bash
# Install Node.js 22 LTS
# Visit: https://nodejs.org/

# Install dependencies
cd ~/.yoyo-dev
npm install

# Verify tsx is installed
npx tsx --version
```

### Issue: "tsx not found"

**Cause:** tsx binary not in PATH or not installed globally.

**Solution:**

```bash
# Option 1: Install tsx globally
npm install -g tsx

# Option 2: Use local tsx (installed with npm install)
cd ~/.yoyo-dev
npx tsx src/tui-v4/index.tsx
```

### Issue: TUI crashes immediately

**Cause:** Runtime error in TypeScript code.

**Check error log:**

```bash
# View error log
cat .yoyo-dev/tui-errors.log

# Example error:
# [2025-12-29T10:30:45.123Z] Uncaught Exception
# Error: Cannot find module './components/Layout.js'
```

**Solution:**

The TUI should automatically fall back to Python TUI v3. If not:

```bash
# Force Python TUI
yoyo --py

# Or disable TUI v4 in config
sed -i 's/version: "v4"/version: "v3"/' .yoyo-dev/config.yml
```

### Issue: WebSocket backend not connecting

**Cause:** Backend server not running or port blocked.

**Solution:**

```bash
# Check if port 3457 is in use
lsof -i :3457

# Start backend manually
cd ~/.yoyo-dev
npm run dev:server

# Check backend status in TUI
# Press ? in TUI to see backend connection status
```

### Issue: Terminal too small

**Cause:** Terminal dimensions below minimum (120x30).

**Solution:**

```bash
# Check terminal size
tput cols
tput lines

# Resize terminal to at least 120 columns x 30 lines
# Or use full-screen mode (F11 in most terminals)
```

### Issue: Colors not displaying correctly

**Cause:** Terminal doesn't support 24-bit color.

**Solution:**

```bash
# Test 24-bit color support
echo -e "\033[38;2;137;180;250mBlue Text\033[0m"

# If not colored, use a modern terminal:
# - GNOME Terminal
# - Konsole
# - Alacritty
# - Kitty
# - iTerm2 (macOS)
# - Windows Terminal
```

### Issue: Box characters display as question marks

**Cause:** Terminal font doesn't support Unicode.

**Solution:**

Install a Nerd Font or Unicode-compatible font:
- FiraCode Nerd Font
- JetBrains Mono
- Cascadia Code
- Ubuntu Mono

## Performance Tuning

### Reduce Memory Usage

If TUI v4 uses more than 100MB memory:

```bash
# Check memory usage
ps aux | grep tsx

# Reduce log buffer in config
cat >> .yoyo-dev/config.yml << EOF

tui:
  performance:
    max_log_lines: 500    # Default: 1000
    virtual_scroll: true  # Enable virtual scrolling
EOF
```

### Improve Rendering Performance

For smoother 60fps rendering:

```yaml
# .yoyo-dev/config.yml
tui:
  performance:
    debounce_ms: 100      # Debounce terminal resize events
    batch_updates: true   # Batch React state updates
```

## Migration from TUI v3

### Feature Parity

TUI v4 has complete feature parity with v3:

| Feature | v3 (Python) | v4 (TypeScript) |
|---------|-------------|-----------------|
| Task tree navigation | ✅ | ✅ |
| Real-time updates | ✅ | ✅ |
| Execution monitoring | ✅ | ✅ |
| Test result parsing | ✅ | ✅ |
| Session persistence | ✅ | ✅ |
| Keyboard shortcuts | ✅ | ✅ |
| MCP status display | ✅ | ✅ |
| Memory system integration | ✅ | ✅ |

### Known Differences

1. **Startup time** - v4 is slightly slower (~200ms) due to Node.js initialization
2. **Memory usage** - v4 uses less memory (<100MB vs ~300MB)
3. **Rendering** - v4 has smoother animations (60fps vs ~30fps)
4. **Error messages** - v4 has more detailed TypeScript stack traces

### Rollback Procedure

If you need to roll back to TUI v3:

```bash
# Method 1: Edit config
sed -i 's/version: "v4"/version: "v3"/' .yoyo-dev/config.yml

# Method 2: Use flag
yoyo --py

# Method 3: Unset config (defaults to v3)
sed -i '/^tui:/,/^[a-z]/d' .yoyo-dev/config.yml
```

## Advanced Usage

### Running Backend Separately

For debugging or advanced setups:

```bash
# Terminal 1: Start backend
cd ~/.yoyo-dev
npm run dev:server

# Terminal 2: Start TUI
cd /path/to/project
yoyo --tui-v4
```

### Custom Theme

Create custom Catppuccin theme variant:

```json
// ~/.yoyo-dev/tui-config.json
{
  "theme": "custom",
  "colors": {
    "primary": "#89b4fa",
    "success": "#a6e3a1",
    "warning": "#f9e2af",
    "error": "#f38ba8"
  }
}
```

### Development Mode

For TUI development with hot reload:

```bash
cd ~/.yoyo-dev

# Watch mode with tsx
npx tsx watch src/tui-v4/index.tsx

# Or with nodemon
npm install -g nodemon
nodemon --exec tsx src/tui-v4/index.tsx
```

## Getting Help

### In-TUI Help

Press **?** while TUI is running to see:
- Keyboard shortcuts
- Current configuration
- Backend connection status
- Session information

### Command-Line Help

```bash
# Show launcher help
yoyo --help

# Show version
yoyo --version
```

### Documentation

- **Migration Guide:** `docs/tui-v4-migration.md`
- **Installation Scripts:** `setup/README.md`
- **Memory System:** `docs/memory-system.md`
- **MCP Setup:** See CLAUDE.md "MCP Server Installation" section

### Reporting Issues

If TUI v4 crashes or has bugs:

1. Check error log: `.yoyo-dev/tui-errors.log`
2. Verify Node.js version: `node --version`
3. Verify dependencies: `npm list --depth=0`
4. Test with Python TUI: `yoyo --py`
5. Report issue with error log and steps to reproduce

## Next Steps

After successful installation:

1. **Launch TUI:** `yoyo`
2. **Press ?** to see keyboard shortcuts
3. **Navigate tasks** with j/k
4. **Start a workflow** with `/create-new` or `/execute-tasks`
5. **Customize** with `~/.yoyo-dev/tui-config.json`

Enjoy the new TUI v4! 🚀
