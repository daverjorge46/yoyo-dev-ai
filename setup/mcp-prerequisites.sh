#!/usr/bin/env bash
# MCP Prerequisite Checking Script for Yoyo Dev
# Checks Docker Desktop installation, running status, and MCP Toolkit availability
# Docker Desktop with MCP Toolkit is required for Yoyo Dev MCP features

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Requirements
MIN_DOCKER_VERSION=24

# Flags
PREREQUISITES_MET=true

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

# ============================================
# Platform Detection
# ============================================

detect_platform() {
    local os=$(uname -s)

    case "$os" in
        Linux*)
            echo "linux"
            ;;
        Darwin*)
            echo "macos"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# ============================================
# Docker Detection Functions
# ============================================

get_docker_version() {
    if ! command -v docker &> /dev/null; then
        echo ""
        return 1
    fi

    local version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

    if [ -z "$version" ]; then
        echo ""
        return 1
    fi

    echo "$version"
    return 0
}

get_docker_major_version() {
    local version=$1

    if [ -z "$version" ]; then
        echo "0"
        return
    fi

    echo "$version" | cut -d. -f1
}

check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        return 1
    fi

    return 0
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
    if ! docker info &> /dev/null; then
        return 1
    fi

    return 0
}

check_mcp_toolkit() {
    if ! docker mcp --help &> /dev/null 2>&1; then
        return 1
    fi

    return 0
}

# ============================================
# Claude CLI Detection (Optional)
# ============================================

get_claude_cli_version() {
    if ! command -v claude &> /dev/null; then
        echo ""
        return 1
    fi

    local version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "installed")

    echo "$version"
    return 0
}

# ============================================
# Error Messages and Instructions
# ============================================

show_docker_not_installed() {
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

show_docker_version_error() {
    local version=$(get_docker_version)
    print_error "Docker version $version is too old"
    echo ""
    echo "  ${BOLD}MCP Toolkit requires Docker Desktop 4.32+ (Docker Engine ${MIN_DOCKER_VERSION}+)${RESET}"
    echo ""
    echo "  Update Docker Desktop from:"
    echo "  ${CYAN}https://www.docker.com/products/docker-desktop/${RESET}"
    echo ""
}

show_docker_not_running() {
    print_error "Docker Desktop is not running"
    echo ""
    echo "  ${BOLD}Please start Docker Desktop and try again.${RESET}"
    echo ""
    local platform=$(detect_platform)
    if [ "$platform" = "linux" ]; then
        echo "  On Linux: ${CYAN}systemctl --user start docker-desktop${RESET}"
    elif [ "$platform" = "macos" ]; then
        echo "  On macOS: Open Docker Desktop from Applications"
    fi
    echo ""
}

show_mcp_toolkit_not_enabled() {
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
# Prerequisite Checks
# ============================================

check_docker() {
    # Step 1: Check Docker installed
    if ! check_docker_installed; then
        show_docker_not_installed
        return 1
    fi

    local docker_version=$(get_docker_version)

    # Step 2: Check Docker version
    if ! check_docker_version; then
        show_docker_version_error
        return 1
    fi

    print_success "Docker Desktop v$docker_version detected (required: v${MIN_DOCKER_VERSION}+)"

    # Step 3: Check Docker running
    if ! check_docker_running; then
        show_docker_not_running
        return 1
    fi

    print_success "Docker Desktop is running"

    # Step 4: Check MCP Toolkit enabled
    if ! check_mcp_toolkit; then
        show_mcp_toolkit_not_enabled
        return 1
    fi

    print_success "MCP Toolkit is enabled"

    return 0
}

check_claude_cli() {
    local claude_version=$(get_claude_cli_version)

    if [ -z "$claude_version" ]; then
        print_info "Claude Code CLI not found (optional)"
        echo -e "  ${BLUE}→${RESET} Install Claude Code for enhanced AI assistance"
        echo -e "  ${BLUE}→${RESET} Download: ${CYAN}https://claude.ai/download${RESET}"
        return 0  # Claude CLI is optional
    fi

    if [ "$claude_version" = "installed" ]; then
        print_success "Claude Code CLI detected (optional)"
    else
        print_success "Claude Code CLI v$claude_version detected (optional)"
    fi

    return 0
}

# ============================================
# Main Execution
# ============================================

main() {
    echo ""
    echo "=========================================="
    echo "  MCP Prerequisite Check"
    echo "=========================================="
    echo ""

    # Check Docker Desktop with MCP Toolkit (required)
    if ! check_docker; then
        PREREQUISITES_MET=false
    fi

    echo ""

    # Check Claude CLI (optional, informational)
    check_claude_cli

    echo ""
    echo "=========================================="

    if [ "$PREREQUISITES_MET" = "true" ]; then
        echo -e "${GREEN}✓ All required prerequisites met${RESET}"
        echo "=========================================="
        echo ""
        echo "  ${BOLD}Next Steps:${RESET}"
        echo "  Run the Docker MCP setup script to enable MCP servers:"
        echo "  ${CYAN}~/.yoyo-dev/setup/docker-mcp-setup.sh${RESET}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Prerequisites check failed${RESET}"
        echo "=========================================="
        echo ""
        return 1
    fi
}

# Run main function
main
exit $?
