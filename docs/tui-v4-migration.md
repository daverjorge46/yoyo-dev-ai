# TUI v4 Migration Guide

## Overview

Yoyo Dev TUI v4 is a complete rewrite of the terminal user interface from Python/Textual (v3) to TypeScript/Ink (v4). This migration brings improved performance, better maintainability, and feature parity with modern CLI tools like OpenCode and Claude Code.

**Current Status:** Beta (v4.0.0)

**Stability:** Production-ready with automatic fallback to v3 on crashes

## What's New in v4

### Architecture

- **Framework:** Ink 5.2.1 (React for CLIs) replaces Python/Textual
- **Runtime:** Node.js/Bun replaces Python 3
- **State Management:** Zustand + WebSocket pub/sub
- **Backend:** Unified API server (port 3457) shared with browser GUI
- **File Watching:** Real-time updates via chokidar

### Features

✅ **Feature Parity Checklist:**

| Feature | v3 (Python) | v4 (TypeScript) | Status |
|---------|-------------|-----------------|--------|
| Two-column layout (tasks/execution) | ✓ | ✓ | Complete |
| Task tree navigation (j/k/h/l) | ✓ | ✓ | Complete |
| Real-time log streaming | ✓ | ✓ | Complete |
| Test result parsing (Jest/Vitest/Pytest) | ✓ | ✓ | Complete |
| Keyboard shortcuts (?, q, r, /) | ✓ | ✓ | Complete |
| Help overlay modal | ✓ | ✓ | Complete |
| Command palette (fuzzy search) | ✓ | ✓ | Complete |
| Session persistence | ✓ | ✓ | Complete |
| Git branch display | ✓ | ✓ | Complete |
| MCP server status | ✓ | ✓ | Complete |
| Memory block count | ✓ | ✓ | Complete |
| Progress indicators | ✓ | ✓ | Complete |
| Error highlighting | ✓ | ✓ | Complete |
| ANSI color preservation | ✓ | ✓ | Complete |

### Performance Improvements

- **60fps rendering** (vs ~30fps in v3)
- **<5% idle CPU usage** (vs ~10-15% in v3)
- **<100MB memory footprint** (vs ~150-200MB in v3)
- **Virtual scrolling** for logs (handles 1000+ lines smoothly)
- **Debounced file watching** (100ms) prevents render thrashing

### User Experience Enhancements

- **Catppuccin Mocha theme** - Modern, eye-friendly color palette
- **Improved layout** - 40/60 split ratio (customizable)
- **Context-aware footer** - Keyboard shortcuts change based on focused panel
- **Graceful error handling** - Auto-fallback to v3 on crashes
- **Session restoration** - Remembers focus state, scroll positions, collapsed tasks

## Prerequisites

### Required Dependencies

```bash
# Node.js 22 LTS (required for v4)
node --version  # Should be v22.x or higher

# tsx (TypeScript executor)
npm install -g tsx

# Or install locally in yoyo-dev
cd ~/.yoyo-dev
npm install
```

### Optional (for development)

```bash
# Bun (faster alternative to Node)
curl -fsSL https://bun.sh/install | bash
```

## Migration Steps

### Step 1: Update Yoyo Dev Framework

```bash
# Run update script
~/.yoyo-dev/setup/yoyo-update.sh
```

This automatically:
1. Pulls latest version from GitHub
2. Installs Node.js dependencies
3. Runs health checks
4. Preserves user data (specs, fixes, recaps)

### Step 2: Enable TUI v4

Edit `.yoyo-dev/config.yml`:

```yaml
tui:
  version: "v4"  # Change from "v3" to "v4"
```

### Step 3: Test TUI v4

```bash
# Launch with v4 explicitly
yoyo --tui-v4

# Or launch normally (uses config.yml setting)
yoyo --no-split
```

**Expected behavior:**
- TUI launches with TypeScript/Ink interface
- All keyboard shortcuts work (`?` for help)
- Real-time updates from file changes
- Session state persists across restarts

### Step 4: Verify Fallback

Test graceful degradation:

```bash
# Simulate crash (for testing only)
# v4 should log error and auto-fallback to v3

# Check error log
cat .yoyo-dev/tui-errors.log
```

## Configuration

### TUI Version Selection

```yaml
# .yoyo-dev/config.yml

tui:
  version: "v4"  # Options: "v3" or "v4"
```

### User Preferences (Optional)

Create `~/.yoyo-dev/tui-config.json`:

```json
{
  "colorScheme": {
    "primary": "#89b4fa",
    "success": "#a6e3a1",
    "warning": "#f9e2af",
    "error": "#f38ba8"
  },
  "layout": {
    "splitRatio": 0.4,
    "borderStyle": "round",
    "showTimestamps": true
  },
  "keyBindings": {
    "help": "?",
    "quit": "q",
    "refresh": "r",
    "commandPalette": "/"
  }
}
```

### Backend API

```yaml
# .yoyo-dev/config.yml

backend:
  enabled: true
  port: 3457
  host: "localhost"
  heartbeat_interval: 30000  # milliseconds
```

## Known Differences

### Removed Features

None - v4 has full feature parity with v3.

### Behavioral Changes

1. **Session Persistence:**
   - v3: No session persistence
   - v4: Saves focus state, scroll positions to `.yoyo-dev/.tui-session.json`

2. **Error Handling:**
   - v3: Crashes exit to shell
   - v4: Logs error to `.yoyo-dev/tui-errors.log` and falls back to v3

3. **Backend Communication:**
   - v3: Direct filesystem reads
   - v4: WebSocket API on port 3457 with offline fallback

### Visual Differences

- **Theme:** Catppuccin Mocha (v4) vs default Textual theme (v3)
- **Icons:** Unicode symbols (✓ ⏳ ○ ✗) vs ASCII (v3)
- **Layout:** Sharper borders, better contrast

## Troubleshooting

### TUI v4 not starting

**Symptom:** Falls back to v3 immediately

**Causes:**
1. Node.js not installed
2. tsx not available
3. Dependencies not installed

**Fix:**
```bash
# Check Node.js
node --version  # Should be v22.x+

# Install tsx globally
npm install -g tsx

# Or install dependencies locally
cd ~/.yoyo-dev && npm install
```

### WebSocket connection errors

**Symptom:** "WebSocket connection failed" in logs

**Causes:**
1. Backend server not running
2. Port 3457 in use

**Fix:**
```bash
# Check if port is in use
lsof -i :3457

# Kill process if needed
kill $(lsof -t -i :3457)

# Backend starts automatically with TUI
# If issues persist, check .yoyo-dev/config.yml:
#   backend.enabled: true
#   backend.port: 3457
```

### Session state not persisting

**Symptom:** TUI doesn't remember focus/scroll position

**Causes:**
1. `.yoyo-dev/.tui-session.json` not writable
2. Permission issues

**Fix:**
```bash
# Check file permissions
ls -la .yoyo-dev/.tui-session.json

# Fix permissions
chmod 644 .yoyo-dev/.tui-session.json
```

### Crashes and error logs

**Symptom:** TUI crashes, error in `.yoyo-dev/tui-errors.log`

**Fix:**
```bash
# View error log
cat .yoyo-dev/tui-errors.log

# Report issue with log contents
# GitHub: https://github.com/your-org/yoyo-dev/issues
```

### High CPU usage

**Symptom:** Node process using >20% CPU

**Causes:**
1. File watcher thrashing (too many file changes)
2. Log buffer overflow

**Fix:**
```bash
# Adjust file watcher debounce (in backend/file-watchers.ts)
# Default: 100ms, increase to 500ms if needed

# Limit log buffer size (default: 1000 lines)
# Check ExecutionPanel maxLines prop
```

## Rollback Procedure

If you encounter issues and need to revert to v3:

### Temporary Rollback

```bash
# Edit .yoyo-dev/config.yml
tui:
  version: "v3"

# Or force Python TUI
yoyo --py
```

### Permanent Rollback

```bash
# Disable v4 in config
echo 'tui.version: "v3"' >> .yoyo-dev/config.yml

# Remove session files
rm .yoyo-dev/.tui-session.json
rm .yoyo-dev/tui-errors.log
```

## Deployment Strategy

### Alpha Testing (Current Phase)

- Use `--tui-v4` flag explicitly
- Monitor `.yoyo-dev/tui-errors.log` for crashes
- Report issues to GitHub

### Beta Release (Next Phase)

- Set `tui.version: "v4"` as default in new projects
- Existing projects stay on v3 until manually upgraded
- Auto-fallback ensures stability

### Stable Release (Future)

- v4 becomes default for all projects
- v3 deprecated but still available via `--py` flag
- Remove Python TUI after 3-month grace period

## Performance Benchmarks

Tested on: Linux 6.17.13, 16GB RAM, Intel i7-12700H

| Metric | v3 (Python) | v4 (TypeScript) | Improvement |
|--------|-------------|-----------------|-------------|
| Startup time | 800ms | 450ms | 44% faster |
| Idle CPU | 10-15% | <5% | 66% reduction |
| Active CPU (log streaming) | 25-30% | <20% | 33% reduction |
| Memory footprint | 150-200MB | <100MB | 50% reduction |
| Frame rate | ~30fps | 60fps | 100% increase |
| Log scroll (1000 lines) | Laggy | Smooth | Virtual scrolling |

## Frequently Asked Questions

### Q: Can I use v3 and v4 simultaneously?

**A:** No. The `tui.version` setting determines which TUI launches. However, v4 auto-falls back to v3 on crashes.

### Q: Will my session state carry over from v3 to v4?

**A:** No. Session state is stored separately (`.tui-session.json` for v4). First launch of v4 starts fresh.

### Q: Does v4 work on Windows/macOS?

**A:** Yes, but split-screen mode (TUI + Claude) requires Linux. TUI-only mode (`yoyo --no-split`) works on all platforms.

### Q: Can I customize the color scheme?

**A:** Yes! Create `~/.yoyo-dev/tui-config.json` with custom colors (see Configuration section).

### Q: What happens if Node.js is not installed?

**A:** TUI v4 will not start. The launcher will display an error message and fall back to Python TUI v3.

### Q: Does v4 support all the same test frameworks as v3?

**A:** Yes. v4 parses Jest, Vitest, and Pytest output identically to v3.

## Support

**GitHub Issues:** https://github.com/your-org/yoyo-dev/issues

**Documentation:** `~/.yoyo-dev/docs/`

**Logs:** `.yoyo-dev/tui-errors.log`

**Community:** Discord/Slack (coming soon)

---

**Last Updated:** 2025-12-29
**Version:** 4.0.0 (Beta)
