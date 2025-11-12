#!/bin/bash

# Test: project.sh Installation Directory Behavior
# Validates that project.sh creates .yoyo-dev/ (hidden) instead of yoyo-dev/

set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
test_start() {
    echo -e "\n${YELLOW}TEST:${RESET} $1"
    TESTS_RUN=$((TESTS_RUN + 1))
}

test_pass() {
    echo -e "${GREEN}✓ PASS${RESET}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

test_fail() {
    echo -e "${RED}✗ FAIL${RESET}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Cleanup function
cleanup() {
    rm -rf "$TEST_DIR" 2>/dev/null || true
}

# Set up test directory
TEST_DIR="/tmp/yoyo-dev-install-test-$$"
mkdir -p "$TEST_DIR"
trap cleanup EXIT

echo "========================================="
echo "project.sh Installation Directory Tests"
echo "========================================="

# Test 1: INSTALL_DIR variable uses correct path
test_start "INSTALL_DIR variable should be './.yoyo-dev'"
INSTALL_DIR_VALUE=$(grep '^INSTALL_DIR=' setup/project.sh | head -1 | cut -d= -f2 | tr -d '"')
if [ "$INSTALL_DIR_VALUE" = "./.yoyo-dev" ]; then
    test_pass
else
    test_fail "Expected './.yoyo-dev', got '$INSTALL_DIR_VALUE'"
fi

# Test 2: Script does not reference yoyo-dev without dot
test_start "Script should not contain 'yoyo-dev' without dot prefix in directory operations"
# Exclude comments and check for ./yoyo-dev (without dot after ./)
if grep -q '"./yoyo-dev["/]' setup/project.sh; then
    test_fail "Found './yoyo-dev' reference (should be './.yoyo-dev')"
else
    test_pass
fi

# Test 3: All mkdir operations use INSTALL_DIR variable
test_start "All mkdir operations should use \$INSTALL_DIR variable"
# Look for mkdir with literal "./yoyo-dev" (not $INSTALL_DIR)
if grep 'mkdir' setup/project.sh | grep -q '"./yoyo-dev'; then
    test_fail "Found hardcoded './yoyo-dev' in mkdir commands"
else
    test_pass
fi

# Test 4: Home directory validation exists
test_start "Script should have validation to prevent home directory installation"
if grep -q "Cannot run project installation in home directory" setup/project.sh; then
    test_pass
else
    test_fail "Missing home directory validation check"
fi

# Test 5: Old directory error handling exists
test_start "Script should have error handling for old 'yoyo-dev/' directory"
if grep -q 'old.*yoyo-dev' setup/project.sh || grep -q 'yoyo-dev.*exists' setup/project.sh; then
    test_pass
else
    test_fail "Missing error handling for old directory structure"
fi

# Test 6: Echo messages reference correct directory
test_start "Echo messages should reference '.yoyo-dev/' not 'yoyo-dev/'"
# Check that there are no literal "./yoyo-dev" in echo messages (should use $INSTALL_DIR or .yoyo-dev)
if grep 'echo' setup/project.sh | grep -q '"./yoyo-dev'; then
    test_fail "Found echo messages with hardcoded './yoyo-dev' reference"
else
    test_pass
fi

# Test 7: Simulated installation creates correct directory
test_start "Simulated installation should use '.yoyo-dev/' path"
# Extract the INSTALL_DIR value and verify it would create hidden directory
if [ "$INSTALL_DIR_VALUE" = "./.yoyo-dev" ]; then
    # Verify path starts with dot
    if [[ "$INSTALL_DIR_VALUE" == "./.yoyo-dev"* ]]; then
        test_pass
    else
        test_fail "INSTALL_DIR path does not create hidden directory"
    fi
else
    test_fail "INSTALL_DIR not set to './.yoyo-dev'"
fi

# Test 8: Base installation path remains unchanged
test_start "Script should not modify ~/yoyo-dev/ (base installation)"
# Check that script references BASE_YOYO_DEV for base installation
# and has protection against installing in home directory
if grep -q 'BASE_YOYO_DEV' setup/project.sh && grep -q 'Cannot run project installation in home directory' setup/project.sh; then
    test_pass
else
    test_fail "Script may not properly protect base installation"
fi

# Summary
echo ""
echo "========================================="
echo "Test Results"
echo "========================================="
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${RESET}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "Tests failed: ${RED}$TESTS_FAILED${RESET}"
    echo ""
    echo "❌ TESTS FAILED"
    exit 1
else
    echo "Tests failed: 0"
    echo ""
    echo "✅ ALL TESTS PASSED"
    exit 0
fi
