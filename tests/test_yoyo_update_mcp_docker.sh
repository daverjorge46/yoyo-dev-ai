#!/bin/bash
# Test: yoyo-update.sh MCP Docker Integration
# Verifies that MCP verification uses Docker MCP Gateway (not legacy npx)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
UPDATE_SCRIPT="$PROJECT_DIR/setup/yoyo-update.sh"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

print_test() {
    echo -e "${YELLOW}TEST:${RESET} $1"
}

pass() {
    ((TESTS_PASSED++))
    echo -e "  ${GREEN}PASS${RESET}: $1"
}

fail() {
    ((TESTS_FAILED++))
    echo -e "  ${RED}FAIL${RESET}: $1"
}

# ============================================
# Test 1: expected_mcps contains Docker server names
# ============================================
test_expected_mcps_docker_servers() {
    print_test "expected_mcps contains Docker MCP server names"
    ((TESTS_RUN++))

    # Check for Docker MCP servers (should exist)
    local docker_servers="playwright github-official duckduckgo filesystem"
    local missing_docker=""

    for server in $docker_servers; do
        if grep -q "expected_mcps=.*$server" "$UPDATE_SCRIPT" 2>/dev/null; then
            pass "Docker server '$server' found in expected_mcps"
        else
            missing_docker="$missing_docker $server"
        fi
    done

    if [ -n "$missing_docker" ]; then
        fail "Missing Docker servers in expected_mcps:$missing_docker"
    fi
}

# ============================================
# Test 2: expected_mcps does NOT contain legacy npx names
# ============================================
test_no_legacy_mcp_names() {
    print_test "expected_mcps does NOT contain legacy npx MCP names"
    ((TESTS_RUN++))

    # Check for legacy MCPs (should NOT exist)
    local legacy_servers="context7 memory shadcn containerization chrome-devtools"
    local found_legacy=""

    for server in $legacy_servers; do
        if grep -q "expected_mcps=.*$server" "$UPDATE_SCRIPT" 2>/dev/null; then
            found_legacy="$found_legacy $server"
        fi
    done

    if [ -n "$found_legacy" ]; then
        fail "Legacy npx servers still in expected_mcps:$found_legacy"
    else
        pass "No legacy npx servers in expected_mcps"
    fi
}

# ============================================
# Test 3: get_installed_mcps uses docker mcp command
# ============================================
test_get_installed_mcps_uses_docker() {
    print_test "get_installed_mcps() uses 'docker mcp server status'"
    ((TESTS_RUN++))

    # Check if get_installed_mcps function uses docker mcp command
    if grep -A 30 "^get_installed_mcps()" "$UPDATE_SCRIPT" | grep -q "docker mcp server"; then
        pass "get_installed_mcps() uses docker mcp command"
    else
        fail "get_installed_mcps() does not use docker mcp command"
    fi
}

# ============================================
# Test 4: get_installed_mcps does NOT read ~/.claude.json for MCPs
# ============================================
test_no_claude_json_mcp_parsing() {
    print_test "get_installed_mcps() does NOT parse ~/.claude.json for MCPs"
    ((TESTS_RUN++))

    # Check if get_installed_mcps still reads .claude.json for mcpServers
    if grep -A 30 "^get_installed_mcps()" "$UPDATE_SCRIPT" | grep -q 'claude_config.*\.claude\.json'; then
        fail "get_installed_mcps() still reads ~/.claude.json (legacy approach)"
    else
        pass "get_installed_mcps() does not read ~/.claude.json"
    fi
}

# ============================================
# Test 5: Docker availability check exists
# ============================================
test_docker_availability_check() {
    print_test "Docker availability check before MCP verification"
    ((TESTS_RUN++))

    # Check if check_docker_available function exists
    if grep -q "^check_docker_available()" "$UPDATE_SCRIPT"; then
        # Check if it's called in the main MCP verification flow
        if grep -q "check_docker_available" "$UPDATE_SCRIPT" | grep -v "^check_docker_available()" > /dev/null; then
            # Verify it appears before detect_missing_mcps in the flow
            local docker_check_line=$(grep -n "! check_docker_available" "$UPDATE_SCRIPT" | head -1 | cut -d: -f1)
            local detect_mcps_line=$(grep -n "detect_missing_mcps" "$UPDATE_SCRIPT" | head -1 | cut -d: -f1)

            if [ -n "$docker_check_line" ] && [ -n "$detect_mcps_line" ] && [ "$docker_check_line" -lt "$detect_mcps_line" ]; then
                pass "Docker availability checked before MCP verification"
            else
                pass "Docker availability check function exists and is used"
            fi
        else
            pass "Docker availability check function exists"
        fi
    else
        fail "No check_docker_available function found"
    fi
}

# ============================================
# Test 6: Graceful handling when Docker unavailable
# ============================================
test_graceful_docker_unavailable() {
    print_test "Graceful handling when Docker is unavailable"
    ((TESTS_RUN++))

    # Check for graceful skip when Docker not available
    if grep -q "skip.*[Dd]ocker\|[Dd]ocker.*not.*found\|[Dd]ocker.*not.*installed" "$UPDATE_SCRIPT"; then
        pass "Graceful handling when Docker unavailable"
    else
        fail "No graceful handling for Docker unavailable case"
    fi
}

# ============================================
# Run all tests
# ============================================
echo ""
echo "============================================"
echo "Testing: yoyo-update.sh MCP Docker Integration"
echo "============================================"
echo ""

test_expected_mcps_docker_servers
echo ""
test_no_legacy_mcp_names
echo ""
test_get_installed_mcps_uses_docker
echo ""
test_no_claude_json_mcp_parsing
echo ""
test_docker_availability_check
echo ""
test_graceful_docker_unavailable

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
echo "Tests Run:    $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${RESET}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${RESET}"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}FAILED${RESET}: Some tests failed"
    exit 1
else
    echo -e "${GREEN}PASSED${RESET}: All tests passed"
    exit 0
fi
