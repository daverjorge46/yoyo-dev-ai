# Problem Analysis

> Fix: tui-exit-recursion-error
> Created: 2025-11-07
> Priority: HIGH

## Problem Description

When users press "q" to quit the Yoyo Dev TUI application, they encounter recursion errors and the app fails to exit cleanly. Users must force-quit with Ctrl+C, resulting in a KeyboardInterrupt exception.

## Reproduction Steps

1. Launch the TUI with `yoyo` command
2. Press "q" key to quit
3. Observe recursion errors: "Error in event handler for EventType.COMMAND_SUGGESTIONS_UPDATED: maximum recursion depth exceeded while calling a Python object"
4. App hangs and requires Ctrl+C to force exit

**Expected Behavior**: Pressing "q" should cleanly exit the TUI application with no errors

**Actual Behavior**: Recursion errors occur, app hangs, requires force-quit with KeyboardInterrupt

## Root Cause

Event handler memory leak during application shutdown. When screens and widgets mount, they subscribe to EventBus events in their `on_mount()` methods. However, the corresponding `on_unmount()` methods never call `event_bus.unsubscribe()` to clean up these handler references.

When `app.exit()` is called, the unmount sequence begins but handlers remain registered in the EventBus. The EventBus retains references to handler methods on partially-destroyed or unmounted objects. When final events fire during shutdown (like `COMMAND_SUGGESTIONS_UPDATED`), the EventBus attempts to call methods on objects in invalid states, causing recursion errors and preventing clean exit.

**Affected Files**:
- `lib/yoyo_tui_v3/screens/main_dashboard.py:198-229` - Subscribes 5 handlers, empty `on_unmount()`
- `lib/yoyo_tui_v3/widgets/command_palette.py:44-52` - Subscribes 3 handlers, missing `on_unmount()` method entirely
- `lib/yoyo_tui_v3/screens/task_detail_screen.py:155-158` - Empty `on_unmount()` with TODO comment
- `lib/yoyo_tui_v3/screens/spec_detail_screen.py` - Similar pattern of missing cleanup
- `lib/yoyo_tui_v3/app.py:231-238` - Only stops refresh service, doesn't unsubscribe app-level handlers

## Impact Assessment

- **Severity**: HIGH
- **Affected Users**: All users (100%)
- **Affected Functionality**: Application exit via "q" key binding
- **Workaround Available**: YES - Force-quit with Ctrl+C (but creates ugly error traces)

## Solution Approach

Implement proper lifecycle management for EventBus subscriptions by adding cleanup logic to all `on_unmount()` methods. Each screen/widget must track which handlers it registered during `on_mount()` and explicitly unsubscribe them during `on_unmount()`.

**Implementation Steps**:
1. Add `on_unmount()` method to CommandPalettePanel widget with proper unsubscribe calls
2. Implement cleanup in MainDashboard screen's `on_unmount()` to unsubscribe all 5 handlers
3. Implement cleanup in TaskDetailScreen's `on_unmount()` to unsubscribe handlers
4. Implement cleanup in SpecDetailScreen's `on_unmount()` to unsubscribe handlers
5. Review and implement cleanup in any other screens/widgets following the same pattern
6. Add tests to verify clean shutdown without recursion errors

**Testing Strategy**:
- Unit tests for each screen/widget's unmount cleanup
- Integration test for full app exit sequence
- Manual testing: Launch app, press "q", verify clean exit with no errors
- Verify no memory leaks by checking EventBus handler count after unmount

**Risk Assessment**:
- **Breaking Changes**: NO - This is internal cleanup logic only
- **Performance Impact**: POSITIVE - Prevents memory leaks and enables proper garbage collection
- **Side Effects**: NONE - Improves stability and exit behavior without affecting runtime functionality
