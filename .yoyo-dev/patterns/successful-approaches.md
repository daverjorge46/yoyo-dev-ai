# Successful Approaches - Pattern Library

This document captures proven patterns and approaches from successful implementations in the Yoyo Dev framework.

## Performance Optimization Patterns

### Pattern: Shared Parsing Utilities with Caching

**Last Used:** performance-bottlenecks (2025-10-11)
**Category:** Performance / Code Quality

**Use Case:** When multiple scripts need to parse the same configuration or data files repeatedly. Especially useful for startup scripts, status monitors, or CLI tools that parse product context.

**Implementation:**
- Key files: `setup/parse-utils.sh`
- Core approach:
  - Extract common parsing logic to shared utility file
  - Implement in-memory caching with TTL (1 hour default)
  - Provide simple function interface: `get_project_mission()`, `get_tech_stack()`
  - Source utilities in consuming scripts
- Dependencies: bash/sh, sed/awk, stat for file timestamps

**Why It Works:**
- Eliminates code duplication (DRY principle)
- Caching avoids repeated file I/O and parsing
- Single source of truth makes maintenance easier
- Performance improvement from caching: 5-8x faster for repeated calls
- Graceful fallbacks for missing files

**Gotchas:**
- Cache must be invalidated when source files change (use file modification time)
- Need to handle concurrent access if multiple processes use cache
- Environment variable overrides useful for testing but need documentation
- POSIX compliance important for cross-platform support

**Code Example:**
```bash
# Source the utilities
source "$HOME/.yoyo-dev/setup/parse-utils.sh"

# Use cached parsing functions
mission=$(get_project_mission)
tech_stack=$(get_tech_stack)

# Cache is automatically managed (1-hour TTL)
# No manual invalidation needed for normal use
```

---

### Pattern: Single-Pass AWK Instead of Multiple Greps

**Last Used:** performance-bottlenecks (2025-10-11)
**Category:** Performance / Data Processing

**Use Case:** When you need to extract multiple patterns or counts from the same file. Especially effective for markdown task files, log parsing, or any multi-pattern matching scenario.

**Implementation:**
- Key files: `lib/yoyo-status.sh:76-91`
- Core approach:
  - Replace sequential grep commands with single awk script
  - Parse all patterns in one pass through the file
  - Extract multiple values simultaneously
  - Use END block to format output
- Dependencies: awk (POSIX-compliant)

**Why It Works:**
- File is read once instead of 8 times (in our case)
- Reduces system calls and I/O operations
- AWK is designed for pattern matching and data extraction
- Performance improvement: 46-50% faster for our use case
- Scales better with file size (constant overhead)

**Gotchas:**
- AWK syntax varies slightly between implementations (use POSIX-compliant features)
- Regex patterns need to be carefully tested
- Need to handle empty files and malformed input gracefully
- Output format must match what consuming code expects

**Code Example:**
```bash
# Old approach (8 separate greps):
total_tasks=$(grep -c "^##\s*Task" "$file")
completed=$(grep -c "^- \[x\]" "$file")
# ... 6 more greps ...

# New approach (single awk):
read -r total_tasks completed_subtasks total_subtasks remaining < <(
    awk '
        /^##[[:space:]]*Task/ { total_tasks++ }
        /^- \[x\]/ { completed_subtasks++; total_subtasks++ }
        /^- \[ \]/ { total_subtasks++; remaining++ }
        END {
            printf "%d %d %d %d\n",
                total_tasks+0,
                completed_subtasks+0,
                total_subtasks+0,
                remaining+0
        }
    ' "$file" 2>/dev/null || echo "0 0 0 0"
)
```

---

### Pattern: Configurable Polling with Optimized Defaults

**Last Used:** performance-bottlenecks (2025-10-11)
**Category:** Performance / User Experience

**Use Case:** When implementing polling/monitoring loops that need to balance responsiveness with resource usage. Applies to status monitors, file watchers, health checks, etc.

**Implementation:**
- Key files: `lib/yoyo-status.sh:21`
- Core approach:
  - Set sensible default interval (10 seconds in our case)
  - Allow environment variable override for customization
  - Document the performance tradeoffs
  - Fall back to polling instead of complex event systems
- Dependencies: None (pure bash)

**Why It Works:**
- Conservative default (10s) minimizes CPU usage
- Users can customize for their needs: `YOYO_STATUS_REFRESH=2` for faster updates
- Simple implementation (no dependencies on inotify/fswatch)
- Cross-platform compatible
- CPU reduction: 2-5% → 0% with 10s interval

**Gotchas:**
- Too short interval wastes CPU and battery
- Too long interval feels unresponsive
- Document the configuration option clearly
- Consider adding min/max bounds for interval

**Code Example:**
```bash
# Default with override support
REFRESH_INTERVAL="${YOYO_STATUS_REFRESH:-10}"

# Main monitoring loop
while true; do
    update_status_display
    sleep "$REFRESH_INTERVAL"
done
```

**Configuration Documentation:**
```bash
# Fast refresh (every 2 seconds)
YOYO_STATUS_REFRESH=2 yoyo --visual

# Slow refresh (every 30 seconds, minimal CPU)
YOYO_STATUS_REFRESH=30 yoyo --visual
```

---

## Testing Patterns

### Pattern: Comprehensive Test Suite for Performance Optimizations

**Last Used:** performance-bottlenecks (2025-10-11)
**Category:** Testing / Quality Assurance

**Use Case:** When implementing performance optimizations that must maintain exact behavior while improving speed. Applies to refactoring, algorithm changes, or any optimization work.

**Implementation:**
- Key files: `tests/*.sh`, `tests/integration/*.sh`
- Core approach:
  - **Unit tests** for individual functions (parse-utils functions)
  - **Integration tests** for complete workflows (launcher startup)
  - **Performance benchmarks** to verify improvements
  - **Edge case tests** (empty files, Unicode, malformed input)
- Test types:
  - Correctness tests (output must match old implementation)
  - Performance tests (measure before/after timing)
  - Edge case tests (missing files, empty content, etc.)
- Dependencies: bash, basic Unix tools

**Why It Works:**
- Correctness tests prevent regressions
- Performance tests verify actual improvements (not just assumptions)
- Edge case tests catch real-world issues
- Integration tests validate end-to-end behavior
- Benchmarks provide objective metrics for comparison

**Gotchas:**
- Tests must be updated when expected behavior changes (e.g., all tasks complete)
- Performance benchmarks can vary between runs (take averages)
- Need to clean up test artifacts (temp files, cache)
- Integration tests may timeout if scripts hang

**Test Structure:**
```bash
#!/bin/bash
# test-feature.sh

# Setup
TEST_DIR="$(mktemp -d)"
trap "rm -rf $TEST_DIR" EXIT

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local name="$1"
    TESTS_RUN=$((TESTS_RUN + 1))

    # Execute test
    if actual_output=$(run_test_command); then
        if [ "$actual_output" = "$expected_output" ]; then
            echo "✓ $name"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo "✗ $name"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
}

# Run tests
run_test "Mission extraction"
run_test "Cache behavior"
run_test "Edge cases"

# Summary
echo "Tests: $TESTS_RUN, Passed: $TESTS_PASSED, Failed: $TESTS_FAILED"
```

---

## Code Organization Patterns

### Pattern: Progressive Test Expectations

**Last Used:** performance-bottlenecks (2025-10-11)
**Category:** Testing / Maintenance

**Use Case:** When writing tests for task files or other progressive data structures that change as work completes. Tests should be updated to reflect current state, not hardcoded to original state.

**Problem:** Test expectations hardcoded to initial state fail when work completes
**Solution:** Update test expectations to match current reality

**Example:**
```bash
# BAD: Hardcoded to initial state (will fail when tasks complete)
run_test "Project tasks" ... 6 8 26 18  # Expects 8 complete, 18 remaining

# GOOD: Updated to reflect current state
run_test "Project tasks" ... 6 26 26 0  # All 26 tasks now complete
```

**Why This Matters:**
- Tests should validate current behavior, not past behavior
- Prevents false negatives when work completes successfully
- Makes test maintenance part of the workflow

---

## TUI/Interactive UI Patterns

### Pattern: Service-Based Command Execution

**Last Used:** tui-interaction-improvements (2025-10-17)
**Category:** Architecture / User Experience

**Use Case:** When building interactive TUIs that need to execute external commands or scripts. Applies to dashboards, CLIs with TUI modes, or any interactive terminal application.

**Implementation:**
- Key files: `lib/yoyo_tui/services/command_executor.py`
- Core approach:
  - Create dedicated service class for command execution
  - Use subprocess with stdin for command input
  - Integrate with app notification system for user feedback
  - Validate commands before execution
  - Handle errors gracefully with user-friendly messages
- Dependencies: subprocess, textual (for notifications)

**Why It Works:**
- Separation of concerns (execution logic separate from UI)
- Testable in isolation (can mock subprocess)
- Reusable across multiple widgets
- Provides consistent user feedback
- Safe command execution with validation

**Gotchas:**
- Must validate user input to prevent command injection
- Need timeout handling for long-running commands
- Subprocess communication requires careful stdin/stdout management
- Error messages should be actionable for users

**Code Example:**
```python
class CommandExecutor:
    def __init__(self, app=None):
        self.app = app

    def execute_command(self, command: str) -> bool:
        if not command or not command.strip():
            return False

        try:
            proc = subprocess.Popen(
                ["claude"],  # or appropriate CLI
                stdin=subprocess.PIPE,
                cwd=os.getcwd()
            )
            proc.stdin.write(f"{command}\n".encode())
            proc.stdin.flush()

            if self.app:
                self.app.notify(f"Executing {command}...")
            return True
        except Exception as e:
            if self.app:
                self.app.notify(f"Error: {str(e)}", severity="error")
            return False
```

---

### Pattern: Unified History Aggregation

**Last Used:** tui-interaction-improvements (2025-10-17)
**Category:** Data Integration / User Experience

**Use Case:** When building dashboards or status views that need to aggregate history from multiple sources (git commits, file changes, user actions, etc.). Especially useful for developer tools showing recent activity.

**Implementation:**
- Key files: `lib/yoyo_tui/services/history_tracker.py`, `lib/yoyo_tui/services/recap_parser.py`
- Core approach:
  - Create dedicated service to aggregate multiple history sources
  - Use dataclasses for type-safe history entries
  - Sort chronologically (newest first)
  - Filter to most recent N items (configurable)
  - Parse different file formats consistently
- Dependencies: git (for commit history), file system access

**Why It Works:**
- Single source of truth for "what happened recently"
- Consistent data model across different sources
- Easy to add new history sources
- Efficient caching with TTL prevents repeated parsing
- Chronological sorting provides natural timeline view

**Gotchas:**
- Need graceful handling for missing directories/files
- Git operations can be slow (use caching)
- File parsing can fail with corrupted files (need error handling)
- Multiple date formats need normalization

**Code Example:**
```python
@dataclass
class HistoryEntry:
    type: HistoryType  # COMMIT, SPEC, FIX, RECAP
    timestamp: datetime
    title: str
    description: str
    source_path: Optional[Path]

class HistoryTracker:
    def get_recent_actions(self, count: int = 3) -> List[HistoryEntry]:
        entries = []
        entries.extend(self._get_git_commits())
        entries.extend(self._get_specs())
        entries.extend(self._get_fixes())
        entries.extend(self._get_recaps())

        # Sort chronologically (newest first)
        entries.sort(key=lambda e: e.timestamp, reverse=True)

        return entries[:count]
```

---

## Summary

**Total Patterns:** 8
**Categories:** Performance (3), Testing (2), Code Organization (1), TUI/Interactive UI (2)

**Most Impactful:**
1. Shared Parsing Utilities with Caching (5-8x speedup, eliminated duplication)
2. Single-Pass AWK (46-50% faster, cleaner code)
3. Service-Based Command Execution (clean architecture, reusable, testable)
4. Comprehensive Test Suite (prevented regressions, verified improvements)

**Last Updated:** 2025-10-17 (tui-interaction-improvements fix)
