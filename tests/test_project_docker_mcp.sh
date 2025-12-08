#!/bin/bash

# Test: Project Setup Docker MCP Integration
# Verifies that project.sh uses Docker MCP setup instead of legacy npx installer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Test helper functions
pass() {
    echo -e "${GREEN}PASS${NC}: $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}FAIL${NC}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

skip() {
    echo -e "${YELLOW}SKIP${NC}: $1"
}

# ============================================================================
# Test: project.sh references docker-mcp-setup.sh
# ============================================================================

echo ""
echo "Testing project.sh Docker MCP references..."
echo "============================================="

PROJECT_SH="$PROJECT_DIR/setup/project.sh"

if [ ! -f "$PROJECT_SH" ]; then
    fail "project.sh not found at $PROJECT_SH"
else
    # Test 1: project.sh copies docker-mcp-setup.sh from base
    if grep -q 'setup/docker-mcp-setup.sh' "$PROJECT_SH"; then
        pass "project.sh references docker-mcp-setup.sh"
    else
        fail "project.sh does not reference docker-mcp-setup.sh"
    fi

    # Test 2: project.sh no longer references mcp-claude-installer.sh
    if grep -q 'mcp-claude-installer.sh' "$PROJECT_SH"; then
        fail "project.sh still references legacy mcp-claude-installer.sh"
    else
        pass "project.sh has no references to legacy mcp-claude-installer.sh"
    fi

    # Test 3: MCP_INSTALLER variable points to docker-mcp-setup.sh
    if grep -q 'MCP_INSTALLER=.*docker-mcp-setup.sh' "$PROJECT_SH"; then
        pass "MCP_INSTALLER variable set to docker-mcp-setup.sh"
    else
        fail "MCP_INSTALLER variable not set to docker-mcp-setup.sh"
    fi

    # Test 4: MCP section mentions Docker Desktop
    if grep -q 'Docker Desktop' "$PROJECT_SH"; then
        pass "project.sh mentions Docker Desktop in MCP section"
    else
        fail "project.sh does not mention Docker Desktop requirements"
    fi

    # Test 5: MCP section mentions Docker MCP Gateway
    if grep -q 'Docker MCP' "$PROJECT_SH"; then
        pass "project.sh mentions Docker MCP Gateway"
    else
        fail "project.sh does not mention Docker MCP Gateway"
    fi

    # Test 6: Download section references docker-mcp-setup.sh
    if grep -q 'download_file.*docker-mcp-setup.sh' "$PROJECT_SH"; then
        pass "project.sh downloads docker-mcp-setup.sh from GitHub"
    else
        fail "project.sh does not download docker-mcp-setup.sh from GitHub"
    fi
fi

# ============================================================================
# Test: docker-mcp-setup.sh exists
# ============================================================================

echo ""
echo "Testing docker-mcp-setup.sh exists..."
echo "======================================"

DOCKER_MCP_SETUP="$PROJECT_DIR/setup/docker-mcp-setup.sh"

if [ -f "$DOCKER_MCP_SETUP" ]; then
    pass "docker-mcp-setup.sh exists"

    # Test executable
    if [ -x "$DOCKER_MCP_SETUP" ]; then
        pass "docker-mcp-setup.sh is executable"
    else
        fail "docker-mcp-setup.sh is not executable"
    fi

    # Test has Docker MCP functions
    if grep -q 'docker mcp' "$DOCKER_MCP_SETUP"; then
        pass "docker-mcp-setup.sh contains docker mcp commands"
    else
        fail "docker-mcp-setup.sh does not contain docker mcp commands"
    fi

    # Test enables recommended servers
    if grep -q 'playwright' "$DOCKER_MCP_SETUP" && \
       grep -q 'github-official' "$DOCKER_MCP_SETUP" && \
       grep -q 'duckduckgo' "$DOCKER_MCP_SETUP"; then
        pass "docker-mcp-setup.sh enables recommended servers"
    else
        fail "docker-mcp-setup.sh missing recommended server references"
    fi
else
    fail "docker-mcp-setup.sh does not exist"
fi

# ============================================================================
# Test: .mcp.json configuration
# ============================================================================

echo ""
echo "Testing .mcp.json Docker MCP configuration..."
echo "=============================================="

MCP_JSON="$PROJECT_DIR/.mcp.json"

if [ -f "$MCP_JSON" ]; then
    pass ".mcp.json exists"

    # Test contains MCP_DOCKER entry
    if grep -q 'MCP_DOCKER' "$MCP_JSON"; then
        pass ".mcp.json contains MCP_DOCKER entry"
    else
        fail ".mcp.json missing MCP_DOCKER entry"
    fi

    # Test uses docker command
    if grep -q '"command": "docker"' "$MCP_JSON"; then
        pass ".mcp.json uses docker command"
    else
        fail ".mcp.json does not use docker command"
    fi

    # Test uses gateway run args
    if grep -q '"mcp"' "$MCP_JSON" && grep -q '"gateway"' "$MCP_JSON"; then
        pass ".mcp.json uses mcp gateway args"
    else
        fail ".mcp.json missing mcp gateway args"
    fi

    # Test is valid JSON
    if python3 -c "import json; json.load(open('$MCP_JSON'))" 2>/dev/null; then
        pass ".mcp.json is valid JSON"
    else
        fail ".mcp.json is not valid JSON"
    fi
else
    fail ".mcp.json does not exist"
fi

# ============================================================================
# Test: mcp-prerequisites.sh uses Docker checks
# ============================================================================

echo ""
echo "Testing mcp-prerequisites.sh Docker checks..."
echo "=============================================="

PREREQUISITES="$PROJECT_DIR/setup/mcp-prerequisites.sh"

if [ -f "$PREREQUISITES" ]; then
    pass "mcp-prerequisites.sh exists"

    # Test checks for Docker
    if grep -q 'docker --version' "$PREREQUISITES" || grep -q 'check_docker' "$PREREQUISITES"; then
        pass "mcp-prerequisites.sh checks for Docker"
    else
        fail "mcp-prerequisites.sh does not check for Docker"
    fi

    # Test does not check for Node.js
    if grep -q 'node --version' "$PREREQUISITES" || grep -q 'check_node' "$PREREQUISITES"; then
        fail "mcp-prerequisites.sh still checks for Node.js (should be removed)"
    else
        pass "mcp-prerequisites.sh does not check for Node.js (legacy removed)"
    fi

    # Test checks MCP Toolkit
    if grep -q 'docker mcp' "$PREREQUISITES"; then
        pass "mcp-prerequisites.sh checks for MCP Toolkit"
    else
        fail "mcp-prerequisites.sh does not check for MCP Toolkit"
    fi
else
    fail "mcp-prerequisites.sh does not exist"
fi

# ============================================================================
# Test: Legacy files removed or not referenced
# ============================================================================

echo ""
echo "Testing legacy npx MCP code removal..."
echo "======================================="

# Test that legacy installer is not referenced in active scripts
ACTIVE_SCRIPTS=(
    "$PROJECT_DIR/setup/project.sh"
    "$PROJECT_DIR/setup/yoyo-update.sh"
)

for script in "${ACTIVE_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        script_name=$(basename "$script")
        if grep -q 'mcp-claude-installer.sh' "$script"; then
            fail "$script_name still references mcp-claude-installer.sh"
        else
            pass "$script_name has no mcp-claude-installer.sh references"
        fi
    fi
done

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "============================================="
echo "Test Summary"
echo "============================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
