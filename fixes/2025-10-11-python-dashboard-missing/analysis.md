# Problem Analysis

> Fix: python-dashboard-missing
> Created: 2025-10-11
> Priority: HIGH

## Problem Description

After running `yoyo-update` to upgrade from an old version of Yoyo Dev, the Python dashboard pane no longer displays when running the `yoyo` command. The right pane appears briefly for a second and then disappears, leaving only the left pane visible.

## Reproduction Steps

1. Update Yoyo Dev from an older version using `~/.yoyo-dev/setup/yoyo-update.sh`
2. Run `yoyo` command in a Yoyo Dev project directory
3. Observe the tmux split-pane layout

**Expected Behavior**: Two-pane tmux layout with:
- Left pane (65%): Claude Code with branded header
- Right pane (35%): Python dashboard showing task status

**Actual Behavior**:
- Left pane displays correctly
- Right pane appears briefly then crashes/exits
- User left with single pane only

## Root Cause

The Python dashboard crashes immediately on startup due to a **missing import** for the `Group` class from `rich.console`.

**Technical Explanation**:
1. The `yoyo-dashboard.py` script imports `Group` locally inside the `_create_layout()` method (line 491)
2. However, `Group` is used in the `_render_header()` method (line 517) where it's not in scope
3. When the dashboard tries to render, it throws `NameError: name 'Group' is not defined`
4. This causes the dashboard to crash immediately, which appears as the pane disappearing

**Note**: During investigation, we also found and fixed a filename reference issue in `yoyo-tmux.sh` line 167, though this turned out to already be corrected in the current version.

**Affected Files**:
- `~/.yoyo-dev/lib/yoyo-dashboard.py:58` - Missing `Group` import in module-level imports
- `~/.yoyo-dev/lib/yoyo-dashboard.py:491` - Redundant local import needs removal

## Impact Assessment

- **Severity**: HIGH
- **Affected Users**: All users running `yoyo` command with Python dashboard
- **Affected Functionality**: Python dashboard display in tmux split-pane layout
- **Workaround Available**: NO - The dashboard pane crashes immediately, making the visual monitoring feature unusable

## Solution Approach

Add `Group` to the module-level imports from `rich.console` and remove the redundant local import.

**Implementation Steps**:
1. Add `Group` to the import statement on line 58: `from rich.console import Console, Group`
2. Remove the local import from `_create_layout()` method (line 491)
3. Test the dashboard runs without crashing
4. Verify the `yoyo` command displays both panes correctly

**Testing Strategy**:
- Manual test: Run dashboard directly: `~/.yoyo-dev/venv/bin/python3 ~/.yoyo-dev/lib/yoyo-dashboard.py`
- Manual test: Run `yoyo` command and verify two-pane layout appears
- Manual test: Verify Python dashboard displays in right pane without crashing
- Manual test: Test manual refresh keybinding (Ctrl+B r) works correctly
- Edge case: Verify fallback to bash dashboard still works when Python deps missing

**Risk Assessment**:
- **Breaking Changes**: NO - This is a bug fix correcting a missing import
- **Performance Impact**: NEUTRAL - No performance implications
- **Side Effects**: NONE - Simple import correction
