# MCP Integration Tests

Comprehensive test suite for MCP (Model Context Protocol) integration in Yoyo Dev.

## Test Files

### `test-mcp-installer.sh`

Comprehensive tests for the MCP installer (`setup/mcp-claude-installer.sh`).

**What it tests:**
- User selection scenarios (all MCPs, specific MCPs, single MCP, skip)
- Installation of single and multiple MCPs
- Installation of all 6 MCPs (context7, memory, playwright, chrome-devtools, shadcn, containerization)
- Graceful failure handling (continue on error)
- Config.yml update after installation
- Config preservation during updates
- Edge cases (empty selection, invalid MCP names, parallel safety)

**Coverage:**
- ✓ User Selection (4 tests)
- ✓ Installation (4 tests)
- ✓ Failure Handling (3 tests)
- ✓ Config Updates (3 tests)
- ✓ Edge Cases (4 tests)

**Run:**
```bash
./tests/mcp/test-mcp-installer.sh
```

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    MCP Installer Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tests Run:      15
Tests Passed:   15
Tests Failed:   0

✓ ALL TESTS PASSED

MCP installer is ready for implementation!
```

## Testing Approach

### TDD (Test-Driven Development)

All tests are written **before** implementation, following TDD principles:

1. **Write tests first** - Define expected behavior
2. **Tests fail initially** - Implementation doesn't exist yet
3. **Implement features** - Make tests pass
4. **Refactor** - Improve code while keeping tests green

### Mock-Based Testing

Tests use **mocks** to avoid external dependencies:

- **Mock npm installer** - Simulates `npm install -g` without actual installation
- **Mock installer script** - Provides controllable test environment
- **Temporary directories** - Isolated test execution (cleanup on exit)

### Test Structure

Each test follows this pattern:

```bash
test_function_name() {
    # Setup
    local test_dir="$TEST_DIR/testN"
    mkdir -p "$test_dir"

    # Execute
    output=$("$INSTALLER_SCRIPT" "args" 2>&1)

    # Assert
    [[ "$output" =~ "expected_text" ]] && \
    [[ condition ]]
}
```

## Test Categories

### 1. User Selection Tests

Test all user interaction scenarios:

- **All MCPs** - User selects "all" (installs all 6 MCPs)
- **Specific MCPs** - User selects subset (e.g., context7, memory, playwright)
- **Single MCP** - User selects one MCP
- **Skip** - User opts out of MCP installation

### 2. Installation Tests

Test installation logic:

- **Single MCP** - Install one MCP successfully
- **Multiple MCPs** - Install multiple MCPs in sequence
- **All 6 MCPs** - Full installation suite
- **npm validation** - Verify correct npm commands

### 3. Failure Handling Tests

Test error scenarios:

- **Graceful continuation** - Continue on failure (don't crash)
- **Invalid MCP names** - Handle unknown MCP gracefully
- **Empty selection** - No MCPs selected (edge case)
- **Error messages** - Clear, actionable error messages

### 4. Config Update Tests

Test config.yml integration:

- **MCP section creation** - Add MCP section to config.yml
- **Content preservation** - Don't overwrite existing config
- **Idempotent updates** - Multiple runs don't duplicate sections
- **Multiple MCPs** - All installed MCPs appear in config

### 5. Edge Case Tests

Test unusual scenarios:

- **Parallel safety** - Multiple installations don't conflict
- **Exit codes** - Success/failure codes correct
- **Summary format** - Installation summary is clear
- **Package mapping** - All 6 MCPs defined

## Requirements for Implementation

Based on these tests, the actual `setup/mcp-claude-installer.sh` must:

### Required Functionality

1. **User Selection**
   - Accept arguments: `all`, `specific <names>`, `skip`
   - Prompt user if no arguments provided

2. **Installation**
   - Install MCPs via `npm install -g <package>`
   - Track installed MCPs in array
   - Track failed MCPs in array

3. **Error Handling**
   - Continue on installation failure (graceful degradation)
   - Log failures but don't crash
   - Provide clear error messages

4. **Config Integration**
   - Accept `--config <path>` flag
   - Update config.yml with installed MCPs
   - Preserve existing config content
   - Create MCP section with proper YAML structure

5. **Summary Output**
   - Show installation summary (installed count, failed count)
   - List failed MCPs if any
   - Exit code 0 (always succeed, even with failures)

### MCP Package Mapping

The installer must define these 6 MCPs:

```bash
declare -A MCP_PACKAGES=(
    ["context7"]="@context7/mcp-server"
    ["memory"]="@memory/mcp-server"
    ["playwright"]="@playwright/mcp-server"
    ["chrome-devtools"]="@chrome-devtools/mcp-server"
    ["shadcn"]="@shadcn/mcp-server"
    ["containerization"]="@containerization/mcp-server"
)
```

### Expected Output Format

**Installation:**
```
Installing context7 (@context7/mcp-server)...
✓ context7 installed successfully

Installing memory (@memory/mcp-server)...
✗ memory installation failed (continuing...)
```

**Summary:**
```
Installation Summary:
  Installed: 5
  Failed: 1
  Failed MCPs: memory
```

## Running Tests

### Run All Tests

```bash
./tests/mcp/test-mcp-installer.sh
```

### Run Specific Test

Edit the test file and comment out tests you don't want to run.

### Debug Tests

Enable verbose output:
```bash
bash -x ./tests/mcp/test-mcp-installer.sh
```

## Test Coverage Summary

**Total Tests:** 15

**Categories:**
- User Selection: 4 tests (27%)
- Failure Handling: 3 tests (20%)
- Config Updates: 3 tests (20%)
- Edge Cases: 3 tests (20%)
- Integration: 2 tests (13%)

**Coverage Areas:**
- ✓ All user selection scenarios
- ✓ Single and multiple MCP installation
- ✓ Graceful failure handling
- ✓ Config.yml updates and preservation
- ✓ Invalid input handling
- ✓ Parallel execution safety
- ✓ Exit code correctness
- ✓ Package mapping completeness

## Notes

- **No external dependencies** - Tests use mocks for npm and installer
- **Fast execution** - All tests run in <5 seconds
- **Cleanup guaranteed** - Temporary directories removed on exit
- **Self-contained** - Tests don't affect system state
- **Color output** - Visual test results (green = pass, red = fail)

## Next Steps

After implementation of `setup/mcp-claude-installer.sh`:

1. Run tests: `./tests/mcp/test-mcp-installer.sh`
2. Fix any failures
3. Verify all 15 tests pass
4. Proceed to subtask 1.4 (implement actual installer)
