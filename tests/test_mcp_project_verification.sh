#!/bin/bash
# Test suite for project-aware MCP verification
# Tests that is_mcp_installed() correctly parses nested JSON structure

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MCP_INSTALLER="$PROJECT_ROOT/setup/mcp-claude-installer.sh"

# Test fixtures directory
TEST_FIXTURES="$SCRIPT_DIR/fixtures"
mkdir -p "$TEST_FIXTURES"

# Test helper functions
print_test_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST: $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

pass_test() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓ PASS${RESET} $1"
}

fail_test() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗ FAIL${RESET} $1"
    if [ -n "$2" ]; then
        echo -e "${RED}  Error: $2${RESET}"
    fi
}

run_test() {
    TESTS_RUN=$((TESTS_RUN + 1))
}

# ============================================
# Test Setup: Create mock Claude configs
# ============================================
setup_test_fixtures() {
    # Create a mock Claude config with project structure
    cat > "$TEST_FIXTURES/claude-with-projects.json" << 'EOF'
{
  "projects": {
    "/home/user/project1": {
      "mcpServers": {
        "context7": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-context7"]
        },
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"]
        }
      }
    },
    "/home/user/project2": {
      "mcpServers": {
        "playwright": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-playwright"]
        }
      }
    }
  }
}
EOF

    # Create a mock config with no MCPs for a project
    cat > "$TEST_FIXTURES/claude-empty-project.json" << 'EOF'
{
  "projects": {
    "/home/user/project1": {
      "mcpServers": {}
    }
  }
}
EOF

    # Create a mock config with no projects key
    cat > "$TEST_FIXTURES/claude-no-projects.json" << 'EOF'
{
  "mcpServers": {
    "context7": {
      "command": "npx"
    }
  }
}
EOF

    # Create an invalid JSON config
    echo "{ invalid json" > "$TEST_FIXTURES/claude-invalid.json"

    # Create an empty config
    echo "{}" > "$TEST_FIXTURES/claude-empty.json"
}

cleanup_test_fixtures() {
    rm -rf "$TEST_FIXTURES"
}

# ============================================
# Test 1: is_mcp_installed accepts project_dir parameter
# ============================================
test_is_mcp_installed_signature() {
    print_test_header "is_mcp_installed() Accepts project_dir Parameter"
    run_test

    # Source the installer to get the function
    source "$MCP_INSTALLER"

    # Test that function exists and accepts 2 parameters
    # We'll test by checking the function definition
    local function_def=$(declare -f is_mcp_installed)

    if echo "$function_def" | grep -q 'local project_dir'; then
        pass_test "is_mcp_installed() has project_dir parameter"
        return 0
    else
        fail_test "is_mcp_installed() missing project_dir parameter" "Function should accept mcp_name and project_dir"
        return 1
    fi
}

# ============================================
# Test 2: is_mcp_installed uses Python for JSON parsing
# ============================================
test_uses_python_json_parsing() {
    print_test_header "is_mcp_installed() Uses Python JSON Parsing"
    run_test

    # Check if function uses Python
    local function_def=$(declare -f is_mcp_installed)

    if echo "$function_def" | grep -q 'python3'; then
        pass_test "is_mcp_installed() uses Python for JSON parsing"
        return 0
    else
        fail_test "is_mcp_installed() doesn't use Python" "Should use Python instead of grep for reliable JSON parsing"
        return 1
    fi
}

# ============================================
# Test 3: Detects MCP in specific project
# ============================================
test_detects_mcp_in_project() {
    print_test_header "Detects MCP Installed in Specific Project"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE to use test fixture
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-with-projects.json"

    # Test: context7 should be found in project1
    if is_mcp_installed "context7" "/home/user/project1"; then
        pass_test "Correctly detected context7 in /home/user/project1"
    else
        fail_test "Failed to detect context7 in /home/user/project1" "MCP exists in test fixture"
        return 1
    fi

    # Test: memory should be found in project1
    if is_mcp_installed "memory" "/home/user/project1"; then
        pass_test "Correctly detected memory in /home/user/project1"
    else
        fail_test "Failed to detect memory in /home/user/project1" "MCP exists in test fixture"
        return 1
    fi

    return 0
}

# ============================================
# Test 4: Does not detect MCP in wrong project
# ============================================
test_does_not_detect_mcp_in_wrong_project() {
    print_test_header "Does Not Detect MCP in Wrong Project"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-with-projects.json"

    # Test: context7 should NOT be found in project2
    if is_mcp_installed "context7" "/home/user/project2"; then
        fail_test "Incorrectly detected context7 in /home/user/project2" "MCP only exists in project1"
        return 1
    else
        pass_test "Correctly rejected context7 in /home/user/project2"
    fi

    # Test: playwright should NOT be found in project1
    if is_mcp_installed "playwright" "/home/user/project1"; then
        fail_test "Incorrectly detected playwright in /home/user/project1" "MCP only exists in project2"
        return 1
    else
        pass_test "Correctly rejected playwright in /home/user/project1"
    fi

    return 0
}

# ============================================
# Test 5: Handles project with no MCPs
# ============================================
test_handles_empty_project() {
    print_test_header "Handles Project with No MCPs"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-empty-project.json"

    # Test: should not find any MCP
    if is_mcp_installed "context7" "/home/user/project1"; then
        fail_test "Incorrectly detected MCP in empty project" "Project has no MCPs"
        return 1
    else
        pass_test "Correctly handled project with no MCPs"
        return 0
    fi
}

# ============================================
# Test 6: Handles non-existent project
# ============================================
test_handles_nonexistent_project() {
    print_test_header "Handles Non-Existent Project"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-with-projects.json"

    # Test: should not find MCP in project that doesn't exist
    if is_mcp_installed "context7" "/home/user/project999"; then
        fail_test "Incorrectly detected MCP in non-existent project" "Project doesn't exist in config"
        return 1
    else
        pass_test "Correctly handled non-existent project"
        return 0
    fi
}

# ============================================
# Test 7: Handles config with no projects key
# ============================================
test_handles_no_projects_key() {
    print_test_header "Handles Config Without projects Key"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-no-projects.json"

    # Test: should not find MCP (wrong structure)
    if is_mcp_installed "context7" "/home/user/project1"; then
        fail_test "Incorrectly detected MCP in flat structure" "Should only work with nested structure"
        return 1
    else
        pass_test "Correctly rejected flat config structure"
        return 0
    fi
}

# ============================================
# Test 8: Handles invalid JSON gracefully
# ============================================
test_handles_invalid_json() {
    print_test_header "Handles Invalid JSON Gracefully"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-invalid.json"

    # Test: should not crash, just return false
    if is_mcp_installed "context7" "/home/user/project1" 2>/dev/null; then
        fail_test "Should return false for invalid JSON" "Function should handle errors gracefully"
        return 1
    else
        pass_test "Correctly handled invalid JSON"
        return 0
    fi
}

# ============================================
# Test 9: Defaults to pwd when no project_dir
# ============================================
test_defaults_to_pwd() {
    print_test_header "Defaults to pwd When No project_dir Provided"
    run_test

    # Source the installer
    source "$MCP_INSTALLER"

    # Override CLAUDE_CONFIG_FILE
    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-with-projects.json"

    # Change to a directory that matches test fixture
    local original_dir=$(pwd)

    # Create a temporary directory matching fixture
    local test_dir="/tmp/yoyo-test-project-$$"
    mkdir -p "$test_dir"

    # Update fixture to use test directory
    cat > "$TEST_FIXTURES/claude-test-pwd.json" << EOF
{
  "projects": {
    "$test_dir": {
      "mcpServers": {
        "context7": {
          "command": "npx"
        }
      }
    }
  }
}
EOF

    CLAUDE_CONFIG_FILE="$TEST_FIXTURES/claude-test-pwd.json"
    cd "$test_dir"

    # Test: should find MCP using pwd as default
    if is_mcp_installed "context7"; then
        pass_test "Correctly defaulted to pwd for project detection"
        cd "$original_dir"
        rm -rf "$test_dir"
        return 0
    else
        fail_test "Failed to default to pwd" "Should use current directory when project_dir not specified"
        cd "$original_dir"
        rm -rf "$test_dir"
        return 1
    fi
}

# ============================================
# Main test execution
# ============================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  MCP Project-Aware Verification Tests                    ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    # Verify installer exists
    if [ ! -f "$MCP_INSTALLER" ]; then
        echo -e "${RED}✗ ERROR${RESET} MCP installer not found at: $MCP_INSTALLER"
        exit 1
    fi

    echo "Testing: $MCP_INSTALLER"
    echo ""

    # Setup test fixtures
    setup_test_fixtures

    # Run all tests
    test_is_mcp_installed_signature
    test_uses_python_json_parsing
    test_detects_mcp_in_project
    test_does_not_detect_mcp_in_wrong_project
    test_handles_empty_project
    test_handles_nonexistent_project
    test_handles_no_projects_key
    test_handles_invalid_json
    test_defaults_to_pwd

    # Cleanup
    cleanup_test_fixtures

    # Print summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Tests Run:    $TESTS_RUN"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${RESET}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${RESET}"
    echo ""

    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${RESET}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ SOME TESTS FAILED${RESET}"
        echo ""
        return 1
    fi
}

# Run tests
main
exit $?
