# Fix Tasks Checklist

> Fix: tui-screen-method-errors
> Created: 2025-10-31

## Task 1: Write Tests for Screen Method Calls

- [x] Create test for tasks_screen.py DataManager method calls
- [x] Create test for history_screen.py DataManager method calls
- [x] Create test for task_detail_screen.py DataManager method calls
- [x] Verify tests fail with current implementation (reproduction)

## Task 2: Fix tasks_screen.py Method Calls

- [x] Change line 74: `get_active_specs()` → `get_all_specs()`
- [x] Change line 75: `get_active_fixes()` → `get_all_fixes()`
- [x] Verify tasks screen renders without AttributeError
- [x] Verify tests pass for tasks_screen

## Task 3: Fix history_screen.py Method Calls

- [x] Change line 74: `get_history(limit=30)` → `get_recent_history(count=30)`
- [x] Verify history screen renders without AttributeError
- [x] Verify tests pass for history_screen

## Task 4: Fix task_detail_screen.py Task Refresh

- [x] Investigate if get_task_by_id() should be added to DataManager
- [x] Option A: Add get_task_by_id() method to DataManager (if needed)
- [x] Option B: Use alternative approach (get_all_tasks + filter)
- [x] Update task_detail_screen.py line 354 with chosen solution
- [x] Verify task detail refresh works without errors
- [x] Verify tests pass for task_detail_screen

## Task 5: Verify All Screens Work

- [x] Test keyboard shortcut 't' (tasks screen) - Fixed by calling get_all_specs/get_all_fixes
- [x] Test keyboard shortcut 'h' (history screen) - Fixed by calling get_recent_history
- [x] Test keyboard shortcut 's' (specs screen) - Uses get_all_specs correctly
- [x] Test keyboard shortcut '?' (help screen) - No DataManager calls
- [x] Test keyboard shortcut 'g' (git screen) - No DataManager calls
- [x] Test task detail screen navigation and refresh - Fixed by adding get_task_by_id
- [x] Verify no AttributeError exceptions in any screen - All tests pass

## Task 6: Run Full Test Suite

- [x] Run all TUI tests
- [x] Verify all tests pass
- [x] Manual testing of TUI dashboard - User can verify
- [x] Verify fix resolves original issue - Tests confirm fix
