#!/bin/bash
# Test suite for project context in MCP installation
# Tests that --project-dir parameter works correctly

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
# Test 1: Script accepts --project-dir parameter
# ============================================
test_accepts_project_dir_parameter() {
    print_test_header "Script Accepts --project-dir Parameter"
    run_test

    # Check if script has --project-dir in argument parsing
    if grep -q '\-\-project-dir' "$MCP_INSTALLER"; then
        pass_test "Script accepts --project-dir parameter"
        return 0
    else
        fail_test "Script doesn't accept --project-dir parameter" "Argument parsing missing --project-dir"
        return 1
    fi
}

# ============================================
# Test 2: PROJECT_DIR variable exists
# ============================================
test_project_dir_variable_exists() {
    print_test_header "PROJECT_DIR Variable Exists"
    run_test

    # Check if PROJECT_DIR variable is defined
    if grep -q 'PROJECT_DIR=' "$MCP_INSTALLER"; then
        pass_test "PROJECT_DIR variable defined"
        return 0
    else
        fail_test "PROJECT_DIR variable not found" "Script should define PROJECT_DIR variable"
        return 1
    fi
}

# ============================================
# Test 3: PROJECT_DIR defaults to pwd
# ============================================
test_project_dir_defaults_to_pwd() {
    print_test_header "PROJECT_DIR Defaults to pwd"
    run_test

    # Check if PROJECT_DIR has pwd fallback
    if grep -q 'PROJECT_DIR.*pwd' "$MCP_INSTALLER" || \
       grep -q 'PROJECT_DIR.*\$(pwd)' "$MCP_INSTALLER"; then
        pass_test "PROJECT_DIR defaults to pwd when not specified"
        return 0
    else
        fail_test "PROJECT_DIR doesn't default to pwd" "Should use \$(pwd) as fallback"
        return 1
    fi
}

# ============================================
# Test 4: install_mcp_via_templates uses cd
# ============================================
test_templates_uses_cd() {
    print_test_header "install_mcp_via_templates() Changes to Project Directory"
    run_test

    # Extract function and check for cd command
    local function_body=$(sed -n '/^install_mcp_via_templates()/,/^}/p' "$MCP_INSTALLER")

    if echo "$function_body" | grep -q 'cd.*PROJECT_DIR'; then
        pass_test "install_mcp_via_templates() changes to project directory"
        return 0
    else
        fail_test "install_mcp_via_templates() doesn't cd to project dir" "Should execute from project directory"
        return 1
    fi
}

# ============================================
# Test 5: install_mcp_via_claude_add uses cd
# ============================================
test_claude_add_uses_cd() {
    print_test_header "install_mcp_via_claude_add() Changes to Project Directory"
    run_test

    # Extract function and check for cd command
    local function_body=$(sed -n '/^install_mcp_via_claude_add()/,/^}/p' "$MCP_INSTALLER")

    if echo "$function_body" | grep -q 'cd.*PROJECT_DIR'; then
        pass_test "install_mcp_via_claude_add() changes to project directory"
        return 0
    else
        fail_test "install_mcp_via_claude_add() doesn't cd to project dir" "Should execute from project directory"
        return 1
    fi
}

# ============================================
# Test 6: install_mcp_via_pnpm uses cd
# ============================================
test_pnpm_uses_cd() {
    print_test_header "install_mcp_via_pnpm() Changes to Project Directory"
    run_test

    # Extract function and check for cd command
    local function_body=$(sed -n '/^install_mcp_via_pnpm()/,/^}/p' "$MCP_INSTALLER")

    if echo "$function_body" | grep -q 'cd.*PROJECT_DIR'; then
        pass_test "install_mcp_via_pnpm() changes to project directory"
        return 0
    else
        fail_test "install_mcp_via_pnpm() doesn't cd to project dir" "Should execute from project directory"
        return 1
    fi
}

# ============================================
# Test 7: is_mcp_installed calls pass PROJECT_DIR
# ============================================
test_verification_calls_pass_project_dir() {
    print_test_header "MCP Verification Calls Pass PROJECT_DIR"
    run_test

    # Check if is_mcp_installed calls include PROJECT_DIR
    local install_calls=$(grep -n 'is_mcp_installed' "$MCP_INSTALLER" | grep -v '^is_mcp_installed()' | head -5)

    if echo "$install_calls" | grep -q 'PROJECT_DIR'; then
        pass_test "Verification calls pass PROJECT_DIR parameter"
        return 0
    else
        fail_test "Verification calls don't pass PROJECT_DIR" "is_mcp_installed should receive PROJECT_DIR"
        return 1
    fi
}

# ============================================
# Test 8: Usage help mentions --project-dir
# ============================================
test_usage_documents_project_dir() {
    print_test_header "Usage Help Documents --project-dir"
    run_test

    # Check if show_usage function mentions --project-dir
    local usage_section=$(sed -n '/^show_usage()/,/^}/p' "$MCP_INSTALLER")

    if echo "$usage_section" | grep -q 'project-dir'; then
        pass_test "Usage help documents --project-dir parameter"
        return 0
    else
        fail_test "Usage help doesn't document --project-dir" "Should document new parameter"
        return 1
    fi
}

# ============================================
# Test 9: Individual MCP installers pass through project context
# ============================================
test_individual_installers_use_project_context() {
    print_test_header "Individual MCP Installers Use Project Context"
    run_test

    # Check that install functions reference PROJECT_DIR
    local passed=0
    local failed=0

    for func in install_context7 install_memory install_playwright install_containerization install_chrome_devtools install_shadcn; do
        local function_body=$(sed -n "/^$func()/,/^}/p" "$MCP_INSTALLER")

        if echo "$function_body" | grep -q 'PROJECT_DIR'; then
            ((passed++))
        else
            ((failed++))
        fi
    done

    if [ $failed -eq 0 ]; then
        pass_test "All 6 MCP installers use PROJECT_DIR context"
        return 0
    else
        fail_test "$failed of 6 MCP installers don't use PROJECT_DIR" "All installers should be project-aware"
        return 1
    fi
}

# ============================================
# Main test execution
# ============================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  MCP Project Context Tests                               ║"
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
    test_accepts_project_dir_parameter
    test_project_dir_variable_exists
    test_project_dir_defaults_to_pwd
    test_templates_uses_cd
    test_claude_add_uses_cd
    test_pnpm_uses_cd
    test_verification_calls_pass_project_dir
    test_usage_documents_project_dir
    test_individual_installers_use_project_context

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
