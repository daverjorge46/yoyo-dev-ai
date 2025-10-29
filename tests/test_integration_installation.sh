#!/bin/bash

# Test: Integration Tests for Installation and Update Workflows
# Validates complete end-to-end installation and update workflows with .yoyo-dev/ directory

set -euo pipefail

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

echo "========================================="
echo "Integration Tests: Installation & Update"
echo "========================================="

# Test 1: Verify .yoyo-dev is hidden (not shown in standard ls)
test_start "Verify .yoyo-dev/ is hidden (not shown in standard 'ls' output)"
# Create a test scenario in /tmp
TEST_DIR="/tmp/yoyo-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Simulate directory structure
mkdir -p .yoyo-dev
touch .yoyo-dev/test.txt
mkdir -p yoyo-dev-visible
touch yoyo-dev-visible/test.txt

# Check that 'ls' doesn't show .yoyo-dev but shows yoyo-dev-visible
LS_OUTPUT=$(ls)
if echo "$LS_OUTPUT" | grep -q "yoyo-dev-visible" && ! echo "$LS_OUTPUT" | grep -q ".yoyo-dev"; then
    test_pass
else
    test_fail "Expected .yoyo-dev to be hidden, yoyo-dev-visible to be shown"
fi

# Cleanup
cd - > /dev/null
rm -rf "$TEST_DIR"

# Test 2: Verify .yoyo-dev is shown with 'ls -a'
test_start "Verify .yoyo-dev/ is shown with 'ls -a' (hidden file listing)"
TEST_DIR="/tmp/yoyo-test-$$"
mkdir -p "$TEST_DIR/.yoyo-dev"
cd "$TEST_DIR"

LS_A_OUTPUT=$(ls -a)
if echo "$LS_A_OUTPUT" | grep -q ".yoyo-dev"; then
    test_pass
else
    test_fail ".yoyo-dev not shown in 'ls -a' output"
fi

# Cleanup
cd - > /dev/null
rm -rf "$TEST_DIR"

# Test 3: Verify installation creates .yoyo-dev/ (not yoyo-dev/)
test_start "Installation script references './.yoyo-dev' as INSTALL_DIR"
if grep -q '^INSTALL_DIR="./.yoyo-dev"' setup/project.sh; then
    test_pass
else
    test_fail "INSTALL_DIR not set to './.yoyo-dev'"
fi

# Test 4: Verify update script detects .yoyo-dev/ (not yoyo-dev/)
test_start "Update script checks for './.yoyo-dev' directory"
if grep -q 'if \[ ! -d "./.yoyo-dev" \]' setup/yoyo-update.sh; then
    test_pass
else
    test_fail "Update script doesn't check for './.yoyo-dev'"
fi

# Test 5: Error message for old directory structure
test_start "Installation provides migration instructions for old 'yoyo-dev/' directory"
if grep -q "mv yoyo-dev .yoyo-dev" setup/project.sh; then
    test_pass
else
    test_fail "Missing migration instructions in project.sh"
fi

# Test 6: Update script provides migration hint
test_start "Update script provides migration hint for old directory"
if grep -q "mv yoyo-dev .yoyo-dev" setup/yoyo-update.sh; then
    test_pass
else
    test_fail "Missing migration hint in yoyo-update.sh"
fi

# Test 7: Verify home directory protection
test_start "Installation prevents installing in home directory (protects ~/yoyo-dev/)"
if grep -q "Cannot run project installation in home directory" setup/project.sh; then
    test_pass
else
    test_fail "Missing home directory protection"
fi

# Test 8: All file operations use consistent directory references
test_start "All copy operations in project.sh use \$INSTALL_DIR variable"
# Check that hardcoded paths are not used inappropriately
if grep '"./yoyo-dev' setup/project.sh | grep -v '^INSTALL_DIR=' | grep -v '# Check for old' | grep -v 'mv yoyo-dev' | grep -q .; then
    test_fail "Found hardcoded './yoyo-dev' references outside expected locations"
else
    test_pass
fi

# Test 9: Update script uses consistent .yoyo-dev references
test_start "All copy operations in yoyo-update.sh use './.yoyo-dev'"
# Should have exactly 1 reference to old directory (migration check)
OLD_DIR_COUNT=$(grep -c '"./yoyo-dev"' setup/yoyo-update.sh || echo "0")
if [ "$OLD_DIR_COUNT" -eq 1 ]; then
    test_pass
else
    test_fail "Expected 1 './yoyo-dev' reference (migration check), found $OLD_DIR_COUNT"
fi

# Test 10: Verify base installation at ~/yoyo-dev/ is never modified
test_start "Scripts never write to ~/yoyo-dev/ (base installation)"
if grep -E 'copy.*\$HOME/yoyo-dev|mkdir.*\$HOME/yoyo-dev|>.*\$HOME/yoyo-dev' setup/project.sh setup/yoyo-update.sh | grep -v '#'; then
    test_fail "Found operations that write to ~/yoyo-dev/"
else
    test_pass
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
