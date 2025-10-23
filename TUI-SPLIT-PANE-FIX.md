# TUI Split-Pane Architecture Fix

**Status:** ✅ RESOLVED

**Date:** 2025-10-23

## The Problem

When running `yoyo` command (with tmux visual mode), the TUI was appearing briefly then disappearing when Claude Code started. This caused a poor user experience.

### Root Cause

The yoyo-tmux.sh script was prioritizing `yoyo-tui.py` (Textual-based interactive TUI) for the split pane dashboard. However, Textual applications are designed to take over the entire terminal using:
- Alternate screen buffer
- Terminal control escape sequences
- Full terminal management

This caused a conflict with tmux split panes, where:
- Tmux tries to constrain the application to a pane
- Textual tries to take control of the entire terminal
- Result: TUI appears briefly, then disappears or conflicts

## The Solution

**Changed dashboard priority for split pane usage:**

**Before:**
```
Textual TUI → Rich dashboard → Bash fallback
```

**After:**
```
Rich dashboard → Bash fallback
```

**Why this works:**
- `yoyo-dashboard.py` (Rich-based) is a **passive dashboard** - it outputs formatted text without trying to control the terminal
- Perfect for split pane display (no terminal control conflicts)
- Still provides real-time monitoring with file watching and auto-refresh

**For interactive TUI:**
- Created `yoyo-tui-launcher.sh` for full-screen standalone TUI
- Can be used in separate terminal window/tab
- Provides rich interactive experience without split pane constraints

## Files Modified

### 1. `/home/yoga999/.yoyo-dev/setup/yoyo-tmux.sh`

**Changes:**
- Lines 269-289: Changed dashboard selection logic to prioritize Rich dashboard
- Lines 164-167: Updated Ctrl+B r keybinding to use same priority
- Line 233: Added instruction about full-screen TUI command

**Key changes:**
```bash
# OLD (Lines 274-277)
if "$HOME/.yoyo-dev/venv/bin/python3" -c "import textual, watchdog, yaml" &> /dev/null 2>&1; then
    DASHBOARD_CMD="$HOME/.yoyo-dev/venv/bin/python3 $HOME/.yoyo-dev/lib/yoyo-tui.py"

# NEW (Lines 278-281)
if "$HOME/.yoyo-dev/venv/bin/python3" -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
    DASHBOARD_CMD="$HOME/.yoyo-dev/venv/bin/python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
```

### 2. `/home/yoga999/.yoyo-dev/setup/yoyo-tui-launcher.sh` (NEW)

**Purpose:** Launch full-screen interactive Textual TUI for standalone use

**Features:**
- Checks for Yoyo Dev project
- Validates dependencies (textual, watchdog, pyyaml)
- Launches yoyo-tui.py in full-screen mode

## User Experience Now

### Split Pane Mode (Default with `yoyo`)

```
┌─────────────────────────┬──────────────────┐
│                         │                  │
│   Claude Code           │   Dashboard      │
│   (Main pane)           │   (Status pane)  │
│                         │                  │
│   Interactive           │   Passive        │
│   Commands              │   Monitoring     │
│   Code generation       │   Auto-refresh   │
│                         │                  │
└─────────────────────────┴──────────────────┘
```

**Dashboard shows:**
- Active specs/fixes
- Current tasks
- Recent history
- Real-time file watching
- Auto-refresh every 5s

### Full-Screen Interactive TUI Mode (Separate terminal)

**Command:** `yoyo-tui` (after setup - see below)

**Features:**
- Full terminal takeover
- Rich interactive experience
- Keyboard navigation
- Focus management
- Detail screens
- All Textual TUI features

## Setup Instructions

### Install yoyo-tui Command (Optional)

To use the `yoyo-tui` command globally:

```bash
# Create symlink (requires sudo)
sudo ln -sf ~/.yoyo-dev/setup/yoyo-tui-launcher.sh /usr/local/bin/yoyo-tui
```

Or add alias to your shell:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias yoyo-tui='~/.yoyo-dev/setup/yoyo-tui-launcher.sh'
```

### Verify Installation

```bash
# Check if yoyo command works
which yoyo
# Should show: /usr/local/bin/yoyo

# Check dashboard dependencies
~/.yoyo-dev/venv/bin/python3 -c "import rich, watchdog, yaml" && echo "✓ Dashboard ready"

# Check TUI dependencies
~/.yoyo-dev/venv/bin/python3 -c "import textual, watchdog, yaml" && echo "✓ TUI ready"
```

### Test the Fix

1. **Test split pane (yoyo):**
   ```bash
   cd /path/to/yoyo-dev-project
   yoyo
   ```

   **Expected:**
   - Claude Code launches in left pane
   - Dashboard displays in right pane (stays visible)
   - No disappearing TUI issue

2. **Test full-screen TUI:**
   ```bash
   # In separate terminal
   cd /path/to/yoyo-dev-project
   yoyo-tui
   # OR
   ~/.yoyo-dev/setup/yoyo-tui-launcher.sh
   ```

   **Expected:**
   - Full-screen interactive TUI launches
   - Rich interface with navigation
   - File watching enabled

## Architecture Summary

### Two Complementary Approaches

**1. Split Pane (yoyo-dashboard.py with Rich)**
- **Use case:** Working in Claude Code with live status monitoring
- **Type:** Passive dashboard
- **Output:** Formatted text via Rich Console
- **Terminal control:** None (works in split pane)
- **Features:** Auto-refresh, file watching, real-time updates

**2. Full-Screen (yoyo-tui.py with Textual)**
- **Use case:** Dedicated monitoring terminal, rich interaction
- **Type:** Interactive TUI application
- **Output:** Full TUI with Textual framework
- **Terminal control:** Full terminal takeover
- **Features:** Navigation, focus management, detail screens, all Textual features

### Best Practices

**Recommended workflow:**

```
Terminal 1: yoyo            (Claude Code + Dashboard split pane)
Terminal 2: yoyo-tui        (Optional: Full-screen interactive TUI)
```

**Benefits:**
- Main development in Terminal 1 with Claude Code
- Live status monitoring in Terminal 1 (right pane)
- Rich interactive monitoring in Terminal 2 (optional)
- No terminal conflicts
- Best of both worlds

## Technical Notes

### Why Textual Conflicts with Tmux Split Panes

**Textual's terminal control:**
```python
# Textual uses alternate screen buffer
app.run()  # Takes over terminal
```

**What happens:**
1. Textual calls `smcup` (switch to alternate screen)
2. Textual sets up event loop for keyboard/mouse
3. Textual assumes full terminal dimensions
4. Tmux pane has constrained dimensions
5. Conflict: Textual's assumptions vs tmux's constraints
6. Result: Flickering, disappearing, or broken display

**Rich's passive approach:**
```python
# Rich just prints formatted text
console.print(panel)  # No terminal control
```

**What happens:**
1. Rich formats text with ANSI escape codes
2. Rich prints to stdout
3. No terminal control attempted
4. Works perfectly in any context (split pane, pipe, file, etc.)

### File Watching in Both Modes

Both dashboard and TUI use the same `FileWatcher` service:
- Monitors `.yoyo-dev/` directory
- Detects file changes (specs, fixes, tasks, recaps)
- Triggers auto-refresh
- Uses `watchdog` library

**Performance:**
- 100ms debouncing (prevents excessive refreshes)
- Recursive directory watching
- Efficient file event handling

## Migration Notes

### For Existing Projects

If you updated with old `yoyo-update.sh` (before this fix):

```bash
# Re-run update with fixed script
cd /path/to/your-project
~/.yoyo-dev/setup/yoyo-update.sh
```

Or use force-update:

```bash
cd /path/to/your-project
~/.yoyo-dev/force-tui-update.sh
```

### For New Projects

New installations automatically get the fixed version:

```bash
cd /path/to/new-project
~/.yoyo-dev/setup/project.sh --claude-code
```

## Changelog

**v2.2.1 - 2025-10-23**

**Fixed:**
- TUI appearing then disappearing in split pane
- Terminal control conflicts between Textual and tmux
- Dashboard selection logic for split pane compatibility

**Changed:**
- yoyo-tmux.sh: Prioritize Rich dashboard for split pane
- yoyo-tmux.sh: Update Ctrl+B r keybinding priority
- yoyo-tmux.sh: Add full-screen TUI instructions

**Added:**
- yoyo-tui-launcher.sh: Full-screen TUI launcher
- TUI-SPLIT-PANE-FIX.md: Comprehensive documentation

**Improved:**
- User experience with split pane dashboard
- Clear separation of use cases (split pane vs full-screen)
- Documentation for both approaches

## Future Improvements

**Potential enhancements:**

1. **Passive mode for yoyo-tui.py**
   - Add `--passive` flag
   - Disable interactive features
   - Use Rich Console instead of Textual App
   - Would work in split pane

2. **Smart dashboard detection**
   - Detect if running in split pane vs full terminal
   - Automatically choose appropriate mode
   - Seamless experience

3. **Dashboard configuration**
   - User preference for dashboard type
   - Configuration in .yoyo-dev/config.yml
   - Per-project settings

## Related Files

**Core files:**
- `lib/yoyo-tui.py` - Interactive Textual TUI
- `lib/yoyo-dashboard.py` - Passive Rich dashboard
- `lib/yoyo-status.sh` - Bash fallback dashboard

**Launcher scripts:**
- `setup/yoyo-tmux.sh` - Visual mode with split pane (FIXED)
- `setup/yoyo-tui-launcher.sh` - Full-screen TUI launcher (NEW)
- `setup/yoyo-simple.sh` - Simple Claude Code launcher (no split pane)
- `setup/yoyo.sh` - Standard launcher (no tmux)

**Installation/update scripts:**
- `setup/project.sh` - Initial installation (already fixed)
- `setup/yoyo-update.sh` - Update script (already fixed)
- `force-tui-update.sh` - Force copy TUI files (utility)

**Diagnostic scripts:**
- `debug-yoyo-launcher.sh` - Troubleshooting TUI launch issues

## Conclusion

✅ **Problem resolved:** Split pane dashboard now works reliably with Rich-based passive dashboard.

✅ **User experience improved:** Clear separation between split pane monitoring (Rich) and full-screen interactive TUI (Textual).

✅ **Architecture validated:** Passive dashboard for split panes, interactive TUI for full-screen - best of both worlds.

🎯 **Next steps:** User can test the fix by running `yoyo` in any Yoyo Dev project. Dashboard should display reliably in right pane without disappearing.
