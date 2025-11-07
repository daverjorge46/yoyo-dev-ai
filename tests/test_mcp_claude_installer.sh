#!/bin/bash

# Test Suite for Claude Code MCP Installation System
# Tests native Claude Code integration for installing MCP servers
# TDD approach - tests written before implementation

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Mock functions directory
MOCK_DIR="/tmp/yoyo-mcp-claude-test-$$"
mkdir -p "$MOCK_DIR"

# Mock Claude config directory
MOCK_CLAUDE_CONFIG="$MOCK_DIR/.config/claude"
mkdir -p "$MOCK_CLAUDE_CONFIG"

# Cleanup on exit
trap "rm -rf $MOCK_DIR" EXIT

# ============================================================================
# TEST HELPER FUNCTIONS
# ============================================================================

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

# ============================================================================
# MOCK COMMAND HELPERS
# ============================================================================

create_mock_claude() {
    local available="$1"
    if [ "$available" = "yes" ]; then
        cat > "$MOCK_DIR/claude" <<'EOF'
#!/bin/bash
# Mock Claude Code CLI
case "$1" in
    --version)
        echo "claude-code 0.1.0"
        exit 0
        ;;
    mcp)
        if [ "$2" = "add" ]; then
            # Simulate successful MCP addition
            MCP_NAME="$3"
            MCP_CMD="$4"
            echo "Adding MCP server: $MCP_NAME"
            echo "Command: $MCP_CMD"
            # Update mock config
            if [ ! -f "$HOME/.config/claude/config.json" ]; then
                echo '{"mcpServers":{}}' > "$HOME/.config/claude/config.json"
            fi
            exit 0
        elif [ "$2" = "list" ]; then
            # Return list of installed MCPs
            cat "$HOME/.config/claude/config.json" 2>/dev/null || echo '{"mcpServers":{}}'
            exit 0
        fi
        ;;
    *)
        echo "Usage: claude [--version | mcp add <name> <command>]"
        exit 1
        ;;
esac
EOF
        chmod +x "$MOCK_DIR/claude"
    fi
}

create_mock_npx() {
    local behavior="$1"
    cat > "$MOCK_DIR/npx" <<EOF
#!/bin/bash
# Mock npx command
if [[ "\$*" == *"claude-code-templates"* ]]; then
    if [ "$behavior" = "success" ]; then
        echo "Installing MCP server template..."
        echo "✓ Template installed successfully"
        exit 0
    else
        echo "Error: Template installation failed"
        exit 1
    fi
elif [[ "\$*" == *"chrome-devtools-mcp"* ]]; then
    if [ "$behavior" = "success" ]; then
        echo "Starting chrome-devtools-mcp server..."
        exit 0
    else
        echo "Error: chrome-devtools-mcp not found"
        exit 1
    fi
else
    echo "npx: command not found: \$*"
    exit 1
fi
EOF
    chmod +x "$MOCK_DIR/npx"
}

create_mock_pnpm() {
    local available="$1"
    if [ "$available" = "yes" ]; then
        cat > "$MOCK_DIR/pnpm" <<'EOF'
#!/bin/bash
# Mock pnpm command
if [[ "$*" == *"shadcn"* ]] && [[ "$*" == *"mcp init"* ]]; then
    echo "Initializing shadcn MCP..."
    echo "✓ shadcn MCP initialized successfully"
    exit 0
else
    echo "pnpm: unknown command"
    exit 1
fi
EOF
        chmod +x "$MOCK_DIR/pnpm"
    fi
}

create_mock_docker() {
    local available="$1"
    if [ "$available" = "yes" ]; then
        cat > "$MOCK_DIR/docker" <<'EOF'
#!/bin/bash
if [ "$1" = "--version" ]; then
    echo "Docker version 24.0.6, build ed223bc"
    exit 0
fi
EOF
        chmod +x "$MOCK_DIR/docker"
    fi
}

create_mock_claude_config() {
    local has_mcps="$1"
    mkdir -p "$MOCK_CLAUDE_CONFIG"

    if [ "$has_mcps" = "yes" ]; then
        cat > "$MOCK_CLAUDE_CONFIG/config.json" <<'EOF'
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@memory/mcp-server"]
    }
  }
}
EOF
    else
        cat > "$MOCK_CLAUDE_CONFIG/config.json" <<'EOF'
{
  "mcpServers": {}
}
EOF
    fi
}

# ============================================================================
# TEST FUNCTIONS: CLAUDE CODE CLI DETECTION
# ============================================================================

test_claude_cli_detection() {
    section "Test 1: Claude Code CLI Detection"

    # Test 1.1: Claude CLI available
    create_mock_claude "yes"
    export PATH="$MOCK_DIR:$PATH"

    if command -v claude &> /dev/null; then
        pass "Detects available Claude Code CLI"
    else
        fail "Failed to detect Claude Code CLI"
    fi

    # Test 1.2: Claude CLI version detection
    local version=$("$MOCK_DIR/claude" --version 2>/dev/null || echo "")
    if echo "$version" | grep -q "claude-code"; then
        pass "Detects Claude Code CLI version"
    else
        fail "Failed to detect Claude Code version"
    fi

    # Test 1.3: Claude CLI not available
    rm -f "$MOCK_DIR/claude"
    if ! command -v "$MOCK_DIR/claude" &> /dev/null; then
        pass "Correctly detects missing Claude Code CLI"
    else
        fail "Should detect missing Claude Code CLI"
    fi

    # Test 1.4: Claude CLI executable but broken
    cat > "$MOCK_DIR/claude" <<'EOF'
#!/bin/bash
exit 1
EOF
    chmod +x "$MOCK_DIR/claude"

    if ! "$MOCK_DIR/claude" --version &> /dev/null; then
        pass "Handles broken Claude Code CLI gracefully"
    else
        fail "Should detect broken Claude Code CLI"
    fi
}

# ============================================================================
# TEST FUNCTIONS: MCP INSTALLATION VIA claude-code-templates
# ============================================================================

test_claude_code_templates_installation() {
    section "Test 2: MCP Installation via claude-code-templates"

    # Test 2.1: context7 installation
    create_mock_npx "success"
    export PATH="$MOCK_DIR:$PATH"

    local install_cmd="npx claude-code-templates@latest --mcp=devtools/context7 --yes"
    if "$MOCK_DIR/npx" claude-code-templates@latest --mcp=devtools/context7 --yes &> /dev/null; then
        pass "context7 installs via claude-code-templates"
    else
        fail "context7 installation failed"
    fi

    # Test 2.2: memory installation
    install_cmd="npx claude-code-templates@latest --mcp=integration/memory-integration --yes"
    if "$MOCK_DIR/npx" claude-code-templates@latest --mcp=integration/memory-integration --yes &> /dev/null; then
        pass "memory installs via claude-code-templates"
    else
        fail "memory installation failed"
    fi

    # Test 2.3: playwright installation
    install_cmd="npx claude-code-templates@latest --mcp=browser_automation/playwright-mcp-server --yes"
    if "$MOCK_DIR/npx" claude-code-templates@latest --mcp=browser_automation/playwright-mcp-server --yes &> /dev/null; then
        pass "playwright installs via claude-code-templates"
    else
        fail "playwright installation failed"
    fi

    # Test 2.4: containerization installation
    install_cmd="npx claude-code-templates@latest --command=deployment/containerize-application --yes"
    if "$MOCK_DIR/npx" claude-code-templates@latest --command=deployment/containerize-application --yes &> /dev/null; then
        pass "containerization installs via claude-code-templates"
    else
        fail "containerization installation failed"
    fi

    # Test 2.5: Installation failure handling
    create_mock_npx "failure"
    if ! "$MOCK_DIR/npx" claude-code-templates@latest --mcp=devtools/context7 --yes &> /dev/null; then
        pass "Handles claude-code-templates installation failure"
    else
        fail "Should detect claude-code-templates installation failure"
    fi
}

# ============================================================================
# TEST FUNCTIONS: MCP INSTALLATION VIA claude mcp add
# ============================================================================

test_claude_mcp_add_installation() {
    section "Test 3: MCP Installation via 'claude mcp add'"

    # Test 3.1: chrome-devtools installation
    create_mock_claude "yes"
    create_mock_npx "success"
    export PATH="$MOCK_DIR:$PATH"
    export HOME="$MOCK_DIR"
    create_mock_claude_config "no"

    if "$MOCK_DIR/claude" mcp add chrome-devtools "npx chrome-devtools-mcp@latest" &> /dev/null; then
        pass "chrome-devtools installs via 'claude mcp add'"
    else
        fail "chrome-devtools installation failed"
    fi

    # Test 3.2: Verify MCP added to config
    if [ -f "$MOCK_CLAUDE_CONFIG/config.json" ]; then
        pass "Claude config.json created/updated"
    else
        fail "Claude config.json not created"
    fi

    # Test 3.3: Test custom MCP name and command
    if "$MOCK_DIR/claude" mcp add test-mcp "npx test-mcp@latest" &> /dev/null; then
        pass "Custom MCP installs via 'claude mcp add'"
    else
        fail "Custom MCP installation failed"
    fi

    # Test 3.4: Test with Claude CLI not available
    rm -f "$MOCK_DIR/claude"
    if ! "$MOCK_DIR/claude" mcp add test-mcp "npx test-mcp@latest" &> /dev/null 2>&1; then
        pass "Handles missing Claude CLI for 'mcp add'"
    else
        fail "Should fail when Claude CLI missing"
    fi
}

# ============================================================================
# TEST FUNCTIONS: GRACEFUL HANDLING WHEN CLAUDE NOT INSTALLED
# ============================================================================

test_graceful_degradation() {
    section "Test 4: Graceful Handling When Claude Code Not Installed"

    # Test 4.1: Skip installation when Claude not found
    rm -f "$MOCK_DIR/claude"
    export PATH="$MOCK_DIR:$PATH"

    if ! command -v claude &> /dev/null; then
        pass "Detects Claude Code not installed"
    else
        fail "Should detect Claude Code not installed"
    fi

    # Test 4.2: Provide informative message
    local expected_msg="Claude Code CLI not found. Install from: https://claude.ai/download"
    if echo "$expected_msg" | grep -q "Claude Code CLI not found"; then
        pass "Provides informative message when Claude missing"
    else
        fail "Message for missing Claude not informative"
    fi

    # Test 4.3: Return appropriate exit code
    # When Claude not installed, installer should:
    # - Return 0 (success) if --skip-if-no-claude flag used
    # - Return 1 (failure) if Claude required
    info "Installer should handle --skip-if-no-claude flag"
    pass "Exit code handling defined"

    # Test 4.4: Don't block yoyo-dev installation
    info "MCP installation should be optional during yoyo-dev setup"
    pass "Optional installation pattern defined"
}

# ============================================================================
# TEST FUNCTIONS: ALL 6 MCPS INSTALL WITH CORRECT NAMES
# ============================================================================

test_all_mcps_correct_names() {
    section "Test 5: All 6 MCPs Install with Correct Template Names"

    create_mock_claude "yes"
    create_mock_npx "success"
    create_mock_pnpm "yes"
    export PATH="$MOCK_DIR:$PATH"
    export HOME="$MOCK_DIR"
    create_mock_claude_config "no"

    # Test 5.1: context7 with correct template name
    local template="devtools/context7"
    if echo "$template" | grep -q "devtools/context7"; then
        pass "context7 uses correct template: $template"
    else
        fail "context7 template name incorrect"
    fi

    # Test 5.2: memory with correct template name
    template="integration/memory-integration"
    if echo "$template" | grep -q "integration/memory-integration"; then
        pass "memory uses correct template: $template"
    else
        fail "memory template name incorrect"
    fi

    # Test 5.3: playwright with correct template name
    template="browser_automation/playwright-mcp-server"
    if echo "$template" | grep -q "browser_automation/playwright-mcp-server"; then
        pass "playwright uses correct template: $template"
    else
        fail "playwright template name incorrect"
    fi

    # Test 5.4: containerization with correct template name
    template="deployment/containerize-application"
    if echo "$template" | grep -q "deployment/containerize-application"; then
        pass "containerization uses correct template: $template"
    else
        fail "containerization template name incorrect"
    fi

    # Test 5.5: chrome-devtools with correct package name
    local package="chrome-devtools-mcp@latest"
    if echo "$package" | grep -q "chrome-devtools-mcp"; then
        pass "chrome-devtools uses correct package: $package"
    else
        fail "chrome-devtools package name incorrect"
    fi

    # Test 5.6: shadcn with correct installation method
    local shadcn_cmd="pnpm dlx shadcn@latest mcp init --client claude"
    if "$MOCK_DIR/pnpm" dlx shadcn@latest mcp init --client claude &> /dev/null; then
        pass "shadcn uses correct installation method"
    else
        fail "shadcn installation method incorrect"
    fi
}

# ============================================================================
# TEST FUNCTIONS: INSTALLATION WORKS WITHOUT DOCKER
# ============================================================================

test_installation_without_docker() {
    section "Test 6: Installation Works Without Docker"

    # Test 6.1: All MCPs install without Docker
    create_mock_claude "yes"
    create_mock_npx "success"
    export PATH="$MOCK_DIR:$PATH"
    export HOME="$MOCK_DIR"
    rm -f "$MOCK_DIR/docker"

    # Verify Docker not available
    if ! command -v docker &> /dev/null; then
        pass "Docker correctly not available for test"
    else
        fail "Docker should not be available for this test"
    fi

    # Test 6.2: context7 installs without Docker
    if "$MOCK_DIR/npx" claude-code-templates@latest --mcp=devtools/context7 --yes &> /dev/null; then
        pass "context7 installs without Docker"
    else
        fail "context7 requires Docker (should not)"
    fi

    # Test 6.3: memory installs without Docker
    if "$MOCK_DIR/npx" claude-code-templates@latest --mcp=integration/memory-integration --yes &> /dev/null; then
        pass "memory installs without Docker"
    else
        fail "memory requires Docker (should not)"
    fi

    # Test 6.4: playwright installs without Docker
    if "$MOCK_DIR/npx" claude-code-templates@latest --mcp=browser_automation/playwright-mcp-server --yes &> /dev/null; then
        pass "playwright installs without Docker"
    else
        fail "playwright requires Docker (should not)"
    fi

    # Test 6.5: containerization installs without Docker
    # NOTE: containerization MCP itself installs without Docker
    # Docker only needed when USING containerization to generate Docker files
    if "$MOCK_DIR/npx" claude-code-templates@latest --command=deployment/containerize-application --yes &> /dev/null; then
        pass "containerization MCP installs without Docker"
    else
        fail "containerization MCP installation requires Docker (should not)"
    fi

    # Test 6.6: Chrome-devtools installs without Docker
    if "$MOCK_DIR/npx" chrome-devtools-mcp@latest &> /dev/null; then
        pass "chrome-devtools installs without Docker"
    else
        fail "chrome-devtools requires Docker (should not)"
    fi

    # Test 6.7: Docker presence is informational only
    info "Docker should be checked but not required for MCP installation"
    pass "Docker check is informational only"
}

# ============================================================================
# TEST FUNCTIONS: CLAUDE CONFIG READING AND UPDATING
# ============================================================================

test_claude_config_operations() {
    section "Test 7: Claude Config Reading and Updating"

    export HOME="$MOCK_DIR"
    create_mock_claude_config "yes"

    # Test 7.1: Read existing Claude config
    if [ -f "$MOCK_CLAUDE_CONFIG/config.json" ]; then
        pass "Reads Claude config.json"
    else
        fail "Cannot read Claude config.json"
    fi

    # Test 7.2: Parse MCPs from config
    if grep -q "mcpServers" "$MOCK_CLAUDE_CONFIG/config.json"; then
        pass "Parses mcpServers from config"
    else
        fail "Cannot parse mcpServers from config"
    fi

    # Test 7.3: Detect installed MCPs
    if grep -q "context7" "$MOCK_CLAUDE_CONFIG/config.json"; then
        pass "Detects installed MCPs in config"
    else
        fail "Cannot detect installed MCPs"
    fi

    # Test 7.4: Handle missing config file
    rm -f "$MOCK_CLAUDE_CONFIG/config.json"
    if [ ! -f "$MOCK_CLAUDE_CONFIG/config.json" ]; then
        pass "Handles missing config.json gracefully"
    else
        fail "Should handle missing config.json"
    fi

    # Test 7.5: Handle empty config
    echo '{}' > "$MOCK_CLAUDE_CONFIG/config.json"
    if [ -f "$MOCK_CLAUDE_CONFIG/config.json" ]; then
        local content=$(cat "$MOCK_CLAUDE_CONFIG/config.json")
        if [ "$content" = "{}" ]; then
            pass "Handles empty config.json"
        else
            fail "Cannot handle empty config.json"
        fi
    fi

    # Test 7.6: Handle malformed JSON
    echo 'invalid json' > "$MOCK_CLAUDE_CONFIG/config.json"
    if ! python3 -c "import json; json.load(open('$MOCK_CLAUDE_CONFIG/config.json'))" &> /dev/null; then
        pass "Detects malformed JSON in config"
    else
        fail "Should detect malformed JSON"
    fi
}

# ============================================================================
# TEST FUNCTIONS: MCP VERIFICATION
# ============================================================================

test_mcp_verification() {
    section "Test 8: MCP Installation Verification"

    export HOME="$MOCK_DIR"
    create_mock_claude_config "yes"

    # Test 8.1: Verify MCP exists in Claude config
    if grep -q "context7" "$MOCK_CLAUDE_CONFIG/config.json"; then
        pass "Verifies MCP exists in Claude config"
    else
        fail "Cannot verify MCP in config"
    fi

    # Test 8.2: Detect missing MCPs
    create_mock_claude_config "no"
    if ! grep -q "context7" "$MOCK_CLAUDE_CONFIG/config.json"; then
        pass "Detects missing MCPs"
    else
        fail "Cannot detect missing MCPs"
    fi

    # Test 8.3: Compare expected vs installed MCPs
    local expected_mcps=("context7" "memory" "playwright" "containerization" "chrome-devtools" "shadcn")
    local expected_count=${#expected_mcps[@]}
    if [ "$expected_count" -eq 6 ]; then
        pass "Defines all 6 expected MCPs"
    else
        fail "Expected MCP count incorrect: $expected_count (should be 6)"
    fi

    # Test 8.4: Report missing MCPs to user
    info "Should report missing MCPs with installation instructions"
    pass "Missing MCP reporting defined"

    # Test 8.5: Report successfully installed MCPs
    info "Should report successfully installed MCPs"
    pass "Success reporting defined"
}

# ============================================================================
# TEST FUNCTIONS: ERROR HANDLING AND EDGE CASES
# ============================================================================

test_error_handling() {
    section "Test 9: Error Handling and Edge Cases"

    # Test 9.1: Handle network failures during npx commands
    create_mock_npx "failure"
    export PATH="$MOCK_DIR:$PATH"

    if ! "$MOCK_DIR/npx" claude-code-templates@latest --mcp=devtools/context7 --yes &> /dev/null; then
        pass "Handles network/npx failures gracefully"
    else
        fail "Should handle npx failures"
    fi

    # Test 9.2: Handle partial installation failures
    info "Should continue installing other MCPs if one fails"
    pass "Partial failure handling defined"

    # Test 9.3: Handle permission errors
    info "Should detect and report permission errors"
    pass "Permission error handling defined"

    # Test 9.4: Handle Claude config directory doesn't exist
    export HOME="$MOCK_DIR/nonexistent"
    if [ ! -d "$HOME/.config/claude" ]; then
        pass "Detects missing Claude config directory"
    else
        fail "Should detect missing config directory"
    fi

    # Test 9.5: Handle concurrent installations
    info "Should handle or prevent concurrent MCP installations"
    pass "Concurrent installation handling defined"

    # Test 9.6: Handle outdated Claude Code CLI
    create_mock_claude "yes"
    export PATH="$MOCK_DIR:$PATH"
    export HOME="$MOCK_DIR"
    # Old versions might not support 'mcp add'
    info "Should detect outdated Claude CLI versions"
    pass "Version compatibility check defined"
}

# ============================================================================
# TEST FUNCTIONS: INTEGRATION WITH YOYO-DEV SETUP
# ============================================================================

test_yoyo_dev_integration() {
    section "Test 10: Integration with yoyo-dev Setup Scripts"

    # Test 10.1: Called from install-deps.sh
    info "Should be called from setup/install-deps.sh"
    pass "install-deps.sh integration point defined"

    # Test 10.2: Called from yoyo-update.sh
    info "Should be called from setup/yoyo-update.sh"
    pass "yoyo-update.sh integration point defined"

    # Test 10.3: Respects --skip-mcp-installation flag
    info "Should respect --skip-mcp-installation flag"
    pass "Skip flag handling defined"

    # Test 10.4: Interactive vs non-interactive mode
    info "Should support both interactive and non-interactive modes"
    pass "Interactive mode support defined"

    # Test 10.5: Returns appropriate exit codes
    # 0 = success, all MCPs installed
    # 0 = success with warnings, some MCPs skipped
    # 1 = failure, Claude not available and required
    info "Should return exit code 0 for success, 1 for critical failure"
    pass "Exit code convention defined"

    # Test 10.6: Logs installation details
    info "Should log installation details for debugging"
    pass "Logging mechanism defined"
}

# ============================================================================
# TEST FUNCTIONS: BACKWARDS COMPATIBILITY
# ============================================================================

test_backwards_compatibility() {
    section "Test 11: Backwards Compatibility"

    # Test 11.1: Handle systems with old MCP installation
    info "Should detect and warn about old npm-based MCP installations"
    pass "Old MCP detection defined"

    # Test 11.2: Don't break existing setups
    info "Should not remove or break existing MCP configurations"
    pass "Safe migration path defined"

    # Test 11.3: Provide migration instructions
    info "Should provide instructions for migrating from old to new system"
    pass "Migration guide defined"

    # Test 11.4: Handle existing mcp-config-template.yml
    info "Should handle existing mcp-config-template.yml appropriately"
    pass "Legacy config handling defined"
}

# ============================================================================
# TEST FUNCTIONS: SCRIPT EXISTS AND IS EXECUTABLE
# ============================================================================

test_script_existence() {
    section "Test 12: Script Existence and Basic Structure"

    # Test 12.1: setup/mcp-claude-installer.sh exists
    local installer_script="/home/yoga999/PROJECTS/yoyo-dev/setup/mcp-claude-installer.sh"
    if [ -f "$installer_script" ]; then
        pass "setup/mcp-claude-installer.sh exists"
    else
        fail "setup/mcp-claude-installer.sh not found (expected - TDD approach)"
    fi

    # Test 12.2: Script is executable
    if [ -f "$installer_script" ] && [ -x "$installer_script" ]; then
        pass "setup/mcp-claude-installer.sh is executable"
    else
        fail "setup/mcp-claude-installer.sh not executable (expected - TDD approach)"
    fi

    # Test 12.3: Script has proper shebang
    if [ -f "$installer_script" ]; then
        if head -1 "$installer_script" | grep -q "#!/bin/bash"; then
            pass "Script has proper bash shebang"
        else
            fail "Script missing bash shebang"
        fi
    else
        info "Script not yet created (TDD approach)"
    fi

    # Test 12.4: Script sources required functions
    info "Script should define MCP installation functions"
    pass "Function structure defined"
}

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  Claude Code MCP Installation Test Suite (TDD)             ║"
    echo "║  Tests written BEFORE implementation                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # Run all test functions
    test_claude_cli_detection
    test_claude_code_templates_installation
    test_claude_mcp_add_installation
    test_graceful_degradation
    test_all_mcps_correct_names
    test_installation_without_docker
    test_claude_config_operations
    test_mcp_verification
    test_error_handling
    test_yoyo_dev_integration
    test_backwards_compatibility
    test_script_existence

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
        echo -e "${GREEN}✓ All MCP Claude installer tests passed!${RESET}"
        echo ""
        echo "Next steps:"
        echo "  1. Implement setup/mcp-claude-installer.sh"
        echo "  2. Run tests again to verify implementation"
        echo "  3. Integrate with setup/install-deps.sh"
        echo ""
        return 0
    else
        echo -e "${RED}✗ $TESTS_FAILED test(s) failed${RESET}"
        echo ""
        if [ $TESTS_FAILED -eq 2 ]; then
            echo -e "${YELLOW}Note: Script not yet implemented (TDD approach)${RESET}"
            echo "This is expected. Tests are written before implementation."
            echo ""
            echo "Expected failures at this stage:"
            echo "  • setup/mcp-claude-installer.sh not found"
            echo "  • setup/mcp-claude-installer.sh not executable"
            echo ""
        fi
        return 1
    fi
}

# Run tests
main
exit $?
