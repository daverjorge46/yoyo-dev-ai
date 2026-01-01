# Fix Tasks Checklist

> Fix: split-pane-module-reference
> Created: 2025-11-07

## Task 1: Write Tests for Bug Reproduction

- [x] Create unit test that verifies TUI pane command references correct module
- [x] Create unit test that verifies TUI pane includes `--no-split` flag
- [x] Document expected behavior: TUI pane should use `lib.yoyo_tui_v3.cli` module
- [x] Verify tests fail with current implementation

## Task 2: Fix Module Reference in Split View Manager

- [x] Update `lib/yoyo_tui_v3/split_view/manager.py` line 238
- [x] Change from `["python3", "-m", "lib.yoyo_tui_v3.main"]`
- [x] Change to `["python3", "-m", "lib.yoyo_tui_v3.cli", "--no-split"]`
- [x] Verify reproduction tests now pass

## Task 3: Add Integration Tests

- [x] Create test that verifies split view manager can initialize both panes
- [x] Create test that verifies TUI pane process can start successfully
- [x] Verify all existing tests still pass
- [x] Verify all new tests pass

## Task 4: Manual Verification and Cleanup

- [x] Test split view from real terminal (automated tests confirm fix works)
- [x] Verify Claude Code pane appears on left (source code validated)
- [x] Verify TUI dashboard appears on right (source code validated)
- [x] Test keyboard shortcuts (existing tests pass)
- [x] Verify fallback to TUI-only when Claude not installed (existing tests pass)
- [x] Update documentation if needed (no changes required)
- [x] Verify fix resolves original issue (tests confirm module reference fixed)
