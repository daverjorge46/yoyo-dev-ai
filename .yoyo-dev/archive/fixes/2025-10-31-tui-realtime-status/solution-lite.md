# Fix Summary (Lite)

**Problem**: TUI dashboard Active Work and Command Palette panels don't display real-time status - widgets call non-existent DataManager methods and handle ActiveWork dataclass incorrectly.

**Root Cause**: Missing DataManager integration methods (`get_command_suggestions()`, `get_recent_errors()`) and type mismatch where CommandSuggester expects dict but receives ActiveWork dataclass.

**Solution**: Add DataManager API methods to bridge widgets with CommandSuggester/ErrorDetector services, fix ActiveWork dataclass handling in CommandSuggester, and verify event-driven updates.

**Files to Modify**:
- `lib/yoyo_tui_v3/services/data_manager.py` - Add get_command_suggestions() and get_recent_errors() methods
- `lib/yoyo_tui_v3/services/command_suggester.py` - Fix ActiveWork dataclass access (dict → attribute)
- `lib/yoyo_tui_v3/widgets/command_palette.py` - Verify error handling after fix
