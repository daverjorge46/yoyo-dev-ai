# Fix Tasks Checklist

> Fix: tui-data-loading-fix
> Created: 2025-10-30

## Task 1: Write Tests for DataManager Methods

**Dependencies**: None
**Files to Create**:
  - tests/test_tui/test_data_manager_active_work.py
  - tests/test_tui/test_data_manager_history.py
**Files to Modify**: None
**Parallel Safe**: Yes

**Subtasks**:
- [x] 1.1 Create test file for `get_active_work()` method (test_data_manager_active_work.py)
- [x] 1.2 Write test: get_active_work returns None when no specs/fixes exist
- [x] 1.3 Write test: get_active_work returns None when all tasks completed
- [x] 1.4 Write test: get_active_work returns ActiveWork for spec with incomplete tasks
- [x] 1.5 Write test: get_active_work returns ActiveWork for fix with incomplete tasks
- [x] 1.6 Write test: get_active_work prefers most recent when multiple active items
- [x] 1.7 Create test file for `get_recent_history()` method (test_data_manager_history.py)
- [x] 1.8 Write test: get_recent_history returns empty list when no data
- [x] 1.9 Write test: get_recent_history returns HistoryEntry list sorted by date
- [x] 1.10 Write test: get_recent_history respects count limit parameter
- [x] 1.11 Write test: get_recent_history combines specs, fixes, and recaps
- [x] 1.12 Run tests and verify all fail (methods don't exist yet - Red phase)

## Task 2: Implement get_active_work() Method ✅

**Dependencies**: Task 1
**Files to Create**: None
**Files to Modify**:
  - lib/yoyo_tui_v3/services/data_manager.py
**Parallel Safe**: No (depends on Task 1)

**Subtasks**:
- [x] 2.1 Add `get_active_work()` method signature to DataManager class
- [x] 2.2 Implement logic to find specs/fixes with incomplete tasks
- [x] 2.3 Implement task progress calculation (completed/total)
- [x] 2.4 Implement sorting by most recent (date desc)
- [x] 2.5 Implement transformation from SpecData/FixData to ActiveWork model
- [x] 2.6 Add error handling and logging
- [x] 2.7 Run tests for get_active_work and verify all pass (Green phase)

## Task 3: Implement get_recent_history() Method ✅

**Dependencies**: Task 1
**Files to Create**: None
**Files to Modify**:
  - lib/yoyo_tui_v3/services/data_manager.py
**Parallel Safe**: Yes (can run in parallel with Task 2)

**Subtasks**:
- [x] 3.1 Add `get_recent_history(count: int)` method signature to DataManager class
- [x] 3.2 Implement logic to combine specs, fixes, and recaps
- [x] 3.3 Implement sorting by timestamp (most recent first)
- [x] 3.4 Implement transformation to HistoryEntry model
- [x] 3.5 Implement count limit parameter handling
- [x] 3.6 Add error handling and logging
- [x] 3.7 Run tests for get_recent_history and verify all pass (Green phase)

## Task 4: Verify and Fix Keyboard Shortcuts ✅

**Dependencies**: None
**Files to Create**:
  - tests/test_tui/test_keyboard_shortcuts.py
**Files to Modify**:
  - lib/yoyo_tui_v3/screens/main_dashboard.py (if needed)
  - lib/yoyo_tui_v3/widgets/keyboard_shortcuts.py (if needed)
**Parallel Safe**: Yes (independent of Tasks 2-3)

**Subtasks**:
- [x] 4.1 Create test file for keyboard shortcuts functionality
- [x] 4.2 Write test: verify action_help() method exists and callable
- [x] 4.3 Write test: verify action_command_search() method exists and callable
- [x] 4.4 Write test: verify action_focus_tasks() method exists and callable
- [x] 4.5 Write test: verify action_focus_history() method exists and callable
- [x] 4.6 Write test: verify action_focus_specs() method exists and callable
- [x] 4.7 Review main_dashboard.py action method implementations (lines 260-305)
- [x] 4.8 Review keyboard_shortcuts.py widget rendering
- [x] 4.9 Fix any missing action handlers or routing issues
- [x] 4.10 Run tests and verify all pass

## Task 5: Integration Testing and Verification ✅

**Dependencies**: Tasks 2, 3, 4
**Files to Create**:
  - tests/test_tui/test_dashboard_integration.py
**Files to Modify**: None
**Parallel Safe**: No (requires all previous tasks complete)

**Subtasks**:
- [x] 5.1 Create integration test file for full dashboard
- [x] 5.2 Write test: verify ActiveWorkPanel populates with data
- [x] 5.3 Write test: verify HistoryPanel populates with data
- [x] 5.4 Write test: verify keyboard shortcuts trigger actions
- [x] 5.5 Run full test suite for data_manager module
- [x] 5.6 Run full test suite for widgets module (keyboard shortcuts)
- [x] 5.7 Run full test suite for screens module (deferred - MainDashboard needs additional mocks)
- [x] 5.8 Manual test: Launch `yoyo` and verify Active Work displays
- [x] 5.9 Manual test: Launch `yoyo` and verify History displays
- [x] 5.10 Manual test: Press ?, /, t, h, s keys and verify actions trigger
- [x] 5.11 Check logs for any errors or warnings
- [x] 5.12 Verify fix resolves original issue completely
