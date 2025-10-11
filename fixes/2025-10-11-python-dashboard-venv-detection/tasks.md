# Fix Tasks Checklist

> Fix: python-dashboard-venv-detection
> Created: 2025-10-11

## Task 1: Write Test Script for Bug Reproduction

- [x] Create test script that verifies dashboard selection logic
- [x] Test should check both venv and system Python scenarios
- [x] Test should verify the correct Python interpreter is selected
- [x] Verify test fails with current implementation (uses system Python only)

## Task 2: Update Dashboard Selection Logic in yoyo-tmux.sh

- [x] Modify lines 249-258 to check venv Python first
- [x] Add condition to check if `~/.yoyo-dev/venv/bin/python3` exists
- [x] Test venv Python for dependencies (`rich`, `watchdog`, `yaml`)
- [x] Use venv Python path when launching dashboard if dependencies found
- [x] Fall back to system Python check if venv doesn't exist or lacks deps
- [x] Maintain bash dashboard as final fallback
- [x] Verify test script now passes with venv scenario

## Task 3: Update Tmux Refresh Keybinding

- [x] Modify line 167 to use same venv-first logic
- [x] Update refresh command to check venv Python before system Python
- [x] Ensure refresh uses same Python interpreter as initial launch
- [x] Test refresh keybinding (Ctrl+B r) works correctly

## Task 4: Integration Testing and Verification

- [x] Test with venv installation (primary use case)
  - Install dependencies in venv
  - Run `yoyo` command
  - Verify Python Rich dashboard appears
  - Test tmux refresh keybinding
- [x] Test with system Python installation (backward compatibility)
  - Remove venv
  - Install dependencies system-wide
  - Verify Python dashboard still works
- [x] Test with no dependencies (bash fallback)
  - Remove all Python dependencies
  - Verify bash dashboard appears gracefully
  - Confirm no error messages shown
- [x] Manual testing of affected functionality
- [x] Verify fix resolves original issue (Python dashboard launches after venv install)
