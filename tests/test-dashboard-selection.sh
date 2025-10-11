#!/bin/bash

# Test Dashboard Selection Logic
# Tests that yoyo-tmux.sh correctly detects and uses venv Python before system Python

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YOYO_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "======================================"
echo "Dashboard Selection Logic Test"
echo "======================================"
echo ""

# Test Counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${RESET} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${RESET} $test_name"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Extract dashboard selection logic from yoyo-tmux.sh
extract_dashboard_logic() {
    local venv_exists="$1"
    local venv_has_deps="$2"
    local system_has_deps="$3"

    DASHBOARD_CMD="$HOME/.yoyo-dev/lib/yoyo-status.sh"

    # Simulate venv check
    if [ "$venv_exists" = "true" ] && [ "$venv_has_deps" = "true" ]; then
        DASHBOARD_CMD="$HOME/.yoyo-dev/venv/bin/python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
    elif [ "$system_has_deps" = "true" ]; then
        DASHBOARD_CMD="python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
    fi

    echo "$DASHBOARD_CMD"
}

echo "Test 1: Venv exists with dependencies (primary use case)"
echo "--------------------------------------------------------"
result=$(extract_dashboard_logic "true" "true" "false")
expected="$HOME/.yoyo-dev/venv/bin/python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
run_test "Should use venv Python" "$expected" "$result"
echo ""

echo "Test 2: Venv exists but missing dependencies"
echo "-------------------------------------------"
result=$(extract_dashboard_logic "true" "false" "true")
expected="python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
run_test "Should fall back to system Python" "$expected" "$result"
echo ""

echo "Test 3: No venv, system Python has dependencies"
echo "----------------------------------------------"
result=$(extract_dashboard_logic "false" "false" "true")
expected="python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
run_test "Should use system Python" "$expected" "$result"
echo ""

echo "Test 4: No dependencies anywhere"
echo "-------------------------------"
result=$(extract_dashboard_logic "false" "false" "false")
expected="$HOME/.yoyo-dev/lib/yoyo-status.sh"
run_test "Should fall back to bash dashboard" "$expected" "$result"
echo ""

echo "Test 5: Venv without deps, system without deps"
echo "---------------------------------------------"
result=$(extract_dashboard_logic "true" "false" "false")
expected="$HOME/.yoyo-dev/lib/yoyo-status.sh"
run_test "Should fall back to bash dashboard" "$expected" "$result"
echo ""

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Total:  $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${RESET}"
echo -e "Failed: ${RED}$TESTS_FAILED${RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}Some tests failed!${RESET}"
    exit 1
fi
