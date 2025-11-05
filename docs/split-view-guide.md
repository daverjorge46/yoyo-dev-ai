# Split View Feature Guide

**Version:** 3.1.0
**Platform:** Linux (macOS/Windows planned)
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Configuration](#configuration)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)
9. [Technical Details](#technical-details)
10. [FAQ](#faq)

---

## Overview

Split View mode transforms the `yoyo` command into an integrated development environment by launching **Claude Code CLI** and **Yoyo TUI Dashboard** side-by-side in a single terminal window.

### What Problem Does It Solve?

**Before Split View:**
- Run `yoyo` in one terminal
- Run `claude` in another terminal
- Manually position/switch between terminals
- Lose context switching between windows
- Terminal management overhead

**With Split View:**
- Single `yoyo` command launches both tools
- Intelligent split screen layout (40/60 default)
- Seamless focus switching with keyboard shortcuts
- Real-time synchronization between panes
- Layout persistence across sessions

### Key Benefits

1. **Unified Experience**: One command, two powerful tools working together
2. **Context Preservation**: See Claude's changes reflected instantly in TUI
3. **Efficient Workflow**: No terminal management, just development
4. **Smart Defaults**: Works out of the box with sensible configuration
5. **Graceful Degradation**: Falls back to TUI-only if Claude not installed

---

## Getting Started

### Quick Start

```bash
# Launch split view (default mode)
yoyo
```

You'll see:

```
┌────────────────────────┬─────────────────────────────────────┐
│                        │                                     │
│  Claude Code CLI       │    Yoyo TUI Dashboard               │
│  (Left, 40%)           │    (Right, 60%)                     │
│                        │                                     │
│  > Type your message   │    Active Work:                     │
│  > Get AI assistance   │    - Feature: user-profile (70%)    │
│  > Create code         │    - Fix: mobile-layout (100%)      │
│                        │                                     │
│                        │    Commands:                        │
│                        │    /execute-tasks                   │
│                        │    /create-new                      │
│                        │                                     │
│  [Active Border:       │    History:                         │
│   Bright Cyan]         │    ✓ Task 3 completed               │
│                        │    ✓ Tests passed                   │
└────────────────────────┴─────────────────────────────────────┘
```

### Your First Session

1. **Launch split view:**
   ```bash
   yoyo
   ```

2. **Interact with Claude (left pane is focused by default):**
   - Type your questions or commands
   - Watch TUI update automatically as Claude creates/modifies files

3. **Switch to TUI (right pane):**
   - Press `Ctrl+B` then `→` (right arrow)
   - Navigate TUI with normal shortcuts

4. **Switch back to Claude:**
   - Press `Ctrl+B` then `←` (left arrow)

5. **Resize panes (optional):**
   - Press `Ctrl+B` then `<` (make left larger)
   - Press `Ctrl+B` then `>` (make right larger)

6. **Exit:**
   - Type `exit` in Claude pane or press `Ctrl+D`
   - Press `q` in TUI pane
   - Either action closes both panes gracefully

---

## Installation

### Prerequisites

1. **Yoyo Dev installed** (see main README.md)
2. **Claude Code CLI** (optional but recommended)
3. **Linux terminal** with Unicode support

### Installing Claude Code CLI

Split view works best with Claude Code installed:

```bash
# Check if already installed
which claude

# If not found, install from:
# https://claude.com/claude-code
```

**Note:** If Claude Code is not installed, split view will automatically fall back to TUI-only mode with a helpful message showing installation instructions.

### Supported Terminals

Split view has been tested and verified on:

- ✅ **GNOME Terminal** (default on Ubuntu/Fedora)
- ✅ **Konsole** (default on KDE)
- ✅ **Alacritty** (fast, GPU-accelerated)
- ✅ **Kitty** (modern, feature-rich)
- ✅ **Terminator** (power user favorite)

**Requirements:**
- Unicode/UTF-8 support for box-drawing characters
- ANSI color support
- Minimum size: 120 columns × 30 rows

### Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Linux** | ✅ Fully Supported | Production ready |
| **macOS** | 🚧 Planned | Coming in future release |
| **Windows** | 🚧 Planned | WSL may work (untested) |

---

## Usage

### Basic Commands

```bash
# Launch split view (default)
yoyo

# Launch TUI only (disable split view)
yoyo --no-split

# Custom split ratio (50/50)
yoyo --split-ratio 0.5

# Custom split ratio (30% Claude, 70% TUI)
yoyo --split-ratio 0.3

# Start with TUI focused instead of Claude
yoyo --focus tui

# Combine flags
yoyo --split-ratio 0.6 --focus tui
```

### Command-Line Flags

| Flag | Type | Description | Example |
|------|------|-------------|---------|
| `--no-split` | boolean | Disable split view, launch TUI only | `yoyo --no-split` |
| `--split-ratio` | float | Left pane width ratio (0.0-1.0) | `yoyo --split-ratio 0.5` |
| `--focus` | string | Starting focus: "claude" or "tui" | `yoyo --focus tui` |

### Understanding Split Ratios

The `--split-ratio` flag controls left pane width:

```bash
# 0.3 = 30% Claude, 70% TUI (more space for TUI)
yoyo --split-ratio 0.3

# 0.4 = 40% Claude, 60% TUI (default, balanced)
yoyo --split-ratio 0.4

# 0.5 = 50% Claude, 50% TUI (equal split)
yoyo --split-ratio 0.5

# 0.6 = 60% Claude, 40% TUI (more space for Claude)
yoyo --split-ratio 0.6
```

**Recommended ratios:**
- **Default (0.4)**: Best for most workflows
- **Code-heavy (0.6)**: More space for Claude when writing lots of code
- **Monitoring (0.3)**: More space for TUI when tracking many tasks

---

## Configuration

### Configuration File

Split view settings are stored in `.yoyo-dev/config.yml`:

```yaml
split_view:
  enabled: true                    # Master toggle
  ratio: 0.4                       # Default split ratio
  active_pane: claude              # Starting focus

  # Visual styling
  border_style:
    active: bright_cyan            # Active pane border color
    inactive: dim_white            # Inactive pane border color

  # Keyboard shortcuts (read-only, cannot be customized yet)
  shortcuts:
    switch_focus: ctrl+b+arrow     # Ctrl+B →/←
    resize_left: ctrl+b+<          # Ctrl+B <
    resize_right: ctrl+b+>         # Ctrl+B >

  # Claude Code integration
  claude:
    command: claude                # Command to launch Claude
    auto_cwd: true                 # Auto-attach to project directory
    fallback_delay: 3              # Wait time before TUI-only fallback
```

### Configuration Options

| Option | Type | Default | Valid Values | Description |
|--------|------|---------|--------------|-------------|
| `enabled` | boolean | `true` | `true`, `false` | Enable/disable split view |
| `ratio` | float | `0.4` | `0.1` - `0.9` | Left pane width ratio |
| `active_pane` | string | `"claude"` | `"claude"`, `"tui"` | Starting focus |
| `border_style.active` | string | `"bright_cyan"` | ANSI color name | Active border color |
| `border_style.inactive` | string | `"dim_white"` | ANSI color name | Inactive border color |
| `claude.command` | string | `"claude"` | Any valid command | Claude Code command |
| `claude.auto_cwd` | boolean | `true` | `true`, `false` | Auto-attach to project |
| `claude.fallback_delay` | integer | `3` | `0` - `10` | Fallback wait time (seconds) |

### Customizing Configuration

Edit `.yoyo-dev/config.yml` in your project:

```bash
# Open config in your editor
$EDITOR .yoyo-dev/config.yml

# Or use nano
nano .yoyo-dev/config.yml
```

**Example: Disable split view by default:**
```yaml
split_view:
  enabled: false  # Change to false
```

**Example: Change default ratio to 50/50:**
```yaml
split_view:
  ratio: 0.5  # Change from 0.4 to 0.5
```

**Example: Start with TUI focused:**
```yaml
split_view:
  active_pane: tui  # Change from "claude" to "tui"
```

### Layout Persistence

Your split ratio is **automatically saved** when you resize panes with `Ctrl+B <` or `Ctrl+B >`.

The next time you run `yoyo`, it will use your saved ratio.

**Reset to defaults:**
```bash
# Remove config file to reset
rm .yoyo-dev/config.yml

# Next launch will regenerate with defaults
yoyo
```

---

## Keyboard Shortcuts

### Split View Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+B →` | Switch to right pane | Focus TUI dashboard |
| `Ctrl+B ←` | Switch to left pane | Focus Claude Code |
| `Ctrl+B <` | Increase left pane | Make Claude pane wider |
| `Ctrl+B >` | Increase right pane | Make TUI pane wider |

**How it works:**
1. Press and hold `Ctrl+B`
2. Release both keys
3. Press arrow key or `<`/`>` within 1 second

### Shortcut Examples

**Switch focus to TUI:**
```
1. Press Ctrl+B
2. Release
3. Press → (right arrow)
```

**Switch focus to Claude:**
```
1. Press Ctrl+B
2. Release
3. Press ← (left arrow)
```

**Make Claude pane larger:**
```
1. Press Ctrl+B
2. Release
3. Press < (shift + comma)
```

**Make TUI pane larger:**
```
1. Press Ctrl+B
2. Release
3. Press > (shift + period)
```

### Claude Pane Shortcuts

When Claude pane is focused, standard terminal shortcuts work:

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit Claude (closes split view) |
| `Ctrl+L` | Clear screen |
| Arrow keys | Navigate history |

### TUI Pane Shortcuts

When TUI pane is focused, standard TUI shortcuts work:

| Shortcut | Action |
|----------|--------|
| `?` | Show help |
| `/` | Command search |
| `r` | Refresh |
| `g` | Git menu |
| `q` | Quit TUI (closes split view) |

---

## Advanced Features

### Terminal Resize Handling

Split view automatically handles terminal resize events:

- Maintains aspect ratio when terminal is resized
- Validates minimum size (120×30)
- Shows error message if terminal too small
- Debounces rapid resize events (100ms)

**Resize behavior:**
```bash
# Start with normal size
yoyo

# Resize terminal window (drag corner)
# → Split view automatically adjusts

# Make terminal too small
# → Error message: "Terminal too small (min 120×30)"
# → Keeps running, waiting for resize
```

### Claude Code Detection

Split view intelligently detects Claude Code installation:

**Claude installed:**
```bash
$ yoyo
# Launches split view immediately
```

**Claude not installed:**
```bash
$ yoyo
# Waits 3 seconds for Claude detection
# Shows installation instructions:
#
# ┌─────────────────────────────────────────────┐
# │ Claude Code CLI not found                   │
# │                                             │
# │ Install from:                               │
# │ https://claude.com/claude-code              │
# │                                             │
# │ Falling back to TUI-only mode...            │
# └─────────────────────────────────────────────┘
#
# Launches TUI-only mode after 3 seconds
```

**Override fallback delay:**
```yaml
split_view:
  claude:
    fallback_delay: 5  # Wait 5 seconds instead of 3
```

### Independent Pane Exit

Each pane can be closed independently:

**Exit Claude pane:**
- Type `exit` or press `Ctrl+D` in Claude pane
- TUI continues running
- Claude pane shows "Process exited" message
- Close other pane to fully exit

**Exit TUI pane:**
- Press `q` in TUI pane
- Claude continues running
- TUI pane shows "TUI exited" message
- Close other pane to fully exit

**Exit both panes:**
- Exit either pane first
- Then exit the remaining pane
- OR: Press `Ctrl+C` multiple times to force exit

### Real-Time File Synchronization

TUI automatically updates when Claude creates or modifies files:

**Example workflow:**
```bash
# 1. Launch split view
yoyo

# 2. In Claude pane, create a new file
Claude> Create a new component at src/Button.tsx

# 3. TUI pane automatically shows:
#    - New task added (if part of current feature)
#    - File change notification
#    - Updated progress indicators

# 4. In Claude pane, run tests
Claude> Run the test suite

# 5. TUI pane automatically shows:
#    - Test results
#    - Pass/fail indicators
#    - Updated task status
```

**How it works:**
- TUI uses file system watchers (watchdog library)
- Detects changes in `.yoyo-dev/` directory
- Updates UI in real-time (< 100ms latency)
- No polling, efficient event-driven updates

---

## Troubleshooting

### Common Issues

#### 1. Split view not launching

**Symptom:** `yoyo` command launches TUI only, no split view

**Causes & Solutions:**

```bash
# Check if Claude Code is installed
which claude
# If not found:
# → Install from https://claude.com/claude-code
# → OR use: yoyo --no-split

# Check if split view is enabled in config
grep -A 2 "split_view:" .yoyo-dev/config.yml
# If "enabled: false":
# → Change to "enabled: true"
# → OR override: yoyo (will respect config)

# Check terminal size
echo $COLUMNS x $LINES
# If less than 120x30:
# → Resize terminal window
# → OR use: yoyo --no-split
```

#### 2. Terminal too small error

**Symptom:** Error message "Terminal too small (minimum 120×30)"

**Solution:**
```bash
# Check current size
echo $COLUMNS x $LINES

# Resize terminal window (drag corner to make larger)
# OR
# Launch TUI only
yoyo --no-split
```

**Why 120×30?**
- 120 columns: Enough for Claude + TUI side-by-side
- 30 rows: Minimum for useful TUI display
- Below this, split view becomes unusable

#### 3. Borders not rendering correctly

**Symptom:** Borders show as `?` or broken characters

**Cause:** Terminal doesn't support Unicode or locale not set to UTF-8

**Solution:**
```bash
# Check locale
locale | grep UTF-8
# Should show: LANG=en_US.UTF-8 (or similar)

# If not UTF-8, add to ~/.bashrc:
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LANGUAGE=en_US.UTF-8

# Reload shell
source ~/.bashrc

# Try again
yoyo
```

**Alternative solution:**
```bash
# Use a different terminal emulator
# Recommended: GNOME Terminal, Konsole, Alacritty
```

#### 4. Keyboard shortcuts not working

**Symptom:** `Ctrl+B →` doesn't switch focus

**Causes & Solutions:**

```bash
# 1. Check if Ctrl+B is bound by another application
# Common conflicts:
# - tmux (uses Ctrl+B as prefix)
# - screen (uses Ctrl+A but may conflict)
#
# Solution: Exit tmux/screen before running yoyo

# 2. Terminal emulator intercepts Ctrl+B
# Some terminals use Ctrl+B for bookmarks
# Solution: Disable terminal keyboard shortcuts or use different terminal

# 3. Timing issue (pressing keys too fast or slow)
# Correct sequence:
# - Press Ctrl+B together
# - Release both keys
# - Press arrow within 1 second

# Workaround: Use TUI-only mode
yoyo --no-split
```

#### 5. Split ratio not persisting

**Symptom:** Custom split ratio resets to default on next launch

**Causes & Solutions:**

```bash
# 1. Check config file permissions
ls -la .yoyo-dev/config.yml
# If not writable:
chmod 644 .yoyo-dev/config.yml

# 2. Check config file structure
grep -A 20 "split_view:" .yoyo-dev/config.yml
# Should show "ratio: 0.X" under split_view section

# 3. Config file corrupted
# Backup and regenerate:
cp .yoyo-dev/config.yml .yoyo-dev/config.yml.backup
rm .yoyo-dev/config.yml
yoyo  # Regenerates config
```

#### 6. Claude pane shows "Process exited"

**Symptom:** Claude pane exits immediately after launch

**Causes & Solutions:**

```bash
# 1. Claude command not found
which claude
# If empty:
# → Install Claude Code CLI
# → OR check PATH: echo $PATH

# 2. Claude exits with error
# Check error message in pane

# 3. Working directory issue
# Claude can't attach to current directory
pwd
# Ensure you're in a valid project directory

# 4. Permissions issue
ls -la .
# Ensure you have read/write access to current directory
```

### Getting Help

If you encounter issues not covered here:

1. **Check GitHub Issues:**
   https://github.com/daverjorge46/yoyo-dev-ai/issues

2. **Enable debug logging:**
   ```bash
   # Set environment variable
   export YOYO_DEBUG=1
   yoyo

   # Check logs
   cat .yoyo-dev/logs/split-view.log
   ```

3. **Create minimal reproduction:**
   ```bash
   # Test in clean environment
   cd /tmp
   mkdir test-yoyo
   cd test-yoyo
   ~/.yoyo-dev/setup/project.sh --claude-code --no-base
   yoyo
   ```

4. **Report bug with details:**
   - Terminal emulator and version
   - Linux distribution and version
   - Terminal size (`echo $COLUMNS x $LINES`)
   - Locale settings (`locale`)
   - Error messages
   - Steps to reproduce

---

## Technical Details

### Architecture

Split view is implemented as a pure Python solution using:

**Core Components:**

1. **SplitViewManager** (`lib/yoyo_tui_v3/split_view/manager.py`)
   - Orchestrates entire lifecycle
   - Manages main event loop
   - Handles pane creation and cleanup

2. **TerminalController** (`lib/yoyo_tui_v3/split_view/terminal_control.py`)
   - ANSI/VT100 escape sequence handling
   - Alternate screen buffer management
   - Cursor control and color setting

3. **LayoutManager** (`lib/yoyo_tui_v3/split_view/layout.py`)
   - Split ratio calculations
   - Terminal size validation
   - Dynamic resize handling

4. **FocusManager** (`lib/yoyo_tui_v3/split_view/focus.py`)
   - Active pane tracking
   - Focus switching logic
   - Visual indicator rendering

5. **Pane** (`lib/yoyo_tui_v3/split_view/pane.py`)
   - PTY (pseudo-terminal) management
   - Process lifecycle control
   - Non-blocking I/O

6. **LayoutPersistence** (`lib/yoyo_tui_v3/services/layout_persistence.py`)
   - Config loading/saving
   - Schema validation
   - Config migration

### Technical Specifications

**Requirements:**
- Python 3.8+
- Linux kernel 2.6+ (for pty support)
- Terminal with ANSI escape sequence support
- 120×30 minimum terminal size

**Dependencies:**
- `pty` (Python standard library)
- `select` (Python standard library)
- `fcntl` (Python standard library)
- `termios` (Python standard library)
- `signal` (Python standard library)
- `yaml` (PyYAML package)

**Performance:**
- Launch time: < 3 seconds (with Claude)
- Input latency: < 50ms
- Output rendering: < 100ms
- Idle CPU usage: 0%
- Memory usage: ~50MB total

**Limitations:**
- Linux only (POSIX pty dependency)
- No mouse support
- Fixed horizontal split (no vertical split)
- Two panes only (no three-way split)
- Keyboard shortcuts not customizable (yet)

### How It Works

**1. Initialization:**
```
User runs: yoyo

→ Load config from .yoyo-dev/config.yml
→ Check if split view enabled
→ Validate terminal size (≥ 120×30)
→ Detect Claude Code CLI (check PATH)
```

**2. Pane Creation:**
```
→ Create left pane (Claude):
  - Fork process with pty.fork()
  - Exec 'claude' command
  - Set pty size with fcntl/termios
  - Set non-blocking I/O

→ Create right pane (TUI):
  - Fork process with pty.fork()
  - Exec Python + TUI script
  - Set pty size
  - Set non-blocking I/O
```

**3. Event Loop:**
```
Loop:
  → Use select() to wait for:
    - stdin (user keyboard input)
    - left pane output
    - right pane output
    - signals (SIGWINCH for resize)

  → On stdin input:
    - Check if shortcut (Ctrl+B sequence)
    - If yes: handle focus/resize
    - If no: route to active pane

  → On pane output:
    - Read available data
    - Render to correct screen area
    - Update borders

  → On SIGWINCH (resize):
    - Recalculate layout
    - Resize both panes
    - Redraw everything
```

**4. Rendering:**
```
Frame render:
  → Move cursor to (0, 0)
  → Clear screen
  → Draw left border (cyan or dim)
  → Draw left pane output
  → Draw separator
  → Draw right border (cyan or dim)
  → Draw right pane output
  → Flush to terminal
```

**5. Cleanup:**
```
On exit:
  → Send SIGTERM to both panes
  → Wait for processes to exit (max 5s)
  → If still running: SIGKILL
  → Close PTY file descriptors
  → Exit alternate screen buffer
  → Restore cursor
  → Exit program
```

### Escape Sequences Used

**Terminal Control:**
- `\x1b[?1049h` - Enter alternate screen buffer
- `\x1b[?1049l` - Exit alternate screen buffer
- `\x1b[H` - Move cursor to home (0,0)
- `\x1b[{row};{col}H` - Move cursor to position
- `\x1b[?25l` - Hide cursor
- `\x1b[?25h` - Show cursor
- `\x1b[2J` - Clear entire screen
- `\x1b[0m` - Reset all attributes

**Colors:**
- `\x1b[96m` - Bright cyan (active border)
- `\x1b[37;2m` - Dim white (inactive border)

**Box-Drawing Characters (Unicode):**
- `─` (U+2500) - Horizontal line
- `│` (U+2502) - Vertical line
- `┌` (U+250C) - Top-left corner
- `┐` (U+2510) - Top-right corner
- `└` (U+2514) - Bottom-left corner
- `┘` (U+2518) - Bottom-right corner

---

## FAQ

### General Questions

**Q: Do I need Claude Code installed to use split view?**

A: No. Split view will gracefully fall back to TUI-only mode if Claude Code is not found. You'll see installation instructions and can install it later.

**Q: Can I use split view on macOS or Windows?**

A: Not currently. Split view is Linux-only in v3.1. macOS and Windows support are planned for future releases. Windows users might be able to use WSL (untested).

**Q: Does split view work inside tmux or screen?**

A: Yes, but keyboard shortcuts may conflict. tmux uses `Ctrl+B` as its prefix key. You can:
- Exit tmux before running `yoyo`
- OR rebind tmux prefix to different key
- OR use `yoyo --no-split` inside tmux

**Q: Can I run split view over SSH?**

A: Yes! Split view works perfectly over SSH as long as:
- Your SSH client supports ANSI escape sequences
- Terminal is at least 120×30
- UTF-8 encoding is enabled

**Q: How much overhead does split view add?**

A: Very little. Launch time is ~3 seconds (mostly Claude startup). Input latency is <50ms. Idle CPU usage is 0%. Memory is ~50MB total for both panes.

### Configuration Questions

**Q: Can I customize the keyboard shortcuts?**

A: Not yet. Keyboard shortcuts are hardcoded in v3.1. Custom shortcuts are planned for v3.2.

**Q: Can I change the border colors?**

A: Yes! Edit `.yoyo-dev/config.yml`:
```yaml
split_view:
  border_style:
    active: bright_green    # Any ANSI color
    inactive: dim_gray      # Any ANSI color
```

**Q: Can I have more than two panes?**

A: Not currently. Split view supports exactly two panes (Claude + TUI). Three-pane layouts are planned for future releases.

**Q: Can I do vertical split instead of horizontal?**

A: Not yet. Only horizontal split (left/right) is supported in v3.1. Vertical split (top/bottom) and toggle between them are planned for v3.2.

**Q: Where is the configuration stored?**

A: `.yoyo-dev/config.yml` in your project directory. Each project has its own configuration.

### Troubleshooting Questions

**Q: Why do I see `?` instead of borders?**

A: Your terminal doesn't support Unicode or locale is not UTF-8. Fix:
```bash
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
```

**Q: Split view launches but I only see TUI, no Claude pane?**

A: Claude Code is not installed or not in PATH. Check:
```bash
which claude
```

**Q: Can I force TUI-only mode permanently?**

A: Yes. Edit `.yoyo-dev/config.yml`:
```yaml
split_view:
  enabled: false
```

**Q: How do I reset configuration to defaults?**

A: Delete config and relaunch:
```bash
rm .yoyo-dev/config.yml
yoyo
```

### Advanced Questions

**Q: Can I use a different AI CLI instead of Claude Code?**

A: Technically yes, but not officially supported. You can change the command:
```yaml
split_view:
  claude:
    command: your-ai-cli
```
But behavior may be unpredictable.

**Q: Does split view support mouse input?**

A: No. Split view is keyboard-only. Mouse support is not planned (adds complexity, reduces portability).

**Q: Can I record/replay split view sessions?**

A: Yes! Use `asciinema`:
```bash
asciinema rec
yoyo
# ... work ...
exit
# Recording saved
```

**Q: How does split view compare to tmux splits?**

A: Similarities:
- Both provide terminal splitting
- Both support keyboard shortcuts
- Both work over SSH

Differences:
- Split view: Purpose-built for Claude + TUI, zero configuration, automatic layout persistence
- tmux: General-purpose, highly configurable, session management, more complex

Use split view for Yoyo Dev workflow. Use tmux for general terminal multiplexing.

---

## Appendix

### Color Reference

Valid ANSI color names for `border_style`:

**Standard Colors:**
- `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`

**Bright Colors:**
- `bright_black`, `bright_red`, `bright_green`, `bright_yellow`
- `bright_blue`, `bright_magenta`, `bright_cyan`, `bright_white`

**Styled Colors:**
- `dim_white`, `dim_gray`

### Terminal Compatibility

Tested and verified terminals:

| Terminal | Version | Status | Notes |
|----------|---------|--------|-------|
| GNOME Terminal | 3.x | ✅ Excellent | Default Ubuntu terminal |
| Konsole | 21.x+ | ✅ Excellent | Default KDE terminal |
| Alacritty | 0.11+ | ✅ Excellent | Fast, GPU-accelerated |
| Kitty | 0.26+ | ✅ Excellent | Modern, feature-rich |
| Terminator | 2.x | ✅ Excellent | Power user favorite |
| xterm | 366+ | ⚠️ Works | Basic, some visual glitches |
| rxvt | 9.x | ⚠️ Works | Limited color support |
| Linux console | 4.x | ❌ Not supported | No UTF-8 box-drawing |

### Version History

**v3.1.0** (2025-11-05)
- Initial split view release
- Linux support
- Claude Code integration
- Layout persistence
- Keyboard shortcuts

**Planned for v3.2.0:**
- macOS support
- Customizable keyboard shortcuts
- Vertical split option
- Split toggle hotkey
- Three-pane layouts

### Credits

Split view is built with:
- **pty** - Python pseudo-terminal module
- **select** - I/O multiplexing
- **PyYAML** - Configuration management
- **Textual** - TUI framework for dashboard
- **Claude Code** - AI-assisted development

---

**Documentation Version:** 1.0.0
**Last Updated:** 2025-11-05
**Maintained By:** Yoyo Dev Team
**License:** MIT
