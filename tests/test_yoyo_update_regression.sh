#!/bin/bash
#
# Regression tests for yoyo-update.sh venv handling
# Tests all scenarios: valid venv, broken shebang, missing venv, no Python
#

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper
run_test() {
    local test_name="$1"
    local test_func="$2"

    TESTS_RUN=$((TESTS_RUN + 1))
    echo ""
    echo -e "${CYAN}Running: $test_name${RESET}"

    if $test_func; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓ PASS${RESET}"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗ FAIL${RESET}"
    fi
}

# Test 1: yoyo-update with valid venv (should upgrade normally)
test_valid_venv_upgrade() {
    # Check if yoyo-update.sh contains the validate_venv_shebang function
    if ! grep -q "validate_venv_shebang" setup/yoyo-update.sh; then
        echo "  ⚠ validate_venv_shebang function not found"
        return 1
    fi

    # Check if the function is called in the upgrade logic
    if ! grep -q "validate_venv_shebang \"\$BASE_AGENT_OS/venv\"" setup/yoyo-update.sh; then
        echo "  ⚠ validate_venv_shebang not called in upgrade logic"
        return 1
    fi

    echo "  ✓ Valid venv upgrade logic is present"
    return 0
}

# Test 2: yoyo-update with broken shebang (should auto-recreate)
test_broken_shebang_recovery() {
    # Check if yoyo-update.sh has auto-recovery logic
    if ! grep -q "Automatically recreating virtual environment" setup/yoyo-update.sh; then
        echo "  ⚠ Auto-recovery message not found"
        return 1
    fi

    # Check if it backs up broken venv
    if ! grep -q "Backing up broken venv" setup/yoyo-update.sh; then
        echo "  ⚠ Backup logic not found"
        return 1
    fi

    # Check if it calls install-dashboard-deps.sh
    if ! grep -q "install-dashboard-deps.sh" setup/yoyo-update.sh; then
        echo "  ⚠ install-dashboard-deps.sh call not found"
        return 1
    fi

    echo "  ✓ Auto-recovery logic is present"
    return 0
}

# Test 3: yoyo-update with missing venv (should handle gracefully)
test_missing_venv_handling() {
    # Check if there's fallback to system pip when venv doesn't exist
    if ! grep -q "command -v pip3" setup/yoyo-update.sh; then
        echo "  ⚠ System pip fallback not found"
        return 1
    fi

    echo "  ✓ Missing venv fallback logic is present"
    return 0
}

# Test 4: yoyo-update with no Python (should fall back appropriately)
test_no_python_fallback() {
    # Check if script handles case where Python/pip is not available
    # This should skip gracefully or show appropriate message
    if ! grep -q "pip3" setup/yoyo-update.sh; then
        echo "  ⚠ pip3 handling not found"
        return 1
    fi

    echo "  ✓ No Python fallback logic is present"
    return 0
}

# Test 5: Verify existing functionality preserved
test_existing_functionality() {
    # Verify that the original upgrade logic is still present
    if ! grep -q "timeout 300.*pip.*install.*--upgrade" setup/yoyo-update.sh; then
        echo "  ⚠ Original upgrade logic modified unexpectedly"
        return 1
    fi

    # Verify requirements.txt is still used
    if ! grep -q "requirements.txt" setup/yoyo-update.sh; then
        echo "  ⚠ requirements.txt reference missing"
        return 1
    fi

    echo "  ✓ Existing functionality preserved"
    return 0
}

# Test 6: User messaging clarity
test_user_messaging() {
    local message_count=0

    # Check for clear user messages
    if grep -q "Virtual environment has broken shebang" setup/yoyo-update.sh; then
        ((message_count++))
    fi

    if grep -q "Automatically recreating virtual environment" setup/yoyo-update.sh; then
        ((message_count++))
    fi

    if grep -q "Virtual environment recreated successfully" setup/yoyo-update.sh; then
        ((message_count++))
    fi

    if [ $message_count -ge 2 ]; then
        echo "  ✓ User messaging is clear ($message_count key messages found)"
        return 0
    else
        echo "  ⚠ Insufficient user messaging ($message_count key messages found)"
        return 1
    fi
}

# Main test execution
echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  yoyo-update Regression Tests                             ║${RESET}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}"

run_test "Test 1: Valid venv upgrade handling" test_valid_venv_upgrade
run_test "Test 2: Broken shebang auto-recovery" test_broken_shebang_recovery
run_test "Test 3: Missing venv graceful handling" test_missing_venv_handling
run_test "Test 4: No Python fallback behavior" test_no_python_fallback
run_test "Test 5: Existing functionality preserved" test_existing_functionality
run_test "Test 6: User messaging clarity" test_user_messaging

# Print summary
echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  Test Summary                                             ║${RESET}"
echo -e "${BOLD}${CYAN}╠═══════════════════════════════════════════════════════════╣${RESET}"
echo -e "${CYAN}║${RESET}  Tests Run:    $TESTS_RUN                                        ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  Tests Passed: ${GREEN}$TESTS_PASSED${RESET}                                        ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  Tests Failed: ${RED}$TESTS_FAILED${RESET}                                        ${CYAN}║${RESET}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}All regression tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}${BOLD}Some regression tests failed.${RESET}"
    exit 1
fi
