# Fix Tasks Checklist

> Fix: duplicate-lib-import-error
> Created: 2025-11-06

## Task 1: Verify Problem and Affected Files

- [x] Run `yoyo` command to confirm the error still occurs
- [x] Document the exact error output
- [x] Verify `.yoyo-dev/lib/` directory exists and contains duplicate files
- [x] Check git status to see if `.yoyo-dev/lib/` is tracked
- [x] List all files in `.yoyo-dev/lib/` to understand scope

## Task 2: Remove Duplicate lib Directory

- [x] Remove `.yoyo-dev/lib/` directory completely: `rm -rf .yoyo-dev/lib/`
- [x] Verify the directory no longer exists: `ls -la .yoyo-dev/`
- [x] Check git status to confirm deletion is staged properly
- [x] Verify canonical `lib/yoyo_tui_v3/` still exists and is intact

## Task 3: Update .gitignore to Prevent Recurrence

- [x] Check if `.gitignore` exists in project root
- [x] Add `.yoyo-dev/lib/` to `.gitignore` if not already present
- [x] Add comment explaining why it's excluded: `# Prevent duplicate lib in yoyo-dev base repo`
- [x] Verify `.gitignore` syntax is correct
- [x] Commit `.gitignore` changes

## Task 4: Test TUI Launch

- [x] Run `yoyo` command from terminal
- [x] Verify TUI launches without import errors
- [x] Check that all services initialize successfully:
  - [x] EventBus
  - [x] CacheManager
  - [x] DataManager
  - [x] CommandSuggester
  - [x] ErrorDetector
  - [x] MCPServerMonitor
  - [x] RefreshService
- [x] Test split view functionality (if available)
- [x] Verify keyboard shortcuts work (? for help, q to quit)
- [x] Test from IDE context (if applicable)

## Task 5: Clean Up Python Cache Files

- [x] Remove stale bytecode in `.yoyo-dev/lib/`: Already done by removing directory
- [x] Remove stale bytecode in `lib/`: `find lib/ -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true`
- [x] Remove any `.pyc` files: `find lib/ -type f -name "*.pyc" -delete`
- [x] Re-test `yoyo` command to ensure clean state

## Task 6: Verification and Documentation

- [x] Run full verification test suite (if available)
- [x] Document the fix in `.yoyo-dev/fixes/2025-11-06-duplicate-lib-import-error/`
- [x] Update fix state.json: tasks_created, current_phase
- [x] Create recap explaining what was fixed and why
- [x] Add note to project documentation about `.yoyo-dev/lib/` exclusion
- [x] Verify fix resolves original issue completely
