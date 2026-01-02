# Integrated Claude Code + TUI Split View

**Created:** 2025-11-05
**Status:** Ready for Implementation
**Priority:** High
**Complexity:** High

## Overview

Transform the `yoyo` command from a simple TUI launcher into an integrated development environment that automatically launches Claude Code CLI alongside the Yoyo TUI dashboard in a split-screen terminal layout. This creates a seamless workflow where developers have immediate access to both the AI assistant and project dashboard in a single terminal window.

## Problem Statement

**Current Experience:**
- Users run `yoyo` to launch the dashboard TUI
- Users must separately run `claude` in another terminal or tab
- Context switching between terminals is cumbersome
- No visual integration between the AI assistant and project dashboard
- Users need to manually position terminals side-by-side

**Desired Experience:**
- Single command `yoyo` launches both Claude Code and TUI in split view
- 40/60 split ratio (Claude left, TUI right) that's resizable
- Visual indicators show which pane is active
- Layout persists across sessions
- Independent pane operation (can close one without affecting the other)
- TUI updates reactively when Claude Code executes commands

## User Stories

### As a Developer
- I want to run `yoyo` and immediately have both my AI assistant and dashboard ready
- I want to see my project context in the TUI while interacting with Claude Code
- I want the layout to remember my preferred split ratio across sessions
- I want to quickly identify which pane is active with visual indicators

### As a New User
- I want clear guidance if Claude Code isn't installed
- I want a link to installation instructions if I need to install it
- I want the TUI to still work if Claude Code isn't available

## Requirements

### Functional Requirements

**FR-1: Automatic Split View Launch**
- Running `yoyo` launches both Claude Code CLI and TUI dashboard
- Default split: 40% Claude Code (left) / 60% TUI (right)
- Split is resizable with standard terminal controls
- Claude Code automatically attaches to current project directory

**FR-2: Layout Persistence**
- Store split ratio in config file (`.yoyo-dev/config.yml`)
- Restore layout on next launch
- Support per-project layout preferences

**FR-3: Visual Active Pane Indicators**
- Active pane has distinct border color/style
- Inactive pane has dimmed or neutral border
- Clear visual distinction without being distracting
- Updates in real-time when focus switches

**FR-4: TUI Reactivity**
- TUI file watcher detects changes from Claude Code operations
- Dashboard updates when specs/tasks/fixes are created/modified
- Real-time refresh of project statistics
- No manual refresh needed

**FR-5: Independent Pane Operation**
- Closing Claude Code pane leaves TUI running
- Closing TUI pane leaves Claude Code running
- Users can exit either pane independently
- Standard terminal controls work in both panes

**FR-6: Graceful Claude Code Fallback**
- Detect if `claude` command is available in PATH
- If not found, launch TUI only
- Display clear message: "Claude Code not found. Install from: https://github.com/anthropics/claude-code"
- Provide instructions for installation
- Suggest running `yoyo --no-split` to suppress the message

**FR-7: Built-in Terminal Splitting**
- Implement terminal splitting without external dependencies (no tmux/screen)
- Use terminal escape sequences and control codes
- Handle terminal resize events gracefully
- Support standard terminal emulators (GNOME Terminal, Konsole, Alacritty, etc.)

### Non-Functional Requirements

**NFR-1: Performance**
- Split view launch time: < 3 seconds total
- No noticeable lag when switching between panes
- Minimal overhead compared to running commands separately

**NFR-2: Compatibility**
- Linux support (primary target)
- Standard terminal emulators
- Terminal size minimum: 120x30 characters

**NFR-3: Reliability**
- Graceful handling of terminal resize
- Recovery from pane crashes
- Clean shutdown of both processes

**NFR-4: Usability**
- Intuitive keyboard shortcuts for pane switching
- Clear visual feedback for all actions
- Accessible to terminal users with screen readers

## Technical Approach

### Architecture

**Component Structure:**
```
lib/yoyo_tui_v3/
├── split_view/
│   ├── __init__.py
│   ├── manager.py           # SplitViewManager - orchestrates split view
│   ├── pane.py              # Pane - represents a terminal pane
│   ├── layout.py            # LayoutManager - handles sizing/positioning
│   ├── focus.py             # FocusManager - tracks active pane
│   └── terminal_control.py  # TerminalController - escape sequences
├── services/
│   ├── claude_launcher.py   # ClaudeLauncher - spawns Claude Code
│   └── layout_persistence.py # LayoutPersistence - save/load config
└── main.py                  # Updated entry point
```

### Implementation Strategy

**1. Terminal Control Layer**
- Use ANSI/VT100 escape sequences for split view
- Implement alternative screen buffer for clean exit
- Handle SIGWINCH for terminal resize
- Use `pty` module for pseudo-terminal management

**2. Split View Manager**
- Orchestrate Claude Code process and TUI application
- Manage layout calculations (percentage-based splits)
- Route input to appropriate pane based on focus
- Handle cleanup on exit

**3. Pane Management**
- Each pane runs in separate pseudo-terminal (pty)
- Capture output and render in designated area
- Forward input to active pane only
- Maintain independent scroll buffers

**4. Layout Persistence**
- Extend `.yoyo-dev/config.yml` with split view settings
- Schema:
```yaml
split_view:
  enabled: true
  ratio: 0.4           # 40% left pane
  active_pane: "claude"
  border_style:
    active: "bright_cyan"
    inactive: "dim_white"
```

**5. Claude Code Integration**
- Spawn `claude` process with `--cwd` flag (if available)
- Pass current directory as working directory
- Detect Claude Code installation via `shutil.which('claude')`
- Show installation prompt if not found

**6. TUI Reactivity**
- Existing file watcher already monitors `.yoyo-dev/`
- No changes needed - TUI will automatically update
- Ensure watch service runs in both split and non-split modes

### Technical Decisions

**Decision 1: Built-in Terminal Splitting vs External Multiplexer**
- **Choice:** Built-in using `pty` and terminal escape sequences
- **Rationale:**
  - No external dependencies (tmux/screen not required)
  - More control over UX and visual design
  - Easier to implement focus indicators
  - Simpler installation for users
- **Trade-offs:** More complex implementation, but better UX

**Decision 2: Process Management**
- **Choice:** Separate OS processes with pty
- **Rationale:**
  - Claude Code runs independently
  - TUI runs as separate Textual app
  - Clean separation of concerns
  - Easy to kill one without affecting the other
- **Trade-offs:** More complex IPC, but cleaner architecture

**Decision 3: Layout Persistence**
- **Choice:** Store in `.yoyo-dev/config.yml`
- **Rationale:**
  - Consistent with existing configuration approach
  - Per-project settings
  - Easy to version control or gitignore
  - Simple YAML schema
- **Trade-offs:** None significant

**Decision 4: Focus Switching**
- **Choice:** Use Ctrl+B followed by arrow keys (tmux-like)
- **Rationale:**
  - Familiar to terminal users
  - Doesn't conflict with common shortcuts
  - Easy to document and remember
- **Trade-offs:** Requires user to learn new shortcuts

## User Interface

### Split View Layout

```
┌─────────────────────┬──────────────────────────────────────┐
│ [ACTIVE: CYAN]      │ [INACTIVE: DIM]                      │
│ Claude Code CLI     │ Yoyo TUI Dashboard                   │
│                     │                                      │
│ > claude            │ ┌──────── Project Overview ────────┐│
│                     │ │ Mission: [...]                    ││
│ Available agents:   │ │ Tech Stack: Python, Textual       ││
│ /plan-product       │ │                                   ││
│ /create-new         │ │ Quick Stats:                      ││
│ /create-spec        │ │   Active Specs: 1                 ││
│ /execute-tasks      │ │   Pending Tasks: 7                ││
│                     │ └───────────────────────────────────┘│
│                     │                                      │
│                     │ ┌──────── Active Work ─────────────┐│
│                     │ │ • feature-name (0%)               ││
│                     │ └───────────────────────────────────┘│
│                     │                                      │
│ 40%                 │ 60%                                  │
└─────────────────────┴──────────────────────────────────────┘

Keyboard Shortcuts:
• Ctrl+B → : Switch pane focus
• Ctrl+B <: Resize left (shrink right)
• Ctrl+B >: Resize right (shrink left)
• Ctrl+D: Exit active pane
• Ctrl+C: Interrupt active process
```

### Visual Indicators

**Active Pane:**
- Border color: Bright cyan (`\033[1;36m`)
- Title bar: Bold and highlighted
- Cursor visible

**Inactive Pane:**
- Border color: Dim white (`\033[2;37m`)
- Title bar: Normal weight
- Cursor hidden (if supported)

### Fallback Message (No Claude Code)

```
┌────────────────────────────────────────────────────────────┐
│ ⚠️  Claude Code Not Found                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Claude Code CLI is not installed or not in PATH.          │
│                                                            │
│ To install Claude Code:                                   │
│ https://github.com/anthropics/claude-code                 │
│                                                            │
│ After installation, run 'yoyo' again to launch split view │
│                                                            │
│ To launch TUI only: yoyo --no-split                       │
│                                                            │
│ [Launching TUI in 3 seconds...]                           │
└────────────────────────────────────────────────────────────┘
```

## Configuration

### config.yml Extension

```yaml
# Split view configuration
split_view:
  enabled: true                    # Master toggle
  ratio: 0.4                       # 40% left pane, 60% right pane
  active_pane: "claude"            # Which pane starts with focus

  # Visual styling
  border_style:
    active: "bright_cyan"          # Active pane border color
    inactive: "dim_white"          # Inactive pane border color

  # Keyboard shortcuts (customize if needed)
  shortcuts:
    switch_focus: "ctrl+b+arrow"   # Switch pane focus
    resize_left: "ctrl+b+<"        # Make left pane larger
    resize_right: "ctrl+b+>"       # Make right pane larger

  # Claude Code settings
  claude:
    command: "claude"              # Command to launch Claude
    auto_cwd: true                 # Auto-attach to current directory
    fallback_delay: 3              # Seconds to wait before launching TUI only
```

### Command Line Flags

```bash
# Launch split view (default)
yoyo

# Launch TUI only (skip Claude Code)
yoyo --no-split

# Override split ratio
yoyo --split-ratio 0.5  # 50/50 split

# Start with specific pane focused
yoyo --focus claude
yoyo --focus tui
```

## Implementation Phases

### Phase 1: Terminal Control Foundation (Week 1)
- Implement `TerminalController` with escape sequences
- Handle alternate screen buffer
- Implement resize detection (SIGWINCH)
- Test on multiple terminal emulators

### Phase 2: Pane Management (Week 1)
- Implement `Pane` class with pty integration
- Create `LayoutManager` for split calculations
- Implement `FocusManager` for active pane tracking
- Add keyboard input routing

### Phase 3: Split View Orchestration (Week 2)
- Implement `SplitViewManager`
- Integrate Claude Code launcher
- Handle process lifecycle (spawn/cleanup)
- Implement independent exit handling

### Phase 4: Layout Persistence (Week 2)
- Extend config.yml schema
- Implement save/load functionality
- Add command-line flag overrides
- Test persistence across sessions

### Phase 5: Visual Polish & UX (Week 2)
- Implement active pane indicators
- Add border styling
- Create fallback message UI
- Add keyboard shortcut hints

### Phase 6: Testing & Documentation (Week 3)
- Unit tests for all components
- Integration tests for split view
- Test Claude Code detection/fallback
- Update user documentation
- Create demo video/screenshots

## Testing Strategy

### Unit Tests

**Terminal Control:**
- Escape sequence generation
- Terminal resize handling
- Screen buffer switching

**Pane Management:**
- Split ratio calculations
- Focus tracking
- Input routing

**Layout Persistence:**
- Config save/load
- Schema validation
- Migration from old configs

### Integration Tests

**Split View Launch:**
- Both panes start successfully
- Correct split ratio applied
- Active pane indicators work

**Claude Code Detection:**
- Detects when Claude is installed
- Shows fallback message when missing
- Launches TUI after delay

**TUI Reactivity:**
- TUI updates when Claude creates files
- File watcher works in split view
- Real-time statistics update

### Manual Testing

**Terminal Emulators:**
- GNOME Terminal
- Konsole
- Alacritty
- Kitty
- Terminator

**User Scenarios:**
- First-time launch (no config)
- Persistent layout restoration
- Resize behavior
- Keyboard shortcuts
- Independent pane exit

## Edge Cases

**1. Terminal Too Small**
- Minimum size: 120x30 characters
- Show error message if smaller
- Suggest increasing terminal size

**2. Claude Code Process Crash**
- Detect process exit
- Show error message in Claude pane
- Offer to restart or continue with TUI only

**3. TUI Process Crash**
- Detect process exit
- Clean up terminal state
- Return to normal shell prompt

**4. Rapid Terminal Resize**
- Debounce resize events (100ms)
- Recalculate layout smoothly
- Prevent flickering

**5. Config File Corruption**
- Validate config on load
- Fall back to defaults if invalid
- Log warning message

## Success Metrics

**Developer Productivity:**
- Time to start coding: Reduced from 30s (two terminals) to 5s (one command)
- Context switches per hour: Reduced by 50%
- User satisfaction: 80%+ positive feedback

**Technical Metrics:**
- Launch time: < 3 seconds
- Pane switch time: < 100ms
- TUI update latency: < 500ms
- Crash rate: < 0.1% of sessions

**Adoption:**
- 70%+ of users use split view as default
- 90%+ keep split view enabled after trying it

## Documentation Updates

**README.md:**
- Add split view section with screenshot
- Document keyboard shortcuts
- Add troubleshooting section

**CLAUDE.md:**
- Update Quick Start with split view info
- Add configuration reference
- Note platform support (Linux)

**User Guide:**
- Create dedicated split view guide
- Add video walkthrough
- Include customization examples

## Future Enhancements (Out of Scope)

**V2 Features:**
- Three-pane layout (Claude + TUI + Terminal)
- Vertical/horizontal split toggle
- Saved layout presets
- macOS support
- Windows WSL support
- Mouse-based pane resizing
- Sync clipboard between panes

**V3 Features:**
- Multi-project workspace
- Split view profiles
- Custom pane commands (not just Claude)
- Integration with tmux/screen for advanced users

## Dependencies

**Python Libraries:**
- `pty` (built-in) - Pseudo-terminal management
- `select` (built-in) - Non-blocking I/O
- `signal` (built-in) - Signal handling (SIGWINCH)
- `shutil` (built-in) - Claude Code detection

**External:**
- Claude Code CLI (optional) - Will be detected at runtime

## Risks & Mitigations

**Risk 1: Terminal Compatibility Issues**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:** Test on major terminal emulators, provide fallback mode

**Risk 2: Complex Terminal Control**
- **Likelihood:** High
- **Impact:** Medium
- **Mitigation:** Use well-documented escape sequences, thorough testing

**Risk 3: Performance Degradation**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Profile and optimize, use buffering

**Risk 4: User Confusion**
- **Likelihood:** Medium
- **Impact:** Low
- **Mitigation:** Clear documentation, keyboard shortcut hints, good defaults

## Open Questions

1. Should we support custom commands in the left pane (not just Claude Code)?
2. Should there be a global keyboard shortcut to toggle split view on/off?
3. Should we auto-detect Claude Code updates and show notifications?
4. Should layout persist globally or per-project only?

## Conclusion

This feature transforms Yoyo Dev from a dashboard tool into a complete integrated development environment. By combining Claude Code and the TUI dashboard in a single split view, we dramatically reduce context switching and improve developer workflow. The built-in terminal splitting ensures no external dependencies, while graceful fallback ensures the TUI remains usable even without Claude Code installed.
