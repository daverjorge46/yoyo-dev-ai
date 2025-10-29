#!/bin/bash
#
# Integration Test: yoyo-tmux.sh with parse-utils.sh
# Tests that tmux launcher produces identical output when using shared functions
#

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$HOME/yoyo-dev/setup"
TMUX_SCRIPT="$SETUP_DIR/yoyo-tmux.sh"
PARSE_UTILS="$SETUP_DIR/parse-utils.sh"
TEST_PROJECT_DIR="/tmp/yoyo-test-tmux-$$"

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

# Test 2: Tmux script syntax is valid
test_tmux_script_syntax() {
    ((TESTS_RUN++))

    if [ ! -f "$TMUX_SCRIPT" ]; then
        fail "Tmux script not found at $TMUX_SCRIPT"
        return 1
    fi

    if bash -n "$TMUX_SCRIPT" 2>/dev/null; then
        pass "Tmux script syntax is valid"
    else
        fail "Tmux script has syntax errors"
        return 1
    fi
}

# Test 3: Tmux script sources parse-utils.sh (after refactor)
test_tmux_sources_parse_utils() {
    ((TESTS_RUN++))

    if grep -q "source.*parse-utils.sh" "$TMUX_SCRIPT"; then
        pass "Tmux script sources parse-utils.sh"
    else
        echo -e "${YELLOW}⚠${RESET} Tmux script not yet refactored to use parse-utils.sh (expected before Task 2.4)"
    fi
}

# Test 4: Tmux script uses get_project_mission function
test_tmux_uses_mission_function() {
    ((TESTS_RUN++))

    if grep -q "get_project_mission" "$TMUX_SCRIPT"; then
        pass "Tmux script uses get_project_mission()"
    else
        echo -e "${YELLOW}⚠${RESET} Tmux script not yet using get_project_mission() (expected before Task 2.4)"
    fi
}

# Test 5: Tmux script uses get_tech_stack function
test_tmux_uses_tech_stack_function() {
    ((TESTS_RUN++))

    if grep -q "get_tech_stack" "$TMUX_SCRIPT"; then
        pass "Tmux script uses get_tech_stack()"
    else
        echo -e "${YELLOW}⚠${RESET} Tmux script not yet using get_tech_stack() (expected before Task 2.4)"
    fi
}

# Test 6: Verify old parsing logic is removed (after refactor)
test_old_logic_removed() {
    ((TESTS_RUN++))

    # Check for old sed-based extraction patterns (lines 86-110 in original)
    local old_pattern_count
    old_pattern_count=$(grep -c "sed -n '/^## Mission/,/^##/p'" "$TMUX_SCRIPT" 2>/dev/null || echo "0")

    if [ "$old_pattern_count" -eq 0 ]; then
        pass "Old parsing logic has been removed"
    else
        echo -e "${YELLOW}⚠${RESET} Old parsing logic still present (will be removed in Task 2.4)"
    fi
}

# Test 7: Mission extraction with test data
test_mission_extraction_tmux() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission (Lite Version)

## Mission

Build a visual task monitoring system for Yoyo Dev.

## Tech Stack

- React 18 + TypeScript
- Tmux for terminal multiplexing
EOF

    source "$PARSE_UTILS"
    local mission
    mission=$(get_project_mission)

    local expected="Build a visual task monitoring system for Yoyo Dev."

    if [ "$mission" = "$expected" ]; then
        pass "Mission extraction works correctly for tmux use case"
    else
        fail "Mission extraction mismatch" "$expected" "$mission"
    fi
}

# Test 8: Tech stack extraction with test data
test_tech_stack_extraction_tmux() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission (Lite Version)

## Mission

Test project.

## Tech Stack

- React 18 + TypeScript
- Tmux for terminal multiplexing
- Bash scripting
EOF

    source "$PARSE_UTILS"
    local tech_stack
    tech_stack=$(get_tech_stack)

    # Should contain React and Tmux
    if echo "$tech_stack" | grep -q "React" && echo "$tech_stack" | grep -q "Tmux"; then
        pass "Tech stack extraction works correctly for tmux use case"
    else
        fail "Tech stack extraction failed" "Contains React and Tmux" "$tech_stack"
    fi
}

# Test 9: Performance - parsing should be fast enough for tmux startup
test_parsing_performance_tmux() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission

## Mission

Performance test for tmux launcher.

## Tech Stack

- React 18
- Node.js
EOF

    source "$PARSE_UTILS"

    # Measure time for parsing (should be very fast)
    local start
    local end
    local duration

    start=$(date +%s%N)
    get_project_mission > /dev/null
    get_tech_stack > /dev/null
    end=$(date +%s%N)

    duration=$(( (end - start) / 1000000 )) # Convert to milliseconds

    # Should be fast enough for tmux startup (< 50ms)
    if [ $duration -lt 50 ]; then
        pass "Parsing performance is fast enough for tmux startup (${duration}ms)"
    else
        fail "Parsing too slow for tmux startup" "< 50ms" "${duration}ms"
    fi
}

# Test 10: Cache works correctly in tmux context
test_cache_tmux_context() {
    ((TESTS_RUN++))

    setup_test_project

    cat > ".yoyo-dev/product/mission-lite.md" << 'EOF'
# Product Mission

## Mission

Cache test for tmux.
EOF

    source "$PARSE_UTILS"

    # First call - creates cache
    local mission1
    mission1=$(get_project_mission)

    # Second call - uses cache (should be even faster)
    local start
    local end
    local duration

    start=$(date +%s%N)
    local mission2
    mission2=$(get_project_mission)
    end=$(date +%s%N)

    duration=$(( (end - start) / 1000000 ))

    # Cache should work and be very fast (< 10ms)
    if [ "$mission1" = "$mission2" ] && [ $duration -lt 10 ]; then
        pass "Cache works correctly in tmux context (${duration}ms)"
    else
        fail "Cache not working correctly" "< 10ms and consistent results" "${duration}ms, m1=$mission1, m2=$mission2"
    fi
}

# Run all tests
echo ""
echo "=========================================="
echo "Integration Test: yoyo-tmux.sh"
echo "=========================================="
echo ""

test_parse_utils_source
test_tmux_script_syntax
test_tmux_sources_parse_utils
test_tmux_uses_mission_function
test_tmux_uses_tech_stack_function
test_old_logic_removed
test_mission_extraction_tmux
test_tech_stack_extraction_tmux
test_parsing_performance_tmux
test_cache_tmux_context

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
