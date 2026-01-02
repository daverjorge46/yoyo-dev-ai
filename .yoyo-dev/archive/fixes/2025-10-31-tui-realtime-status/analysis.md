# Problem Analysis

> Fix: tui-realtime-status
> Created: 2025-10-31
> Priority: HIGH

## Problem Description

The TUI dashboard's Active Work panel and Command Palette are not displaying real-time status updates. The Active Work panel doesn't reflect the actual current status of specs/fixes, and the Command Palette shows no suggestions or detected errors, making the dashboard non-functional for monitoring project state.

## Reproduction Steps

1. Launch the Yoyo Dev TUI (`yoyo` command)
2. Observe the Active Work panel - shows no active work even when specs/fixes exist
3. Observe the Command Palette - shows "No suggestions available" and "No errors detected"
4. Create or modify specs/fixes
5. Refresh the dashboard (press 'r')
6. Status still doesn't update properly

**Expected Behavior**:
- Active Work panel should display current active spec/fix with progress and task tree
- Command Palette should show intelligent suggestions based on project state
- Both panels should update automatically when state changes via EventBus

**Actual Behavior**:
- Active Work panel may show outdated or incorrect information
- Command Palette shows no suggestions or errors regardless of project state
- Real-time updates don't work

## Root Cause

Two critical architectural issues prevent real-time status updates:

### Issue 1: Missing DataManager API Methods

**Technical Explanation:**
The `CommandPalettePanel` widget calls two methods that don't exist in the `DataManager` class:
- `data_manager.get_command_suggestions()` (command_palette.py:70)
- `data_manager.get_recent_errors()` (command_palette.py:73)

These methods were never implemented in DataManager, even though the underlying services exist:
- `IntelligentCommandSuggester.generate_suggestions()` - exists but not exposed
- `ErrorDetector.get_recent_errors()` - exists but not exposed

**Why This Happens:**
The widgets were designed to use a unified DataManager API pattern, but the integration code to bridge DataManager with CommandSuggester and ErrorDetector was never written. This causes silent failures where widgets call non-existent methods, catch exceptions, and display empty states.

**Affected Files:**
- `lib/yoyo_tui_v3/services/data_manager.py` - Missing `get_command_suggestions()` and `get_recent_errors()` methods
- `lib/yoyo_tui_v3/widgets/command_palette.py:66-78` - Calls non-existent methods, catches exceptions silently
- `lib/yoyo_tui_v3/services/command_suggester.py:52` - Has `generate_suggestions()` but not accessible via DataManager

### Issue 2: ActiveWork Data Structure Type Mismatch

**Technical Explanation:**
The `IntelligentCommandSuggester` expects active_work to be a dictionary with keys:
```python
tasks = active_work.get("tasks", [])  # line 85
progress = active_work.get("progress", 0.0)  # line 86
status = active_work.get("status", "pending")  # line 87
pr_url = active_work.get("pr_url")  # line 88
```

But `DataManager.get_active_work()` returns an `ActiveWork` dataclass object with attributes:
```python
ActiveWork(type="spec", name="...", tasks=[], progress=50.0, status="in_progress")
```

**Why This Happens:**
Inconsistent data structure design - DataManager uses typed dataclasses (correct), but CommandSuggester was written to expect dictionaries. When CommandSuggester tries to call `.get()` on a dataclass, it fails.

**Affected Files:**
- `lib/yoyo_tui_v3/services/command_suggester.py:85-88` - Uses dict access patterns on dataclass
- `lib/yoyo_tui_v3/services/data_manager.py:545` - Returns ActiveWork dataclass
- `lib/yoyo_tui_v3/models.py:144-150` - ActiveWork dataclass definition

## Impact Assessment

- **Severity**: HIGH
- **Affected Users**: All developers using the TUI dashboard
- **Affected Functionality**:
  - Active Work monitoring completely non-functional
  - Command Palette intelligence system disabled
  - Real-time status updates broken
  - Dashboard essentially displays static/incorrect information
- **Workaround Available**: NO - no workaround exists, must use command line directly

## Solution Approach

Fix the architectural integration gaps and type consistency issues through systematic implementation.

**Implementation Steps:**

1. **Add DataManager API methods** - Implement `get_command_suggestions()` and `get_recent_errors()` to bridge widgets with services
2. **Initialize services in DataManager** - Store references to CommandSuggester and ErrorDetector for delegation
3. **Fix ActiveWork type handling** - Update CommandSuggester to handle ActiveWork dataclass correctly
4. **Add comprehensive tests** - Test DataManager integration, ActiveWork data flow, and event-driven updates
5. **Verify real-time updates** - Manual testing to confirm dashboard updates correctly

**Testing Strategy:**
- Unit tests for new DataManager methods
- Integration tests for widget → DataManager → service flow
- Type checking tests for ActiveWork dataclass handling
- Manual TUI testing with live state changes

**Risk Assessment:**
- **Breaking Changes**: NO - purely additive changes and bug fixes
- **Performance Impact**: NEUTRAL - no performance changes expected
- **Side Effects**: None - fixes restore intended functionality
