#!/bin/bash

# Yoyo Dev GUI Global Launcher
# This script can be symlinked to /usr/local/bin/yoyo-gui
# It delegates to the base installation's yoyo-gui.sh

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

# Version
readonly VERSION="4.0.0"

# ============================================================================
# Helper Functions
# ============================================================================

find_base_installation() {
    # Check common locations for Yoyo Dev base installation
    local locations=(
        "$HOME/yoyo-dev"
        "$HOME/.yoyo-dev"
        "/opt/yoyo-dev"
    )

    for loc in "${locations[@]}"; do
        if [ -f "$loc/setup/yoyo-gui.sh" ]; then
            echo "$loc"
            return 0
        fi
    done

    # Check if script was symlinked from installation
    local script_path="${BASH_SOURCE[0]}"
    if [ -L "$script_path" ]; then
        local resolved
        resolved="$(readlink -f "$script_path")"
        local install_dir
        install_dir="$(dirname "$(dirname "$resolved")")"
        if [ -f "$install_dir/setup/yoyo-gui.sh" ]; then
            echo "$install_dir"
            return 0
        fi
    fi

    return 1
}

show_version() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev GUI v${VERSION}${RESET}"
    echo "Browser-based development dashboard"
    echo ""
}

show_quick_help() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev GUI v${VERSION}${RESET}"
    echo ""
    echo -e "${BOLD}Usage:${RESET}"
    echo -e "  ${GREEN}yoyo-gui${RESET}              Launch browser dashboard"
    echo -e "  ${GREEN}yoyo-gui --port 8080${RESET}  Use custom port (default: 3456)"
    echo -e "  ${GREEN}yoyo-gui --dev${RESET}        Development mode"
    echo -e "  ${GREEN}yoyo-gui --help${RESET}       Show detailed help"
    echo ""
    echo -e "${BOLD}Related Commands:${RESET}"
    echo -e "  ${GREEN}yoyo${RESET}           TUI dashboard + Claude"
    echo -e "  ${GREEN}yoyo-update${RESET}    Update installation"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    local mode="${1:-launch}"

    case "$mode" in
        --version|-v)
            show_version
            exit 0
            ;;
        -h)
            show_quick_help
            exit 0
            ;;
    esac

    # Find base installation
    local base_dir
    if ! base_dir=$(find_base_installation); then
        echo ""
        echo -e "${RED}ERROR: Yoyo Dev base installation not found${RESET}"
        echo ""
        echo "Expected locations:"
        echo "  ~/yoyo-dev/"
        echo "  ~/.yoyo-dev/"
        echo ""
        echo "Please install Yoyo Dev first:"
        echo "  git clone https://github.com/daverjorge46/yoyo-dev-ai ~/yoyo-dev"
        echo ""
        exit 1
    fi

    # Delegate to base installation's yoyo-gui.sh
    if [ -f "$base_dir/setup/yoyo-gui.sh" ]; then
        exec bash "$base_dir/setup/yoyo-gui.sh" "$@"
    else
        echo ""
        echo -e "${RED}ERROR: yoyo-gui.sh not found in base installation${RESET}"
        echo ""
        echo "Please update Yoyo Dev:"
        echo "  yoyo-update"
        echo ""
        exit 1
    fi
}

main "$@"
