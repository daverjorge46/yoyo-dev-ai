# Problem Analysis

> Fix: split-pane-module-reference
> Created: 2025-11-07
> Priority: HIGH

## Problem Description

Users cannot see the Claude Code split pane and TUI dashboard at the same time when running the `yoyo` command. The split view fails to launch properly because the TUI pane process cannot start.

## Reproduction Steps

1. Open a real terminal (Konsole, GNOME Terminal, etc.) with TTY
2. Navigate to a Yoyo Dev project directory
3. Run `yoyo` command
4. Expected: Split view with Claude Code (left) and TUI dashboard (right)
5. Actual: Split view fails, only TUI launches (fallback mode)

**Expected Behavior**: Split view launches with two panes visible simultaneously - Claude Code CLI on the left (40%) and Yoyo TUI dashboard (right) (60%)

**Actual Behavior**: Split view initialization fails when TUI pane tries to start, causing fallback to TUI-only mode

## Root Cause

The split view manager at `lib/yoyo_tui_v3/split_view/manager.py:238` references a non-existent module when launching the TUI pane.

**Technical Explanation**:
```python
# Current (BROKEN):
self.tui_pane = Pane(
    command=["python3", "-m", "lib.yoyo_tui_v3.main"],  # ← Module doesn't exist
    bounds=tui_bounds,
    name="Yoyo TUI"
)
```

When the Pane attempts to start, Python raises `ModuleNotFoundError: No module named 'lib.yoyo_tui_v3.main'`, causing the TUI pane process to fail immediately.

This is a regression from the recent launcher update (documented in SPLIT-VIEW-FIXED.md) where the global launcher was correctly updated to use `lib.yoyo_tui_v3.cli`, but the internal pane command wasn't updated to match.

**Affected Files**:
- `lib/yoyo_tui_v3/split_view/manager.py:238` - Incorrect module reference

## Impact Assessment

- **Severity**: HIGH
- **Affected Users**: All users attempting to use split view mode
- **Affected Functionality**: Split view mode completely non-functional
- **Workaround Available**: YES - Users can run `yoyo --no-split` for TUI-only mode, or the system auto-falls back to TUI-only

## Solution Approach

Fix the module reference to point to the correct entry point and add the `--no-split` flag to prevent recursive split view initialization.

**Implementation Steps**:
1. Change line 238 in manager.py from `lib.yoyo_tui_v3.main` to `lib.yoyo_tui_v3.cli`
2. Add `--no-split` flag to TUI pane command to prevent recursive split view
3. Write test to verify TUI pane can start with correct module
4. Verify split view launches successfully from real TTY

**Testing Strategy**:
- Unit test: Verify Pane command uses correct module path
- Unit test: Verify TUI pane includes `--no-split` flag
- Integration test: Mock pty.fork() and verify both panes start
- Manual test: Launch `yoyo` from real terminal and verify split view works

**Risk Assessment**:
- **Breaking Changes**: NO - only fixes broken functionality
- **Performance Impact**: NEUTRAL - no performance changes
- **Side Effects**: None - isolated fix in one location
