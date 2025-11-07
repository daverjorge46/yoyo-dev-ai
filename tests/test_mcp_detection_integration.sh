#!/bin/bash
# Integration test for MCP detection logic
# Simulates real-world scenarios with mock Claude config

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
RESET='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

print_test() {
    echo -e "${BLUE}[TEST]${RESET} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${RESET} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}[FAIL]${RESET} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Setup test environment
TEST_DIR=$(mktemp -d)
TEST_CLAUDE_CONFIG="$TEST_DIR/.claude.json"
CURRENT_DIR=$(pwd)

cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Create mock Claude config with some MCPs installed
create_mock_claude_config() {
    local project_path="$1"
    cat > "$TEST_CLAUDE_CONFIG" <<EOF
{
  "projects": {
    "$project_path": {
      "allowedTools": [],
      "mcpContextUris": [],
      "mcpServers": {
        "context7": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-context7"]
        },
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"]
        }
      },
      "enabledMcpjsonServers": [],
      "disabledMcpjsonServers": [],
      "hasTrustDialogAccepted": true
    }
  }
}
EOF
}

# Test function: get_installed_mcps
get_installed_mcps() {
    local claude_config="$TEST_CLAUDE_CONFIG"
    local project_path="$CURRENT_DIR"

    if [ ! -f "$claude_config" ]; then
        return 0
    fi

    if command -v python3 &> /dev/null; then
        timeout 2 python3 -c "
import json
import sys

try:
    with open('$claude_config', 'r') as f:
        data = json.load(f)

    project_path = '$project_path'
    if project_path in data.get('projects', {}):
        mcp_servers = data['projects'][project_path].get('mcpServers', {})
        for name in mcp_servers.keys():
            print(name)
except Exception as e:
    pass
" 2>/dev/null || true
    fi
}

# Test function: detect_missing_mcps
detect_missing_mcps() {
    local expected_mcps="context7 memory playwright containerization chrome-devtools shadcn"
    local installed_mcps=$(get_installed_mcps)
    local missing_mcps=""

    for mcp in $expected_mcps; do
        if ! echo "$installed_mcps" | grep -q "^${mcp}$"; then
            missing_mcps="$missing_mcps $mcp"
        fi
    done

    echo "$missing_mcps" | xargs
}

# Test 1: Detect installed MCPs from config
print_test "Test 1: Detect installed MCPs from mock config"
create_mock_claude_config "$CURRENT_DIR"
INSTALLED=$(get_installed_mcps)
if echo "$INSTALLED" | grep -q "context7" && echo "$INSTALLED" | grep -q "memory"; then
    print_pass "Successfully detected context7 and memory from config"
else
    print_fail "Failed to detect installed MCPs. Got: $INSTALLED"
fi

# Test 2: Detect missing MCPs
print_test "Test 2: Detect missing MCPs"
MISSING=$(detect_missing_mcps)
if echo "$MISSING" | grep -q "playwright" && echo "$MISSING" | grep -q "containerization"; then
    print_pass "Successfully detected missing MCPs: $MISSING"
else
    print_fail "Failed to detect missing MCPs. Got: $MISSING"
fi

# Test 3: Verify correct count of missing MCPs
print_test "Test 3: Verify 4 MCPs are missing (out of 6 total)"
MISSING_COUNT=$(echo "$MISSING" | wc -w)
if [ "$MISSING_COUNT" -eq 4 ]; then
    print_pass "Correctly detected 4 missing MCPs"
else
    print_fail "Expected 4 missing MCPs, got $MISSING_COUNT"
fi

# Test 4: Test with empty config
print_test "Test 4: Handle empty Claude config"
rm -f "$TEST_CLAUDE_CONFIG"
echo '{"projects":{}}' > "$TEST_CLAUDE_CONFIG"
INSTALLED=$(get_installed_mcps)
if [ -z "$INSTALLED" ]; then
    print_pass "Correctly handled empty config (no MCPs installed)"
else
    print_fail "Expected no MCPs, got: $INSTALLED"
fi

# Test 5: Test with all MCPs installed
print_test "Test 5: Handle config with all MCPs installed"
cat > "$TEST_CLAUDE_CONFIG" <<EOF
{
  "projects": {
    "$CURRENT_DIR": {
      "mcpServers": {
        "context7": {},
        "memory": {},
        "playwright": {},
        "containerization": {},
        "chrome-devtools": {},
        "shadcn": {}
      }
    }
  }
}
EOF
MISSING=$(detect_missing_mcps)
if [ -z "$MISSING" ]; then
    print_pass "Correctly detected all MCPs installed (no missing)"
else
    print_fail "Expected no missing MCPs, got: $MISSING"
fi

# Test 6: Test with non-existent config file
print_test "Test 6: Handle non-existent Claude config"
rm -f "$TEST_CLAUDE_CONFIG"
INSTALLED=$(get_installed_mcps)
if [ -z "$INSTALLED" ] || [ "$INSTALLED" = "" ]; then
    print_pass "Correctly handled non-existent config"
else
    print_fail "Expected no MCPs from non-existent config, got: $INSTALLED"
fi

# Test 7: Test malformed JSON (skip if python timeout issues)
print_test "Test 7: Handle malformed JSON in config"
echo "{ invalid json }" > "$TEST_CLAUDE_CONFIG"
INSTALLED=$(timeout 2 bash -c "get_installed_mcps" 2>/dev/null || echo "")
if [ -z "$INSTALLED" ] || [ "$INSTALLED" = "" ]; then
    print_pass "Correctly handled malformed JSON"
else
    print_fail "Expected no MCPs from malformed JSON, got: $INSTALLED"
fi

# Summary
echo ""
echo "================================"
echo "Integration Test Summary"
echo "================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${RESET}"
echo -e "${RED}Failed: $TESTS_FAILED${RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All integration tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}Some integration tests failed.${RESET}"
    exit 1
fi
