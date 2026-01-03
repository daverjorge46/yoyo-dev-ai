#!/bin/bash

# Ralph Auto-Installation Script for Yoyo Dev
# Installs Ralph from GitHub and configures for use with Yoyo Dev

set -euo pipefail

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Try to load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    # Fallback colors
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_YELLOW='\033[1;33m'
    UI_DIM='\033[2m'
    UI_RESET='\033[0m'
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_YELLOW}⚠${UI_RESET} $1"; }
fi

# ============================================================================
# Configuration
# ============================================================================

RALPH_REPO="https://github.com/frankbria/ralph-claude-code.git"
RALPH_BRANCH="main"
TEMP_DIR="/tmp/ralph-install-$$"
FORCE=false
SKIP_PROMPT=false

# ============================================================================
# Argument Parsing
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=true
            shift
            ;;
        --yes|-y)
            SKIP_PROMPT=true
            shift
            ;;
        --help|-h)
            echo ""
            echo "Ralph Installation Script for Yoyo Dev"
            echo ""
            echo "Usage: ralph-setup.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force, -f    Force reinstall even if already installed"
            echo "  --yes, -y      Skip confirmation prompt"
            echo "  --help, -h     Show this help"
            echo ""
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_prerequisites() {
    local missing=()

    # Check git
    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi

    # Check bash version (4.0+ required)
    if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
        ui_error "Bash 4.0+ required (found ${BASH_VERSION})"
        exit 1
    fi

    # Check Claude Code CLI
    if ! command -v claude &> /dev/null; then
        ui_warning "Claude Code CLI not found - Ralph requires it"
        missing+=("claude")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        ui_error "Missing prerequisites: ${missing[*]}"
        echo ""
        echo "  Please install the following:"
        for pkg in "${missing[@]}"; do
            echo "    - $pkg"
        done
        echo ""
        exit 1
    fi

    ui_success "Prerequisites check passed"
}

check_already_installed() {
    if command -v ralph &> /dev/null; then
        if [ "$FORCE" = true ]; then
            ui_warning "Ralph already installed, forcing reinstall..."
            return 1
        else
            local version
            version=$(ralph --version 2>/dev/null || echo "unknown")
            ui_success "Ralph already installed: $version"
            echo ""
            echo "  Use --force to reinstall"
            echo ""
            exit 0
        fi
    fi
    return 1
}

# ============================================================================
# Installation
# ============================================================================

clone_ralph() {
    ui_info "Cloning Ralph repository..."

    # Clean up any existing temp directory
    rm -rf "$TEMP_DIR"

    if git clone --depth 1 --branch "$RALPH_BRANCH" "$RALPH_REPO" "$TEMP_DIR" 2>/dev/null; then
        ui_success "Repository cloned"
    else
        ui_error "Failed to clone Ralph repository"
        exit 1
    fi
}

run_ralph_installer() {
    ui_info "Running Ralph installer..."

    cd "$TEMP_DIR"

    if [ -f "install.sh" ]; then
        chmod +x install.sh
        if ./install.sh; then
            ui_success "Ralph installed successfully"
        else
            ui_error "Ralph installation failed"
            cleanup
            exit 1
        fi
    else
        ui_error "Ralph install.sh not found"
        cleanup
        exit 1
    fi
}

cleanup() {
    ui_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    ui_success "Cleanup complete"
}

verify_installation() {
    ui_info "Verifying installation..."

    if command -v ralph &> /dev/null; then
        local version
        version=$(ralph --version 2>/dev/null || echo "installed")
        ui_success "Ralph verified: $version"
        return 0
    else
        ui_error "Ralph command not found after installation"
        echo ""
        echo "  You may need to restart your shell or add Ralph to your PATH"
        echo ""
        return 1
    fi
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo ""
    echo -e "${UI_PRIMARY}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
    echo -e "${UI_PRIMARY}│${UI_RESET}                 ${UI_SUCCESS}RALPH INSTALLATION${UI_RESET}                            ${UI_PRIMARY}│${UI_RESET}"
    echo -e "${UI_PRIMARY}│${UI_RESET}          ${UI_DIM}Autonomous Development for Yoyo Dev${UI_RESET}                 ${UI_PRIMARY}│${UI_RESET}"
    echo -e "${UI_PRIMARY}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Check if already installed
    if check_already_installed; then
        exit 0
    fi

    # Confirm installation
    if [ "$SKIP_PROMPT" = false ]; then
        echo ""
        echo "  This will install Ralph from:"
        echo -e "    ${UI_PRIMARY}$RALPH_REPO${UI_RESET}"
        echo ""
        echo -n "  Continue? [Y/n]: "
        read -r confirm
        confirm="${confirm:-Y}"

        if [[ ! "$confirm" =~ ^[Yy] ]]; then
            ui_info "Installation cancelled"
            exit 0
        fi
    fi

    echo ""

    # Run installation
    clone_ralph
    run_ralph_installer
    cleanup

    # Verify
    if verify_installation; then
        echo ""
        echo -e "${UI_SUCCESS}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
        echo -e "${UI_SUCCESS}│${UI_RESET}              ${UI_SUCCESS}INSTALLATION COMPLETE${UI_RESET}                          ${UI_SUCCESS}│${UI_RESET}"
        echo -e "${UI_SUCCESS}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
        echo ""
        echo "  You can now use --ralph flag with Yoyo Dev commands:"
        echo ""
        echo -e "    ${UI_PRIMARY}/execute-tasks --ralph${UI_RESET}"
        echo -e "    ${UI_PRIMARY}/create-spec --ralph${UI_RESET}"
        echo -e "    ${UI_PRIMARY}/create-fix --ralph${UI_RESET}"
        echo ""
        echo "  For monitoring dashboard, use:"
        echo ""
        echo -e "    ${UI_PRIMARY}/execute-tasks --ralph --ralph-monitor${UI_RESET}"
        echo ""
    else
        exit 1
    fi
}

main "$@"
