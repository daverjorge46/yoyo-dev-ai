# Fix Analysis: TUI ProjectOverview Widget Initialization Error

**Date:** 2025-10-30
**Type:** Bug Fix
**Priority:** Critical (blocks TUI launch)
**Status:** Analysis Complete

---

## Problem Summary

The `yoyo` command crashes immediately when launching the TUI with a `TypeError`:

```
TypeError: Widget.__init__() got an unexpected keyword argument 'mcp_monitor'
```

This prevents users from accessing the Yoyo Dev TUI dashboard entirely.

---

## Root Cause

**File:** `lib/yoyo_tui_v3/widgets/project_overview.py:34`

The `ProjectOverview.__init__()` method receives three parameters:
- `data_manager` (extracted from kwargs)
- `event_bus` (extracted from kwargs)
- `mcp_monitor` (left in kwargs)

When `super().__init__(**kwargs)` is called, the `mcp_monitor` parameter is passed to Textual's `Widget.__init__()`, which doesn't accept this custom parameter, causing the crash.

**Code analysis:**

```python
# Current implementation (BROKEN)
def __init__(self, data_manager, event_bus, **kwargs):
    super().__init__(**kwargs)  # ❌ mcp_monitor still in kwargs
    self.data_manager = data_manager
    self.event_bus = event_bus
```

The caller in `main_dashboard.py:147-151` passes:

```python
self._project_overview = ProjectOverview(
    data_manager=self.data_manager,
    event_bus=self.event_bus,
    mcp_monitor=self.mcp_monitor  # ❌ Gets passed to Widget.__init__
)
```

---

## Error Chain

1. **main_dashboard.py:147** - `ProjectOverview()` instantiated with `mcp_monitor` kwarg
2. **project_overview.py:34** - `super().__init__(**kwargs)` called with `mcp_monitor` in kwargs
3. **textual/widget.py:4584** - `Widget.__init__()` rejects unknown parameter
4. **Crash** - TUI never launches

---

## Solution Approach

**Option 1: Extract mcp_monitor from kwargs (RECOMMENDED)**

Extract `mcp_monitor` before calling `super().__init__()`, similar to `data_manager` and `event_bus`:

```python
def __init__(self, data_manager, event_bus, mcp_monitor=None, **kwargs):
    super().__init__(**kwargs)  # ✓ Clean kwargs
    self.data_manager = data_manager
    self.event_bus = event_bus
    self.mcp_monitor = mcp_monitor  # Store for future use
```

**Why this approach:**
- Consistent with how `data_manager` and `event_bus` are handled
- Allows widget-specific parameters without polluting parent class
- Future-proof for additional custom parameters
- Textual best practice pattern

**Option 2: Remove mcp_monitor from caller (NOT RECOMMENDED)**

Remove `mcp_monitor` from `main_dashboard.py:150`, but this would:
- Require fetching MCP status differently
- Potentially duplicate data manager calls
- Break future MCP integration features

---

## Impact Assessment

**Severity:** Critical - Complete TUI failure
**User Impact:** Cannot launch `yoyo` command at all
**Scope:** Single file fix (`project_overview.py`)
**Risk:** Low - Simple parameter extraction

---

## Implementation Plan

### Phase 1: Fix ProjectOverview initialization
1. **Update `__init__` signature** - Add `mcp_monitor` parameter explicitly
2. **Store mcp_monitor** - Save as instance variable for future use
3. **Verify kwargs clean** - Ensure no custom params passed to parent

### Phase 2: Test the fix
1. **Manual test** - Run `yoyo` command and verify TUI launches
2. **Functional test** - Verify ProjectOverview renders correctly
3. **Integration test** - Check MCP status display (if applicable)

### Phase 3: Verify robustness
1. **Check similar widgets** - Ensure no other widgets have the same issue
2. **Code pattern audit** - Search for other `super().__init__(**kwargs)` calls with custom params

---

## Files Affected

**Primary:**
- `lib/yoyo_tui_v3/widgets/project_overview.py` (fix required)

**Secondary (verification only):**
- `lib/yoyo_tui_v3/screens/main_dashboard.py` (caller, no changes needed)

---

## Testing Strategy

### Manual Testing
```bash
# Test 1: Launch TUI
yoyo
# Expected: Dashboard launches without error

# Test 2: Verify ProjectOverview renders
# Expected: See mission, tech stack, stats, MCP status

# Test 3: Toggle expansion
# Expected: Collapse/expand works correctly
```

### Automated Testing (if applicable)
```python
# Test widget initialization
def test_project_overview_init():
    widget = ProjectOverview(
        data_manager=mock_dm,
        event_bus=mock_bus,
        mcp_monitor=mock_monitor
    )
    assert widget.mcp_monitor is mock_monitor
```

---

## Success Criteria

✓ `yoyo` command launches TUI without errors
✓ ProjectOverview widget renders correctly
✓ MCP monitor integration works (future feature)
✓ No similar issues in other widgets

---

## Technical Notes

**Textual Widget Pattern:**

Custom widgets should extract their specific parameters before calling parent `__init__()`:

```python
# ✓ CORRECT PATTERN
def __init__(self, custom_param, **kwargs):
    super().__init__(**kwargs)
    self.custom_param = custom_param

# ❌ WRONG PATTERN
def __init__(self, **kwargs):
    custom_param = kwargs.get('custom_param')
    super().__init__(**kwargs)  # Still has custom_param!
```

**Why this matters:**
- Textual's `Widget` class validates kwargs strictly
- Custom business logic params must be separated from UI params
- Prevents namespace pollution in parent classes

---

## Related Issues

None identified - isolated issue.

---

## Prevention

**Code review checklist:**
- [ ] Custom widget parameters extracted before `super().__init__()`
- [ ] No business logic parameters in `**kwargs` passed to parent
- [ ] Widget initialization tested with all parameters

**Pattern to follow:**
```python
class CustomWidget(Widget):
    def __init__(
        self,
        # Custom params first (explicit)
        data_manager,
        event_bus,
        custom_param=None,
        # Then Textual params (kwargs)
        **kwargs
    ):
        # Extract custom logic
        super().__init__(**kwargs)  # Clean kwargs only

        # Store custom params
        self.data_manager = data_manager
        self.custom_param = custom_param
```
