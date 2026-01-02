# Fix: TUI ProjectOverview Widget Initialization Error

**Error:** `TypeError: Widget.__init__() got an unexpected keyword argument 'mcp_monitor'`

**Root Cause:** `ProjectOverview.__init__()` passes `mcp_monitor` kwarg to parent `Widget.__init__()`, which doesn't accept custom parameters.

**Location:** `lib/yoyo_tui_v3/widgets/project_overview.py:34`

## Solution

Extract `mcp_monitor` from kwargs before calling `super().__init__()`:

```python
# BEFORE (broken)
def __init__(self, data_manager, event_bus, **kwargs):
    super().__init__(**kwargs)  # ❌ mcp_monitor in kwargs
    self.data_manager = data_manager
    self.event_bus = event_bus

# AFTER (fixed)
def __init__(self, data_manager, event_bus, mcp_monitor=None, **kwargs):
    super().__init__(**kwargs)  # ✓ Clean kwargs
    self.data_manager = data_manager
    self.event_bus = event_bus
    self.mcp_monitor = mcp_monitor
```

## Impact
- **Severity:** Critical (blocks TUI launch)
- **Scope:** Single file fix
- **Risk:** Low

## Testing
```bash
yoyo  # Should launch without errors
```
