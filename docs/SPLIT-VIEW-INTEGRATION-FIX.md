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

Added split view documentation to help output.

### 3. Version Update (Line 22)

Updated version from 3.0.0 to 3.1.0.

## Verification

✅ CLI help works and shows split view options
✅ New entry point works: `python3 -m lib.yoyo_tui_v3.cli`
✅ Claude Code detected in PATH

## Impact

**After Fix:**
- `yoyo` → Split view with Claude Code + TUI (if Claude installed)
- `yoyo --no-split` → TUI only mode
- Automatic fallback to TUI if Claude not found
- Full support for `--split-ratio` and `--focus` flags

## Files Modified

- `/usr/local/bin/yoyo` (launcher script outside repo)

## Distribution

This fix updates the global launcher. The base repository launcher template should also be updated in future commits to propagate this fix via `yoyo-update`.
