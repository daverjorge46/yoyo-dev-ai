# Fix Tasks: TUI ProjectOverview Widget Initialization Error

**Fix:** `.yoyo-dev/fixes/2025-10-30-tui-project-overview-kwargs/`
**Created:** 2025-10-30
**Status:** Ready for execution

---

## Task 1: Fix ProjectOverview widget initialization

**Description:** Update `ProjectOverview.__init__()` to extract `mcp_monitor` parameter before calling parent class.

**Dependencies:** None

**Files to Create:** None

**Files to Modify:**
  - `lib/yoyo_tui_v3/widgets/project_overview.py`

**Parallel Safe:** Yes

### Subtasks

- [x] 1.1 Write test for ProjectOverview initialization with mcp_monitor parameter
- [x] 1.2 Update `__init__` signature to extract `mcp_monitor` explicitly
- [x] 1.3 Store `mcp_monitor` as instance variable
- [x] 1.4 Verify all tests pass

**Implementation Notes:**

Update signature from:
```python
def __init__(self, data_manager, event_bus, **kwargs):
    super().__init__(**kwargs)
    self.data_manager = data_manager
    self.event_bus = event_bus
```

To:
```python
def __init__(self, data_manager, event_bus, mcp_monitor=None, **kwargs):
    super().__init__(**kwargs)
    self.data_manager = data_manager
    self.event_bus = event_bus
    self.mcp_monitor = mcp_monitor
```

---

## Task 2: Verify fix and audit similar patterns

**Description:** Manually test TUI launch and audit codebase for similar kwargs issues in other widgets.

**Dependencies:** Task 1

**Files to Create:** None

**Files to Modify:** None

**Parallel Safe:** No (depends on Task 1)

### Subtasks

- [x] 2.1 Manually test `yoyo` command launches successfully
- [x] 2.2 Verify ProjectOverview widget renders correctly in TUI
- [x] 2.3 Search for similar `super().__init__(**kwargs)` patterns in other widgets
- [x] 2.4 Document any additional issues found (if any)

**Verification Commands:**
```bash
# Test TUI launch
yoyo

# Expected: Dashboard launches without TypeError
# Expected: ProjectOverview panel displays mission, tech stack, stats
```

**Search Pattern:**
```bash
# Find similar patterns that might have same issue
grep -r "super().__init__(\*\*kwargs)" lib/yoyo_tui_v3/widgets/
```

---

## Execution Summary

**Total Tasks:** 2
**Total Subtasks:** 8
**Estimated Time:** 15-20 minutes
**Risk Level:** Low

**Next Step:** Run `/execute-tasks` to implement the fix.
