#!/bin/bash

# Ralph Integration Tests for Yoyo Dev
# Tests the Ralph autonomous development integration

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SETUP_DIR="$PROJECT_DIR/setup"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================================================
# Test Utilities
# ============================================================================

log_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

log_pass() {
    echo -e "${GREEN}PASS:${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

assert() {
    local test_name="$1"
    shift
    ((TESTS_RUN++))
    log_test "$test_name"

    if "$@" 2>/dev/null; then
        log_pass "$test_name"
    else
        log_fail "$test_name"
    fi
}

assert_file_exists() {
    local test_name="$1"
    local file_path="$2"
    ((TESTS_RUN++))
    log_test "$test_name"

    if [ -f "$file_path" ]; then
        log_pass "$test_name"
    else
        log_fail "$test_name"
    fi
}

assert_grep() {
    local test_name="$1"
    local pattern="$2"
    local file_path="$3"
    ((TESTS_RUN++))
    log_test "$test_name"

    if grep -q "$pattern" "$file_path" 2>/dev/null; then
        log_pass "$test_name"
    else
        log_fail "$test_name"
    fi
}

# ============================================================================
# Main Test Runner
# ============================================================================

echo ""
echo "╭──────────────────────────────────────────────────────────────────╮"
echo "│            RALPH INTEGRATION TESTS                               │"
echo "╰──────────────────────────────────────────────────────────────────╯"
echo ""

# Detection Script Tests
echo "=== Ralph Detection Script ==="
assert_file_exists "ralph-detect.sh exists" "$SETUP_DIR/ralph-detect.sh"
assert "ralph-detect.sh is executable" test -x "$SETUP_DIR/ralph-detect.sh"
echo ""

# Setup Script Tests
echo "=== Ralph Setup Script ==="
assert_file_exists "ralph-setup.sh exists" "$SETUP_DIR/ralph-setup.sh"
assert "ralph-setup.sh is executable" test -x "$SETUP_DIR/ralph-setup.sh"
echo ""

# PROMPT.md Generator Tests
echo "=== PROMPT.md Generator ==="
assert_file_exists "ralph-prompt-generator.sh exists" "$SETUP_DIR/ralph-prompt-generator.sh"
assert "ralph-prompt-generator.sh is executable" test -x "$SETUP_DIR/ralph-prompt-generator.sh"
echo ""

# Yoyo.sh Integration Tests
echo "=== Yoyo.sh Integration ==="
assert_grep "yoyo.sh has RALPH_MODE config" "RALPH_MODE" "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh parses --ralph flag" '\-\-ralph' "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh parses --ralph-calls flag" '\-\-ralph-calls' "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh parses --ralph-timeout flag" '\-\-ralph-timeout' "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh parses --ralph-monitor flag" '\-\-ralph-monitor' "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh has launch_ralph_mode function" "launch_ralph_mode" "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh has check_ralph_installed function" "check_ralph_installed" "$SETUP_DIR/yoyo.sh"
assert_grep "yoyo.sh has generate_ralph_prompt function" "generate_ralph_prompt" "$SETUP_DIR/yoyo.sh"
echo ""

# Ralph Commands Tests
echo "=== Ralph Commands ==="
assert_file_exists "/ralph-status command exists" "$PROJECT_DIR/.claude/commands/ralph-status.md"
assert_file_exists "/ralph-stop command exists" "$PROJECT_DIR/.claude/commands/ralph-stop.md"
assert_file_exists "/ralph-config command exists" "$PROJECT_DIR/.claude/commands/ralph-config.md"
echo ""

# Documentation Tests
echo "=== Documentation ==="
assert_grep "CLAUDE.md has Ralph section" "Ralph Autonomous Development" "$PROJECT_DIR/CLAUDE.md"
assert_grep "CLAUDE.md documents --ralph flag" "\-\-ralph" "$PROJECT_DIR/CLAUDE.md"
assert_grep "CLAUDE.md documents /ralph-status" "/ralph-status" "$PROJECT_DIR/CLAUDE.md"
assert_grep "CLAUDE.md documents rate limiting" "rate_limit" "$PROJECT_DIR/CLAUDE.md"
assert_grep "CLAUDE.md documents circuit breaker" "circuit_breaker" "$PROJECT_DIR/CLAUDE.md"
echo ""

# Spec Tests
echo "=== Spec Files ==="
SPEC_DIR="$PROJECT_DIR/.yoyo-dev/specs/2026-01-02-ralph-autonomous-development"
assert_file_exists "spec.md exists" "$SPEC_DIR/spec.md"
assert_file_exists "spec-lite.md exists" "$SPEC_DIR/spec-lite.md"
assert_file_exists "tasks.md exists" "$SPEC_DIR/tasks.md"
assert_file_exists "decisions.md exists" "$SPEC_DIR/decisions.md"
assert_file_exists "state.json exists" "$SPEC_DIR/state.json"
echo ""

# Summary
echo "╭──────────────────────────────────────────────────────────────────╮"
echo "│                      TEST SUMMARY                                │"
echo "╰──────────────────────────────────────────────────────────────────╯"
echo ""
echo "  Tests Run:    $TESTS_RUN"
echo -e "  Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
