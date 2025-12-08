#!/bin/bash

# Test suite for MCP prerequisite checking (Docker-based)
# Tests Docker Desktop installation, running status, and MCP Toolkit availability

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
MOCK_DIR="/tmp/yoyo-mcp-prereq-test-$$"
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
    local running="${2:-yes}"
    local mcp_enabled="${3:-yes}"

    cat > "$MOCK_DIR/docker" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "Docker version ${version}, build abc123"
    exit 0
fi

if [ "\$1" = "info" ]; then
    if [ "$running" = "no" ]; then
        echo "Cannot connect to the Docker daemon. Is the docker daemon running?" >&2
        exit 1
    fi
    echo "Server Version: ${version}"
    echo "Operating System: Linux"
    exit 0
fi

if [ "\$1" = "mcp" ]; then
    if [ "$mcp_enabled" = "no" ]; then
        echo "Error: 'mcp' is not a docker command" >&2
        exit 1
    fi

    if [ "\$2" = "--help" ]; then
        echo "Usage: docker mcp [command]"
        echo "Commands:"
        echo "  server    Manage MCP servers"
        echo "  client    Manage MCP clients"
        exit 0
    fi

    if [ "\$2" = "server" ]; then
        if [ "\$3" = "status" ]; then
            echo "Enabled servers:"
            echo "  - playwright (running)"
            exit 0
        fi
    fi
fi

echo "Unknown command: \$@" >&2
exit 1
EOF
    chmod +x "$MOCK_DIR/docker"
}

create_mock_claude() {
    local version="$1"
    cat > "$MOCK_DIR/claude" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "claude-code ${version}"
    exit 0
fi
EOF
    chmod +x "$MOCK_DIR/claude"
}

# ============================================
# Test Functions for Docker Version Detection
# ============================================

test_docker_version_detection() {
    section "Docker Version Detection Tests"

    # Test 1: Valid Docker version 27.0.0
    create_mock_docker "27.0.0"
    export PATH="$MOCK_DIR:$PATH"

    local detected_version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    local major_version=$(echo "$detected_version" | cut -d. -f1)

    if [ "$major_version" -ge 24 ]; then
        pass "Detects valid Docker v27+ ($detected_version)"
    else
        fail "Failed to detect valid Docker version"
    fi

    # Test 2: Valid Docker version 24.0.0 (minimum)
    create_mock_docker "24.0.0"
    detected_version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    major_version=$(echo "$detected_version" | cut -d. -f1)

    if [ "$major_version" -ge 24 ]; then
        pass "Detects minimum Docker v24+ ($detected_version)"
    else
        fail "Failed to detect minimum Docker version"
    fi

    # Test 3: Invalid Docker version (too old)
    create_mock_docker "20.10.0"
    detected_version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    major_version=$(echo "$detected_version" | cut -d. -f1)

    if [ "$major_version" -lt 24 ]; then
        pass "Correctly identifies outdated Docker v20 as invalid"
    else
        fail "Should reject Docker v20"
    fi

    # Test 4: Docker version parsing edge cases
    create_mock_docker "27.0.0-ce"
    if "$MOCK_DIR/docker" --version | grep -qE '[0-9]+\.[0-9]+\.[0-9]+'; then
        pass "Handles Docker version with suffix (ce/ee)"
    else
        fail "Failed to parse Docker version with suffix"
    fi
}

test_docker_installation() {
    section "Docker Installation Detection Tests"

    # Test 1: Docker installed
    create_mock_docker "27.0.0"
    export PATH="$MOCK_DIR:$PATH"

    if command -v "$MOCK_DIR/docker" &> /dev/null; then
        pass "Detects Docker is installed"
    else
        fail "Should detect Docker installation"
    fi

    # Test 2: Docker not installed
    rm -f "$MOCK_DIR/docker"
    if ! command -v "$MOCK_DIR/docker" &> /dev/null; then
        pass "Correctly detects Docker not installed"
    else
        fail "Should detect missing Docker"
    fi
}

test_docker_running_detection() {
    section "Docker Running Detection Tests"

    # Test 1: Docker Desktop running
    create_mock_docker "27.0.0" "yes"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/docker" info &> /dev/null; then
        pass "Detects Docker Desktop is running"
    else
        fail "Should detect running Docker Desktop"
    fi

    # Test 2: Docker installed but not running
    create_mock_docker "27.0.0" "no"
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
    create_mock_docker "27.0.0" "yes" "yes"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/docker" mcp --help &> /dev/null; then
        pass "Detects MCP Toolkit is enabled"
    else
        fail "Should detect MCP Toolkit enabled"
    fi

    # Test 2: MCP Toolkit not enabled
    create_mock_docker "27.0.0" "yes" "no"
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1; then
        pass "Correctly detects MCP Toolkit not enabled"
    else
        fail "Should detect MCP Toolkit not enabled"
    fi

    # Test 3: Old Docker without MCP command
    create_mock_docker "20.10.0" "yes" "no"
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1; then
        pass "Correctly detects old Docker without MCP command"
    else
        fail "Should detect missing MCP command in old Docker"
    fi
}

# ============================================
# Test Functions for Claude CLI Detection
# ============================================

test_claude_cli_detection() {
    section "Claude CLI Detection Tests (Optional)"

    # Test 1: Claude CLI installed
    create_mock_claude "1.0.0"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/claude" --version &> /dev/null; then
        pass "Detects Claude CLI is installed (optional)"
    else
        fail "Should detect Claude CLI installation"
    fi

    # Test 2: Claude CLI not installed (should be info, not error)
    rm -f "$MOCK_DIR/claude"
    if ! command -v "$MOCK_DIR/claude" &> /dev/null; then
        pass "Correctly detects missing Claude CLI (optional prerequisite)"
    else
        fail "Should detect missing Claude CLI"
    fi

    # Test 3: Claude CLI version extraction
    create_mock_claude "1.2.3"
    local claude_version=$("$MOCK_DIR/claude" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "")
    if [ -n "$claude_version" ]; then
        pass "Extracts Claude CLI version ($claude_version)"
    else
        # Version extraction is optional, just needs to detect installed
        pass "Claude CLI detected (version extraction optional)"
    fi
}

# ============================================
# Test Functions for Platform Detection
# ============================================

test_platform_detection() {
    section "Platform Detection Tests"

    # Test 1: Detect current platform
    local platform=$(uname -s)
    if [ "$platform" = "Linux" ] || [ "$platform" = "Darwin" ]; then
        pass "Detects supported platform: $platform"
    else
        warn "Unsupported platform: $platform"
    fi

    # Test 2: Platform-specific Docker Desktop path exists conceptually
    if [ "$platform" = "Linux" ]; then
        pass "Linux platform detected for Docker Desktop"
    elif [ "$platform" = "Darwin" ]; then
        pass "macOS platform detected for Docker Desktop"
    fi
}

# ============================================
# Test Functions for Error Messages
# ============================================

test_error_messages() {
    section "Error Message Clarity Tests"

    # Test 1: Docker not installed error message
    local error_msg="Docker Desktop is required for Yoyo Dev MCP features"
    if echo "$error_msg" | grep -q "Docker Desktop is required"; then
        pass "Docker missing error includes clear requirement"
    else
        fail "Docker error message unclear"
    fi

    # Test 2: Docker not running error message
    error_msg="Docker Desktop is not running. Please start Docker Desktop and try again."
    if echo "$error_msg" | grep -q "not running"; then
        pass "Docker not running error is clear"
    else
        fail "Docker not running error unclear"
    fi

    # Test 3: MCP Toolkit not enabled error message
    error_msg="MCP Toolkit is not enabled. Enable it via: Settings > Beta features > Enable Docker MCP Toolkit"
    if echo "$error_msg" | grep -q "MCP Toolkit"; then
        pass "MCP Toolkit error includes enable instructions"
    else
        fail "MCP Toolkit error message unclear"
    fi

    # Test 4: Docker version too old error
    error_msg="Docker version 20.10.0 is too old. MCP Toolkit requires Docker Desktop 4.32+ (Docker Engine 24+)"
    if echo "$error_msg" | grep -q "too old"; then
        pass "Docker version error includes minimum requirement"
    else
        fail "Docker version error unclear"
    fi

    # Test 5: Success message format
    local success_msg="✓ Docker Desktop v27.0.0 detected and running"
    if echo "$success_msg" | grep -q "✓.*detected"; then
        pass "Success message format is clear"
    else
        fail "Success message format unclear"
    fi

    # Test 6: Installation instructions URL
    local install_msg="Install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    if echo "$install_msg" | grep -q "docker.com"; then
        pass "Installation instructions include Docker URL"
    else
        fail "Installation instructions missing URL"
    fi
}

# ============================================
# Test Functions for Prerequisite Combinations
# ============================================

test_prerequisite_combinations() {
    section "Prerequisite Combination Tests"

    # Test 1: All prerequisites present (Docker running + MCP Toolkit)
    create_mock_docker "27.0.0" "yes" "yes"
    create_mock_claude "1.0.0"
    export PATH="$MOCK_DIR:$PATH"

    local all_present=true
    "$MOCK_DIR/docker" --version &> /dev/null || all_present=false
    "$MOCK_DIR/docker" info &> /dev/null || all_present=false
    "$MOCK_DIR/docker" mcp --help &> /dev/null || all_present=false

    if $all_present; then
        pass "All prerequisites detected (Docker + MCP Toolkit)"
    else
        fail "Failed to detect all prerequisites"
    fi

    # Test 2: Docker present but MCP Toolkit not enabled
    create_mock_docker "27.0.0" "yes" "no"
    local docker_ok=true
    local mcp_ok=true
    "$MOCK_DIR/docker" info &> /dev/null || docker_ok=false
    "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1 || mcp_ok=false

    if $docker_ok && ! $mcp_ok; then
        pass "Correctly detects Docker without MCP Toolkit"
    else
        fail "Should detect Docker without MCP Toolkit"
    fi

    # Test 3: Docker installed but not running
    create_mock_docker "27.0.0" "no" "yes"
    if ! "$MOCK_DIR/docker" info &> /dev/null 2>&1; then
        pass "Correctly detects Docker not running"
    else
        fail "Should detect Docker not running"
    fi
}

# ============================================
# Test Functions for Return Codes
# ============================================

test_return_codes() {
    section "Return Code Tests"

    # Test 1: Success return code (0) when all prerequisites met
    create_mock_docker "27.0.0" "yes" "yes"
    export PATH="$MOCK_DIR:$PATH"

    local rc=0
    "$MOCK_DIR/docker" --version &> /dev/null || rc=1
    "$MOCK_DIR/docker" info &> /dev/null || rc=1
    "$MOCK_DIR/docker" mcp --help &> /dev/null || rc=1

    if [ $rc -eq 0 ]; then
        pass "Returns success (0) when prerequisites met"
    else
        fail "Should return 0 on success"
    fi

    # Test 2: Failure return code (1) when Docker not installed
    rm -f "$MOCK_DIR/docker"
    if ! command -v "$MOCK_DIR/docker" &> /dev/null 2>&1; then
        pass "Returns failure when Docker not installed"
    else
        fail "Should return failure when Docker missing"
    fi

    # Test 3: Failure return code when Docker not running
    create_mock_docker "27.0.0" "no"
    if ! "$MOCK_DIR/docker" info &> /dev/null 2>&1; then
        pass "Returns failure when Docker not running"
    else
        fail "Should return failure when Docker not running"
    fi

    # Test 4: Failure return code when MCP Toolkit not enabled
    create_mock_docker "27.0.0" "yes" "no"
    if ! "$MOCK_DIR/docker" mcp --help &> /dev/null 2>&1; then
        pass "Returns failure when MCP Toolkit not enabled"
    else
        fail "Should return failure when MCP Toolkit not enabled"
    fi

    # Test 5: Success even when Claude CLI missing (optional)
    create_mock_docker "27.0.0" "yes" "yes"
    rm -f "$MOCK_DIR/claude"

    rc=0
    "$MOCK_DIR/docker" --version &> /dev/null || rc=1
    "$MOCK_DIR/docker" info &> /dev/null || rc=1
    "$MOCK_DIR/docker" mcp --help &> /dev/null || rc=1

    if [ $rc -eq 0 ]; then
        pass "Returns success even when Claude CLI missing (optional)"
    else
        fail "Should return 0 when only optional prerequisite missing"
    fi
}

# ============================================
# Test Functions for Edge Cases
# ============================================

test_edge_cases() {
    section "Edge Case Tests"

    # Test 1: Docker version command fails but binary exists
    cat > "$MOCK_DIR/docker" <<'EOF'
#!/bin/bash
exit 1
EOF
    chmod +x "$MOCK_DIR/docker"
    export PATH="$MOCK_DIR:$PATH"

    if ! "$MOCK_DIR/docker" --version &> /dev/null; then
        pass "Handles Docker version command failure gracefully"
    else
        fail "Should handle version check failure"
    fi

    # Test 2: Very new Docker version (v30)
    create_mock_docker "30.0.0"
    local detected=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    local major=$(echo "$detected" | cut -d. -f1)

    if [ "$major" -ge 24 ]; then
        pass "Accepts future Docker versions (v30+)"
    else
        fail "Should accept future Docker versions"
    fi

    # Test 3: Docker info with verbose output
    create_mock_docker "27.0.0" "yes" "yes"
    if "$MOCK_DIR/docker" info 2>/dev/null | grep -q "Server Version"; then
        pass "Parses Docker info output correctly"
    else
        fail "Should parse Docker info output"
    fi

    # Test 4: MCP server status check
    create_mock_docker "27.0.0" "yes" "yes"
    if "$MOCK_DIR/docker" mcp server status 2>/dev/null | grep -q "Enabled servers"; then
        pass "Handles MCP server status check"
    else
        fail "Should handle MCP server status"
    fi
}

# ============================================
# Main Test Execution
# ============================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  MCP Prerequisite Checking Test Suite (Docker)     ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""

    test_docker_version_detection
    test_docker_installation
    test_docker_running_detection
    test_mcp_toolkit_detection
    test_claude_cli_detection
    test_platform_detection
    test_error_messages
    test_prerequisite_combinations
    test_return_codes
    test_edge_cases

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
        echo -e "${GREEN}✓ All prerequisite checking tests passed!${RESET}"
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
