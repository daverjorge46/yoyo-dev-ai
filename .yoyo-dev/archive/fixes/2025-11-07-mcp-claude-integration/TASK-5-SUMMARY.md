# Task 5 Implementation Summary

## Overview
Added MCP verification and update logic to `setup/yoyo-update.sh` to automatically detect and install missing MCP servers during Yoyo Dev updates.

## Changes Made

### 1. Modified `setup/yoyo-update.sh`

**New Features:**
- Added `--skip-mcp-check` flag to skip MCP verification
- Implemented MCP detection and update flow after framework files are updated
- Added user-friendly prompts for missing MCP installation

**New Functions:**

1. **`check_claude_cli_available()`** (lines 363-370)
   - Detects if Claude Code CLI is installed and functional
   - Returns 0 if available, 1 if not

2. **`get_installed_mcps()`** (lines 373-401)
   - Reads Claude's config at `~/.claude.json` (not `~/.config/claude/config.json`)
   - Parses JSON using Python to extract installed MCP server names
   - Returns list of installed MCPs for current project
   - Gracefully handles missing files and malformed JSON

3. **`detect_missing_mcps()`** (lines 404-416)
   - Compares expected MCPs against installed MCPs
   - Expected MCPs: `context7 memory playwright containerization chrome-devtools shadcn`
   - Returns space-separated list of missing MCPs

4. **`prompt_mcp_update()`** (lines 419-442)
   - Displays formatted list of missing MCPs
   - Prompts user: "Would you like to install missing MCPs? [Y/n]"
   - Returns 0 if user accepts, 1 if declined

5. **`install_missing_mcps()`** (lines 445-468)
   - Calls `mcp-claude-installer.sh --non-interactive` to install missing MCPs
   - Displays installation progress and results
   - Handles missing installer gracefully

**Main MCP Verification Flow** (lines 471-500)
- Only runs if Claude Code is installed AND `--skip-mcp-check` is false
- Checks if Claude CLI is available
- Detects missing MCPs
- Prompts user if any are missing
- Installs missing MCPs if user accepts
- Provides informational messages for verbose mode

### 2. Updated Help Message

Added documentation for new flag:
```bash
--skip-mcp-check               Skip MCP verification and update
```

### 3. Implementation Notes

**Claude Config Location:**
- Actual location: `~/.claude.json`
- NOT at: `~/.config/claude/config.json` (as initially expected)
- Structure: Per-project config under `projects[project_path].mcpServers`

**Design Decisions:**
- Version detection NOT implemented (no reliable MCP version registry)
- Graceful fallback if Python not available (no JSON parsing)
- Timeout protection for Python JSON parsing (2 seconds)
- Non-interactive mode for installer to avoid blocking

**Error Handling:**
- Missing Claude CLI: Skip MCP check with verbose message
- Missing config file: Treat as no MCPs installed
- Malformed JSON: Gracefully ignore, treat as empty
- Missing installer: Display warning, provide manual command

## Testing

### Unit Tests (tests/test_mcp_update_logic.sh)
Created 12 tests to verify:
- All required functions exist
- `--skip-mcp-check` flag is handled
- Expected MCPs list is complete
- Claude config path is correct
- Help message includes new flag
- Python JSON parsing is implemented

**Result:** 12/12 tests passing

### Integration Tests (tests/test_mcp_detection_integration.sh)
Created 7 tests to verify:
- MCP detection from mock config files
- Missing MCP detection
- Empty config handling
- All MCPs installed scenario
- Non-existent config file handling
- Malformed JSON handling

**Result:** 7/7 tests passing

**Total: 19/19 tests passing**

## User Experience

### When MCPs are missing:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 MCP Server Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Missing MCP servers detected:

  • playwright
  • containerization
  • chrome-devtools
  • shadcn

MCP servers enhance Claude Code with additional capabilities.

Would you like to install missing MCPs? [Y/n]
```

### When user declines:
```
ℹ️  Skipping MCP installation
   You can install MCPs later by running:
   /home/user/.yoyo-dev/setup/mcp-claude-installer.sh
```

### When all MCPs installed (verbose mode):
```
✅ All expected MCP servers are installed
```

## Usage Examples

### Standard update (with MCP check):
```bash
~/.yoyo-dev/setup/yoyo-update.sh
```

### Skip MCP verification:
```bash
~/.yoyo-dev/setup/yoyo-update.sh --skip-mcp-check
```

### Verbose mode (show MCP status):
```bash
~/.yoyo-dev/setup/yoyo-update.sh --verbose
```

## Files Modified

1. **setup/yoyo-update.sh**
   - Added 143 lines of MCP verification logic
   - Updated help message
   - Added new flag: `--skip-mcp-check`

## Files Created

1. **tests/test_mcp_update_logic.sh**
   - 12 unit tests for MCP update functions
   - Executable: `chmod +x tests/test_mcp_update_logic.sh`

2. **tests/test_mcp_detection_integration.sh**
   - 7 integration tests for MCP detection
   - Executable: `chmod +x tests/test_mcp_detection_integration.sh`

## Next Steps

Task 5 is complete. Remaining work for the fix:

1. **Task 4:** Integrate MCP installer into installation scripts
2. **Task 7:** Update remaining scripts to reference new installer
3. **Task 8:** Update documentation
4. **Task 9:** Comprehensive testing
5. **Task 10:** Final verification and cleanup

## Verification Commands

```bash
# Run unit tests
bash tests/test_mcp_update_logic.sh

# Run integration tests
bash tests/test_mcp_detection_integration.sh

# Test update flow (requires Claude CLI)
~/.yoyo-dev/setup/yoyo-update.sh --verbose

# Test with MCP check skipped
~/.yoyo-dev/setup/yoyo-update.sh --skip-mcp-check
```

## Related Files

- **MCP Installer:** `setup/mcp-claude-installer.sh` (created in Task 2)
- **Tasks List:** `.yoyo-dev/fixes/2025-11-07-mcp-claude-integration/tasks.md`
- **Claude Config:** `~/.claude.json` (per-project MCP configuration)
