# Problem Analysis

> Fix: tui-screen-method-errors
> Created: 2025-10-31
> Priority: HIGH

## Problem Description

TUI dashboard screens crash with AttributeError when users press keyboard shortcuts (t, h, ?, s, etc.). The screens attempt to call DataManager methods that don't exist, causing the application to fail when trying to display those screens.

## Reproduction Steps

1. Launch Yoyo Dev TUI with `yoyo` command
2. Press any action key:
   - `t` for Tasks screen
   - `h` for History screen
   - Or navigate to task detail and refresh
3. Application crashes with AttributeError

**Expected Behavior**: Screen should display correctly with data from DataManager

**Actual Behavior**: AttributeError is raised and screen fails to render

## Root Cause

Multiple TUI screens are calling DataManager methods with incorrect names. The screens were implemented expecting certain method signatures that don't match the actual DataManager API.

**Affected Files**:
- `lib/yoyo_tui_v3/screens/tasks_screen.py:74-75` - Calls `get_active_specs()` and `get_active_fixes()` which don't exist
- `lib/yoyo_tui_v3/screens/history_screen.py:74` - Calls `get_history(limit=30)` with wrong parameter name
- `lib/yoyo_tui_v3/screens/task_detail_screen.py:354` - Calls `get_task_by_id()` which doesn't exist

**DataManager Actual Methods**:
- `get_all_specs()` - Returns all specs
- `get_all_fixes()` - Returns all fixes
- `get_recent_history(count=10)` - Returns recent history with `count` parameter
- No `get_task_by_id()` method exists

## Impact Assessment

- **Severity**: HIGH
- **Affected Users**: All users attempting to use TUI keyboard shortcuts
- **Affected Functionality**:
  - Tasks screen (keyboard: `t`)
  - History screen (keyboard: `h`)
  - Task detail screen refresh
  - Potentially other screens with similar issues
- **Workaround Available**: NO - screens are completely unusable

## Solution Approach

Fix method calls in all affected screens to match the actual DataManager API.

**Implementation Steps**:

1. **Fix tasks_screen.py**:
   - Line 74: Change `get_active_specs()` → `get_all_specs()`
   - Line 75: Change `get_active_fixes()` → `get_all_fixes()`

2. **Fix history_screen.py**:
   - Line 74: Change `get_history(limit=30)` → `get_recent_history(count=30)`

3. **Fix task_detail_screen.py**:
   - Line 354: Need to implement alternative approach since `get_task_by_id()` doesn't exist
   - Options:
     - Add `get_task_by_id()` method to DataManager
     - Or use `get_all_tasks()` and filter by task ID
     - Or pass task data directly without refreshing from DataManager

4. **Verify no other screens have similar issues**:
   - Check all remaining screens (specs_screen, commands_screen, git_screen, help_screen)
   - Ensure they all use correct DataManager methods

**Testing Strategy**:
- Write tests to verify correct method calls
- Test each keyboard shortcut manually (t, h, ?, s, etc.)
- Verify screens render without errors
- Verify data displays correctly
- Test screen refresh functionality

**Risk Assessment**:
- **Breaking Changes**: NO - Only fixing broken functionality
- **Performance Impact**: NEUTRAL - No performance changes
- **Side Effects**: None expected - straightforward method name corrections
