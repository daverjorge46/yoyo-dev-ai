#!/bin/bash
# MCP Claude Code Installer for Yoyo Dev
# Installs MCP servers using Claude Code's native installation system
# Supports: claude-code-templates, claude mcp add, and pnpm dlx (for shadcn)

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Script configuration
SKIP_IF_NO_CLAUDE=false
INTERACTIVE=true
VERBOSE=false

# Claude configuration location
CLAUDE_CONFIG_DIR="${HOME}/.config/claude"
CLAUDE_CONFIG_FILE="${CLAUDE_CONFIG_DIR}/config.json"

# MCP installation status
MCPS_INSTALLED=0
MCPS_FAILED=0
MCPS_SKIPPED=0

# ============================================
# Helper Functions
# ============================================

print_success() {
    echo -e "${GREEN}✓${RESET} $1"
}

print_error() {
    echo -e "${RED}✗${RESET} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${RESET} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${RESET} $1"
}

print_header() {
    echo ""
    echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${CYAN}${BOLD}║${RESET}  $1"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${RESET} $1"
    fi
}

# ============================================
# Claude Code CLI Detection
# ============================================

check_claude_cli() {
    log_verbose "Checking for Claude Code CLI..."

    if ! command -v claude &> /dev/null; then
        return 1
    fi

    # Verify Claude CLI works
    if ! claude --version &> /dev/null; then
        return 1
    fi

    return 0
}

get_claude_version() {
    if command -v claude &> /dev/null; then
        claude --version 2>/dev/null | head -1 || echo "unknown"
    else
        echo "not installed"
    fi
}

# ============================================
# Claude Config Operations
# ============================================

check_claude_config_exists() {
    if [ -f "$CLAUDE_CONFIG_FILE" ]; then
        return 0
    else
        return 1
    fi
}

create_claude_config_if_missing() {
    if ! check_claude_config_exists; then
        log_verbose "Creating Claude config directory..."
        mkdir -p "$CLAUDE_CONFIG_DIR"
        echo '{"mcpServers":{}}' > "$CLAUDE_CONFIG_FILE"
        log_verbose "Created empty Claude config at $CLAUDE_CONFIG_FILE"
    fi
}

read_claude_config() {
    if check_claude_config_exists; then
        cat "$CLAUDE_CONFIG_FILE" 2>/dev/null || echo '{}'
    else
        echo '{}'
    fi
}

is_mcp_installed() {
    local mcp_name="$1"

    if ! check_claude_config_exists; then
        return 1
    fi

    # Check if MCP exists in config.json
    if grep -q "\"$mcp_name\"" "$CLAUDE_CONFIG_FILE" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# ============================================
# MCP Installation Functions
# ============================================

install_mcp_via_templates() {
    local mcp_name="$1"
    local template_path="$2"
    local use_command="${3:-false}"

    log_verbose "Installing $mcp_name via claude-code-templates..."

    if [ "$use_command" = "true" ]; then
        npx claude-code-templates@latest --command="$template_path" --yes
    else
        npx claude-code-templates@latest --mcp="$template_path" --yes
    fi
}

install_mcp_via_claude_add() {
    local mcp_name="$1"
    local mcp_command="$2"

    log_verbose "Installing $mcp_name via 'claude mcp add'..."

    # Ensure config directory exists
    create_claude_config_if_missing

    # Use claude mcp add
    claude mcp add "$mcp_name" "$mcp_command"
}

install_mcp_via_pnpm() {
    local mcp_name="$1"

    log_verbose "Installing $mcp_name via pnpm dlx..."

    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm not found. Install pnpm to enable shadcn MCP."
        return 1
    fi

    pnpm dlx shadcn@latest mcp init --client claude
}

# ============================================
# Individual MCP Installers
# ============================================

install_context7() {
    local mcp_name="context7"

    if is_mcp_installed "$mcp_name"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    if install_mcp_via_templates "$mcp_name" "devtools/context7" "false" &> /dev/null; then
        print_success "$mcp_name installed successfully"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

install_memory() {
    local mcp_name="memory"

    if is_mcp_installed "$mcp_name"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    if install_mcp_via_templates "$mcp_name" "integration/memory-integration" "false" &> /dev/null; then
        print_success "$mcp_name installed successfully"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

install_playwright() {
    local mcp_name="playwright"

    if is_mcp_installed "$mcp_name"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    if install_mcp_via_templates "$mcp_name" "browser_automation/playwright-mcp-server" "false" &> /dev/null; then
        print_success "$mcp_name installed successfully"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

install_containerization() {
    local mcp_name="containerization"

    if is_mcp_installed "$mcp_name"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    if install_mcp_via_templates "$mcp_name" "deployment/containerize-application" "true" &> /dev/null; then
        print_success "$mcp_name installed successfully"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

install_chrome_devtools() {
    local mcp_name="chrome-devtools"

    if is_mcp_installed "$mcp_name"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    if install_mcp_via_claude_add "$mcp_name" "npx chrome-devtools-mcp@latest" &> /dev/null; then
        print_success "$mcp_name installed successfully"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

install_shadcn() {
    local mcp_name="shadcn"

    if is_mcp_installed "$mcp_name"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    if install_mcp_via_pnpm "$mcp_name" &> /dev/null; then
        print_success "$mcp_name installed successfully"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed (pnpm required)"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

# ============================================
# Main Installation Flow
# ============================================

install_all_mcps() {
    print_header "Installing MCP Servers via Claude Code"

    # Check for Claude CLI
    if ! check_claude_cli; then
        print_warning "Claude Code CLI not found. Install from: https://claude.ai/download"

        if [ "$SKIP_IF_NO_CLAUDE" = true ]; then
            print_info "Skipping MCP installation (--skip-if-no-claude flag set)"
            return 0
        else
            print_error "Claude Code CLI required for MCP installation"
            return 1
        fi
    fi

    # Display Claude version
    local claude_version=$(get_claude_version)
    print_info "Claude Code CLI detected: $claude_version"

    # Create config if missing
    create_claude_config_if_missing

    echo ""
    print_info "Installing 6 MCP servers..."
    echo ""

    # Install all MCPs (continue on individual failures)
    install_context7 || true
    install_memory || true
    install_playwright || true
    install_containerization || true
    install_chrome_devtools || true
    install_shadcn || true

    # Print summary
    echo ""
    print_header "Installation Summary"

    echo -e "MCPs Installed: ${GREEN}${BOLD}$MCPS_INSTALLED${RESET}"
    echo -e "MCPs Skipped:   ${YELLOW}${BOLD}$MCPS_SKIPPED${RESET}"
    echo -e "MCPs Failed:    ${RED}${BOLD}$MCPS_FAILED${RESET}"
    echo ""

    if [ $MCPS_FAILED -gt 0 ]; then
        print_warning "Some MCPs failed to install. Check logs above for details."
    fi

    if [ $MCPS_INSTALLED -gt 0 ]; then
        print_success "MCP installation completed"
    fi

    # Provide informational message about Docker
    echo ""
    print_info "Note: Docker is NOT required for MCP installation."
    print_info "Docker is only needed when using the containerization MCP to generate Docker files."
    echo ""

    return 0
}

# ============================================
# Usage Information
# ============================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Install MCP servers using Claude Code's native installation system.

OPTIONS:
    --skip-if-no-claude    Exit gracefully if Claude Code CLI not found (exit 0)
    --non-interactive      Run without user prompts
    --verbose              Show detailed installation logs
    -h, --help             Show this help message

SUPPORTED MCPS:
    1. context7            - DevTools context management
    2. memory              - Memory integration
    3. playwright          - Browser automation
    4. containerization    - Docker/container deployment
    5. chrome-devtools     - Chrome DevTools Protocol
    6. shadcn              - UI component library (requires pnpm)

REQUIREMENTS:
    - Claude Code CLI (https://claude.ai/download)
    - Node.js and npm (for npx commands)
    - pnpm (optional, for shadcn MCP)

EXAMPLES:
    # Standard installation
    $0

    # Skip if Claude Code not installed
    $0 --skip-if-no-claude

    # Verbose mode for debugging
    $0 --verbose

EOF
}

# ============================================
# Argument Parsing
# ============================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-if-no-claude)
                SKIP_IF_NO_CLAUDE=true
                shift
                ;;
            --non-interactive)
                INTERACTIVE=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# ============================================
# Main Entry Point
# ============================================

main() {
    parse_args "$@"

    # Run installation
    if install_all_mcps; then
        exit 0
    else
        exit 1
    fi
}

# Run main function if script executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
