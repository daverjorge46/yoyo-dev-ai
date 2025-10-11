#!/bin/sh

# Test script for get_tech_stack() function
# Tests tech stack extraction from mission-lite.md and tech-stack.md

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

# Source the parse-utils.sh file
PARSE_UTILS_PATH="/home/yoga999/.yoyo-dev/setup/parse-utils.sh"

echo ""
echo "Testing get_tech_stack() function"
echo "=================================="
echo ""

# Test 1: Extract tech stack from mission-lite.md
echo "Test 1: Extract tech stack from mission-lite.md"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

Build amazing products

## Tech Stack

- React 18
- TypeScript
- Convex
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="React 18 TypeScript Convex"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Tech stack extracted from mission-lite.md"
    else
        test_result "fail" "Tech stack extraction failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 2: Extract frontend + backend from tech-stack.md
echo ""
echo "Test 2: Extract frontend + backend from tech-stack.md"
setup_test
cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

**Frontend:** React 18 + TypeScript
**Backend:** Convex
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="React 18 + TypeScript + Convex"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Frontend + Backend extracted"
    else
        test_result "fail" "Frontend + Backend extraction failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 3: Extract only frontend from tech-stack.md
echo ""
echo "Test 3: Extract only frontend from tech-stack.md"
setup_test
cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

**Frontend:** Next.js 14

Other tools and configurations here.
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="Next.js 14"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Frontend only extracted"
    else
        test_result "fail" "Frontend only extraction failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 4: Extract only backend from tech-stack.md
echo ""
echo "Test 4: Extract only backend from tech-stack.md"
setup_test
cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

**Backend:** Express + PostgreSQL

Some additional information.
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="Express + PostgreSQL"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Backend only extracted"
    else
        test_result "fail" "Backend only extraction failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 5: Fallback to pattern matching in tech-stack.md
echo ""
echo "Test 5: Fallback to pattern matching in tech-stack.md"
setup_test
cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

We're using the following technologies:
- React for frontend
- Django for backend APIs
- PostgreSQL database
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    # Should detect React and Django
    if echo "$result" | grep -q "React" && echo "$result" | grep -q "Django"; then
        test_result "pass" "Pattern matching fallback works"
    else
        test_result "fail" "Pattern matching fallback failed" "React + Django" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 6: Handle missing files (fallback to default)
echo ""
echo "Test 6: Handle missing files (fallback to default)"
setup_test
# Don't create any files

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="Not configured yet - run /plan-product or /analyze-product"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Default fallback returned"
    else
        test_result "fail" "Default fallback failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 7: Prefer mission-lite.md over tech-stack.md
echo ""
echo "Test 7: Prefer mission-lite.md over tech-stack.md"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

Build products

## Tech Stack

- Vue 3
- Supabase
EOF

cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

**Frontend:** React
**Backend:** Firebase
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="Vue 3 Supabase"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "mission-lite.md takes precedence"
    else
        test_result "fail" "Precedence failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 8: Fallback to tech-stack.md when mission-lite.md has no Tech Stack section
echo ""
echo "Test 8: Fallback to tech-stack.md when mission-lite.md has no Tech Stack"
setup_test
cat > .yoyo-dev/product/mission-lite.md << 'EOF'
# Product Mission

## Mission

Build products
EOF

cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

**Frontend:** Angular
**Backend:** FastAPI
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="Angular + FastAPI"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Fallback to tech-stack.md works"
    else
        test_result "fail" "Fallback failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 9: Handle various Frontend/Backend label formats
echo ""
echo "Test 9: Handle various Frontend/Backend label formats"
setup_test
cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

- **Frontend**: Svelte
- *Backend*: Node.js
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    # Should extract both
    if echo "$result" | grep -q "Svelte" && echo "$result" | grep -q "Node"; then
        test_result "pass" "Various label formats handled"
    else
        test_result "fail" "Label format handling failed" "Svelte + Node" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Test 10: Handle whitespace in tech-stack.md
echo ""
echo "Test 10: Handle whitespace in tech-stack.md"
setup_test
cat > .yoyo-dev/product/tech-stack.md << 'EOF'
# Tech Stack

**Frontend:**    React with extra spaces
**Backend:**   Convex with spaces
EOF

if [ -f "$PARSE_UTILS_PATH" ]; then
    # shellcheck source=/dev/null
    . "$PARSE_UTILS_PATH"
    result=$(get_tech_stack)
    expected="React with extra spaces + Convex with spaces"
    if [ "$result" = "$expected" ]; then
        test_result "pass" "Whitespace handled correctly"
    else
        test_result "fail" "Whitespace handling failed" "$expected" "$result"
    fi
else
    test_result "fail" "parse-utils.sh not found" "File exists" "File missing"
fi
cleanup_test

# Summary
echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
printf "Total tests: %d\n" "$TESTS_RUN"
printf "${GREEN}Passed: %d${RESET}\n" "$TESTS_PASSED"
printf "${RED}Failed: %d${RESET}\n" "$TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
    exit 1
fi

exit 0
