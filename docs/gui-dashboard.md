# GUI Dashboard Guide

> Yoyo Dev v5.0 Browser-Based Dashboard

The GUI Dashboard provides a modern, browser-based interface for Yoyo Dev with real-time updates, command palette, and interactive task management.

---

## Overview

**Access:** http://localhost:3456 (default)

The GUI Dashboard runs as a background server and provides:
- Visual task tracking
- Spec browser with syntax highlighting
- Command palette for quick actions
- Real-time updates via WebSocket
- Responsive design (mobile, tablet, desktop)

---

## Getting Started

### Launch GUI Dashboard

**Method 1: Launch with yoyo command (default)**

```bash
# Launch TUI + Claude + GUI (default in v5.0)
yoyo

# GUI server runs in background on port 3456
# Access at http://localhost:3456
```

**Method 2: Launch GUI standalone**

```bash
# Launch GUI server only
yoyo-gui

# Access at http://localhost:3456
```

**Method 3: Launch without GUI**

```bash
# Launch TUI + Claude without GUI
yoyo --no-gui
```

### Stop GUI Server

```bash
# Stop background GUI server
yoyo --stop-gui

# Check if GUI server is running
yoyo --gui-status
```

### Configuration

Edit `.yoyo-dev/config.yml`:

```yaml
gui:
  enabled: true                    # Launch browser GUI with yoyo command
  port: 3456                       # GUI server port
  auto_open_browser: false         # Don't auto-open browser (user preference)
  dev_mode: false                  # Use production mode by default
```

---

## Features

### 1. Project Overview Panel

Displays project information and status.

**Contents:**
- Project name
- Mission statement (from mission-lite.md)
- Tech stack
- Memory status (block count, scope, last updated)
- MCP server status

**Real-time updates:**
- Updates when mission.md changes
- Updates when memory blocks change
- Updates when MCP servers connect/disconnect

### 2. Active Tasks Panel

Interactive task tracking with real-time updates.

**Features:**
- Hierarchical task tree (parent/subtasks)
- Progress indicators
- Status badges (pending, in_progress, completed)
- One-click expand/collapse
- Completion percentage

**Real-time updates:**
- Updates when tasks.md changes
- Updates when todos are marked complete
- Updates during `/execute-tasks`

**Example:**

```
Active Tasks (4/10 completed - 40%)

✓ Task 1: Set up authentication (completed)
  ✓ Subtask 1.1: Install Clerk SDK
  ✓ Subtask 1.2: Configure provider
  ✓ Subtask 1.3: Add auth routes

→ Task 2: Protect API endpoints (in_progress)
  ✓ Subtask 2.1: Add middleware
  → Subtask 2.2: Verify tokens
  • Subtask 2.3: Handle errors

• Task 3: Add tests (pending)
  • Subtask 3.1: Unit tests
  • Subtask 3.2: Integration tests
```

### 3. Specs Browser

Browse and view specifications with syntax highlighting.

**Features:**
- List of recent specs
- Spec preview with markdown rendering
- Syntax highlighting for code blocks
- Quick navigation
- Search specs

**Contents per spec:**
- spec.md - Full requirements
- spec-lite.md - Condensed summary
- technical-spec.md - Implementation details
- tasks.md - Task breakdown
- decisions.md - Technical decisions

**Real-time updates:**
- Updates when new specs created
- Updates when specs modified

### 4. Command History Panel

Track recent slash commands and their status.

**Features:**
- Recent command list (last 50)
- Execution status (running, success, failed)
- Timestamp
- Duration
- Quick re-run
- Copy command

**Example:**

```
Command History

✓ /create-new "Add authentication"      2m ago (45s)
✓ /execute-tasks                         5m ago (2m 30s)
→ /research "Convex auth patterns"       Running... (30s)
✗ /execute-tasks --task=3                10m ago (Failed)
✓ /consult-oracle "Microservices?"       15m ago (8s)
```

### 5. Command Palette

Quick access to all Yoyo Dev commands.

**Access:**
- Click search icon
- Keyboard: `Cmd/Ctrl+K`

**Features:**
- Fuzzy search
- Recent commands
- Keyboard navigation
- One-click execution
- Command descriptions

**Example:**

```
Search commands...

> create

/create-new          Create feature with full spec workflow
/create-spec         Create specification only
/create-tasks        Generate tasks from spec
/create-fix          Analyze and fix bugs
```

### 6. Error Detector Panel

Real-time error monitoring and analysis.

**Features:**
- Recent errors (last 20)
- Stack trace analysis
- Error categorization
- Quick fixes
- Copy error details

**Categories:**
- Test failures
- TypeScript errors
- Build errors
- Runtime errors

**Example:**

```
Error Detector (2 errors)

✗ Test Failure
  auth/service.test.ts:45
  Expected 200, got 401

  Stack Trace:
    at authenticateUser (src/auth/service.ts:23)
    ...

  Quick Fix: Check token generation

✗ TypeScript Error
  src/components/Dashboard.tsx:12
  Property 'user' does not exist on type '{}'
```

### 7. Memory Status Panel

Display memory system status and blocks.

**Features:**
- Block count (persona, project, user, corrections)
- Scope (project or global)
- Last updated timestamp
- Quick /init action

**Example:**

```
Memory Status

4 blocks (project scope)
Last updated: 5 min ago

Blocks:
✓ persona        Updated 10m ago
✓ project        Updated 5m ago
✓ user           Updated 1h ago
✓ corrections    Updated 2h ago

Action: /remember or /init
```

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Open command palette |
| `Cmd/Ctrl+R` | Refresh dashboard |
| `ESC` | Close modal/palette |
| `?` | Show keyboard shortcuts |

### Navigation

| Shortcut | Action |
|----------|--------|
| `t` | Focus tasks panel |
| `s` | Focus specs panel |
| `h` | Focus history panel |
| `e` | Focus error detector |
| `m` | Focus memory status |

### Command Palette

| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate commands |
| `Enter` | Execute command |
| `ESC` | Close palette |
| `Tab` | Autocomplete |

---

## Real-Time Updates

### WebSocket Connection

The GUI Dashboard connects to the TUI backend via WebSocket for real-time updates.

**Connection:**
```
ws://localhost:3456/ws
```

**Events:**

| Event | Trigger | Dashboard Update |
|-------|---------|------------------|
| `task:updated` | tasks.md changed | Active Tasks panel |
| `spec:created` | New spec created | Specs Browser |
| `spec:updated` | Spec modified | Spec preview |
| `command:started` | Command execution | Command History |
| `command:completed` | Command finished | Command History |
| `error:detected` | Error occurred | Error Detector |
| `memory:updated` | Memory block changed | Memory Status |

**Auto-Reconnect:**
- Reconnects automatically on disconnect
- Shows connection status indicator
- Queues updates during disconnect

### Update Frequency

**Fast Updates (real-time):**
- Task status changes
- Command execution status
- Error detection

**Medium Updates (debounced 1s):**
- File content changes
- Memory block updates

**Slow Updates (polling 5s):**
- MCP server status
- Git status

---

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features:**
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Offline fallback (cached UI)

**Minimum Screen Size:**
- Mobile: 375x667 (iPhone SE)
- Tablet: 768x1024 (iPad)
- Desktop: 1280x720

---

## Integration with TUI

The GUI Dashboard complements the TUI dashboard:

**TUI (Terminal):**
- Keyboard-driven navigation
- Low resource usage
- Works over SSH
- Terminal-based interaction

**GUI (Browser):**
- Visual task tracking
- Mouse-friendly
- Syntax highlighting
- Rich formatting

**Use both together:**
```bash
# Launch split view with GUI
yoyo

# Left pane: Claude Code CLI
# Right pane: TUI dashboard
# Browser: GUI dashboard at http://localhost:3456
```

---

## Advanced Features

### Command Execution

Execute commands directly from GUI:

**Method 1: Command Palette**
1. Open palette (`Cmd/Ctrl+K`)
2. Search for command
3. Press Enter

**Method 2: Quick Actions**
- Click command in history to re-run
- Click task to execute specific task

### Spec Preview

View specs with enhanced formatting:

**Features:**
- Markdown rendering
- Syntax highlighted code blocks
- Collapsible sections
- Table of contents
- Quick copy

**Navigation:**
```
Specs Browser → Click spec → Spec preview opens

Preview shows:
- spec.md (rendered)
- Code blocks with syntax highlighting
- Quick navigation to sections
```

### Task Management

Interactive task management:

**Actions:**
- Click task to expand/collapse
- Hover for details
- Right-click for context menu
  - Execute task
  - Mark complete
  - View in editor

### Error Analysis

Advanced error detection:

**Features:**
- Stack trace parsing
- Source code preview
- Quick fix suggestions
- Copy error details
- Link to related files

---

## Development Mode

Enable development mode for debugging:

```yaml
# .yoyo-dev/config.yml
gui:
  dev_mode: true
```

**Development Features:**
- Hot module reload
- React DevTools support
- Verbose logging
- Network inspector

**Access DevTools:**
- Chrome: `F12` or `Cmd/Ctrl+Shift+I`
- Firefox: `F12` or `Cmd/Ctrl+Shift+I`

---

## Troubleshooting

### GUI Not Loading

**Symptoms:** http://localhost:3456 shows "connection refused"

**Solution:**

```bash
# Check if GUI server is running
yoyo --gui-status

# Restart GUI server
yoyo --stop-gui
yoyo
```

### WebSocket Not Connecting

**Symptoms:** "Disconnected" indicator in GUI

**Solution:**

```bash
# Check firewall allows port 3456
sudo ufw allow 3456

# Check TUI is running
ps aux | grep yoyo_tui
```

### Slow Updates

**Symptoms:** Dashboard updates lag behind file changes

**Solution:**

```bash
# Check file watcher count
cat /proc/sys/fs/inotify/max_user_watches

# Increase if low (<100000)
echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches
```

### Port Already in Use

**Symptoms:** "Port 3456 already in use"

**Solution:**

```bash
# Find process using port 3456
lsof -i :3456

# Kill process (or change port in config.yml)
kill -9 <PID>

# Or change port
# Edit .yoyo-dev/config.yml: gui.port: 3457
```

---

## See Also

- **[Quick Start](QUICK-START.md)** - Getting started
- **[Command Reference](commands.md)** - All commands
- **[Architecture](ARCHITECTURE.md)** - System architecture
- **[Installation](INSTALLATION.md)** - Setup guide

---

**Version:** 5.0.0
**Last Updated:** 2025-12-29
**Status:** Production Ready
