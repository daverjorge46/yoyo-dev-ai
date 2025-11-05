#!/bin/bash
#
# Test script for venv shebang validation
# Tests the validate_venv_shebang function from yoyo-update.sh
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

# Function to validate venv shebang (extracted from yoyo-update.sh for testing)
validate_venv_shebang() {
    local venv_path="$1"
    local pip_path="$venv_path/bin/pip"

    # Check if pip exists
    if [ ! -f "$pip_path" ]; then
        return 1
    fi

    # Extract shebang from pip
    local shebang=$(head -1 "$pip_path")

    # Remove the #! prefix
    local python_path="${shebang#\#!}"

    # Check if the python interpreter exists
    if [ -f "$python_path" ]; then
        return 0  # Valid shebang
    else
        return 1  # Broken shebang
    fi
}

# Test helper functions
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

# Test 1: Detect venv with valid shebang
test_valid_shebang() {
    local test_venv="/tmp/test_venv_valid_$$"

    # Create a test venv with valid shebang
    python3 -m venv "$test_venv" 2>/dev/null || return 1

    # Validate it
    if validate_venv_shebang "$test_venv"; then
        # Cleanup
        rm -rf "$test_venv"
        return 0
    else
        # Cleanup
        rm -rf "$test_venv"
        return 1
    fi
}

# Test 2: Detect venv with broken shebang
test_broken_shebang() {
    local test_venv="/tmp/test_venv_broken_$$"

    # Create a test venv
    python3 -m venv "$test_venv" 2>/dev/null || return 1

    # Break the shebang by pointing to non-existent path
    local pip_path="$test_venv/bin/pip"
    local original_shebang=$(head -1 "$pip_path")

    # Replace with broken shebang
    echo "#!/path/that/does/not/exist/python3" > "$pip_path.tmp"
    tail -n +2 "$pip_path" >> "$pip_path.tmp"
    mv "$pip_path.tmp" "$pip_path"
    chmod +x "$pip_path"

    # Validate it (should fail)
    if ! validate_venv_shebang "$test_venv"; then
        # Cleanup
        rm -rf "$test_venv"
        return 0  # Test passes because validation correctly detected broken shebang
    else
        # Cleanup
        rm -rf "$test_venv"
        return 1  # Test fails because validation didn't detect broken shebang
    fi
}

# Test 3: Detect missing venv directory
test_missing_venv() {
    local test_venv="/tmp/test_venv_missing_$$"

    # Don't create venv, just test with non-existent path
    if ! validate_venv_shebang "$test_venv"; then
        return 0  # Test passes because validation correctly handled missing venv
    else
        return 1  # Test fails because validation didn't handle missing venv
    fi
}

# Test 4: Detect venv directory without pip
test_venv_without_pip() {
    local test_venv="/tmp/test_venv_no_pip_$$"

    # Create directory structure but no pip
    mkdir -p "$test_venv/bin"

    # Validate it (should fail)
    if ! validate_venv_shebang "$test_venv"; then
        # Cleanup
        rm -rf "$test_venv"
        return 0  # Test passes because validation correctly detected missing pip
    else
        # Cleanup
        rm -rf "$test_venv"
        return 1  # Test fails because validation didn't detect missing pip
    fi
}

# Test 5: Verify test fails before fix (integration test)
test_yoyo_update_broken_venv() {
    # This test will check if yoyo-update.sh has the validate_venv_shebang function
    local update_script="setup/yoyo-update.sh"

    if [ ! -f "$update_script" ]; then
        echo "  ⚠ yoyo-update.sh not found, skipping integration test"
        return 0
    fi

    # Check if validate_venv_shebang function exists in the script
    if grep -q "validate_venv_shebang" "$update_script"; then
        return 0  # Function exists, test passes
    else
        echo "  ℹ validate_venv_shebang not yet implemented in yoyo-update.sh"
        return 1  # Function doesn't exist yet, expected before fix
    fi
}

# Main test execution
echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  Venv Shebang Validation Tests                           ║${RESET}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}"

run_test "Test 1: Valid shebang detection" test_valid_shebang
run_test "Test 2: Broken shebang detection" test_broken_shebang
run_test "Test 3: Missing venv directory handling" test_missing_venv
run_test "Test 4: Venv without pip handling" test_venv_without_pip
run_test "Test 5: Integration with yoyo-update.sh" test_yoyo_update_broken_venv

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
    echo -e "${GREEN}${BOLD}All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}${BOLD}Some tests failed.${RESET}"
    exit 1
fi
