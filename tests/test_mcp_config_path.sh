#!/bin/bash
# Test suite for MCP Claude config path detection
# Tests that mcp-claude-installer.sh uses correct config location

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MCP_INSTALLER="$PROJECT_ROOT/setup/mcp-claude-installer.sh"

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
# Test 1: Verify correct config path constant
# ============================================
test_config_path_constant() {
    print_test_header "Config Path Constant Uses ~/.claude.json"
    run_test

    # Extract CLAUDE_CONFIG_FILE value from installer
    local config_path=$(grep '^CLAUDE_CONFIG_FILE=' "$MCP_INSTALLER" | cut -d'=' -f2 | tr -d '"' | tr -d "'")

    # Expand ${HOME} if present
    config_path=$(eval echo "$config_path")

    local expected_path="${HOME}/.claude.json"

    if [ "$config_path" = "$expected_path" ]; then
        pass_test "CLAUDE_CONFIG_FILE correctly set to ~/.claude.json"
        return 0
    else
        fail_test "CLAUDE_CONFIG_FILE is wrong" "Expected: $expected_path, Got: $config_path"
        return 1
    fi
}

# ============================================
# Test 2: Verify no CLAUDE_CONFIG_DIR variable
# ============================================
test_no_config_dir_variable() {
    print_test_header "No CLAUDE_CONFIG_DIR Variable Exists"
    run_test

    # Check if CLAUDE_CONFIG_DIR is defined
    if grep -q '^CLAUDE_CONFIG_DIR=' "$MCP_INSTALLER"; then
        fail_test "CLAUDE_CONFIG_DIR variable still exists" "Should be removed as it's no longer needed"
        return 1
    else
        pass_test "CLAUDE_CONFIG_DIR variable correctly removed"
        return 0
    fi
}

# ============================================
# Test 3: Verify create_claude_config_if_missing removed
# ============================================
test_no_create_config_function() {
    print_test_header "create_claude_config_if_missing() Function Removed"
    run_test

    # Check if function exists
    if grep -q 'create_claude_config_if_missing()' "$MCP_INSTALLER"; then
        fail_test "create_claude_config_if_missing() function still exists" "Should be removed - Claude creates config automatically"
        return 1
    else
        pass_test "create_claude_config_if_missing() function correctly removed"
        return 0
    fi
}

# ============================================
# Test 4: Verify read_claude_config uses correct path
# ============================================
test_read_config_function() {
    print_test_header "read_claude_config() Uses Correct Path"
    run_test

    # Extract read_claude_config function
    local function_body=$(sed -n '/^read_claude_config()/,/^}/p' "$MCP_INSTALLER")

    # Check if it references CLAUDE_CONFIG_FILE
    if echo "$function_body" | grep -q 'CLAUDE_CONFIG_FILE'; then
        pass_test "read_claude_config() correctly uses CLAUDE_CONFIG_FILE variable"
        return 0
    else
        fail_test "read_claude_config() doesn't use CLAUDE_CONFIG_FILE" "Function may be using wrong path"
        return 1
    fi
}

# ============================================
# Test 5: Verify check_claude_config_exists uses correct path
# ============================================
test_check_config_exists_function() {
    print_test_header "check_claude_config_exists() Uses Correct Path"
    run_test

    # Extract check_claude_config_exists function
    local function_body=$(sed -n '/^check_claude_config_exists()/,/^}/p' "$MCP_INSTALLER")

    # Check if it references CLAUDE_CONFIG_FILE
    if echo "$function_body" | grep -q 'CLAUDE_CONFIG_FILE'; then
        pass_test "check_claude_config_exists() correctly uses CLAUDE_CONFIG_FILE variable"
        return 0
    else
        fail_test "check_claude_config_exists() doesn't use CLAUDE_CONFIG_FILE" "Function may be using wrong path"
        return 1
    fi
}

# ============================================
# Test 6: Verify is_mcp_installed uses correct path
# ============================================
test_is_mcp_installed_function() {
    print_test_header "is_mcp_installed() Uses Correct Path"
    run_test

    # Extract is_mcp_installed function
    local function_body=$(sed -n '/^is_mcp_installed()/,/^}/p' "$MCP_INSTALLER")

    # Check if it references CLAUDE_CONFIG_FILE
    if echo "$function_body" | grep -q 'CLAUDE_CONFIG_FILE'; then
        pass_test "is_mcp_installed() correctly uses CLAUDE_CONFIG_FILE variable"
        return 0
    else
        fail_test "is_mcp_installed() doesn't use CLAUDE_CONFIG_FILE" "Function may be using wrong path"
        return 1
    fi
}

# ============================================
# Test 7: No references to wrong config path
# ============================================
test_no_wrong_path_references() {
    print_test_header "No References to Wrong Config Path"
    run_test

    # Check for references to wrong path
    local wrong_path_count=$(grep -c '\.config/claude' "$MCP_INSTALLER" || true)

    if [ "$wrong_path_count" -eq 0 ]; then
        pass_test "No references to wrong path ~/.config/claude found"
        return 0
    else
        fail_test "Found $wrong_path_count references to wrong path ~/.config/claude" "All paths should use ~/.claude.json"
        return 1
    fi
}

# ============================================
# Main test execution
# ============================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  MCP Config Path Detection Tests                         ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    # Verify installer exists
    if [ ! -f "$MCP_INSTALLER" ]; then
        echo -e "${RED}✗ ERROR${RESET} MCP installer not found at: $MCP_INSTALLER"
        exit 1
    fi

    echo "Testing: $MCP_INSTALLER"
    echo ""

    # Run all tests
    test_config_path_constant
    test_no_config_dir_variable
    test_no_create_config_function
    test_read_config_function
    test_check_config_exists_function
    test_is_mcp_installed_function
    test_no_wrong_path_references

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
