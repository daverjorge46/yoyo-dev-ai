#!/usr/bin/env bash
# MCP Prerequisite Checking Script for Yoyo Dev
# Checks Node.js v18+, npm v9+, and optionally Claude Code CLI and Docker
# Auto-installs Node.js if missing

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Requirements
REQUIRED_NODE_VERSION=18
REQUIRED_NPM_VERSION=9

# Flags
PREREQUISITES_MET=true
AUTO_INSTALL=${AUTO_INSTALL:-true}

# ============================================
# Helper Functions
# ============================================

print_success() {
    echo -e "${GREEN}✓${RESET} $1"
}

print_error() {
    echo -e "${RED}ERROR:${RESET} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}WARNING:${RESET} $1"
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

detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v brew &> /dev/null; then
        echo "brew"
    else
        echo "none"
    fi
}

# ============================================
# Version Detection
# ============================================

get_node_version() {
    if ! command -v node &> /dev/null; then
        echo ""
        return 1
    fi

    local version_output=$(node --version 2>/dev/null || echo "")

    if [ -z "$version_output" ]; then
        echo ""
        return 1
    fi

    # Strip 'v' prefix and handle pre-release suffixes
    local version=$(echo "$version_output" | sed 's/^v//' | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')

    if [ -z "$version" ]; then
        echo ""
        return 1
    fi

    echo "$version"
    return 0
}

get_node_major_version() {
    local version=$1

    if [ -z "$version" ]; then
        echo "0"
        return
    fi

    echo "$version" | cut -d. -f1
}

get_npm_version() {
    if ! command -v npm &> /dev/null; then
        echo ""
        return 1
    fi

    local version=$(npm --version 2>/dev/null || echo "")

    if [ -z "$version" ]; then
        echo ""
        return 1
    fi

    echo "$version"
    return 0
}

get_npm_major_version() {
    local version=$1

    if [ -z "$version" ]; then
        echo "0"
        return
    fi

    echo "$version" | cut -d. -f1
}

get_docker_version() {
    if ! command -v docker &> /dev/null; then
        echo ""
        return 1
    fi

    local version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

    echo "$version"
    return 0
}

get_claude_cli_version() {
    if ! command -v claude &> /dev/null; then
        echo ""
        return 1
    fi

    # Try to get version - claude CLI may not have --version flag
    local version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "installed")

    echo "$version"
    return 0
}

# ============================================
# Node.js Installation
# ============================================

install_nodejs() {
    local platform=$(detect_platform)
    local pkg_manager=$(detect_package_manager)

    print_info "Attempting to auto-install Node.js v20 LTS via $pkg_manager..."

    case "$pkg_manager" in
        apt)
            # Debian/Ubuntu
            if ! curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; then
                print_error "Failed to add NodeSource repository"
                return 1
            fi

            if ! sudo apt-get install -y nodejs; then
                print_error "Failed to install Node.js. Permission denied. Try: sudo apt-get install nodejs"
                return 1
            fi
            ;;

        yum)
            # RHEL/CentOS
            if ! curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -; then
                print_error "Failed to add NodeSource repository"
                return 1
            fi

            if ! sudo yum install -y nodejs; then
                print_error "Failed to install Node.js. Permission denied. Try: sudo yum install nodejs"
                return 1
            fi
            ;;

        dnf)
            # Fedora
            if ! curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -; then
                print_error "Failed to add NodeSource repository"
                return 1
            fi

            if ! sudo dnf install -y nodejs; then
                print_error "Failed to install Node.js. Permission denied. Try: sudo dnf install nodejs"
                return 1
            fi
            ;;

        brew)
            # macOS Homebrew
            if ! brew install node@20; then
                print_error "Failed to install Node.js via Homebrew"
                return 1
            fi
            ;;

        *)
            print_error "No supported package manager found"
            print_error "Auto-installation failed. Please install manually: https://nodejs.org/en/download/"
            return 1
            ;;
    esac

    # Verify installation
    if ! command -v node &> /dev/null; then
        print_error "Node.js installation failed"
        print_error "Auto-installation failed. Please install manually: https://nodejs.org/en/download/"
        return 1
    fi

    local installed_version=$(get_node_version)
    local major_version=$(get_node_major_version "$installed_version")

    if [ "$major_version" -lt "$REQUIRED_NODE_VERSION" ]; then
        print_error "Installed Node.js v$installed_version is too old (required: v${REQUIRED_NODE_VERSION}+)"
        return 1
    fi

    print_success "Node.js v$installed_version installed successfully"
    return 0
}

# ============================================
# Prerequisite Checks
# ============================================

check_nodejs() {
    local node_version=$(get_node_version)

    if [ -z "$node_version" ]; then
        print_error "Node.js v${REQUIRED_NODE_VERSION}+ is required but not found. Install via: https://nodejs.org/en/download/"

        if [ "$AUTO_INSTALL" = "true" ]; then
            if install_nodejs; then
                return 0
            else
                return 1
            fi
        fi

        return 1
    fi

    local major_version=$(get_node_major_version "$node_version")

    if [ "$major_version" -lt "$REQUIRED_NODE_VERSION" ]; then
        print_error "Node.js v$node_version detected but v${REQUIRED_NODE_VERSION}+ is required"

        if [ "$AUTO_INSTALL" = "true" ]; then
            print_info "Upgrading Node.js to v20 LTS..."
            if install_nodejs; then
                return 0
            else
                return 1
            fi
        fi

        return 1
    fi

    print_success "Node.js v$node_version detected (required: v${REQUIRED_NODE_VERSION}+)"
    return 0
}

check_npm() {
    local npm_version=$(get_npm_version)

    if [ -z "$npm_version" ]; then
        print_error "npm v${REQUIRED_NPM_VERSION}+ is required but not found. Install Node.js (includes npm): https://nodejs.org/en/download/"
        return 1
    fi

    local major_version=$(get_npm_major_version "$npm_version")

    if [ "$major_version" -lt "$REQUIRED_NPM_VERSION" ]; then
        print_error "npm v$npm_version detected but v${REQUIRED_NPM_VERSION}+ is required"
        return 1
    fi

    print_success "npm v$npm_version detected (required: v${REQUIRED_NPM_VERSION}+)"
    return 0
}

check_claude_cli() {
    local claude_version=$(get_claude_cli_version)

    if [ -z "$claude_version" ]; then
        print_info "Claude Code CLI not found (optional)"
        echo -e "  ${BLUE}→${RESET} Claude Code CLI enables native MCP server installation"
        echo -e "  ${BLUE}→${RESET} Install: https://github.com/anthropics/claude-code"
        echo -e "  ${BLUE}→${RESET} MCPs provide enhanced capabilities (memory, browser automation, etc.)"
        return 0  # Claude CLI is optional, return success
    fi

    if [ "$claude_version" = "installed" ]; then
        print_success "Claude Code CLI detected (optional)"
    else
        print_success "Claude Code CLI v$claude_version detected (optional)"
    fi

    echo -e "  ${BLUE}→${RESET} MCP servers can be installed via Claude Code integration"
    return 0
}

check_docker() {
    local docker_version=$(get_docker_version)

    if [ -z "$docker_version" ]; then
        print_info "Docker not found (optional)"
        echo -e "  ${BLUE}→${RESET} Docker is only needed if using the Containerization MCP server"
        echo -e "  ${BLUE}→${RESET} All other MCPs work without Docker"
        echo -e "  ${BLUE}→${RESET} Install Docker if needed: https://docs.docker.com/get-docker/"
        return 0  # Docker is optional, return success
    fi

    print_success "Docker v$docker_version detected (optional)"
    echo -e "  ${BLUE}→${RESET} Containerization MCP server will be able to generate Docker files"
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

    # Check Node.js (required)
    if ! check_nodejs; then
        PREREQUISITES_MET=false
    fi

    # Check npm (required)
    if ! check_npm; then
        PREREQUISITES_MET=false
    fi

    # Check Claude CLI (optional, informational)
    check_claude_cli

    # Check Docker (optional, informational)
    check_docker

    echo ""
    echo "=========================================="

    if [ "$PREREQUISITES_MET" = "true" ]; then
        echo -e "${GREEN}✓ All required prerequisites met${RESET}"
        echo "=========================================="
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
