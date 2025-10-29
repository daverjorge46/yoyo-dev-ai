#!/bin/bash

# Test: yoyo-update.sh Update Script Directory Behavior
# Validates that yoyo-update.sh detects and updates .yoyo-dev/ (hidden) instead of yoyo-dev/

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

echo "========================================="
echo "yoyo-update.sh Directory Detection Tests"
echo "========================================="

# Test 1: Installation detection checks for .yoyo-dev
test_start "Installation detection should check for './.yoyo-dev'"
if grep -q 'if \[ ! -d "./.yoyo-dev" \]' setup/yoyo-update.sh; then
    test_pass
else
    test_fail "Installation detection still uses './yoyo-dev'"
fi

# Test 2: Script should not reference yoyo-dev without dot (except migration check)
test_start "Script should not contain './yoyo-dev' (should be './.yoyo-dev')"
# Count references - should only be 1 (the intentional check for old directory)
COUNT=$(grep -c '"./yoyo-dev"' setup/yoyo-update.sh || echo "0")
if [ "$COUNT" -eq 1 ]; then
    test_pass
else
    test_fail "Found $COUNT './yoyo-dev' references (expected 1 for migration check)"
fi

# Test 3: All copy operations use .yoyo-dev
test_start "All copy operations should target './.yoyo-dev/'"
if grep 'copy_file\|copy_directory' setup/yoyo-update.sh | grep -q '"./yoyo-dev/'; then
    test_fail "Found './yoyo-dev/' in copy operations (should be './.yoyo-dev/')"
else
    test_pass
fi

# Test 4: Error message references correct directory
test_start "Error message should reference '.yoyo-dev/'"
if grep -q 'Yoyo Dev not found' setup/yoyo-update.sh; then
    # Check the context around the error message
    if grep -A2 -B2 'Yoyo Dev not found' setup/yoyo-update.sh | grep -q '.yoyo-dev'; then
        test_pass
    else
        test_fail "Error message doesn't reference '.yoyo-dev/'"
    fi
else
    test_fail "Missing 'Yoyo Dev not found' error message"
fi

# Test 5: Migration hint for old installations
test_start "Script should have migration hint for old 'yoyo-dev/' directory"
if grep -q 'old.*yoyo-dev' setup/yoyo-update.sh || grep -q 'mv yoyo-dev .yoyo-dev' setup/yoyo-update.sh; then
    test_pass
else
    test_fail "Missing migration hint for old directory structure"
fi

# Test 6: TUI library check uses .yoyo-dev
test_start "TUI library detection should check './.yoyo-dev/lib/yoyo_tui_v3'"
if grep 'yoyo_tui_v3' setup/yoyo-update.sh | grep -q '.yoyo-dev'; then
    test_pass
else
    test_fail "TUI library check may not use correct path"
fi

# Test 7: No hardcoded ./yoyo-dev paths in rsync operations
test_start "Rsync operations should use './.yoyo-dev/'"
if grep 'rsync' setup/yoyo-update.sh | grep -q '"./yoyo-dev/'; then
    test_fail "Found './yoyo-dev/' in rsync operations"
else
    test_pass
fi

# Test 8: Success messages reference correct directory
test_start "Success messages should reference '.yoyo-dev/'"
# Check update success messages don't use old path
if grep -i 'updated\|success' setup/yoyo-update.sh | grep 'yoyo-dev' | grep -qv '.yoyo-dev'; then
    test_fail "Success messages may reference old 'yoyo-dev' path"
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
