# Integrated Claude Code + TUI Split View

**Created:** 2025-11-05
**Priority:** High
**Complexity:** High

## Summary

Transform the `yoyo` command to automatically launch Claude Code CLI and Yoyo TUI dashboard in a split-screen terminal layout (40/60 ratio, resizable, layout persists across sessions).

## Problem

Users currently must:
- Run `yoyo` in one terminal
- Run `claude` in another terminal
- Manually position/switch between terminals
- Lose context switching between separate windows

## Solution

Single `yoyo` command launches integrated split view:
- **Left pane (40%):** Claude Code CLI with auto-attach to project
- **Right pane (60%):** Yoyo TUI dashboard
- **Visual indicators:** Active pane highlighted with bright cyan border
- **Independent operation:** Close either pane without affecting the other
- **Persistent layout:** Split ratio saved in `.yoyo-dev/config.yml`
- **Graceful fallback:** TUI-only mode if Claude Code not installed

## Key Features

1. **Built-in terminal splitting** (no tmux/screen dependency)
2. **Layout persistence** across sessions
3. **Visual active pane indicators** (cyan vs dim borders)
4. **TUI reactivity** - auto-updates when Claude creates/modifies files
5. **Claude Code detection** - shows installation instructions if missing
6. **Keyboard shortcuts** - Ctrl+B for focus switching, resizing
7. **Independent exit** - close one pane, other continues

## Technical Approach

**Architecture:**
- `SplitViewManager` - orchestrates split view
- `Pane` - represents terminal pane with pty
- `LayoutManager` - calculates split ratios, positioning
- `FocusManager` - tracks active pane
- `TerminalController` - ANSI escape sequences
- `ClaudeLauncher` - spawns Claude Code process
- `LayoutPersistence` - save/load config

**Implementation:**
- Use `pty` module for pseudo-terminals
- ANSI/VT100 escape sequences for split rendering
- SIGWINCH handling for terminal resize
- File watcher (existing) provides TUI reactivity
- Config stored in `.yoyo-dev/config.yml`

## Configuration

```yaml
split_view:
  enabled: true
  ratio: 0.4  # 40% Claude, 60% TUI
  active_pane: "claude"
  border_style:
    active: "bright_cyan"
    inactive: "dim_white"
```

## Command Flags

- `yoyo` - Launch split view (default)
- `yoyo --no-split` - TUI only
- `yoyo --split-ratio 0.5` - Custom ratio
- `yoyo --focus tui` - Start with TUI focused

## Success Metrics

- Launch time: < 3 seconds
- Pane switch time: < 100ms
- 70%+ adoption rate
- 50% reduction in context switches

## Out of Scope (Future)

- Three-pane layouts
- Mouse-based resizing
- macOS/Windows support (v1 is Linux only)
- Vertical/horizontal split toggle
- Integration with external multiplexers
