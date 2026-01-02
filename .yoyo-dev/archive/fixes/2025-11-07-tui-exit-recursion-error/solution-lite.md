# Fix Summary (Lite)

**Problem**: TUI exit via "q" key causes recursion errors and hangs, requiring Ctrl+C force-quit

**Root Cause**: EventBus handlers never unsubscribed in `on_unmount()` methods, causing calls to destroyed objects during shutdown

**Solution**: Implement proper cleanup by calling `event_bus.unsubscribe()` for all registered handlers in each screen/widget's `on_unmount()` method

**Files to Modify**:
- `lib/yoyo_tui_v3/screens/main_dashboard.py` - Add unsubscribe for 5 handlers
- `lib/yoyo_tui_v3/widgets/command_palette.py` - Add `on_unmount()` method with unsubscribe for 3 handlers
- `lib/yoyo_tui_v3/screens/task_detail_screen.py` - Add unsubscribe calls
- `lib/yoyo_tui_v3/screens/spec_detail_screen.py` - Add unsubscribe calls
- `lib/yoyo_tui_v3/app.py` - Review and add any missing cleanup
