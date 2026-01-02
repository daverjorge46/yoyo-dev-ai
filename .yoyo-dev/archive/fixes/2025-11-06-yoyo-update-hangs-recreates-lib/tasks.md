# Fix Tasks Checklist

> Fix: yoyo-update-hangs-recreates-lib
> Created: 2025-11-06

## Task 1: Verify Problem Exists

- [x] Run `yoyo-update` and confirm it hangs after completion
- [x] Check if `.yoyo-dev/lib/` directory is created
- [x] Count files in duplicate lib directory
- [x] Document exact behavior and timing

## Task 2: Remove Duplicate lib Copy Operations

- [x] Remove lines 282-285: Old v2 TUI copy logic
- [x] Remove lines 299-333: TUI v3.0 update logic that creates `.yoyo-dev/lib/`
- [x] Remove lines 265-277: Any other lib copy operations
- [x] Verify no other code creates `.yoyo-dev/lib/` directory
- [x] Update comments to explain why lib copying is removed

## Task 3: Add Base Repository Detection

- [x] Add check after line 118: Detect if running in base yoyo-dev repo
- [x] Set `IS_BASE_REPO=true` if `$CURRENT_DIR` equals `$BASE_YOYO_DEV`
- [x] Skip all `.yoyo-dev/lib/` operations when `IS_BASE_REPO=true`
- [x] Add warning message if base repo tries to create duplicate lib

## Task 4: Fix Script Hanging

- [x] Add `wait` command before final exit to clean up background processes
- [x] Add explicit `exit 0` at end of script (after line 597)
- [x] Review pip timeout commands to ensure proper termination
- [x] Test that script exits cleanly without hanging

## Task 5: Test in Base Repository

- [x] Run `yoyo-update` in base yoyo-dev repository
- [x] Verify script completes and exits cleanly (no hanging)
- [x] Verify no `.yoyo-dev/lib/` directory is created
- [x] Time the execution to ensure reasonable duration
- [x] Check that all other updates complete successfully

## Task 6: Test in Project Installation

- [x] Verified TUI works correctly (references base installation)
- [x] Confirmed no duplicate lib issues

## Task 7: Verification and Documentation

- [x] Run full test suite if available
- [x] Verify both issues are resolved:
  - [x] Script exits cleanly without hanging
  - [x] No `.yoyo-dev/lib/` directory created
- [x] Update fix state.json
- [x] Create recap document
- [x] Document the correct TUI reference pattern for projects
