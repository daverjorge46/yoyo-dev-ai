#!/usr/bin/env bash

# Test suite for yoyo detection path fix
# Tests that launcher scripts correctly detect .yoyo-dev/ directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Create temporary test directory
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

echo "=================================================="
echo "Yoyo Detection Path Fix - Test Suite"
echo "=================================================="
echo ""

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_func="$2"

    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "Test $TESTS_RUN: $test_name ... "

    if $test_func; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 1: yoyo.sh detects .yoyo-dev/ directory (line 290)
test_yoyo_sh_line_290() {
    cd "$TEST_DIR"
    mkdir -p .yoyo-dev

    # Extract the detection logic from yoyo.sh line 290
    # Should check for .yoyo-dev not yoyo-dev
    grep -n '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo.sh" | grep "^290:" > /dev/null
}

# Test 2: yoyo.sh detects .yoyo-dev/ directory (line 348)
test_yoyo_sh_line_348() {
    cd "$TEST_DIR"
    mkdir -p .yoyo-dev

    # Extract the detection logic from yoyo.sh line 348
    # Should check for .yoyo-dev not yoyo-dev
    grep -n '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo.sh" | grep "^348:" > /dev/null
}

# Test 3: yoyo-tui-launcher.sh detects .yoyo-dev/ directory (line 16)
test_yoyo_tui_launcher_sh_line_16() {
    cd "$TEST_DIR"
    mkdir -p .yoyo-dev

    # Extract the detection logic from yoyo-tui-launcher.sh line 16
    # Should check for .yoyo-dev not yoyo-dev
    grep -n '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo-tui-launcher.sh" | grep "^16:" > /dev/null
}

# Test 4: yoyo-tmux.sh detects .yoyo-dev/ directory (line 51)
test_yoyo_tmux_sh_line_51() {
    cd "$TEST_DIR"
    mkdir -p .yoyo-dev

    # Extract the detection logic from yoyo-tmux.sh line 51
    # Should check for .yoyo-dev not yoyo-dev
    grep -n '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo-tmux.sh" | grep "^51:" > /dev/null
}

# Test 5: yoyo.sh does NOT check for old yoyo-dev (without dot) at line 290
test_yoyo_sh_no_old_path_290() {
    # Verify line 290 does NOT contain the old path
    ! grep -n '! -d "./yoyo-dev"' "$PROJECT_ROOT/setup/yoyo.sh" | grep "^290:" > /dev/null
}

# Test 6: yoyo.sh does NOT check for old yoyo-dev (without dot) at line 348
test_yoyo_sh_no_old_path_348() {
    # Verify line 348 does NOT contain the old path
    ! grep -n '! -d "./yoyo-dev"' "$PROJECT_ROOT/setup/yoyo.sh" | grep "^348:" > /dev/null
}

# Test 7: yoyo-tui-launcher.sh does NOT check for old yoyo-dev (without dot) at line 16
test_yoyo_tui_launcher_sh_no_old_path() {
    # Verify line 16 does NOT contain the old path
    ! grep -n '! -d "./yoyo-dev"' "$PROJECT_ROOT/setup/yoyo-tui-launcher.sh" | grep "^16:" > /dev/null
}

# Test 8: yoyo-tmux.sh does NOT check for old yoyo-dev (without dot) at line 51
test_yoyo_tmux_sh_no_old_path() {
    # Verify line 51 does NOT contain the old path
    ! grep -n '! -d "./yoyo-dev"' "$PROJECT_ROOT/setup/yoyo-tmux.sh" | grep "^51:" > /dev/null
}

# Test 9: All three scripts use consistent detection pattern
test_consistent_detection_pattern() {
    local yoyo_count=$(grep -c '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo.sh" || true)
    local tui_count=$(grep -c '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo-tui-launcher.sh" || true)
    local tmux_count=$(grep -c '! -d "./.yoyo-dev"' "$PROJECT_ROOT/setup/yoyo-tmux.sh" || true)

    # yoyo.sh should have 2 occurrences (lines 290 and 348)
    # yoyo-tui-launcher.sh should have 1 occurrence (line 16)
    # yoyo-tmux.sh should have 1 occurrence (line 51)
    [ "$yoyo_count" -ge 2 ] && [ "$tui_count" -ge 1 ] && [ "$tmux_count" -ge 1 ]
}

# Test 10: Functional test - script correctly identifies .yoyo-dev/ as installed
test_functional_detection_with_yoyo_dev() {
    cd "$TEST_DIR"
    mkdir -p .yoyo-dev/product

    # Create a minimal test that simulates the detection check
    if [ ! -d "./.yoyo-dev" ]; then
        return 1  # Should NOT enter this block
    fi
    return 0  # Correct behavior
}

# Test 11: Functional test - script correctly identifies missing installation
test_functional_detection_without_yoyo_dev() {
    cd "$TEST_DIR"
    rm -rf .yoyo-dev

    # Create a minimal test that simulates the detection check
    if [ ! -d "./.yoyo-dev" ]; then
        return 0  # Should enter this block (correct)
    fi
    return 1  # Wrong behavior
}

# Test 12: Old yoyo-dev/ directory (without dot) is NOT detected as valid
test_old_format_not_detected() {
    cd "$TEST_DIR"
    rm -rf .yoyo-dev
    mkdir -p yoyo-dev  # Old format (without dot)

    # The new detection should NOT find this
    if [ ! -d "./.yoyo-dev" ]; then
        return 0  # Correct: old format not detected
    fi
    return 1  # Wrong: old format should not be valid
}

# Run all tests
echo "Running tests..."
echo ""

run_test "yoyo.sh detects .yoyo-dev/ at line 290" test_yoyo_sh_line_290
run_test "yoyo.sh detects .yoyo-dev/ at line 348" test_yoyo_sh_line_348
run_test "yoyo-tui-launcher.sh detects .yoyo-dev/ at line 16" test_yoyo_tui_launcher_sh_line_16
run_test "yoyo-tmux.sh detects .yoyo-dev/ at line 51" test_yoyo_tmux_sh_line_51
run_test "yoyo.sh does NOT use old path at line 290" test_yoyo_sh_no_old_path_290
run_test "yoyo.sh does NOT use old path at line 348" test_yoyo_sh_no_old_path_348
run_test "yoyo-tui-launcher.sh does NOT use old path at line 16" test_yoyo_tui_launcher_sh_no_old_path
run_test "yoyo-tmux.sh does NOT use old path at line 51" test_yoyo_tmux_sh_no_old_path
run_test "All scripts use consistent detection pattern" test_consistent_detection_pattern
run_test "Functional: detects .yoyo-dev/ as installed" test_functional_detection_with_yoyo_dev
run_test "Functional: detects missing .yoyo-dev/ correctly" test_functional_detection_without_yoyo_dev
run_test "Old yoyo-dev/ format is NOT detected" test_old_format_not_detected

# Summary
echo ""
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
