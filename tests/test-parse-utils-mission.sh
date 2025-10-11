#!/bin/sh

# Test script for get_project_mission() function
# Tests mission extraction from mission-lite.md

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
test_result() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$1" = "pass" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        printf "${GREEN}✓${RESET} %s\n" "$2"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        printf "${RED}✗${RESET} %s\n" "$2"
        printf "  ${RED}Expected: %s${RESET}\n" "$3"
        printf "  ${RED}Got: %s${RESET}\n" "$4"
    fi
}

# Setup test environment
setup_test() {
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR" || exit 1
    mkdir -p .yoyo-dev/product
}

# Cleanup test environment
cleanup_test() {
    cd / || exit 1
    rm -rf "$TEST_DIR"
}

# Source the parse-utils.sh file (will be created later)
PARSE_UTILS_PATH="/home/yoga999/.yoyo-dev/setup/parse-utils.sh"

echo ""
echo "Testing get_project_mission() function"
echo "======================================="
echo ""

# Test 1: Extract mission from valid mission-lite.md
echo "Test 1: Extract mission from valid mission-lite.md"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

Build a revolutionary AI-powered task management system

## Tech Stack

React + Convex
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="Build a revolutionary AI-powered task management system"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Mission extracted correctly"
    else
        test_result "fail" "Mission extraction failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 2: Handle missing mission-lite.md (fallback)
echo ""
echo "Test 2: Handle missing mission-lite.md (fallback)"
setup_test
# Don't create mission-lite.md

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="AI-assisted development workflow"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Fallback mission returned"
    else
        test_result "fail" "Fallback mission failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 3: Handle empty mission-lite.md
echo ""
echo "Test 3: Handle empty mission-lite.md"
setup_test
touch .yoyo-dev/product/mission-lite.md

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="AI-assisted development workflow"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Empty file handled with fallback"
    else
        test_result "fail" "Empty file handling failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 4: Handle mission with leading/trailing whitespace
echo ""
echo "Test 4: Handle mission with leading/trailing whitespace"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

   Spaces everywhere mission statement

## Tech Stack

React
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="Spaces everywhere mission statement"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Whitespace trimmed correctly"
    else
        test_result "fail" "Whitespace trimming failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 5: Handle Unicode characters in mission
echo ""
echo "Test 5: Handle Unicode characters in mission"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

Build innovative AI solutions 🚀 for global users 🌍

## Tech Stack

React
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="Build innovative AI solutions 🚀 for global users 🌍"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Unicode handled correctly"
    else
        test_result "fail" "Unicode handling failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 6: Handle multi-line mission (should only get first line)
echo ""
echo "Test 6: Handle multi-line mission (should only get first line)"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

First line of mission
Second line should be ignored

## Tech Stack

React
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="First line of mission"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Only first line extracted"
    else
        test_result "fail" "Multi-line handling failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 7: Handle mission-lite.md without Mission section
echo ""
echo "Test 7: Handle mission-lite.md without Mission section"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Tech Stack

React + Convex
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_project_mission)
    expected="AI-assisted development workflow"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Missing section handled with fallback"
    else
        test_result "fail" "Missing section handling failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Summary
echo ""
echo "======================================="
echo "Test Summary"
echo "======================================="
printf "Total tests: %d\n" "$TESTS_RUN"
printf "${GREEN}Passed: %d${RESET}\n" "$TESTS_PASSED"
printf "${RED}Failed: %d${RESET}\n" "$TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
    exit 1
fi

exit 0
