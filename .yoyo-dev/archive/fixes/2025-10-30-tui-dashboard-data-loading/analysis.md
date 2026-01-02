# Problem Analysis

> Fix: tui-dashboard-data-loading
> Created: 2025-10-30
> Priority: HIGH

## Problem Description

The Yoyo Dev TUI v3.0 dashboard launches successfully but displays no project data. All panels show empty states or error messages despite `.yoyo-dev/` directory containing valid specs, fixes, and product documentation.

**User-Visible Symptoms**:
- Project Overview panel shows "Error loading mission"
- Tech Stack shows "Not specified"
- Quick Stats shows "No stats available"
- MCP Server shows "Status unknown"
- Active Work panel shows "All Specs (0)" and "All Fixes (0)" even when specs/fixes exist
- Recent History panel shows "No recent activity"
- Refresh (pressing `r`) does not update any panels

## Reproduction Steps

1. Navigate to Yoyo Dev project with `.yoyo-dev/` directory containing:
   - `.yoyo-dev/product/mission-lite.md`
   - `.yoyo-dev/product/tech-stack.md`
   - `.yoyo-dev/specs/2025-10-29-fix-project-install-directory/`
   - `.yoyo-dev/specs/2025-10-30-command-workflow-integration/`
   - Multiple fix folders in `.yoyo-dev/fixes/`

2. Run `yoyo` command to launch TUI dashboard

3. Observe dashboard launches but all panels show empty/error states

**Expected Behavior**:
- Project Overview shows mission statement from mission-lite.md
- Tech Stack shows list of technologies
- Quick Stats shows counts (e.g., "Active Specs: 2", "Active Fixes: 11")
- Active Work panel shows "All Specs (2)", "All Fixes (11)"
- MCP Server shows connection status

**Actual Behavior**:
- All panels show empty states or "Error loading..." messages
- Counts show 0 for everything
- No data displayed anywhere in dashboard

## Root Cause

**Primary Issue**: Missing implementation of product file parsing and DataManager query methods

The TUI v3.0 architecture is well-designed with complete infrastructure (`EventBus`, `CacheManager`, parsers for specs/fixes/recaps) BUT the implementation is **incomplete**:

### 1. Missing Product File Parsers

**No parsers exist for product documentation files**:
- No `MissionParser` for `mission.md` / `mission-lite.md`
- No `TechStackParser` for `tech-stack.md`
- No `RoadmapParser` for `roadmap.md`

The parser infrastructure exists (see `spec_parser.py`, `fix_parser.py`, `recap_parser.py`) but product file parsers were never created.

### 2. Missing DataManager Methods

**File**: `lib/yoyo_tui_v3/services/data_manager.py`

The `ProjectOverview` widget (line 66-81 in `project_overview.py`) calls these methods:
```python
self._mission = self.data_manager.get_mission_statement()  # DOESN'T EXIST
self._tech_stack = self.data_manager.get_tech_stack_summary()  # DOESN'T EXIST
self._stats = self.data_manager.get_project_stats()  # DOESN'T EXIST
self._mcp_status = self.data_manager.get_mcp_status()  # DOESN'T EXIST
```

**None of these methods are implemented in `DataManager`**. The class only implements:
- `get_all_specs()` ✅
- `get_all_fixes()` ✅
- `get_all_recaps()` ✅
- `get_execution_progress()` ✅
- `get_recent_actions()` ✅

### 3. Specs/Fixes Loading Works But Not Displayed

The good news: `_load_all_specs()` and `_load_all_fixes()` ARE implemented and working correctly. They parse spec/fix folders and populate `self._state.specs` and `self._state.fixes`.

**However**: The dashboard crashes early when trying to load the Project Overview panel (which calls the missing methods), so the UI never gets to display the successfully-loaded specs and fixes.

**Affected Files**:
- `lib/yoyo_tui_v3/services/data_manager.py:66-82` - Missing 4 query methods
- `lib/yoyo_tui_v3/services/data_manager.py:93-133` - `initialize()` doesn't load product files
- `lib/yoyo_tui_v3/widgets/project_overview.py:62-91` - Calls non-existent methods
- `lib/yoyo_tui_v3/parsers/` - No mission/tech-stack/roadmap parsers exist
- `lib/yoyo_tui_v3/models.py` - May need `ProjectStats`, `MCPStatus` models

## Impact Assessment

- **Severity**: **HIGH** (Critical functionality completely broken)
- **Affected Users**: All users trying to use TUI dashboard (100% of TUI users)
- **Affected Functionality**:
  - Project Overview panel (crashes)
  - Stats display (all show 0)
  - Active Work counts (show 0 even when data exists)
  - MCP status (not shown)
  - Dashboard is completely unusable for monitoring project progress
- **Workaround Available**: **NO** - Dashboard cannot function without these implementations

## Solution Approach

Implement the missing parsers and DataManager methods following the existing architecture patterns (EventBus, CacheManager, defensive parsing).

### Implementation Strategy

**Phase 1: Create Product File Parsers** (following existing parser patterns)

1. **MissionParser** (`lib/yoyo_tui_v3/parsers/mission_parser.py`):
   - Parse `mission-lite.md` (or fallback to `mission.md`)
   - Extract first paragraph as mission statement
   - Defensive error handling (return None on failure)
   - Same structure as `SpecParser`, `FixParser`

2. **TechStackParser** (`lib/yoyo_tui_v3/parsers/tech_stack_parser.py`):
   - Parse `tech-stack.md`
   - Extract technology list from markdown (look for bullet points or sections)
   - Return list of strings (e.g., `["Python 3.11", "Textual", "Bash"]`)
   - Defensive error handling

3. **RoadmapParser** (`lib/yoyo_tui_v3/parsers/roadmap_parser.py`):
   - Parse `roadmap.md`
   - Extract phase information and task counts
   - Calculate statistics (total phases, completed items, etc.)
   - Used for generating project stats
   - Defensive error handling

**Phase 2: Add Missing DataManager Methods**

4. **Update `DataManager`** (`lib/yoyo_tui_v3/services/data_manager.py`):

   Add 4 new methods:
   ```python
   def get_mission_statement(self) -> Optional[str]:
       """Return first paragraph from mission-lite.md."""

   def get_tech_stack_summary(self) -> List[str]:
       """Return list of technologies from tech-stack.md."""

   def get_project_stats(self) -> Optional[ProjectStats]:
       """Return stats: active_specs, active_fixes, pending_tasks, recent_errors."""

   def get_mcp_status(self) -> Optional[MCPStatus]:
       """Delegate to MCPMonitor for current status."""
   ```

5. **Update `DataManager.initialize()`**:
   - Load mission statement (cache with key "mission")
   - Load tech stack (cache with key "tech_stack")
   - Load roadmap for stats calculation
   - Follow same pattern as `_load_all_specs()`

6. **Add Models** (if needed in `lib/yoyo_tui_v3/models.py`):
   ```python
   @dataclass
   class ProjectStats:
       active_specs: int
       active_fixes: int
       pending_tasks: int
       recent_errors: int

   @dataclass
   class MCPStatus:
       connected: bool
       server_name: Optional[str]
       error_message: Optional[str]
   ```

**Phase 3: Testing & Verification**

7. **Write Tests**:
   - Unit tests for each parser (mission, tech-stack, roadmap)
   - Unit tests for new DataManager methods
   - Integration test: Load real .yoyo-dev data and verify counts
   - End-to-end test: Launch dashboard and verify all panels show data

8. **Manual Verification**:
   - Launch dashboard with `yoyo`
   - Verify Project Overview shows mission, tech stack, stats
   - Verify Active Work shows correct spec/fix counts
   - Verify refresh (`r` key) works
   - Verify all panels update with real data

### Testing Strategy

**Unit Tests**:
- `tests/parsers/test_mission_parser.py` - Test mission extraction, fallback, errors
- `tests/parsers/test_tech_stack_parser.py` - Test tech list extraction
- `tests/parsers/test_roadmap_parser.py` - Test phase/stats extraction
- `tests/services/test_data_manager_product.py` - Test new DataManager methods

**Integration Tests**:
- `tests/integration/test_dashboard_data_loading.py` - End-to-end test with real .yoyo-dev

**Manual Tests**:
1. Launch dashboard in Yoyo Dev project
2. Verify all panels display data
3. Create new spec with `/create-new` in another terminal
4. Verify dashboard updates within 10 seconds (file watching)
5. Press `r` to refresh manually
6. Verify all data refreshes

### Risk Assessment

- **Breaking Changes**: **NO** - All changes are purely additive
  - New parsers (no existing code depends on them)
  - New DataManager methods (no existing calls to remove)
  - Existing specs/fixes loading unchanged

- **Performance Impact**: **POSITIVE**
  - Adds caching for product files (same as specs/fixes)
  - Product files only loaded once on startup + when changed
  - Cache TTL prevents repeated file reads

- **Side Effects**: **NONE**
  - Follows existing architecture patterns exactly
  - Uses same EventBus, CacheManager, error handling
  - No changes to existing working code (specs/fixes loading)

### Implementation Notes

**Follow Existing Patterns**:
- All parsers return `None` on failure (defensive)
- All parsers use `logger.error()` for debugging
- All DataManager methods are thread-safe (use `self._state_lock`)
- All product files cached with TTL (default 30 seconds)
- File watching triggers cache invalidation automatically

**Product File Locations**:
- Mission: `.yoyo-dev/product/mission-lite.md` (or `mission.md` as fallback)
- Tech Stack: `.yoyo-dev/product/tech-stack.md`
- Roadmap: `.yoyo-dev/product/roadmap.md`

**Error Handling**:
- If product files don't exist: Show sensible defaults ("No mission defined", empty tech stack list)
- If parsing fails: Log error, return None, show "Error loading..."
- Dashboard should never crash - graceful degradation
