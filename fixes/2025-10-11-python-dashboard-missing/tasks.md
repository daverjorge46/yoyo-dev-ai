# Fix Tasks Checklist

> Fix: python-dashboard-missing
> Created: 2025-10-11

## Task 1: Verify Current Behavior and Setup Test

- [x] 1.1 Read yoyo-tmux.sh to understand current keybinding implementation
- [x] 1.2 Verify the filename mismatch at line 167
- [x] 1.3 Document expected behavior after fix
- [x] 1.4 Create manual test plan for verification

## Task 2: Fix Filename Reference in Tmux Keybinding

- [x] 2.1 Update line 167 in yoyo-tmux.sh to replace `dashboard-python.py` with `yoyo-dashboard.py`
- [x] 2.2 Verify the fix matches the dashboard launch logic used elsewhere in the script (lines 257, 263)
- [x] 2.3 Check for any other references to the old filename in the file
- [x] 2.4 Save the changes

## Task 3: Manual Testing and Verification

- [x] 3.1 Kill any existing tmux sessions running yoyo
- [x] 3.2 Run `yoyo` command and verify two-pane layout appears
- [x] 3.3 Verify Python dashboard displays correctly in right pane
- [x] 3.4 Test manual refresh keybinding (Ctrl+B r) works correctly
- [x] 3.5 Verify fix resolves original issue (dashboard no longer crashes)
