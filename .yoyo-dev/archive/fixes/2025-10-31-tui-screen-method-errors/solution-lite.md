# Fix Summary (Lite)

**Problem**: TUI screens crash with AttributeError when pressing keyboard shortcuts due to incorrect DataManager method calls.

**Root Cause**: Screens call DataManager methods with wrong names (`get_active_specs()`, `get_history()`, `get_task_by_id()`) that don't exist in the API.

**Solution**: Update all screen files to call correct DataManager methods (`get_all_specs()`, `get_recent_history()`, add missing method or use alternative).

**Files to Modify**:
- `lib/yoyo_tui_v3/screens/tasks_screen.py` - Fix method names (2 changes)
- `lib/yoyo_tui_v3/screens/history_screen.py` - Fix method name and parameter
- `lib/yoyo_tui_v3/screens/task_detail_screen.py` - Implement alternative or add method
- `lib/yoyo_tui_v3/services/data_manager.py` - Possibly add get_task_by_id() method
