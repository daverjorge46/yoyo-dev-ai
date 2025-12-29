#!/bin/bash
# Docker MCP Setup Script for Yoyo Dev
# Configures Docker MCP Toolkit and enables recommended MCP servers
# Replaces legacy npx-based mcp-claude-installer.sh

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
SKIP_IF_NO_DOCKER=false
INTERACTIVE=false  # Non-interactive by default (changed from true)
VERBOSE=false
PROJECT_DIR=""

# Minimum Docker version (Docker Desktop 4.32+ uses Docker Engine 27.0+)
MIN_DOCKER_VERSION=24

# Recommended MCP servers for Yoyo Dev workflows
RECOMMENDED_SERVERS=(
    "playwright"
    "github-official"
    "duckduckgo"
    "filesystem"
)

# Installation status counters
SERVERS_ENABLED=0
SERVERS_FAILED=0
SERVERS_SKIPPED=0

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
# Docker Desktop Detection
# ============================================

check_docker_installed() {
    log_verbose "Checking if Docker is installed..."

    if ! command -v docker &> /dev/null; then
        return 1
    fi

    return 0
}

get_docker_version() {
    if ! command -v docker &> /dev/null; then
        echo ""
        return 1
    fi

    local version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo "$version"
}

get_docker_major_version() {
    local version="$1"

    if [ -z "$version" ]; then
        echo "0"
        return
    fi

    echo "$version" | cut -d. -f1
}

check_docker_version() {
    local version=$(get_docker_version)

    if [ -z "$version" ]; then
        return 1
    fi

    local major_version=$(get_docker_major_version "$version")

    if [ "$major_version" -lt "$MIN_DOCKER_VERSION" ]; then
        return 1
    fi

    return 0
}

check_docker_running() {
    log_verbose "Checking if Docker Desktop is running..."

    if ! docker info &> /dev/null; then
        return 1
    fi

    return 0
}

# ============================================
# MCP Toolkit Detection
# ============================================

check_mcp_toolkit_enabled() {
    log_verbose "Checking if MCP Toolkit is enabled..."

    # Try to run docker mcp --help to check if MCP Toolkit is available
    if ! docker mcp --help &> /dev/null 2>&1; then
        return 1
    fi

    return 0
}

# ============================================
# MCP Server Management
# ============================================

is_server_enabled() {
    local server_name="$1"

    # Check if server is already enabled using 'docker mcp server ls'
    local status_output=$(docker mcp server ls 2>/dev/null || echo "")

    if echo "$status_output" | grep -q "$server_name"; then
        return 0
    fi

    return 1
}

enable_mcp_server() {
    local server_name="$1"

    log_verbose "Enabling MCP server: $server_name"

    # Check if already enabled
    if is_server_enabled "$server_name"; then
        print_info "$server_name already enabled (skipping)"
        SERVERS_SKIPPED=$((SERVERS_SKIPPED + 1))
        return 0
    fi

    echo -e "${CYAN}→${RESET} Enabling ${BOLD}$server_name${RESET}..."

    local error_log=$(mktemp)
    if docker mcp server enable "$server_name" 2>"$error_log"; then
        print_success "$server_name enabled successfully"
        rm -f "$error_log"
        SERVERS_ENABLED=$((SERVERS_ENABLED + 1))
        return 0
    else
        print_error "$server_name failed to enable"
        if [ "$VERBOSE" = true ] && [ -s "$error_log" ]; then
            echo "  ${YELLOW}Error details:${RESET}"
            head -5 "$error_log" | sed 's/^/  /'
        fi
        rm -f "$error_log"
        SERVERS_FAILED=$((SERVERS_FAILED + 1))
        return 1
    fi
}

enable_recommended_servers() {
    print_info "Enabling recommended MCP servers..."
    echo ""

    for server in "${RECOMMENDED_SERVERS[@]}"; do
        enable_mcp_server "$server" || true
    done
}

# ============================================
# Client Connection
# ============================================

connect_claude_code() {
    log_verbose "Connecting Claude Code to MCP Gateway..."

    echo -e "${CYAN}→${RESET} Connecting ${BOLD}Claude Code${RESET} to MCP Gateway..."

    if docker mcp client connect claude-code &> /dev/null; then
        print_success "Claude Code connected to MCP Gateway"
        return 0
    else
        print_error "Failed to connect Claude Code to MCP Gateway"
        return 1
    fi
}

# ============================================
# Error Messages and Instructions
# ============================================

show_docker_not_installed_error() {
    print_error "Docker Desktop is required for Yoyo Dev MCP features"
    echo ""
    echo "  ${BOLD}Installation Instructions:${RESET}"
    echo ""
    echo "  Install Docker Desktop from:"
    echo "  ${CYAN}https://www.docker.com/products/docker-desktop/${RESET}"
    echo ""
    echo "  After installing:"
    echo "  1. Open Docker Desktop"
    echo "  2. Go to Settings > Beta features"
    echo "  3. Enable 'Docker MCP Toolkit'"
    echo "  4. Click Apply & Restart"
    echo ""
}

show_docker_not_running_error() {
    print_error "Docker Desktop is not running"
    echo ""
    echo "  ${BOLD}Please start Docker Desktop and try again.${RESET}"
    echo ""
    echo "  On Linux: ${CYAN}systemctl --user start docker-desktop${RESET}"
    echo "  On macOS: Open Docker Desktop from Applications"
    echo ""
}

show_docker_version_error() {
    local version=$(get_docker_version)
    print_error "Docker version $version is too old for MCP Toolkit"
    echo ""
    echo "  ${BOLD}MCP Toolkit requires Docker Desktop 4.32+ (Docker Engine 24+)${RESET}"
    echo ""
    echo "  Update Docker Desktop from:"
    echo "  ${CYAN}https://www.docker.com/products/docker-desktop/${RESET}"
    echo ""
}

show_mcp_toolkit_not_enabled_error() {
    print_error "MCP Toolkit is not enabled in Docker Desktop"
    echo ""
    echo "  ${BOLD}Enable MCP Toolkit:${RESET}"
    echo ""
    echo "  1. Open Docker Desktop"
    echo "  2. Go to Settings > Beta features"
    echo "  3. Enable 'Docker MCP Toolkit'"
    echo "  4. Click Apply & Restart"
    echo ""
    echo "  Then run this script again."
    echo ""
}

# ============================================
# Main Installation Flow
# ============================================

run_setup() {
    print_header "Docker MCP Setup for Yoyo Dev"

    # Step 1: Check Docker installed
    print_info "Checking Docker Desktop installation..."

    if ! check_docker_installed; then
        show_docker_not_installed_error

        if [ "$SKIP_IF_NO_DOCKER" = true ]; then
            print_info "Skipping MCP setup (--skip-if-no-docker flag set)"
            return 0
        else
            return 1
        fi
    fi

    local docker_version=$(get_docker_version)
    print_success "Docker detected: v$docker_version"

    # Step 2: Check Docker version
    if ! check_docker_version; then
        show_docker_version_error
        return 1
    fi

    # Step 3: Check Docker running
    if ! check_docker_running; then
        show_docker_not_running_error
        return 1
    fi

    print_success "Docker Desktop is running"

    # Step 4: Check MCP Toolkit enabled
    if ! check_mcp_toolkit_enabled; then
        show_mcp_toolkit_not_enabled_error
        return 1
    fi

    print_success "MCP Toolkit is enabled"
    echo ""

    # Step 5: Connect Claude Code to MCP Gateway
    if ! connect_claude_code; then
        print_warning "Claude Code connection failed, but continuing with server setup..."
    fi

    echo ""

    # Step 6: Enable recommended servers
    enable_recommended_servers

    # Print summary
    echo ""
    print_header "Setup Summary"

    echo -e "Servers Enabled:  ${GREEN}${BOLD}$SERVERS_ENABLED${RESET}"
    echo -e "Servers Skipped:  ${YELLOW}${BOLD}$SERVERS_SKIPPED${RESET}"
    echo -e "Servers Failed:   ${RED}${BOLD}$SERVERS_FAILED${RESET}"
    echo ""

    if [ $SERVERS_FAILED -gt 0 ]; then
        print_warning "Some servers failed to enable. Check logs above for details."
        echo ""
        echo "  ${BOLD}Troubleshooting:${RESET}"
        echo "  • Ensure Docker Desktop is fully started"
        echo "  • Check network connectivity"
        echo "  • Run with ${CYAN}--verbose${RESET} for detailed logs"
        echo ""
    fi

    # OAuth reminder for GitHub
    if [ $SERVERS_ENABLED -gt 0 ] || [ $SERVERS_SKIPPED -gt 0 ]; then
        echo ""
        print_info "${BOLD}OAuth Setup (Optional):${RESET}"
        echo ""
        echo "  Some servers like GitHub require OAuth authorization."
        echo "  To authorize GitHub access, run:"
        echo "  ${CYAN}docker mcp oauth authorize github${RESET}"
        echo ""
    fi

    if [ $SERVERS_ENABLED -gt 0 ]; then
        print_success "Docker MCP setup completed successfully"
    fi

    echo ""
    print_info "You can manage servers with:"
    echo "  • List servers:   ${CYAN}docker mcp server ls${RESET}"
    echo "  • Enable server:  ${CYAN}docker mcp server enable <name>${RESET}"
    echo "  • Disable server: ${CYAN}docker mcp server disable <name>${RESET}"
    echo ""

    return 0
}

# ============================================
# Usage Information
# ============================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Configure Docker MCP Toolkit for Yoyo Dev.

OPTIONS:
    --skip-if-no-docker    Exit gracefully if Docker not found (exit 0)
    --interactive          Prompt for user confirmations (default: auto-install)
    --non-interactive      Run without user prompts (same as default)
    --verbose              Show detailed logs
    --project-dir=PATH     Set project directory (default: current directory)
    -h, --help             Show this help message

RECOMMENDED MCP SERVERS:
    The following servers are enabled by default:
    • playwright        - Browser automation, E2E testing
    • github-official   - Repository management, PR operations
    • duckduckgo        - Web search capabilities
    • filesystem        - Secure file operations

REQUIREMENTS:
    • Docker Desktop 4.32+ with MCP Toolkit enabled
    • Docker Desktop must be running

EXAMPLES:
    # Standard setup
    $0

    # Setup for specific project
    $0 --project-dir=/home/user/myproject

    # Skip if Docker not installed
    $0 --skip-if-no-docker

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
            --skip-if-no-docker)
                SKIP_IF_NO_DOCKER=true
                shift
                ;;
            --interactive)
                INTERACTIVE=true
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

    # Change to project directory if specified
    if [ -n "$PROJECT_DIR" ] && [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
    fi

    if run_setup; then
        exit 0
    else
        exit 1
    fi
}

# Run main function if script executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
