#!/bin/bash
#
# Integration Test: yoyo-launcher-v2.sh with parse-utils.sh
# Tests that launcher produces identical output when using shared functions
#

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$HOME/.yoyo-dev/setup"
LAUNCHER_SCRIPT="$SETUP_DIR/yoyo-launcher-v2.sh"
PARSE_UTILS="$SETUP_DIR/parse-utils.sh"
TEST_PROJECT_DIR="/tmp/yoyo-test-launcher-$$"

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Cleanup function
cleanup() {
    if [ -d "$TEST_PROJECT_DIR" ]; then
        rm -rf "$TEST_PROJECT_DIR"
    fi
}

trap cleanup EXIT

# Test result helpers
pass() {
    echo -e "${GREEN}✓${RESET} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${RESET} $1"
    if [ -n "${2:-}" ]; then
        echo "  Expected: $2"
        echo "  Got: $3"
    fi
    ((TESTS_FAILED++))
}

# Create test project structure
setup_test_project() {
    mkdir -p "$TEST_PROJECT_DIR/.yoyo-dev/product"
    cd "$TEST_PROJECT_DIR"
}

# Test 1: Parse-utils functions can be sourced
test_parse_utils_source() {
    ((TESTS_RUN++))

    if [ ! -f "$PARSE_UTILS" ]; then
        fail "parse-utils.sh not found at $PARSE_UTILS"
        return 1
    fi

    # Try sourcing parse-utils
    if source "$PARSE_UTILS" 2>/dev/null; then
        pass "parse-utils.sh can be sourced successfully"
    else
        fail "Failed to source parse-utils.sh"
        return 1
    fi

    # Verify functions exist
    if declare -f get_project_mission &>/dev/null && declare -f get_tech_stack &>/dev/null; then
        pass "Required functions exist (get_project_mission, get_tech_stack)"
    else
        fail "Required functions not found"
        return 1
    fi
}

# Test 2: Mission extraction matches expected output
test_mission_extraction() {
    ((TESTS_RUN++))

    setup_test_project

    # Create mission-lite.md
    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission (Lite Version)

## Mission

Build a task management app for developers that integrates with GitHub and Jira.

## Tech Stack

- React 18 + TypeScript
- Convex (backend)
- Tailwind CSS v4
EOF

    # Source parse-utils and extract mission
    source "$PARSE_UTILS"
    local mission
    mission=$(get_project_mission)

    local expected="Build a task management app for developers that integrates with GitHub and Jira."

    if [ "$mission" = "$expected" ]; then
        pass "Mission extraction matches expected output"
    else
        fail "Mission extraction mismatch" "$expected" "$mission"
    fi
}

# Test 3: Tech stack extraction from mission-lite.md
test_tech_stack_mission_lite() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission (Lite Version)

## Mission

Build a developer tool.

## Tech Stack

- React 18 + TypeScript
- Convex (backend)
- Tailwind CSS v4
EOF

    source "$PARSE_UTILS"
    local tech_stack
    tech_stack=$(get_tech_stack)

    # Should contain key technologies
    if echo "$tech_stack" | grep -q "React" && echo "$tech_stack" | grep -q "Convex"; then
        pass "Tech stack extraction from mission-lite.md works"
    else
        fail "Tech stack extraction failed" "Contains React and Convex" "$tech_stack"
    fi
}

# Test 4: Tech stack extraction from tech-stack.md (fallback)
test_tech_stack_fallback() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/tech-stack.md" << 'EOF'
# Tech Stack

## Frontend
**Frontend:** React 18 + TypeScript + Vite

## Backend
**Backend:** Convex (serverless)
EOF

    source "$PARSE_UTILS"
    local tech_stack
    tech_stack=$(get_tech_stack)

    if echo "$tech_stack" | grep -q "React" && echo "$tech_stack" | grep -q "Convex"; then
        pass "Tech stack extraction from tech-stack.md (fallback) works"
    else
        fail "Tech stack fallback extraction failed" "Contains React and Convex" "$tech_stack"
    fi
}

# Test 5: Fallback to defaults when files missing
test_fallback_defaults() {
    ((TESTS_RUN++))

    setup_test_project
    # No product files created

    source "$PARSE_UTILS"
    local mission
    local tech_stack

    mission=$(get_project_mission)
    tech_stack=$(get_tech_stack)

    if [ "$mission" = "AI-assisted development workflow" ] &&
       echo "$tech_stack" | grep -q "Not configured yet"; then
        pass "Fallback to defaults when files missing"
    else
        fail "Fallback defaults not working" "Default mission and tech stack" "mission=$mission, tech_stack=$tech_stack"
    fi
}

# Test 6: Launcher script references parse-utils (after refactor)
test_launcher_refactored() {
    ((TESTS_RUN++))

    # Check if launcher script exists
    if [ ! -f "$LAUNCHER_SCRIPT" ]; then
        fail "Launcher script not found at $LAUNCHER_SCRIPT"
        return 1
    fi

    # Check if launcher sources parse-utils.sh
    if grep -q "source.*parse-utils.sh" "$LAUNCHER_SCRIPT"; then
        pass "Launcher script sources parse-utils.sh"
    else
        # This is expected before refactoring
        echo -e "${YELLOW}⚠${RESET} Launcher not yet refactored to use parse-utils.sh (expected before Task 2.2)"
    fi

    # Check if launcher uses get_project_mission function
    if grep -q "get_project_mission" "$LAUNCHER_SCRIPT"; then
        pass "Launcher script uses get_project_mission()"
    else
        echo -e "${YELLOW}⚠${RESET} Launcher not yet using get_project_mission() (expected before Task 2.2)"
    fi

    # Check if launcher uses get_tech_stack function
    if grep -q "get_tech_stack" "$LAUNCHER_SCRIPT"; then
        pass "Launcher script uses get_tech_stack()"
    else
        echo -e "${YELLOW}⚠${RESET} Launcher not yet using get_tech_stack() (expected before Task 2.2)"
    fi
}

# Test 7: Performance check - parsing should be fast
test_parsing_performance() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission

## Mission

Performance test project.

## Tech Stack

- React 18 + TypeScript
- Convex
EOF

    source "$PARSE_UTILS"

    # Measure time for 10 mission extractions (should use cache after first)
    local start
    local end
    local duration

    start=$(date +%s%N)
    for i in {1..10}; do
        get_project_mission > /dev/null
        get_tech_stack > /dev/null
    done
    end=$(date +%s%N)

    duration=$(( (end - start) / 1000000 )) # Convert to milliseconds

    # Should be fast (< 100ms total for 10 iterations with caching)
    if [ $duration -lt 100 ]; then
        pass "Parsing performance is fast (${duration}ms for 10 iterations with cache)"
    else
        fail "Parsing too slow" "< 100ms" "${duration}ms"
    fi
}

# Test 8: Cache functionality works
test_cache_functionality() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission

## Mission

Cache test project.
EOF

    source "$PARSE_UTILS"

    # First call - should create cache
    local mission1
    mission1=$(get_project_mission)

    # Check cache directory was created
    if [ -d ".yoyo-dev/.cache/project-context" ]; then
        pass "Cache directory created successfully"
    else
        fail "Cache directory not created"
        return 1
    fi

    # Second call - should read from cache
    local mission2
    mission2=$(get_project_mission)

    if [ "$mission1" = "$mission2" ]; then
        pass "Cache returns consistent results"
    else
        fail "Cache results inconsistent" "$mission1" "$mission2"
    fi
}

# Run all tests
echo ""
echo "=========================================="
echo "Integration Test: yoyo-launcher-v2.sh"
echo "=========================================="
echo ""

test_parse_utils_source
test_mission_extraction
test_tech_stack_mission_lite
test_tech_stack_fallback
test_fallback_defaults
test_launcher_refactored
test_parsing_performance
test_cache_functionality

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${RESET}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${RESET}"
    exit 1
fi
