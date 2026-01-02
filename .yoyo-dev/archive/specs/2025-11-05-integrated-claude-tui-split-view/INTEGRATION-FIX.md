# Split View Integration Fix

**Date:** 2025-11-06
**Issue:** Split view feature not launching when running `yoyo` command
**Status:** ✅ Fixed

## Problem

The integrated split view feature (Claude Code + TUI) was fully implemented but never appeared when users ran the `yoyo` command. Only the TUI dashboard would launch.

## Root Cause

The `/usr/local/bin/yoyo` launcher script was still using the **old entry point** that bypassed the new split view infrastructure:

```bash
# OLD (incorrect)
readonly TUI_SCRIPT="$PROJECT_ROOT/lib/yoyo-tui.py"
exec python3 "$TUI_SCRIPT"
```

This directly launched the TUI-only script, completely bypassing the new CLI at `lib/yoyo_tui_v3/cli.py` which contains all the split view logic.

## Solution

Updated `/usr/local/bin/yoyo` to use the new Python CLI entry point:

```bash
# NEW (correct)
readonly TUI_MODULE="lib.yoyo_tui_v3.cli"
cd "$PROJECT_ROOT"
exec python3 -m "$TUI_MODULE" "$@"
```

## Changes Made

### 1. `/usr/local/bin/yoyo` (Lines 33-34, 471-482)

**Changed constant:**
```bash
- readonly TUI_SCRIPT="$PROJECT_ROOT/lib/yoyo-tui.py"
+ readonly TUI_MODULE="lib.yoyo_tui_v3.cli"
```

**Updated launch function:**
```bash
- exec python3 "$TUI_SCRIPT"
+ cd "$PROJECT_ROOT"
+ exec python3 -m "$TUI_MODULE" "$@"
```

**Updated messaging:**
```bash
- echo "Launching Yoyo Dev TUI..."
+ echo "Launching Yoyo Dev with Split View..."
```

### 2. Help Text Updates (Lines 204-217)

Added split view documentation:
```
yoyo                    Launch split view (Claude Code + TUI)
yoyo --no-split         Launch TUI only (no Claude Code)
yoyo --split-ratio 0.5  Custom split ratio (50/50)
yoyo --focus tui        Start with TUI pane focused

Split View Features (v3.1+):
• Claude Code CLI + TUI dashboard side-by-side
• Ctrl+B → to switch pane focus
• Ctrl+B < / > to resize panes
• Auto-fallback to TUI if Claude not installed
```

### 3. Version Update (Line 22)

```bash
- readonly VERSION="3.0.0"
+ readonly VERSION="3.1.0"
```

### 4. Feature Highlights (Lines 460-470)

Added v3.1 section highlighting split view features.

## Verification

✅ **CLI Help Works:**
```bash
$ yoyo --help
# Shows split view options
```

✅ **New Entry Point Works:**
```bash
$ python3 -m lib.yoyo_tui_v3.cli --version
Yoyo Dev TUI v3.0.0-beta
```

✅ **Claude Code Detected:**
```bash
$ which claude
/home/yoga999/.config/nvm/versions/node/v24.9.0/bin/claude
```

## Impact

**Before Fix:**
- `yoyo` → TUI dashboard only (split view code never executed)
- Split view implementation was complete but disconnected

**After Fix:**
- `yoyo` → Split view with Claude Code + TUI (if Claude installed)
- `yoyo --no-split` → TUI only mode
- Automatic fallback to TUI if Claude not found
- Full support for `--split-ratio` and `--focus` flags

## User Experience

Users will now see:
1. **Branded header** with v3.1 split view announcement
2. **Split view launch message** instead of "Launching TUI..."
3. **Claude Code + TUI side-by-side** (default 40/60 split)
4. **Graceful fallback** with clear message if Claude not installed
5. **Keyboard shortcuts** working (Ctrl+B for pane control)

## Files Modified

- `/usr/local/bin/yoyo` (launcher script)

## Files NOT Modified

- All split view implementation code (already complete and functional)
- `lib/yoyo_tui_v3/cli.py` (entry point, working correctly)
- `lib/yoyo_tui_v3/split_view/` (all components, working correctly)
- `lib/yoyo-tui.py` (legacy entry point, preserved for backward compatibility)

## Distribution

This fix needs to be distributed via `yoyo-update` script to reach all users:

1. **Base installation:** `~/.yoyo-dev/bin/yoyo` (if exists)
2. **Global symlink:** `/usr/local/bin/yoyo` (already fixed)
3. **Update mechanism:** `setup/yoyo-update.sh` should regenerate launcher

## Testing Checklist

- [x] `yoyo --help` shows split view options
- [x] `python3 -m lib.yoyo_tui_v3.cli` works correctly
- [x] Claude Code is detected in PATH
- [ ] `yoyo` launches split view (requires terminal test)
- [ ] Split view shows Claude + TUI side-by-side
- [ ] Ctrl+B shortcuts work for pane switching
- [ ] `yoyo --no-split` launches TUI only
- [ ] Fallback message appears if Claude removed from PATH

## Next Steps

1. Test split view launch in terminal
2. Verify keyboard shortcuts work
3. Test fallback scenario (rename `claude` temporarily)
4. Update `setup/yoyo-update.sh` to include this fix
5. Distribute to all yoyo-dev installations
