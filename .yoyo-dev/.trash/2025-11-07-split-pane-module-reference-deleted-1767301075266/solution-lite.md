# Fix Summary (Lite)

**Problem**: Split view fails because TUI pane references non-existent module `lib.yoyo_tui_v3.main`

**Root Cause**: manager.py line 238 uses incorrect module path (regression from launcher update)

**Solution**: Change module reference from `lib.yoyo_tui_v3.main` to `lib.yoyo_tui_v3.cli` and add `--no-split` flag

**Files to Modify**:
- lib/yoyo_tui_v3/split_view/manager.py - Fix module reference at line 238
