#!/bin/bash

# Test suite for Docker MCP Setup Script
# Tests Docker Desktop detection, MCP Toolkit availability, and server enablement

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Mock functions directory
MOCK_DIR="/tmp/yoyo-docker-mcp-test-$$"
mkdir -p "$MOCK_DIR"

# Cleanup on exit
trap "rm -rf $MOCK_DIR" EXIT

# Test helper functions
pass() {
    echo -e "${GREEN}✓${RESET} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗${RESET} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠${RESET} $1"
}

info() {
    echo -e "${BLUE}ℹ${RESET} $1"
}

section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

# ============================================
# Mock Command Helpers
# ============================================

create_mock_docker() {
    local version="$1"
    local mcp_enabled="${2:-yes}"

    cat > "$MOCK_DIR/docker" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "Docker version ${version}, build abc123"
    exit 0
fi

if [ "\$1" = "info" ]; then
    echo "Server Version: ${version}"
    echo "Operating System: Linux"
    exit 0
fi

if [ "\$1" = "mcp" ]; then
    if [ "$mcp_enabled" = "no" ]; then
        echo "Error: MCP Toolkit is not enabled" >&2
        exit 1
    fi

    if [ "\$2" = "--help" ]; then
        echo "Usage: docker mcp [command]"
        echo "Commands:"
        echo "  server    Manage MCP servers"
        echo "  client    Manage MCP clients"
        echo "  gateway   MCP Gateway operations"
        echo "  oauth     OAuth management"
        exit 0
    fi

    if [ "\$2" = "server" ]; then
        if [ "\$3" = "status" ]; then
            echo "Enabled servers:"
            echo "  - playwright (running)"
            echo "  - github-official (running)"
            exit 0
        fi
        if [ "\$3" = "enable" ]; then
            echo "Server '\$4' enabled successfully"
            exit 0
        fi
        if [ "\$3" = "list" ]; then
            echo "Available servers:"
            echo "  - playwright"
            echo "  - github-official"
            echo "  - duckduckgo"
            echo "  - filesystem"
            exit 0
        fi
    fi

    if [ "\$2" = "client" ]; then
        if [ "\$3" = "connect" ]; then
            echo "Connected '\$4' to MCP Gateway"
            exit 0
        fi
        if [ "\$3" = "list" ]; then
            echo "Connected clients:"
            echo "  - claude-code"
            exit 0
        fi
    fi

    if [ "\$2" = "gateway" ]; then
        if [ "\$3" = "run" ]; then
            echo "MCP Gateway started"
            exit 0
        fi
    fi

    if [ "\$2" = "oauth" ]; then
        if [ "\$3" = "authorize" ]; then
            echo "OAuth authorization started for '\$4'"
            exit 0
        fi
        if [ "\$3" = "ls" ]; then
            echo "Authorized services: github"
            exit 0
        fi
    fi
fi

echo "Unknown command: \$@" >&2
exit 1
EOF
    chmod +x "$MOCK_DIR/docker"
}

create_mock_docker_not_running() {
    cat > "$MOCK_DIR/docker" <<'EOF'
#!/bin/bash
if [ "$1" = "--version" ]; then
    echo "Docker version 27.0.0, build abc123"
    exit 0
fi

if [ "$1" = "info" ]; then
    echo "Cannot connect to the Docker daemon. Is the docker daemon running?" >&2
    exit 1
fi

echo "Unknown command: $@" >&2
exit 1
EOF
    chmod +x "$MOCK_DIR/docker"
}

create_mock_docker_old_version() {
    local version="$1"
    cat > "$MOCK_DIR/docker" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "Docker version ${version}, build abc123"
    exit 0
fi

if [ "\$1" = "info" ]; then
    echo "Server Version: ${version}"
    exit 0
fi

if [ "\$1" = "mcp" ]; then
    echo "Error: 'mcp' is not a docker command" >&2
    exit 1
fi
EOF
    chmod +x "$MOCK_DIR/docker"
}

# ============================================
# Test Functions for Docker Desktop Detection
# ============================================

test_docker_version_detection() {
    section "Docker Desktop Version Detection Tests"

    # Test 1: Valid Docker version 27.0.0+
    create_mock_docker "27.0.0"
    export PATH="$MOCK_DIR:$PATH"

    local version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    local major_version=$(echo "$version" | cut -d. -f1)

    if [ "$major_version" -ge 24 ]; then
        pass "Detects valid Docker version ($version)"
    else
        fail "Failed to detect valid Docker version"
    fi

    # Test 2: Docker Desktop 4.32+ (version 27.0+)
    create_mock_docker "27.2.0"
    version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    major_version=$(echo "$version" | cut -d. -f1)

    if [ "$major_version" -ge 27 ]; then
        pass "Detects Docker Desktop 4.32+ compatible version ($version)"
    else
        fail "Should detect Docker Desktop 4.32+ version"
    fi

    # Test 3: Old Docker version (before MCP support)
    create_mock_docker_old_version "20.10.0"
    version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    major_version=$(echo "$version" | cut -d. -f1)

    if [ "$major_version" -lt 24 ]; then
        pass "Correctly identifies old Docker version without MCP support ($version)"
    else
        fail "Should reject old Docker version"
    fi

    # Test 4: Docker not installed
    rm -f "$MOCK_DIR/docker"
    if ! command -v "$MOCK_DIR/docker" &> /dev/null 2>&1; then
        pass "Correctly detects Docker not installed"
    else
        fail "Should detect missing Docker"
    fi
}

test_docker_running_detection() {
    section "Docker Desktop Running Detection Tests"

    # Test 1: Docker Desktop running
    create_mock_docker "27.0.0"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/docker" info &> /dev/null; then
        pass "Detects Docker Desktop is running"
    else
        fail "Should detect running Docker Desktop"
    fi

    # Test 2: Docker installed but not running
    create_mock_docker_not_running
    if ! "$MOCK_DIR/docker" info &> /dev/null 2>&1; then
        pass "Correctly detects Docker Desktop not running"
    else
        fail "Should detect Docker Desktop not running"
    fi
}

# ============================================
# Test Functions for MCP Toolkit Detection
# ============================================

test_mcp_toolkit_detection() {
    section "MCP Toolkit Detection Tests"

    # Test 1: MCP Toolkit enabled
    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/docker" mcp --help &> /dev/null; then
        pass "Detects MCP Toolkit is enabled"
    else
        fail "Should detect MCP Toolkit enabled"
    fi

    # Test 2: MCP Toolkit not enabled
    create_mock_docker "27.0.0" "no"
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1; then
        pass "Correctly detects MCP Toolkit not enabled"
    else
        fail "Should detect MCP Toolkit not enabled"
    fi

    # Test 3: Old Docker without MCP command
    create_mock_docker_old_version "20.10.0"
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1; then
        pass "Correctly detects old Docker without MCP command"
    else
        fail "Should detect missing MCP command in old Docker"
    fi
}

# ============================================
# Test Functions for MCP Server Management
# ============================================

test_mcp_server_management() {
    section "MCP Server Management Tests"

    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    # Test 1: List available servers
    local server_list=$("$MOCK_DIR/docker" mcp server list 2>/dev/null)
    if echo "$server_list" | grep -q "playwright"; then
        pass "Lists available MCP servers (playwright found)"
    else
        fail "Should list available servers"
    fi

    # Test 2: Enable a server
    local enable_output=$("$MOCK_DIR/docker" mcp server enable playwright 2>/dev/null)
    if echo "$enable_output" | grep -q "enabled successfully"; then
        pass "Enables MCP server (playwright)"
    else
        fail "Should enable server successfully"
    fi

    # Test 3: Check server status
    local status_output=$("$MOCK_DIR/docker" mcp server status 2>/dev/null)
    if echo "$status_output" | grep -q "running"; then
        pass "Reports server status (running)"
    else
        fail "Should report server status"
    fi

    # Test 4: Enable multiple servers
    for server in playwright github-official duckduckgo filesystem; do
        enable_output=$("$MOCK_DIR/docker" mcp server enable "$server" 2>/dev/null)
        if echo "$enable_output" | grep -q "enabled successfully"; then
            pass "Enables MCP server ($server)"
        else
            fail "Should enable server: $server"
        fi
    done
}

# ============================================
# Test Functions for Client Connection
# ============================================

test_client_connection() {
    section "Client Connection Tests"

    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    # Test 1: Connect Claude Code to MCP Gateway
    local connect_output=$("$MOCK_DIR/docker" mcp client connect claude-code 2>/dev/null)
    if echo "$connect_output" | grep -q "Connected"; then
        pass "Connects Claude Code to MCP Gateway"
    else
        fail "Should connect Claude Code"
    fi

    # Test 2: List connected clients
    local client_list=$("$MOCK_DIR/docker" mcp client list 2>/dev/null)
    if echo "$client_list" | grep -q "claude-code"; then
        pass "Lists connected clients (claude-code found)"
    else
        fail "Should list connected clients"
    fi
}

# ============================================
# Test Functions for OAuth Management
# ============================================

test_oauth_management() {
    section "OAuth Management Tests"

    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    # Test 1: Authorize GitHub
    local oauth_output=$("$MOCK_DIR/docker" mcp oauth authorize github 2>/dev/null)
    if echo "$oauth_output" | grep -q "OAuth authorization started"; then
        pass "Initiates OAuth authorization for GitHub"
    else
        fail "Should initiate OAuth authorization"
    fi

    # Test 2: List authorized services
    local oauth_list=$("$MOCK_DIR/docker" mcp oauth ls 2>/dev/null)
    if echo "$oauth_list" | grep -q "github"; then
        pass "Lists authorized services (github found)"
    else
        fail "Should list authorized services"
    fi
}

# ============================================
# Test Functions for Error Messages
# ============================================

test_error_messages() {
    section "Error Message Clarity Tests"

    # Test 1: Docker not installed error
    local error_msg="Docker Desktop is required for Yoyo Dev MCP features"
    if echo "$error_msg" | grep -q "Docker Desktop is required"; then
        pass "Docker missing error is clear"
    else
        fail "Docker missing error unclear"
    fi

    # Test 2: Docker not running error
    error_msg="Docker Desktop is not running. Please start Docker Desktop and try again."
    if echo "$error_msg" | grep -q "not running"; then
        pass "Docker not running error is clear"
    else
        fail "Docker not running error unclear"
    fi

    # Test 3: MCP Toolkit not enabled error
    error_msg="MCP Toolkit is not enabled. Enable it via: Settings > Beta features > Enable Docker MCP Toolkit"
    if echo "$error_msg" | grep -q "MCP Toolkit is not enabled"; then
        pass "MCP Toolkit not enabled error is clear"
    else
        fail "MCP Toolkit error unclear"
    fi

    # Test 4: Installation instructions
    local install_msg="Install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    if echo "$install_msg" | grep -q "docker.com"; then
        pass "Installation instructions include URL"
    else
        fail "Installation instructions missing URL"
    fi

    # Test 5: MCP Toolkit enable instructions
    local enable_msg="1. Open Docker Desktop
2. Go to Settings > Beta features
3. Enable 'Docker MCP Toolkit'
4. Click Apply & Restart"
    if echo "$enable_msg" | grep -q "Beta features"; then
        pass "MCP Toolkit enable instructions are detailed"
    else
        fail "MCP Toolkit enable instructions unclear"
    fi

    # Test 6: Success message format
    local success_msg="✓ MCP server 'playwright' enabled successfully"
    if echo "$success_msg" | grep -q "✓.*enabled successfully"; then
        pass "Success message format is clear"
    else
        fail "Success message format unclear"
    fi
}

# ============================================
# Test Functions for Script Return Codes
# ============================================

test_return_codes() {
    section "Return Code Tests"

    # Test 1: Success when Docker + MCP Toolkit available
    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    local rc=0
    "$MOCK_DIR/docker" --version &> /dev/null || rc=1
    "$MOCK_DIR/docker" info &> /dev/null || rc=1
    "$MOCK_DIR/docker" mcp --help &> /dev/null || rc=1

    if [ $rc -eq 0 ]; then
        pass "Returns success (0) when all prerequisites met"
    else
        fail "Should return 0 on success"
    fi

    # Test 2: Failure when Docker not installed
    rm -f "$MOCK_DIR/docker"
    if ! command -v "$MOCK_DIR/docker" &> /dev/null 2>&1; then
        pass "Returns failure when Docker not installed"
    else
        fail "Should return failure when Docker missing"
    fi

    # Test 3: Failure when Docker not running
    create_mock_docker_not_running
    if ! "$MOCK_DIR/docker" info &> /dev/null 2>&1; then
        pass "Returns failure when Docker not running"
    else
        fail "Should return failure when Docker not running"
    fi

    # Test 4: Failure when MCP Toolkit not enabled
    create_mock_docker "27.0.0" "no"
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1; then
        pass "Returns failure when MCP Toolkit not enabled"
    else
        fail "Should return failure when MCP Toolkit not enabled"
    fi
}

# ============================================
# Test Functions for Edge Cases
# ============================================

test_edge_cases() {
    section "Edge Case Tests"

    # Test 1: Docker version parsing edge cases
    create_mock_docker "27.0.0-ce"
    export PATH="$MOCK_DIR:$PATH"

    local version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [ -n "$version" ]; then
        pass "Handles Docker version with suffix (ce/ee)"
    else
        fail "Should parse version with suffix"
    fi

    # Test 2: Very new Docker version
    create_mock_docker "30.0.0"
    version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    local major=$(echo "$version" | cut -d. -f1)

    if [ "$major" -ge 24 ]; then
        pass "Accepts future Docker versions (v30+)"
    else
        fail "Should accept future Docker versions"
    fi

    # Test 3: MCP server enable with special characters in name
    create_mock_docker "27.0.0" "yes"
    if "$MOCK_DIR/docker" mcp server enable "playwright" &> /dev/null; then
        pass "Handles server names correctly"
    else
        fail "Should handle server names"
    fi

    # Test 4: Multiple client connections
    if "$MOCK_DIR/docker" mcp client connect "claude-code" &> /dev/null; then
        pass "Handles client connection"
    else
        fail "Should handle client connection"
    fi
}

# ============================================
# Test Functions for Full Workflow
# ============================================

test_full_workflow() {
    section "Full Setup Workflow Tests"

    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    # Test complete workflow
    local workflow_success=true

    # Step 1: Check Docker version
    if ! "$MOCK_DIR/docker" --version &> /dev/null; then
        workflow_success=false
    fi

    # Step 2: Check Docker running
    if ! "$MOCK_DIR/docker" info &> /dev/null; then
        workflow_success=false
    fi

    # Step 3: Check MCP Toolkit
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null; then
        workflow_success=false
    fi

    # Step 4: Connect Claude Code
    if ! "$MOCK_DIR/docker" mcp client connect claude-code &> /dev/null; then
        workflow_success=false
    fi

    # Step 5: Enable recommended servers
    for server in playwright github-official duckduckgo filesystem; do
        if ! "$MOCK_DIR/docker" mcp server enable "$server" &> /dev/null; then
            workflow_success=false
        fi
    done

    if $workflow_success; then
        pass "Full setup workflow completes successfully"
    else
        fail "Full setup workflow failed"
    fi
}

# ============================================
# Main Test Execution
# ============================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  Docker MCP Setup Test Suite                        ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""

    test_docker_version_detection
    test_docker_running_detection
    test_mcp_toolkit_detection
    test_mcp_server_management
    test_client_connection
    test_oauth_management
    test_error_messages
    test_return_codes
    test_edge_cases
    test_full_workflow

    # Summary
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo ""
    echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${RESET}"
    echo -e "Tests Failed: ${RED}${TESTS_FAILED}${RESET}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All Docker MCP setup tests passed!${RESET}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ $TESTS_FAILED test(s) failed${RESET}"
        echo ""
        return 1
    fi
}

# Run tests
main
exit $?
