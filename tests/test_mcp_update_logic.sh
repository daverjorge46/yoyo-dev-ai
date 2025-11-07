#!/bin/bash
# Test MCP Update Logic in yoyo-update.sh
# Tests the MCP detection and update functions

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
RESET='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

print_test() {
    echo -e "${BLUE}[TEST]${RESET} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${RESET} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}[FAIL]${RESET} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Test 1: Check Claude CLI detection function exists
print_test "Verifying check_claude_cli_available function exists in yoyo-update.sh"
if grep -q "check_claude_cli_available()" setup/yoyo-update.sh; then
    print_pass "Function check_claude_cli_available exists"
else
    print_fail "Function check_claude_cli_available not found"
fi

# Test 2: Check get_installed_mcps function exists
print_test "Verifying get_installed_mcps function exists in yoyo-update.sh"
if grep -q "get_installed_mcps()" setup/yoyo-update.sh; then
    print_pass "Function get_installed_mcps exists"
else
    print_fail "Function get_installed_mcps not found"
fi

# Test 3: Check detect_missing_mcps function exists
print_test "Verifying detect_missing_mcps function exists in yoyo-update.sh"
if grep -q "detect_missing_mcps()" setup/yoyo-update.sh; then
    print_pass "Function detect_missing_mcps exists"
else
    print_fail "Function detect_missing_mcps not found"
fi

# Test 4: Check prompt_mcp_update function exists
print_test "Verifying prompt_mcp_update function exists in yoyo-update.sh"
if grep -q "prompt_mcp_update()" setup/yoyo-update.sh; then
    print_pass "Function prompt_mcp_update exists"
else
    print_fail "Function prompt_mcp_update not found"
fi

# Test 5: Check install_missing_mcps function exists
print_test "Verifying install_missing_mcps function exists in yoyo-update.sh"
if grep -q "install_missing_mcps()" setup/yoyo-update.sh; then
    print_pass "Function install_missing_mcps exists"
else
    print_fail "Function install_missing_mcps not found"
fi

# Test 6: Verify --skip-mcp-check flag is handled
print_test "Verifying --skip-mcp-check flag handling"
if grep -q "SKIP_MCP_CHECK" setup/yoyo-update.sh && grep -q "\-\-skip-mcp-check" setup/yoyo-update.sh; then
    print_pass "--skip-mcp-check flag is implemented"
else
    print_fail "--skip-mcp-check flag not found"
fi

# Test 7: Verify MCP verification flow is present
print_test "Verifying MCP verification flow in script"
if grep -q "Main MCP verification flow" setup/yoyo-update.sh; then
    print_pass "MCP verification flow is present"
else
    print_fail "MCP verification flow not found"
fi

# Test 8: Verify expected MCPs list
print_test "Verifying expected MCPs list includes all 6 MCPs"
if grep -q "context7 memory playwright containerization chrome-devtools shadcn" setup/yoyo-update.sh; then
    print_pass "All 6 expected MCPs are listed"
else
    print_fail "Expected MCPs list is incomplete or incorrect"
fi

# Test 9: Verify Claude config path
print_test "Verifying Claude config path points to ~/.claude.json"
if grep -q '\$HOME/.claude.json' setup/yoyo-update.sh; then
    print_pass "Claude config path is correct"
else
    print_fail "Claude config path is incorrect or missing"
fi

# Test 10: Verify mcp-claude-installer.sh is called
print_test "Verifying mcp-claude-installer.sh is referenced"
if grep -q "mcp-claude-installer.sh" setup/yoyo-update.sh; then
    print_pass "mcp-claude-installer.sh is referenced correctly"
else
    print_fail "mcp-claude-installer.sh is not referenced"
fi

# Test 11: Test help message includes --skip-mcp-check
print_test "Verifying help message includes --skip-mcp-check flag"
if grep -q "skip-mcp-check.*Skip MCP verification" setup/yoyo-update.sh; then
    print_pass "Help message includes --skip-mcp-check documentation"
else
    print_fail "Help message missing --skip-mcp-check documentation"
fi

# Test 12: Verify Python-based JSON parsing for Claude config
print_test "Verifying Python script for Claude config parsing"
if grep -q "python3 -c" setup/yoyo-update.sh && grep -q "import json" setup/yoyo-update.sh; then
    print_pass "Python-based JSON parsing is implemented"
else
    print_fail "Python-based JSON parsing not found"
fi

# Summary
echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${RESET}"
echo -e "${RED}Failed: $TESTS_FAILED${RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}Some tests failed.${RESET}"
    exit 1
fi
