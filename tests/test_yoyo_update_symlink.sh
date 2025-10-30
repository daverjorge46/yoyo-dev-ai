#!/usr/bin/env bash

# Test suite for yoyo-update symlink resolution fix
# Tests that yoyo-update.sh correctly resolves symlinks to find functions.sh

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
echo "yoyo-update Symlink Resolution - Test Suite"
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

# Test 1: yoyo-update.sh uses symlink resolution pattern
test_uses_symlink_resolution() {
    # Check if yoyo-update.sh contains the symlink resolution pattern
    grep -q 'SCRIPT_PATH="\${BASH_SOURCE\[0\]}"' "$PROJECT_ROOT/setup/yoyo-update.sh" && \
    grep -q 'if \[ -L "\$SCRIPT_PATH" \]' "$PROJECT_ROOT/setup/yoyo-update.sh" && \
    grep -q 'readlink -f' "$PROJECT_ROOT/setup/yoyo-update.sh"
}

# Test 2: yoyo-update.sh does NOT use the old broken pattern
test_not_using_old_pattern() {
    # Verify it doesn't use the old pattern at line 109
    # (This test will fail after fix if we only check line 109, so check context)
    local line_109=$(sed -n '109p' "$PROJECT_ROOT/setup/yoyo-update.sh")

    # After fix, line 109 should be the SCRIPT_PATH line, not SCRIPT_DIR
    if echo "$line_109" | grep -q 'SCRIPT_PATH'; then
        return 0  # Good - using new pattern
    elif echo "$line_109" | grep -q 'SCRIPT_DIR.*dirname.*\$0'; then
        return 1  # Bad - still using old pattern
    else
        # Line 109 is something else (comments, etc), check nearby lines
        grep -A 5 -B 5 '# Resolve symlink' "$PROJECT_ROOT/setup/yoyo-update.sh" | grep -q 'readlink -f'
    fi
}

# Test 3: Symlink resolution logic is present before SCRIPT_DIR calculation
test_resolution_before_script_dir() {
    # The pattern should appear before any SCRIPT_DIR calculation
    local script_path_line=$(grep -n 'SCRIPT_PATH="\${BASH_SOURCE\[0\]}"' "$PROJECT_ROOT/setup/yoyo-update.sh" | cut -d: -f1 | head -1)
    local script_dir_line=$(grep -n 'SCRIPT_DIR=' "$PROJECT_ROOT/setup/yoyo-update.sh" | cut -d: -f1 | head -1)

    if [ -n "$script_path_line" ] && [ -n "$script_dir_line" ]; then
        [ "$script_path_line" -lt "$script_dir_line" ]
    else
        return 1
    fi
}

# Test 4: functions.sh sourcing line is unchanged
test_functions_sourcing_unchanged() {
    # Line 121 (or nearby) should still have the source command
    grep -q 'source.*functions\.sh' "$PROJECT_ROOT/setup/yoyo-update.sh"
}

# Test 5: Consistency with yoyo.sh pattern
test_consistent_with_yoyo_sh() {
    # Both scripts should use similar patterns
    local yoyo_pattern=$(grep -A 3 'SCRIPT_PATH="\${BASH_SOURCE\[0\]}"' "$PROJECT_ROOT/setup/yoyo.sh" | head -4)
    local yoyo_update_pattern=$(grep -A 3 'SCRIPT_PATH="\${BASH_SOURCE\[0\]}"' "$PROJECT_ROOT/setup/yoyo-update.sh" | head -4)

    # If both patterns exist, they should be similar
    if [ -n "$yoyo_pattern" ] && [ -n "$yoyo_update_pattern" ]; then
        # Check that both use readlink -f
        echo "$yoyo_pattern" | grep -q 'readlink -f' && \
        echo "$yoyo_update_pattern" | grep -q 'readlink -f'
    else
        return 1
    fi
}

# Test 6: Script can source functions.sh (syntax check)
test_script_syntax_valid() {
    # Run bash syntax check
    bash -n "$PROJECT_ROOT/setup/yoyo-update.sh" 2>/dev/null
}

# Test 7: SCRIPT_DIR calculation uses resolved path
test_script_dir_uses_resolved_path() {
    # SCRIPT_DIR should be calculated from SCRIPT_PATH, not $0
    local script_dir_line=$(grep 'SCRIPT_DIR=' "$PROJECT_ROOT/setup/yoyo-update.sh")

    # Should reference SCRIPT_PATH, not $0
    echo "$script_dir_line" | grep -q 'SCRIPT_PATH' && \
    ! echo "$script_dir_line" | grep -q '\$0'
}

# Test 8: readlink -f is used (not readlink alone)
test_uses_readlink_f() {
    # Should use 'readlink -f' for full resolution
    grep -q 'readlink -f' "$PROJECT_ROOT/setup/yoyo-update.sh"
}

# Test 9: Symlink check uses correct syntax
test_symlink_check_syntax() {
    # Should check with [ -L "$SCRIPT_PATH" ]
    grep -q '\[ -L "\$SCRIPT_PATH" \]' "$PROJECT_ROOT/setup/yoyo-update.sh"
}

# Test 10: BASE_AGENT_OS still calculated correctly
test_base_agent_os_calculation() {
    # BASE_AGENT_OS should still be calculated from SCRIPT_DIR
    grep -q 'BASE_AGENT_OS=.*dirname.*SCRIPT_DIR' "$PROJECT_ROOT/setup/yoyo-update.sh"
}

# Run all tests
echo "Running tests..."
echo ""

run_test "Uses symlink resolution pattern" test_uses_symlink_resolution
run_test "Does NOT use old broken pattern" test_not_using_old_pattern
run_test "Resolution logic before SCRIPT_DIR calculation" test_resolution_before_script_dir
run_test "functions.sh sourcing line unchanged" test_functions_sourcing_unchanged
run_test "Consistent with yoyo.sh pattern" test_consistent_with_yoyo_sh
run_test "Script syntax is valid" test_script_syntax_valid
run_test "SCRIPT_DIR uses resolved path" test_script_dir_uses_resolved_path
run_test "Uses 'readlink -f' for full resolution" test_uses_readlink_f
run_test "Symlink check uses correct syntax" test_symlink_check_syntax
run_test "BASE_AGENT_OS still calculated correctly" test_base_agent_os_calculation

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
