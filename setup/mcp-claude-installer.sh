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
PROJECT_DIR=""

# Claude configuration location
CLAUDE_CONFIG_FILE="${HOME}/.claude.json"

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

check_network_connectivity() {
    log_verbose "Checking network connectivity..."

    # Try to ping npm registry
    if ! curl -s --max-time 5 https://registry.npmjs.org/ > /dev/null 2>&1; then
        print_warning "Network connectivity issues detected"
        echo ""
        echo "  ${BOLD}Network Troubleshooting:${RESET}"
        echo "  1. Check your internet connection"
        echo "  2. Verify you can access: ${CYAN}https://registry.npmjs.org/${RESET}"
        echo "  3. If behind a proxy, configure npm proxy settings:"
        echo "     ${CYAN}npm config set proxy http://proxy:port${RESET}"
        echo "     ${CYAN}npm config set https-proxy http://proxy:port${RESET}"
        echo ""
        return 1
    fi

    return 0
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

check_claude_config_permissions() {
    if [ ! -f "$CLAUDE_CONFIG_FILE" ]; then
        return 0  # File doesn't exist yet, Claude will create it
    fi

    # Check if file is readable
    if [ ! -r "$CLAUDE_CONFIG_FILE" ]; then
        print_error "Cannot read Claude config file: $CLAUDE_CONFIG_FILE"
        echo ""
        echo "  ${BOLD}Permission Issue Detected:${RESET}"
        echo "  The Claude config file exists but cannot be read."
        echo ""
        echo "  ${BOLD}Fix with:${RESET}"
        echo "     ${CYAN}chmod 644 $CLAUDE_CONFIG_FILE${RESET}"
        echo ""
        return 1
    fi

    # Check if file is writable
    if [ ! -w "$CLAUDE_CONFIG_FILE" ]; then
        print_warning "Claude config file is read-only: $CLAUDE_CONFIG_FILE"
        echo ""
        echo "  ${BOLD}Warning:${RESET} File is readable but not writable."
        echo "  MCPs may fail to install if Claude cannot update config."
        echo ""
        echo "  ${BOLD}Fix with:${RESET}"
        echo "     ${CYAN}chmod 644 $CLAUDE_CONFIG_FILE${RESET}"
        echo ""
        # Return success but with warning
    fi

    return 0
}


read_claude_config() {
    if check_claude_config_exists; then
        cat "$CLAUDE_CONFIG_FILE" 2>/dev/null || echo '{}'
    else
        echo '{}'
    fi
}

validate_claude_config() {
    local config_file="${1:-$CLAUDE_CONFIG_FILE}"

    if [ ! -f "$config_file" ]; then
        return 0  # File doesn't exist, Claude will create it
    fi

    # Validate JSON structure
    python3 << EOF
import json
import sys

try:
    with open("$config_file", "r") as f:
        data = json.load(f)

    # Check for projects key
    if "projects" not in data:
        print("INFO: Claude config missing 'projects' key")
        print("This will be created automatically by Claude")

    sys.exit(0)
except json.JSONDecodeError as e:
    print(f"ERROR: Invalid JSON in Claude config: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"ERROR: Cannot read Claude config: {e}", file=sys.stderr)
    sys.exit(1)
EOF

    return $?
}

is_mcp_installed() {
    local mcp_name="$1"
    local project_dir="${2:-$(pwd)}"

    if ! check_claude_config_exists; then
        return 1
    fi

    # Use Python to parse nested JSON structure correctly
    python3 << EOF
import json
import sys

try:
    with open("$CLAUDE_CONFIG_FILE", "r") as f:
        data = json.load(f)

    # Navigate nested structure: projects > project_dir > mcpServers
    projects = data.get("projects", {})
    project_data = projects.get("$project_dir", {})
    mcp_servers = project_data.get("mcpServers", {})

    # Check if MCP exists in this project
    if "$mcp_name" in mcp_servers:
        sys.exit(0)  # Found
    else:
        sys.exit(1)  # Not found
except Exception:
    sys.exit(1)  # Error or not found
EOF

    return $?
}

# ============================================
# MCP Installation Functions
# ============================================

install_mcp_via_templates() {
    local mcp_name="$1"
    local template_path="$2"
    local use_command="${3:-false}"

    log_verbose "Installing $mcp_name via claude-code-templates..."

    # Execute from project directory to set correct context
    (
        cd "$PROJECT_DIR" || return 1

        if [ "$use_command" = "true" ]; then
            npx claude-code-templates@latest --command="$template_path" --yes
        else
            npx claude-code-templates@latest --mcp="$template_path" --yes
        fi
    )
}

install_mcp_via_claude_add() {
    local mcp_name="$1"
    local mcp_command="$2"

    log_verbose "Installing $mcp_name via 'claude mcp add'..."

    # Execute from project directory to set correct context
    (
        cd "$PROJECT_DIR" || return 1

        # Use claude mcp add (Claude creates config automatically)
        claude mcp add "$mcp_name" "$mcp_command"
    )
}

install_mcp_via_pnpm() {
    local mcp_name="$1"

    log_verbose "Installing $mcp_name via pnpm dlx..."

    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm not found. Install pnpm to enable shadcn MCP."
        return 1
    fi

    # Execute from project directory to set correct context
    (
        cd "$PROJECT_DIR" || return 1

        pnpm dlx shadcn@latest mcp init --client claude
    )
}

# ============================================
# Individual MCP Installers
# ============================================

install_context7() {
    local mcp_name="context7"

    if is_mcp_installed "$mcp_name" "$PROJECT_DIR"; then
        print_info "$mcp_name already installed (skipping)"
        MCPS_SKIPPED=$((MCPS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Installing ${BOLD}$mcp_name${RESET}..."

    local error_log=$(mktemp)
    if install_mcp_via_templates "$mcp_name" "devtools/context7" "false" 2>"$error_log"; then
        print_success "$mcp_name installed successfully"
        rm -f "$error_log"
        MCPS_INSTALLED=$((MCPS_INSTALLED + 1))
        return 0
    else
        print_error "$mcp_name installation failed"
        if [ "$VERBOSE" = true ] && [ -s "$error_log" ]; then
            echo "  ${YELLOW}Error details:${RESET}"
            head -5 "$error_log" | sed 's/^/  /'
        fi
        echo "  ${CYAN}Retry with: $0 --verbose${RESET}"
        rm -f "$error_log"
        MCPS_FAILED=$((MCPS_FAILED + 1))
        return 1
    fi
}

install_memory() {
    local mcp_name="memory"

    if is_mcp_installed "$mcp_name" "$PROJECT_DIR"; then
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

    if is_mcp_installed "$mcp_name" "$PROJECT_DIR"; then
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

    if is_mcp_installed "$mcp_name" "$PROJECT_DIR"; then
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

    if is_mcp_installed "$mcp_name" "$PROJECT_DIR"; then
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

    if is_mcp_installed "$mcp_name" "$PROJECT_DIR"; then
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
        print_error "Claude Code CLI not found or not functional"
        echo ""
        echo "  ${BOLD}Troubleshooting Steps:${RESET}"
        echo "  1. Check if Claude Code is installed:"
        echo "     ${CYAN}which claude${RESET}"
        echo ""
        echo "  2. If not installed, download from:"
        echo "     ${CYAN}https://claude.ai/download${RESET}"
        echo ""
        echo "  3. After installing, verify it works:"
        echo "     ${CYAN}claude --version${RESET}"
        echo ""
        echo "  4. If installed but not in PATH, add Claude to your PATH:"
        echo "     ${CYAN}export PATH=\"\$PATH:/path/to/claude\"${RESET}"
        echo ""

        if [ "$SKIP_IF_NO_CLAUDE" = true ]; then
            print_info "Skipping MCP installation (--skip-if-no-claude flag set)"
            return 0
        else
            return 1
        fi
    fi

    # Display Claude version
    local claude_version=$(get_claude_version)
    print_info "Claude Code CLI detected: $claude_version"

    # Check config file permissions
    if ! check_claude_config_permissions; then
        return 1
    fi

    # Display project context
    print_info "Installing MCPs for project: $PROJECT_DIR"

    # Check network connectivity
    if ! check_network_connectivity; then
        print_warning "Continuing with limited network connectivity..."
    fi

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
        echo ""
        echo "  ${BOLD}Common Causes:${RESET}"
        echo "  • Network connectivity issues (check firewall/proxy)"
        echo "  • npm/pnpm not installed or outdated"
        echo "  • Insufficient permissions to create files"
        echo "  • Claude Code CLI not properly configured"
        echo ""
        echo "  ${BOLD}Next Steps:${RESET}"
        echo "  1. Run with verbose mode for detailed logs:"
        echo "     ${CYAN}$0 --verbose${RESET}"
        echo ""
        echo "  2. Check Claude config at:"
        echo "     ${CYAN}$CLAUDE_CONFIG_FILE${RESET}"
        echo ""
        echo "  3. Verify project context:"
        echo "     ${CYAN}Project: $PROJECT_DIR${RESET}"
        echo ""
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
    --project-dir=PATH     Set project directory for MCP installation (default: current directory)
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
    # Standard installation (uses current directory)
    $0

    # Install for specific project
    $0 --project-dir=/home/user/myproject

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
            --project-dir=*)
                PROJECT_DIR="${1#*=}"
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

    # Set PROJECT_DIR to current directory if not specified
    if [ -z "$PROJECT_DIR" ]; then
        PROJECT_DIR="$(pwd)"
    fi
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
