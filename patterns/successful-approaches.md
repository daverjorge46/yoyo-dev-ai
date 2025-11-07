# Proven Patterns Library

This file captures successful implementation patterns from completed features. Each pattern includes context, approach, and rationale to help maintain consistency across the codebase.

## How to Use This File

- **During Spec Creation**: Review patterns that might apply to new features
- **During Implementation**: Reference specific patterns for similar functionality
- **After Completion**: Add new successful patterns discovered during development

## Pattern Categories

### Authentication & Security
*No patterns recorded yet*

### Form Handling & Validation
*No patterns recorded yet*

### Data Fetching & State Management
*No patterns recorded yet*

### UI Components & Layouts

#### Clipboard-Based Command Integration for Embedded Tools

**Last Used:** tui-display-issues (2025-10-18)
**Category:** UI Components & Layouts

**Use Case:** When building tools that run inside an AI coding assistant session (Claude Code, Cursor, etc.) and need to pass commands back to the parent session without spawning isolated subprocesses.

**Implementation:**
- Key files: `lib/yoyo_tui/services/command_executor.py`
- Core approach: Write commands to system clipboard instead of spawning subprocess, notify user to paste
- Dependencies: `pyperclip` (cross-platform clipboard library)

**Why It Works:**
- Maintains session continuity (no isolated subprocess with lost context)
- Works across all platforms (macOS, Linux, Windows)
- Simple user flow (click button → paste command → execute in current session)
- No IPC complexity (clipboard is universal communication channel)
- Preserves all Claude Code session state (conversation history, loaded files, etc.)

**Example Code:**
```python
import pyperclip

def execute_command(self, command: str) -> CommandResult:
    """Copy command to clipboard for user to paste into Claude Code."""
    try:
        # Write to clipboard
        pyperclip.copy(command)

        # Notify user
        return CommandResult(
            success=True,
            message=f"Command copied to clipboard - paste into Claude Code: {command}",
            output=""
        )
    except Exception as e:
        # Graceful fallback
        return CommandResult(
            success=False,
            message=f"Clipboard error: {e}. Command: {command}",
            output=""
        )
```

**Why This Matters:**
- Subprocess approach creates isolated Claude Code instance (loses all context)
- User sees "pending command" because nothing happens in their actual session
- Clipboard integration keeps everything in single session with full context

**Gotchas:**
- Clipboard requires user action (paste) - not fully automated
- Clipboard may fail in headless environments (provide fallback: display command text)
- Cross-platform clipboard behavior varies (pyperclip handles this)

#### Git Timestamp Extraction for Chronological History

**Last Used:** tui-display-issues (2025-10-18)
**Category:** UI Components & Layouts

**Use Case:** When building history or timeline features that need accurate chronological ordering of git commits, not display-time ordering.

**Implementation:**
- Key files: `lib/yoyo_tui/services/history_tracker.py`
- Core approach: Use `git log --format=%ct` to extract Unix timestamps, convert to datetime
- Dependencies: git, datetime

**Why It Works:**
- Extracts actual commit time, not current time (`datetime.now()` is wrong)
- Unix timestamps are precise and easy to convert
- Enables accurate chronological sorting across different entry types (commits, specs, fixes)
- Works with git's internal timestamp storage

**Example Code:**
```python
import subprocess
from datetime import datetime

def _get_git_commits(self) -> List[HistoryEntry]:
    """Extract git commits with ACTUAL timestamps (not datetime.now())."""
    result = subprocess.run(
        ["git", "log", "--format=%ct|||%s", "-n", "50"],
        capture_output=True,
        text=True,
        cwd=self.repo_root
    )

    entries = []
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue

        timestamp_str, msg = line.split('|||', 1)

        # Convert Unix timestamp to datetime
        timestamp = datetime.fromtimestamp(int(timestamp_str))

        entries.append(HistoryEntry(
            type=HistoryType.COMMIT,
            timestamp=timestamp,  # ✅ CORRECT - actual commit time
            title=msg,
            description="",
            source_path=None
        ))

    return entries
```

**Why This Matters:**
- Using `datetime.now()` breaks chronology (all commits appear as "just now")
- History becomes useless when everything has the same timestamp
- Chronological sorting requires actual commit times, not display times

**Gotchas:**
- Unix timestamps are in seconds (not milliseconds)
- Use `datetime.fromtimestamp()` not `datetime.strptime()` for conversion
- Handle timezone awareness if needed (use `.replace(tzinfo=None)` for naive datetime)
- Cache timestamps to avoid repeated git calls for performance

### API Design & Integration

#### Graceful Degradation for Optional Features

**Last Used:** mcp-integration (2025-10-11)
**Category:** API Design & Integration

**Use Case:** When integrating optional features that may fail during installation or runtime, ensure the core workflow continues successfully even if optional features aren't available.

**Implementation:**
- Key files: `setup/mcp-claude-installer.sh`, decisions.md (D1, D7)
- Core approach: Track successes and failures separately, continue execution on failure, provide clear summary
- Dependencies: None (pattern applicable to any feature integration)

**Why It Works:**
- Improves installation success rate (one failure doesn't block entire setup)
- Better user experience (partial success is better than complete failure)
- Reduces support burden (users can proceed with what worked)
- Provides actionable feedback (lists what failed, why, and how to retry)

**Example Code:**
```bash
# Track successes and failures
declare -a INSTALLED_MCPS=()
declare -a FAILED_MCPS=()

for mcp in "${SELECTED_MCPS[@]}"; do
    if install_mcp "$mcp"; then
        INSTALLED_MCPS+=("$mcp")
    else
        FAILED_MCPS+=("$mcp")
        # Continue instead of exiting
    fi
done

# Always show summary (never exit early)
echo "Installed: ${#INSTALLED_MCPS[@]}"
echo "Failed: ${#FAILED_MCPS[@]}"
[[ ${#FAILED_MCPS[@]} -gt 0 ]] && echo "Failed MCPs: ${FAILED_MCPS[*]}"

# Exit with success even if some failed
exit 0
```

**Why This Matters:**
- User requested: "graceful failure handling (skip failed MCPs, log and continue)"
- Aligns with decision D1: Optional installation means failures shouldn't block workflow
- Critical for features with external dependencies (npm packages, network calls)

**Gotchas:**
- Must provide clear summary so user knows what succeeded vs failed
- Exit code should still be 0 (success) unless critical failure
- Need retry mechanism (`yoyo --install-mcps` to try again later)

### Testing Strategies

#### Test-Driven Implementation with Mock Commands

**Last Used:** mcp-integration (2025-10-11)
**Category:** Testing Strategies

**Use Case:** When implementing bash scripts that interact with external commands (npm, docker, apt) where actual execution would have side effects or require system modifications.

**Implementation:**
- Key files: `tests/test-mcp-prerequisites.sh`, `tests/mcp/test-mcp-installer.sh`
- Core approach: Create temporary mock binaries that simulate command responses, test script logic against mocks
- Dependencies: bash, /tmp directory, trap handlers for cleanup

**Why It Works:**
- Tests run without requiring actual system modifications (no npm install, no apt-get)
- Fast execution (no network calls or package installations)
- Reproducible results (mocked responses are consistent)
- Safe to run in CI/CD (no side effects)
- Comprehensive coverage (can test error scenarios easily)

**Example Code:**
```bash
# Create mock npm command
setup_mock_npm() {
    local version="$1"
    mkdir -p "$MOCK_BIN"
    cat > "$MOCK_BIN/npm" <<EOF
#!/bin/bash
if [[ "\$1" == "--version" ]]; then
    echo "$version"
elif [[ "\$1" == "install" ]]; then
    echo "added 1 package"
fi
EOF
    chmod +x "$MOCK_BIN/npm"
}

# Test uses mocked npm
export PATH="$MOCK_BIN:$PATH"
./script-under-test.sh  # Uses mocked npm
```

**Gotchas:**
- PATH manipulation must be carefully managed (prepend mock directory)
- Cleanup is critical (use trap on EXIT to remove temp directories)
- Mock scripts must handle all argument combinations used by implementation

### Performance Optimization
*No patterns recorded yet*

---

## Pattern Template

When adding a new pattern, use this format:

```markdown
### [Pattern Name]

**Last Used:** [spec-name] ([date])
**Category:** [category]

**Use Case:** [When to apply this pattern]

**Implementation:**
- Key files: `[file paths]`
- Core approach: [description]
- Dependencies: [libraries/tools used]

**Why It Works:**
[Explanation of benefits and rationale]

**Example Code:**
```[language]
// Code snippet demonstrating the pattern
```

**Gotchas:**
- [Known limitations or edge cases]
```

---

*This file is automatically updated by the post-execution-tasks workflow when patterns are identified in completed features.*
