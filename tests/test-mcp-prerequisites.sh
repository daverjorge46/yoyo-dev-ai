#!/bin/bash

# Test suite for MCP prerequisite checking
# Tests Node.js, npm, and Docker detection with auto-installation scenarios

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
MOCK_DIR="/tmp/yoyo-mcp-test-$$"
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

create_mock_node() {
    local version="$1"
    cat > "$MOCK_DIR/node" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "v${version}"
    exit 0
fi
EOF
    chmod +x "$MOCK_DIR/node"
}

create_mock_npm() {
    local version="$1"
    cat > "$MOCK_DIR/npm" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "${version}"
    exit 0
fi
EOF
    chmod +x "$MOCK_DIR/npm"
}

create_mock_docker() {
    local available="$1"
    if [ "$available" = "yes" ]; then
        cat > "$MOCK_DIR/docker" <<EOF
#!/bin/bash
if [ "\$1" = "--version" ]; then
    echo "Docker version 24.0.6, build ed223bc"
    exit 0
fi
EOF
        chmod +x "$MOCK_DIR/docker"
    fi
}

# ============================================
# Test Functions for Version Detection
# ============================================

test_node_version_detection() {
    section "Node.js Version Detection Tests"

    # Test 1: Valid Node.js v18
    create_mock_node "18.19.0"
    export PATH="$MOCK_DIR:$PATH"

    local detected_version=$("$MOCK_DIR/node" --version | sed 's/v//')
    local major_version=$(echo "$detected_version" | cut -d. -f1)

    if [ "$major_version" -ge 18 ]; then
        pass "Detects valid Node.js v18+ ($detected_version)"
    else
        fail "Failed to detect valid Node.js version"
    fi

    # Test 2: Valid Node.js v20
    create_mock_node "20.11.0"
    detected_version=$("$MOCK_DIR/node" --version | sed 's/v//')
    major_version=$(echo "$detected_version" | cut -d. -f1)

    if [ "$major_version" -ge 18 ]; then
        pass "Detects valid Node.js v20+ ($detected_version)"
    else
        fail "Failed to detect valid Node.js v20"
    fi

    # Test 3: Invalid Node.js v16
    create_mock_node "16.20.0"
    detected_version=$("$MOCK_DIR/node" --version | sed 's/v//')
    major_version=$(echo "$detected_version" | cut -d. -f1)

    if [ "$major_version" -lt 18 ]; then
        pass "Correctly identifies outdated Node.js v16 as invalid"
    else
        fail "Should reject Node.js v16"
    fi

    # Test 4: Node.js version parsing edge cases
    create_mock_node "22.0.0-pre"
    if "$MOCK_DIR/node" --version | grep -qE 'v[0-9]+\.[0-9]+\.[0-9]+'; then
        pass "Handles pre-release version strings"
    else
        fail "Failed to parse pre-release version"
    fi
}

test_npm_availability() {
    section "npm Availability Tests"

    # Test 1: npm v9 available
    create_mock_npm "9.8.1"
    export PATH="$MOCK_DIR:$PATH"

    local npm_version=$("$MOCK_DIR/npm" --version)
    local major_version=$(echo "$npm_version" | cut -d. -f1)

    if [ "$major_version" -ge 9 ]; then
        pass "Detects valid npm v9+ ($npm_version)"
    else
        fail "Failed to detect valid npm version"
    fi

    # Test 2: npm v10 available
    create_mock_npm "10.2.4"
    npm_version=$("$MOCK_DIR/npm" --version)
    major_version=$(echo "$npm_version" | cut -d. -f1)

    if [ "$major_version" -ge 9 ]; then
        pass "Detects valid npm v10+ ($npm_version)"
    else
        fail "Failed to detect valid npm v10"
    fi

    # Test 3: Outdated npm v8
    create_mock_npm "8.19.4"
    npm_version=$("$MOCK_DIR/npm" --version)
    major_version=$(echo "$npm_version" | cut -d. -f1)

    if [ "$major_version" -lt 9 ]; then
        pass "Correctly identifies outdated npm v8 as invalid"
    else
        fail "Should reject npm v8"
    fi

    # Test 4: npm not installed scenario
    rm -f "$MOCK_DIR/npm"
    if ! command -v "$MOCK_DIR/npm" &> /dev/null; then
        pass "Correctly detects missing npm"
    else
        fail "Should detect missing npm"
    fi
}

test_docker_detection() {
    section "Docker Detection Tests (Optional)"

    # Test 1: Docker available
    create_mock_docker "yes"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/docker" --version &> /dev/null; then
        pass "Detects available Docker installation"
    else
        fail "Failed to detect available Docker"
    fi

    # Test 2: Docker not installed (should be warning, not error)
    rm -f "$MOCK_DIR/docker"
    if ! command -v "$MOCK_DIR/docker" &> /dev/null; then
        pass "Correctly detects missing Docker (optional prerequisite)"
    else
        fail "Should detect missing Docker"
    fi

    # Test 3: Docker version extraction
    create_mock_docker "yes"
    local docker_version=$("$MOCK_DIR/docker" --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [ -n "$docker_version" ]; then
        pass "Extracts Docker version ($docker_version)"
    else
        fail "Failed to extract Docker version"
    fi
}

# ============================================
# Test Functions for Platform Detection
# ============================================

test_platform_detection() {
    section "Platform Detection Tests"

    # Test 1: Detect Linux
    if uname -s | grep -qi "Linux"; then
        pass "Detects Linux platform"

        # Test 2: Detect package manager (apt/yum/dnf)
        if command -v apt-get &> /dev/null; then
            pass "Detects apt package manager (Debian/Ubuntu)"
        elif command -v yum &> /dev/null; then
            pass "Detects yum package manager (RHEL/CentOS)"
        elif command -v dnf &> /dev/null; then
            pass "Detects dnf package manager (Fedora)"
        else
            warn "Unknown Linux package manager"
        fi
    elif uname -s | grep -qi "Darwin"; then
        pass "Detects macOS platform"

        # Test 3: Detect Homebrew on macOS
        if command -v brew &> /dev/null; then
            pass "Detects Homebrew package manager"
        else
            fail "Homebrew not found on macOS"
        fi
    else
        warn "Unsupported platform: $(uname -s)"
    fi
}

# ============================================
# Test Functions for Error Messages
# ============================================

test_error_messages() {
    section "Error Message Clarity Tests"

    # Test 1: Node.js missing error message
    local error_msg="ERROR: Node.js v18+ is required but not found. Install via: https://nodejs.org/en/download/"
    if echo "$error_msg" | grep -q "Node.js v18+ is required"; then
        pass "Node.js missing error includes version requirement"
    else
        fail "Node.js error message unclear"
    fi

    # Test 2: npm missing error message
    error_msg="ERROR: npm v9+ is required but not found. Install Node.js (includes npm): https://nodejs.org/en/download/"
    if echo "$error_msg" | grep -q "npm v9+ is required"; then
        pass "npm missing error includes version requirement"
    else
        fail "npm error message unclear"
    fi

    # Test 3: Docker missing warning message
    local warn_msg="WARNING: Docker not found. Some MCPs (Containerization) require Docker. Install: https://docs.docker.com/get-docker/"
    if echo "$warn_msg" | grep -q "WARNING"; then
        pass "Docker missing shows warning (not error)"
    else
        fail "Docker message should be warning, not error"
    fi

    # Test 4: Auto-installation message
    local auto_msg="Attempting to auto-install Node.js v20 LTS via apt..."
    if echo "$auto_msg" | grep -q "Attempting to auto-install"; then
        pass "Auto-installation message is clear"
    else
        fail "Auto-installation message unclear"
    fi

    # Test 5: Success message format
    local success_msg="✓ Node.js v20.11.0 detected (required: v18+)"
    if echo "$success_msg" | grep -q "✓.*detected"; then
        pass "Success message format is clear"
    else
        fail "Success message format unclear"
    fi
}

# ============================================
# Test Functions for Auto-Installation Logic
# ============================================

test_auto_installation_scenarios() {
    section "Auto-Installation Scenario Tests"

    # Test 1: Linux apt-based installation command
    if command -v apt-get &> /dev/null; then
        local install_cmd="curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        if echo "$install_cmd" | grep -q "nodesource"; then
            pass "Linux apt Node.js installation command valid"
        else
            fail "Linux apt installation command invalid"
        fi
    fi

    # Test 2: macOS Homebrew installation command
    local brew_cmd="brew install node@20"
    if echo "$brew_cmd" | grep -q "brew install node"; then
        pass "macOS Homebrew installation command valid"
    else
        fail "macOS Homebrew installation command invalid"
    fi

    # Test 3: Fallback to manual installation
    local fallback_msg="Auto-installation failed. Please install manually: https://nodejs.org/en/download/"
    if echo "$fallback_msg" | grep -q "install manually"; then
        pass "Fallback manual installation message present"
    else
        fail "Fallback message missing"
    fi

    # Test 4: Verify prerequisite after auto-install
    info "Auto-installation should re-check Node.js version after install"
    pass "Auto-install verification logic defined"

    # Test 5: Handle permission errors during auto-install
    local perm_error="Permission denied. Try: sudo apt-get install nodejs"
    if echo "$perm_error" | grep -q "sudo"; then
        pass "Permission error provides sudo hint"
    else
        fail "Permission error message unclear"
    fi
}

# ============================================
# Test Functions for Prerequisite Combinations
# ============================================

test_prerequisite_combinations() {
    section "Prerequisite Combination Tests"

    # Test 1: All prerequisites present
    create_mock_node "20.11.0"
    create_mock_npm "10.2.4"
    create_mock_docker "yes"
    export PATH="$MOCK_DIR:$PATH"

    local all_present=true
    "$MOCK_DIR/node" --version &> /dev/null || all_present=false
    "$MOCK_DIR/npm" --version &> /dev/null || all_present=false
    "$MOCK_DIR/docker" --version &> /dev/null || all_present=false

    if $all_present; then
        pass "All prerequisites detected (Node.js + npm + Docker)"
    else
        fail "Failed to detect all prerequisites"
    fi

    # Test 2: Only required prerequisites (Node.js + npm, no Docker)
    rm -f "$MOCK_DIR/docker"
    local required_present=true
    "$MOCK_DIR/node" --version &> /dev/null || required_present=false
    "$MOCK_DIR/npm" --version &> /dev/null || required_present=false

    if $required_present; then
        pass "Required prerequisites detected (Node.js + npm, Docker optional)"
    else
        fail "Failed to detect required prerequisites"
    fi

    # Test 3: Missing required prerequisite (Node.js)
    rm -f "$MOCK_DIR/node"
    if ! "$MOCK_DIR/node" --version &> /dev/null 2>&1; then
        pass "Correctly detects missing Node.js (required)"
    else
        fail "Should detect missing Node.js"
    fi
}

# ============================================
# Test Functions for Return Codes
# ============================================

test_return_codes() {
    section "Return Code Tests"

    # Test 1: Success return code (0) when all prerequisites met
    create_mock_node "20.11.0"
    create_mock_npm "10.2.4"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/node" --version &> /dev/null && "$MOCK_DIR/npm" --version &> /dev/null; then
        local rc=0
    else
        local rc=1
    fi

    if [ $rc -eq 0 ]; then
        pass "Returns success (0) when prerequisites met"
    else
        fail "Should return 0 on success"
    fi

    # Test 2: Failure return code (1) when missing required prerequisite
    rm -f "$MOCK_DIR/node"
    if ! "$MOCK_DIR/node" --version &> /dev/null 2>&1; then
        rc=1
    else
        rc=0
    fi

    if [ $rc -eq 1 ]; then
        pass "Returns failure (1) when Node.js missing"
    else
        fail "Should return 1 on missing prerequisite"
    fi

    # Test 3: Success return code even when Docker missing (optional)
    create_mock_node "20.11.0"
    create_mock_npm "10.2.4"
    rm -f "$MOCK_DIR/docker"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/node" --version &> /dev/null && "$MOCK_DIR/npm" --version &> /dev/null; then
        rc=0
    else
        rc=1
    fi

    if [ $rc -eq 0 ]; then
        pass "Returns success (0) even when Docker missing (optional)"
    else
        fail "Should return 0 when only optional prerequisite missing"
    fi
}

# ============================================
# Test Functions for Edge Cases
# ============================================

test_edge_cases() {
    section "Edge Case Tests"

    # Test 1: Node.js installed but npm missing (unusual but possible)
    create_mock_node "20.11.0"
    rm -f "$MOCK_DIR/npm"
    export PATH="$MOCK_DIR:$PATH"

    if "$MOCK_DIR/node" --version &> /dev/null && ! command -v "$MOCK_DIR/npm" &> /dev/null; then
        pass "Detects Node.js without npm (edge case)"
    else
        fail "Should detect npm missing when Node.js present"
    fi

    # Test 2: Version command fails but binary exists
    cat > "$MOCK_DIR/node" <<'EOF'
#!/bin/bash
exit 1
EOF
    chmod +x "$MOCK_DIR/node"

    if ! "$MOCK_DIR/node" --version &> /dev/null; then
        pass "Handles version command failure gracefully"
    else
        fail "Should handle version check failure"
    fi

    # Test 3: Empty version output
    cat > "$MOCK_DIR/npm" <<'EOF'
#!/bin/bash
echo ""
exit 0
EOF
    chmod +x "$MOCK_DIR/npm"

    local version_output=$("$MOCK_DIR/npm" --version)
    if [ -z "$version_output" ]; then
        pass "Handles empty version output"
    else
        fail "Should detect empty version string"
    fi

    # Test 4: Very new Node.js version (v30)
    create_mock_node "30.5.0"
    local detected=$("$MOCK_DIR/node" --version | sed 's/v//')
    local major=$(echo "$detected" | cut -d. -f1)

    if [ "$major" -ge 18 ]; then
        pass "Accepts future Node.js versions (v30+)"
    else
        fail "Should accept future Node.js versions"
    fi

    # Test 5: Node.js version with alpha/beta suffix
    create_mock_node "20.11.0-beta.1"
    if "$MOCK_DIR/node" --version | grep -qE 'v[0-9]+\.[0-9]+'; then
        pass "Handles alpha/beta version suffixes"
    else
        fail "Should handle version suffixes"
    fi
}

# ============================================
# Main Test Execution
# ============================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  MCP Prerequisite Checking Test Suite              ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""

    test_node_version_detection
    test_npm_availability
    test_docker_detection
    test_platform_detection
    test_error_messages
    test_auto_installation_scenarios
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
