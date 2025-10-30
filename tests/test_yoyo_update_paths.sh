#!/bin/bash

# Test Suite: yoyo-update Path Resolution
# Tests for proper path resolution using $BASE_AGENT_OS instead of hardcoded paths

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

# Helper function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "  ${RED}$message${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Helper function to check if string exists in file
check_string_in_file() {
    local file="$1"
    local search_string="$2"
    grep -q "$search_string" "$file"
}

echo ""
echo "=================================================="
echo "Test Suite: yoyo-update Path Resolution"
echo "=================================================="
echo ""

# Test 1.1: $BASE_AGENT_OS resolution from symlinked execution
echo "Test 1.1: \$BASE_AGENT_OS resolution from symlinked execution"
SCRIPT_PATH="/usr/local/bin/yoyo-update"
if [ -L "$SCRIPT_PATH" ]; then
    RESOLVED_PATH=$(readlink -f "$SCRIPT_PATH")
    SCRIPT_DIR=$(dirname "$RESOLVED_PATH")
    BASE_AGENT_OS=$(dirname "$SCRIPT_DIR")

    if [ -d "$BASE_AGENT_OS" ] && [ -f "$BASE_AGENT_OS/setup/yoyo-update.sh" ]; then
        print_test_result "1.1 \$BASE_AGENT_OS resolution" "PASS" ""
    else
        print_test_result "1.1 \$BASE_AGENT_OS resolution" "FAIL" "BASE_AGENT_OS=$BASE_AGENT_OS does not contain setup/yoyo-update.sh"
    fi
else
    print_test_result "1.1 \$BASE_AGENT_OS resolution" "SKIP" "Symlink /usr/local/bin/yoyo-update not found"
fi

# Test 1.2: venv path detection with existing venv
echo ""
echo "Test 1.2: venv path detection with existing venv"
SCRIPT_FILE="./setup/yoyo-update.sh"
if [ -f "$SCRIPT_FILE" ]; then
    # Check if script uses BASE_AGENT_OS for venv path
    if grep -q "\$BASE_AGENT_OS/venv" "$SCRIPT_FILE"; then
        print_test_result "1.2 venv path uses \$BASE_AGENT_OS" "PASS" ""
    else
        # Check if it uses hardcoded path (this is the bug we're testing for)
        if grep -q "\$HOME/yoyo-dev/venv" "$SCRIPT_FILE"; then
            print_test_result "1.2 venv path uses \$BASE_AGENT_OS" "FAIL" "Script uses hardcoded \$HOME/yoyo-dev/venv instead of \$BASE_AGENT_OS/venv"
        else
            print_test_result "1.2 venv path uses \$BASE_AGENT_OS" "FAIL" "Cannot determine venv path resolution method"
        fi
    fi
else
    print_test_result "1.2 venv path uses \$BASE_AGENT_OS" "FAIL" "setup/yoyo-update.sh not found"
fi

# Test 1.3: venv path detection with missing venv
echo ""
echo "Test 1.3: Graceful handling when venv missing"
if [ -f "$SCRIPT_FILE" ]; then
    # Check if script has conditional check for venv existence (more flexible pattern)
    if grep -q "if \[ -d.*venv" "$SCRIPT_FILE"; then
        print_test_result "1.3 venv existence check" "PASS" ""
    else
        print_test_result "1.3 venv existence check" "FAIL" "No conditional check for venv directory existence"
    fi
else
    print_test_result "1.3 venv existence check" "FAIL" "setup/yoyo-update.sh not found"
fi

# Test 1.4: requirements.txt path resolution
echo ""
echo "Test 1.4: requirements.txt path resolution"
if [ -f "$SCRIPT_FILE" ]; then
    # Check if script uses BASE_AGENT_OS for requirements.txt
    if grep -q "\$BASE_AGENT_OS/requirements.txt" "$SCRIPT_FILE"; then
        print_test_result "1.4 requirements.txt path uses \$BASE_AGENT_OS" "PASS" ""
    else
        # Check if it uses hardcoded path (bug)
        if grep -q "\$HOME/yoyo-dev/requirements.txt" "$SCRIPT_FILE"; then
            print_test_result "1.4 requirements.txt path uses \$BASE_AGENT_OS" "FAIL" "Script uses hardcoded \$HOME/yoyo-dev/requirements.txt"
        else
            print_test_result "1.4 requirements.txt path uses \$BASE_AGENT_OS" "FAIL" "Cannot determine requirements.txt path resolution"
        fi
    fi
else
    print_test_result "1.4 requirements.txt path uses \$BASE_AGENT_OS" "FAIL" "setup/yoyo-update.sh not found"
fi

# Test 1.5: No hardcoded $HOME/yoyo-dev paths exist
echo ""
echo "Test 1.5: No hardcoded \$HOME/yoyo-dev paths exist"
if [ -f "$SCRIPT_FILE" ]; then
    # Count hardcoded paths (excluding comments and resolved BASE_AGENT_OS)
    HARDCODED_COUNT=$(grep -c "\$HOME/yoyo-dev" "$SCRIPT_FILE" || true)

    if [ "$HARDCODED_COUNT" -eq 0 ]; then
        print_test_result "1.5 No hardcoded paths" "PASS" ""
    else
        print_test_result "1.5 No hardcoded paths" "FAIL" "Found $HARDCODED_COUNT instances of hardcoded \$HOME/yoyo-dev paths"
        echo -e "  ${YELLOW}Hardcoded path locations:${NC}"
        grep -n "\$HOME/yoyo-dev" "$SCRIPT_FILE" | head -5
    fi
else
    print_test_result "1.5 No hardcoded paths" "FAIL" "setup/yoyo-update.sh not found"
fi

# Test 1.6: Graceful handling when pip missing from venv
echo ""
echo "Test 1.6: Graceful handling when pip missing from venv"
if [ -f "$SCRIPT_FILE" ]; then
    # Check if script verifies pip exists before using it (more flexible pattern)
    if grep -q "if \[ -f.*venv/bin/pip" "$SCRIPT_FILE"; then
        print_test_result "1.6 pip existence check" "PASS" ""
    else
        print_test_result "1.6 pip existence check" "FAIL" "No check for pip existence before attempting upgrade"
    fi
else
    print_test_result "1.6 pip existence check" "FAIL" "setup/yoyo-update.sh not found"
fi

# Test 1.7: No self-updating symlink logic
echo ""
echo "Test 1.7: No self-updating symlink logic"
if [ -f "$SCRIPT_FILE" ]; then
    # Check if script tries to update /usr/local/bin symlinks
    if grep -q "ln -sf.*\/usr\/local\/bin\/yoyo" "$SCRIPT_FILE"; then
        print_test_result "1.7 No symlink self-update" "FAIL" "Script attempts to update global symlinks (anti-pattern)"
        echo -e "  ${YELLOW}Found symlink update logic at:${NC}"
        grep -n "ln -sf.*\/usr\/local\/bin" "$SCRIPT_FILE" | head -3
    else
        print_test_result "1.7 No symlink self-update" "PASS" ""
    fi
else
    print_test_result "1.7 No symlink self-update" "FAIL" "setup/yoyo-update.sh not found"
fi

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
