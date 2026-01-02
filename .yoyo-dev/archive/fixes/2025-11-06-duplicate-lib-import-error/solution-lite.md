# Fix Summary (Lite)

**Problem**: TUI crashes with `ModuleNotFoundError: No module named 'lib'` when launching via `yoyo` command

**Root Cause**: Duplicate `.yoyo-dev/lib/` directory conflicts with canonical `lib/` causing Python module resolution failure

**Solution**: Remove `.yoyo-dev/lib/` directory and update `.gitignore` to prevent recurrence

**Files to Modify**:
- `.yoyo-dev/lib/` - DELETE entire directory
- `.gitignore` - ADD exclusion for `.yoyo-dev/lib/`
