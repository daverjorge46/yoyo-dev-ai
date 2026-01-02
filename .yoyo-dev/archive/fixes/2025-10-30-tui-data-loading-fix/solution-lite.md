# Fix Summary (Lite)

**Problem**: TUI dashboard shows blank panels for Active Work and History, and keyboard shortcuts (?, /, t, h, s) don't respond.

**Root Cause**: Widgets call `DataManager.get_active_work()` and `DataManager.get_recent_history()` methods that don't exist; keyboard action handlers may not be properly wired.

**Solution**: Implement missing DataManager methods to transform loaded data into view models, and verify keyboard shortcuts are properly connected.

**Files to Modify**:
- `lib/yoyo_tui_v3/services/data_manager.py` - Add `get_active_work()` and `get_recent_history()` methods
- `lib/yoyo_tui_v3/screens/main_dashboard.py` - Verify keyboard action handlers
- `lib/yoyo_tui_v3/widgets/keyboard_shortcuts.py` - Verify display and functionality
