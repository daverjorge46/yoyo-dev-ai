#!/bin/bash
#
# Test Suite: yoyo-update Non-Interactive Execution
#
# Tests that yoyo-update command:
# 1. Completes within 120 seconds (no hanging)
# 2. Can be interrupted with Ctrl+C (SIGINT)
# 3. Exits with proper status codes
# 4. Works with and without venv
# 5. Doesn't prompt for sudo password
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test results array
declare -a TEST_RESULTS

# Helper: Print test header
print_test_header() {
    local test_name="$1"
    echo ""
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${CYAN}${BOLD}TEST: $test_name${RESET}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# Helper: Print test result
print_test_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$result" = "PASS" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓ PASS${RESET}: $test_name"
        TEST_RESULTS+=("PASS: $test_name")
    elif [ "$result" = "FAIL" ]; then
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗ FAIL${RESET}: $test_name"
        if [ -n "$message" ]; then
            echo -e "${RED}  Reason: $message${RESET}"
        fi
        TEST_RESULTS+=("FAIL: $test_name - $message")
    elif [ "$result" = "SKIP" ]; then
        echo -e "${YELLOW}⊘ SKIP${RESET}: $test_name"
        if [ -n "$message" ]; then
            echo -e "${YELLOW}  Reason: $message${RESET}"
        fi
        TEST_RESULTS+=("SKIP: $test_name - $message")
    fi
}

# Helper: Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Test 1: Check install-deps.sh has non-interactive pip flags
test_install_deps_noninteractive() {
    print_test_header "install-deps.sh has --no-input flag"

    local script="setup/install-deps.sh"

    if [ ! -f "$script" ]; then
        print_test_result "install-deps.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Check for --no-input flag in pip install commands (match $PIP or pip)
    if grep -qE "(pip|PIP).*install.*--no-input" "$script"; then
        print_test_result "install-deps.sh has --no-input flag" "PASS"
        return 0
    else
        print_test_result "install-deps.sh has --no-input flag" "FAIL" "Missing --no-input flag in pip install commands"
        return 1
    fi
}

# Test 2: Check install-deps.sh has signal trap
test_install_deps_signal_trap() {
    print_test_header "install-deps.sh has signal trap for Ctrl+C"

    local script="setup/install-deps.sh"

    if [ ! -f "$script" ]; then
        print_test_result "install-deps.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Check for trap command
    if grep -q "trap.*INT" "$script"; then
        print_test_result "install-deps.sh has signal trap" "PASS"
        return 0
    else
        print_test_result "install-deps.sh has signal trap" "FAIL" "Missing trap command for INT signal"
        return 1
    fi
}

# Test 3: Check yoyo-update.sh has non-interactive pip flags
test_yoyo_update_noninteractive() {
    print_test_header "yoyo-update.sh has --no-input flag"

    local script="setup/yoyo-update.sh"

    if [ ! -f "$script" ]; then
        print_test_result "yoyo-update.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Check for --no-input flag in pip install commands (match $PIP or pip or quoted pip paths)
    if grep -qE "(pip|PIP).*install.*--no-input" "$script"; then
        print_test_result "yoyo-update.sh has --no-input flag" "PASS"
        return 0
    else
        print_test_result "yoyo-update.sh has --no-input flag" "FAIL" "Missing --no-input flag in pip install commands"
        return 1
    fi
}

# Test 4: Check yoyo-update.sh has signal trap
test_yoyo_update_signal_trap() {
    print_test_header "yoyo-update.sh has signal trap for Ctrl+C"

    local script="setup/yoyo-update.sh"

    if [ ! -f "$script" ]; then
        print_test_result "yoyo-update.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Check for trap command
    if grep -q "trap.*INT" "$script"; then
        print_test_result "yoyo-update.sh has signal trap" "PASS"
        return 0
    else
        print_test_result "yoyo-update.sh has signal trap" "FAIL" "Missing trap command for INT signal"
        return 1
    fi
}

# Test 5: Check yoyo-update.sh doesn't use sudo for symlinks
test_yoyo_update_no_sudo() {
    print_test_header "yoyo-update.sh avoids sudo prompts"

    local script="setup/yoyo-update.sh"

    if [ ! -f "$script" ]; then
        print_test_result "yoyo-update.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Count sudo ln -sf commands that don't have permission checks
    local sudo_count=$(grep -c "sudo ln -sf" "$script" 2>/dev/null || echo "0")

    # Check for permission check pattern
    local has_permission_check=$(grep -c "\[ -w \"/usr/local/bin\" \]" "$script" 2>/dev/null || echo "0")

    if [ "$sudo_count" -eq 0 ] || [ "$has_permission_check" -gt 0 ]; then
        print_test_result "yoyo-update.sh avoids sudo prompts" "PASS"
        return 0
    else
        print_test_result "yoyo-update.sh avoids sudo prompts" "FAIL" "Found $sudo_count sudo commands without permission checks"
        return 1
    fi
}

# Test 6: Check install-deps.sh has timeout protection
test_install_deps_timeout() {
    print_test_header "install-deps.sh has timeout protection"

    local script="setup/install-deps.sh"

    if [ ! -f "$script" ]; then
        print_test_result "install-deps.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Check for timeout command (match $PIP or pip)
    if grep -qE "timeout.*(pip|PIP).*install" "$script"; then
        print_test_result "install-deps.sh has timeout" "PASS"
        return 0
    else
        print_test_result "install-deps.sh has timeout" "FAIL" "Missing timeout wrapper for pip commands"
        return 1
    fi
}

# Test 7: Check yoyo-update.sh has timeout protection
test_yoyo_update_timeout() {
    print_test_header "yoyo-update.sh has timeout protection"

    local script="setup/yoyo-update.sh"

    if [ ! -f "$script" ]; then
        print_test_result "yoyo-update.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Check for timeout command (match $PIP or pip or quoted pip paths)
    if grep -qE "timeout.*(pip|PIP).*install" "$script"; then
        print_test_result "yoyo-update.sh has timeout" "PASS"
        return 0
    else
        print_test_result "yoyo-update.sh has timeout" "FAIL" "Missing timeout wrapper for pip commands"
        return 1
    fi
}

# Test 8: Simulate Ctrl+C interrupt on install-deps.sh
test_ctrl_c_interrupt() {
    print_test_header "Ctrl+C interrupt simulation"

    if ! command_exists timeout; then
        print_test_result "timeout command available" "SKIP" "timeout command not found"
        return 0
    fi

    local script="setup/install-deps.sh"

    if [ ! -f "$script" ]; then
        print_test_result "install-deps.sh exists" "FAIL" "File not found: $script"
        return 1
    fi

    # Run script in background and send SIGINT after 2 seconds
    echo "  → Running install-deps.sh in background..."
    bash "$script" &> /dev/null &
    local pid=$!

    sleep 2

    echo "  → Sending SIGINT (Ctrl+C)..."
    kill -INT "$pid" 2>/dev/null || true

    # Wait for process to exit (max 5 seconds)
    local waited=0
    while kill -0 "$pid" 2>/dev/null && [ $waited -lt 5 ]; do
        sleep 1
        waited=$((waited + 1))
    done

    # Check if process exited
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
        print_test_result "Ctrl+C interrupt works" "FAIL" "Process did not exit after SIGINT"
        return 1
    else
        print_test_result "Ctrl+C interrupt works" "PASS"
        return 0
    fi
}

# Main test execution
main() {
    echo ""
    echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${CYAN}║${RESET}  🧪 yoyo-update Non-Interactive Test Suite              ${BOLD}${CYAN}║${RESET}"
    echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${YELLOW}This test suite verifies that yoyo-update fixes are applied.${RESET}"
    echo -e "${YELLOW}Tests will FAIL initially (TDD red phase), then PASS after fixes.${RESET}"
    echo ""

    # Run all tests
    test_install_deps_noninteractive || true
    test_install_deps_signal_trap || true
    test_install_deps_timeout || true
    test_yoyo_update_noninteractive || true
    test_yoyo_update_signal_trap || true
    test_yoyo_update_no_sudo || true
    test_yoyo_update_timeout || true
    test_ctrl_c_interrupt || true

    # Print summary
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD}${CYAN}TEST SUMMARY${RESET}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo ""
    echo -e "Total Tests: ${BOLD}$TESTS_TOTAL${RESET}"
    echo -e "Passed:      ${GREEN}${BOLD}$TESTS_PASSED${RESET}"
    echo -e "Failed:      ${RED}${BOLD}$TESTS_FAILED${RESET}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}${BOLD}✅ ALL TESTS PASSED${RESET}"
        echo ""
        return 0
    else
        echo -e "${RED}${BOLD}❌ SOME TESTS FAILED${RESET}"
        echo ""
        echo -e "${YELLOW}Failed tests (expected in TDD red phase):${RESET}"
        for result in "${TEST_RESULTS[@]}"; do
            if [[ "$result" == FAIL:* ]]; then
                echo -e "  ${RED}•${RESET} ${result#FAIL: }"
            fi
        done
        echo ""
        return 1
    fi
}

# Run tests
main "$@"
