# Fix Tasks Checklist

> Fix: tui-dashboard-data-loading
> Created: 2025-10-30

## Task 1: Add Missing Models (ProjectStats, MCPStatus)

**Dependencies**: None
**Files to Create**: None
**Files to Modify**: `lib/yoyo_tui_v3/models.py`
**Parallel Safe**: Yes

- [x] Check if `ProjectStats` dataclass exists in models.py
- [x] Add `ProjectStats` with fields: active_specs, active_fixes, pending_tasks, recent_errors
- [x] Check if `MCPStatus` dataclass exists in models.py
- [x] Add `MCPStatus` with fields: connected, server_name, error_message
- [x] Verify models follow existing pattern (@dataclass, Optional fields, type hints)

## Task 2: Write Tests for MissionParser (TDD - Red Phase)

**Dependencies**: Task 1
**Files to Create**: `tests/parsers/test_mission_parser.py`
**Files to Modify**: None
**Parallel Safe**: Yes

- [x] Create test file with test cases for mission parsing
- [x] Test: `test_parse_mission_lite_success` - Valid mission-lite.md returns first paragraph
- [x] Test: `test_parse_mission_fallback` - Falls back to mission.md if mission-lite missing
- [x] Test: `test_parse_missing_file` - Returns None when no mission file exists
- [x] Test: `test_parse_empty_file` - Returns None when file is empty
- [x] Test: `test_parse_truncate_long_mission` - Truncates mission over 100 chars
- [x] Run tests - verify all fail (parser doesn't exist yet)

## Task 3: Implement MissionParser (TDD - Green Phase)

**Dependencies**: Task 2
**Files to Create**: `lib/yoyo_tui_v3/parsers/mission_parser.py`
**Files to Modify**: None
**Parallel Safe**: Yes

- [x] Create MissionParser class following SpecParser pattern
- [x] Implement `parse(product_path: Path) -> Optional[str]` static method
- [x] Read mission-lite.md, extract first paragraph (split on double newline)
- [x] Implement fallback to mission.md if mission-lite doesn't exist
- [x] Add defensive error handling (return None on any exception)
- [x] Truncate to 100 chars if needed, handle empty files
- [x] Add logging with logger.debug/error
- [x] Run tests - verify all pass

## Task 4: Write Tests for TechStackParser (TDD - Red Phase)

**Dependencies**: Task 1
**Files to Create**: `tests/parsers/test_tech_stack_parser.py`
**Files to Modify**: None
**Parallel Safe**: Yes

- [x] Create test file with test cases for tech stack parsing
- [x] Test: `test_parse_tech_stack_success` - Valid tech-stack.md returns list
- [x] Test: `test_parse_bullet_list` - Extracts tech from bullet points (- Python, - Textual)
- [x] Test: `test_parse_missing_file` - Returns empty list when file missing
- [x] Test: `test_parse_empty_file` - Returns empty list when file empty
- [x] Run tests - verify all fail (parser doesn't exist yet)

## Task 5: Implement TechStackParser (TDD - Green Phase)

**Dependencies**: Task 4
**Files to Create**: `lib/yoyo_tui_v3/parsers/tech_stack_parser.py`
**Files to Modify**: None
**Parallel Safe**: Yes

- [x] Create TechStackParser class following existing pattern
- [x] Implement `parse(product_path: Path) -> List[str]` static method
- [x] Read tech-stack.md, find bullet points or sections
- [x] Extract technology names (remove markdown formatting)
- [x] Return list of strings (e.g., ["Python 3.11", "Textual", "Bash"])
- [x] Add defensive error handling (return empty list on exception)
- [x] Add logging
- [x] Run tests - verify all pass

## Task 6: Write Tests for RoadmapParser (TDD - Red Phase)

**Dependencies**: Task 1
**Files to Create**: `tests/parsers/test_roadmap_parser.py`
**Files to Modify**: None
**Parallel Safe**: Yes

- [x] Create test file with test cases for roadmap parsing
- [x] Test: `test_parse_roadmap_success` - Valid roadmap returns phase count and stats
- [x] Test: `test_count_completed_tasks` - Correctly counts [x] checkboxes
- [x] Test: `test_parse_missing_file` - Returns None when file missing
- [x] Test: `test_parse_empty_file` - Returns None when file empty
- [x] Run tests - verify all fail (parser doesn't exist yet)

## Task 7: Implement RoadmapParser (TDD - Green Phase)

**Dependencies**: Task 6
**Files to Create**: `lib/yoyo_tui_v3/parsers/roadmap_parser.py`
**Files to Modify**: None
**Parallel Safe**: Yes

- [x] Create RoadmapParser class following existing pattern
- [x] Implement `parse(product_path: Path) -> Optional[Dict]` static method
- [x] Read roadmap.md, extract phase information
- [x] Count total phases (## Phase N)
- [x] Count completed items ([x] checkboxes)
- [x] Return dict with keys: total_phases, completed_items, total_items
- [x] Add defensive error handling (return None on exception)
- [x] Add logging
- [x] Run tests - verify all pass

## Task 8: Write Tests for DataManager Product Methods (TDD - Red Phase)

**Dependencies**: Task 3, Task 5, Task 7
**Files to Create**: `tests/services/test_data_manager_product.py`
**Files to Modify**: None
**Parallel Safe**: No (depends on Tasks 3, 5, 7)

- [x] Create test file with test cases for new DataManager methods
- [x] Test: `test_get_mission_statement` - Returns mission from MissionParser
- [x] Test: `test_get_tech_stack_summary` - Returns list from TechStackParser
- [x] Test: `test_get_project_stats` - Returns ProjectStats with correct counts
- [x] Test: `test_get_mcp_status` - Delegates to MCPMonitor
- [x] Test: `test_initialize_loads_product_files` - Verify initialize() loads product data
- [x] Test: `test_product_file_caching` - Verify caching works for product files
- [x] Run tests - verify all fail (methods don't exist yet)

## Task 9: Implement DataManager Product Methods (TDD - Green Phase)

**Dependencies**: Task 8
**Files to Create**: None
**Files to Modify**: `lib/yoyo_tui_v3/services/data_manager.py`
**Parallel Safe**: No (depends on Task 8)

- [x] Add `_mission` and `_tech_stack` instance variables to `__init__`
- [x] Implement `get_mission_statement() -> Optional[str]` method
- [x] Implement `get_tech_stack_summary() -> List[str]` method
- [x] Implement `get_project_stats() -> Optional[ProjectStats]` method
- [x] Implement `get_mcp_status() -> Optional[MCPStatus]` method (delegate to mcp_monitor)
- [x] Update `initialize()` to load mission and tech stack with caching
- [x] Add cache keys: "mission", "tech_stack"
- [x] Ensure thread-safety with `self._state_lock` where needed
- [x] Run tests - verify all pass

## Task 10: Integration Test - End-to-End Dashboard Data Loading

**Dependencies**: Task 9
**Files to Create**: `tests/integration/test_dashboard_data_loading.py`
**Files to Modify**: None
**Parallel Safe**: No (depends on Task 9)

- [x] Create integration test with real .yoyo-dev fixture
- [x] Test: Create DataManager with real product/specs/fixes data
- [x] Test: Verify get_mission_statement() returns non-None
- [x] Test: Verify get_tech_stack_summary() returns list with items
- [x] Test: Verify get_project_stats() shows correct counts (specs, fixes)
- [x] Test: Verify get_all_specs() returns specs (existing functionality still works)
- [x] Test: Verify get_all_fixes() returns fixes (existing functionality still works)
- [x] Run test - verify passes

## Task 11: Manual Verification - Dashboard Display

**Dependencies**: Task 10
**Files to Create**: None
**Files to Modify**: None
**Parallel Safe**: No (depends on Task 10)

- [x] Launch dashboard with `yoyo` command
- [x] Verify Project Overview shows mission statement (not "Error loading mission")
- [x] Verify Tech Stack shows list of technologies (not "Not specified")
- [x] Verify Quick Stats shows counts (not "No stats available")
- [x] Verify Active Work shows "All Specs (N)", "All Fixes (M)" with correct counts
- [x] Verify Recent History works (if data exists)
- [ ] Press `r` to refresh - verify panels update
- [ ] Verify no Python errors or tracebacks in console

## Task 12: Regression Testing - Ensure Existing Features Work

**Dependencies**: Task 11
**Files to Create**: None
**Files to Modify**: None
**Parallel Safe**: No (depends on Task 11)

- [ ] Run full test suite: `pytest tests/ -v`
- [ ] Verify all existing tests still pass (no regressions)
- [ ] Verify spec loading still works (test with real spec folder)
- [ ] Verify fix loading still works (test with real fix folder)
- [ ] Verify file watching still works (modify tasks.md, check dashboard updates)
- [ ] Check code coverage - ensure new code has adequate tests
- [ ] Document any test failures and fix before marking complete
