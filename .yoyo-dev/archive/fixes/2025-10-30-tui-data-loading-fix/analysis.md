# Problem Analysis

> Fix: tui-data-loading-fix
> Created: 2025-10-30
> Priority: HIGH

## Problem Description

The Yoyo Dev TUI dashboard (v3.0) is not displaying data from `.yoyo-dev/` directories. Specifically:

1. **Active Work Panel (left)** - Shows "No active work" despite specs/fixes with incomplete tasks existing
2. **History Panel (right)** - Shows "No recent activity" despite recaps, specs, and fixes existing
3. **Keyboard Shortcuts** - Keys `?`, `/`, `t`, `h`, `s` are not responding when pressed

The Mission and Tech Stack sections DO load correctly, indicating basic file reading works, but specs, fixes, tasks, and history remain blank.

## Reproduction Steps

1. Install or update Yoyo Dev with `yoyo-update.sh`
2. Ensure `.yoyo-dev/specs/`, `.yoyo-dev/fixes/`, `.yoyo-dev/recaps/` have data
3. Launch dashboard with `yoyo` command
4. Observe blank panels for Active Work and History
5. Press keyboard shortcuts (?, /, t, h, s)
6. Observe no response to keyboard input

**Expected Behavior**:
- Active Work panel displays most recent spec/fix with incomplete tasks
- History panel displays recent actions (specs created, fixes implemented, recaps)
- Keyboard shortcuts trigger their respective actions (help modal, command palette, panel focus)

**Actual Behavior**:
- Active Work shows "No active work"
- History shows "No recent activity"
- Keyboard shortcuts do nothing (no response, no error)

## Root Cause

**Primary Issue: Missing DataManager Interface Methods**

The TUI widgets (`active_work_panel.py`, `history_panel.py`) were built expecting specific methods on the `DataManager` class, but these methods were never implemented:

1. **Missing Method: `get_active_work()`**
   - Called by: `active_work_panel.py` line 57
   - Expected to return: `ActiveWork` model with current spec/fix data
   - Actually returns: `AttributeError` (method doesn't exist)
   - Result: Exception caught silently, displays "No active work"

2. **Missing Method: `get_recent_history(count: int)`**
   - Called by: `history_panel.py` line 73
   - Expected to return: `List[HistoryEntry]` with recent actions
   - Actually returns: `AttributeError` (method doesn't exist)
   - Result: Exception caught silently, displays "No recent activity"

**Secondary Issue: Model Transformation Gap**

The DataManager successfully loads raw data (`SpecData`, `FixData`, `RecapData` from parsers) into internal state, but there's no transformation layer to convert this data into the view models (`ActiveWork`, `HistoryEntry`) that widgets expect.

**Tertiary Issue: Keyboard Shortcuts Not Working**

Keyboard bindings are defined in both `app.py` and `main_dashboard.py`, but the actions may not be properly wired up or the keyboard shortcuts widget may not be displaying correctly.

**Affected Files**:
- `lib/yoyo_tui_v3/services/data_manager.py:1-550` - Missing `get_active_work()` and `get_recent_history()` methods
- `lib/yoyo_tui_v3/widgets/active_work_panel.py:57` - Calls non-existent method
- `lib/yoyo_tui_v3/widgets/history_panel.py:73` - Calls non-existent method
- `lib/yoyo_tui_v3/widgets/keyboard_shortcuts.py:1-100` - May need verification
- `lib/yoyo_tui_v3/screens/main_dashboard.py:260-305` - Action handlers may need verification

## Impact Assessment

- **Severity**: HIGH - Core dashboard functionality completely broken
- **Affected Users**: All users (fresh installs and updates)
- **Affected Functionality**:
  - Cannot see active work (specs/fixes in progress)
  - Cannot see recent history (recent actions/activity)
  - Cannot use keyboard navigation (severely degrades UX)
- **Workaround Available**: NO - Dashboard is primary interface, no alternative

## Solution Approach

Implement the missing DataManager methods to provide the data interface that widgets expect, and verify keyboard shortcuts are properly wired.

**Implementation Steps**:

1. **Implement `get_active_work()` method in DataManager**
   - Find most recent spec or fix with incomplete tasks
   - Calculate task progress (completed tasks / total tasks)
   - Transform parsed data (SpecData/FixData) to `ActiveWork` view model
   - Return `ActiveWork` object or `None` if no active work

2. **Implement `get_recent_history(count: int)` method in DataManager**
   - Combine specs, fixes, and recaps from internal state
   - Sort by timestamp (most recent first)
   - Transform to `HistoryEntry` view model list
   - Limit to requested count
   - Return `List[HistoryEntry]`

3. **Verify and fix keyboard shortcuts**
   - Test that Textual bindings trigger action methods
   - Verify action methods execute correctly
   - Ensure help modal/command palette components exist and display
   - Fix any action routing issues in `app.py` or `main_dashboard.py`

4. **Add comprehensive logging**
   - Log when methods are called and what data is found
   - Log keyboard events and action triggers
   - Make failures visible for easier debugging

**Testing Strategy**:
- Unit tests for `get_active_work()` with various scenarios (active spec, active fix, no active work)
- Unit tests for `get_recent_history()` with various data combinations
- Integration test that launches TUI and verifies panels populate correctly
- Manual testing of keyboard shortcuts (?, /, t, h, s)
- Visual regression testing to ensure panels display correctly

**Risk Assessment**:
- **Breaking Changes**: NO - Only adding missing methods, not modifying existing behavior
- **Performance Impact**: POSITIVE - Small additional processing (~10ms), enables core functionality that was broken
- **Side Effects**: NONE - Methods are currently missing entirely, so no existing code depends on them
