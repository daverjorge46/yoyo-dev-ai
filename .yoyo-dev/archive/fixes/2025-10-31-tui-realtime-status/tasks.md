# Fix Tasks Checklist

> Fix: tui-realtime-status
> Created: 2025-10-31

## Task 1: Write Tests for Bug Reproduction

- [ ] Create test for DataManager missing methods (should fail initially)
- [ ] Create test for ActiveWork dataclass access in CommandSuggester (should fail)
- [ ] Create test for CommandPalette widget integration (should fail)
- [ ] Verify all reproduction tests fail consistently

## Task 2: Add DataManager Integration Methods

- [ ] Add `__init__` parameters for command_suggester and error_detector to DataManager
- [ ] Implement `get_command_suggestions()` method that delegates to CommandSuggester
- [ ] Implement `get_recent_errors()` method that delegates to ErrorDetector
- [ ] Update DataManager initialization in main.py to pass services
- [ ] Verify reproduction tests for DataManager now pass

## Task 3: Fix ActiveWork Type Handling in CommandSuggester

- [ ] Update `generate_suggestions()` to handle ActiveWork dataclass (line 85-88)
- [ ] Change `active_work.get("tasks")` to `active_work.tasks` attribute access
- [ ] Change `active_work.get("progress")` to `active_work.progress`
- [ ] Change `active_work.get("status")` to `active_work.status`
- [ ] Change `active_work.get("pr_url")` to `active_work.pr_url`
- [ ] Update all command suggester rule methods for dataclass handling
- [ ] Verify ActiveWork tests now pass

## Task 4: Add Integration Tests

- [ ] Write test for widget → DataManager → CommandSuggester flow
- [ ] Write test for widget → DataManager → ErrorDetector flow
- [ ] Write test for ActiveWork dataclass attribute access
- [ ] Write test for event-driven updates triggering widget refresh
- [ ] Verify all new tests pass

## Task 5: Manual Verification and Testing

- [ ] Launch TUI dashboard and verify Active Work panel shows current status
- [ ] Verify Command Palette displays intelligent suggestions
- [ ] Create/modify a spec and verify real-time updates
- [ ] Test all keyboard shortcuts and panel navigation
- [ ] Check console for any errors or warnings
- [ ] Run full test suite to ensure no regressions
- [ ] Verify fix resolves original issue completely
