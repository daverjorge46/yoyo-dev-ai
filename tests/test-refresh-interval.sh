#!/bin/bash

# Test script for yoyo-status.sh refresh interval configuration
# Tests default value and environment variable override

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YOYO_STATUS="${SCRIPT_DIR}/../lib/yoyo-status.sh"

test_count=0
passed=0
failed=0

# Function to print test results
print_test() {
    local test_name="$1"
    local result="$2"

    test_count=$((test_count + 1))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${RESET} Test $test_count: $test_name"
        passed=$((passed + 1))
    else
        echo -e "${RED}✗${RESET} Test $test_count: $test_name"
        failed=$((failed + 1))
    fi
}

# Test 1: Default refresh interval should be 10 seconds
test_default_interval() {
    local interval=$(grep "^readonly REFRESH_INTERVAL=" "$YOYO_STATUS" | grep -o '[0-9]\+' | tail -1)

    if [ "$interval" = "10" ]; then
        print_test "Default interval is 10 seconds" "PASS"
    else
        print_test "Default interval is 10 seconds (got $interval)" "FAIL"
    fi
}

# Test 2: Environment variable override should work
test_env_override() {
    local pattern='readonly REFRESH_INTERVAL="\${YOYO_STATUS_REFRESH:-[0-9]\+}"'

    if grep -q 'YOYO_STATUS_REFRESH' "$YOYO_STATUS"; then
        print_test "Environment variable override is supported" "PASS"
    else
        print_test "Environment variable override is supported" "FAIL"
    fi
}

# Test 3: Verify interval is actually used in sleep command
test_interval_usage() {
    if grep -q 'sleep "$REFRESH_INTERVAL"' "$YOYO_STATUS"; then
        print_test "Interval is used in sleep command" "PASS"
    else
        print_test "Interval is used in sleep command" "FAIL"
    fi
}

# Test 4: Verify interval is displayed in header
test_interval_display() {
    if grep -q '\${REFRESH_INTERVAL}' "$YOYO_STATUS"; then
        print_test "Interval is displayed to user" "PASS"
    else
        print_test "Interval is displayed to user" "FAIL"
    fi
}

# Test 5: Verify header comments reference the interval
test_header_documentation() {
    if head -10 "$YOYO_STATUS" | grep -q "refresh"; then
        print_test "Header documentation mentions refresh" "PASS"
    else
        print_test "Header documentation mentions refresh" "FAIL"
    fi
}

echo ""
echo "=========================================="
echo "  Refresh Interval Configuration Tests"
echo "=========================================="
echo ""

test_default_interval
test_env_override
test_interval_usage
test_interval_display
test_header_documentation

echo ""
echo "=========================================="
echo "  Test Results"
echo "=========================================="
echo ""
echo -e "Total:  $test_count"
echo -e "${GREEN}Passed: $passed${RESET}"
echo -e "${RED}Failed: $failed${RESET}"
echo ""

if [ "$failed" -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${RESET}"
    exit 1
fi
