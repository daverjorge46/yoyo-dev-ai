#!/bin/bash

# Yoyo Dev v3.0 Global Launcher
# "Powerful when you need it. Invisible when you don't."
#
# This script can be symlinked to /usr/local/bin/yoyo
# It works from any directory and launches the project-local TUI

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BOLD='\033[1m'
readonly RESET='\033[0m'

# Version
readonly VERSION="3.0.0"

# ============================================================================
# Helper Functions
# ============================================================================

find_project_root() {
    # Find project root by looking for .yoyo-dev directory
    local current_dir
    current_dir="$(pwd)"

    while [ "$current_dir" != "/" ]; do
        if [ -d "$current_dir/.yoyo-dev" ]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done

    # Not found
    return 1
}

show_version() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev v${VERSION}${RESET}"
    echo "AI-Assisted Development Framework"
    echo ""
}

show_quick_help() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev v${VERSION}${RESET}"
    echo ""
    echo -e "${BOLD}Usage:${RESET}"
    echo -e "  ${GREEN}yoyo${RESET}              Launch TUI dashboard"
    echo -e "  ${GREEN}yoyo --help${RESET}       Show detailed command reference"
    echo -e "  ${GREEN}yoyo --version${RESET}    Show version"
    echo ""
    echo -e "${BOLD}Quick Commands:${RESET}"
    echo -e "  ${GREEN}/create-new${RESET}      Create feature spec + tasks"
    echo -e "  ${GREEN}/create-fix${RESET}      Fix bugs systematically"
    echo -e "  ${GREEN}/execute-tasks${RESET}   Build and ship code"
    echo ""
    echo -e "Run ${CYAN}yoyo --help${RESET} for detailed documentation"
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
        --help)
            # Delegate to project-local script for full help
            local project_root
            if project_root=$(find_project_root); then
                if [ -f "$project_root/.yoyo-dev/setup/yoyo.sh" ]; then
                    exec bash "$project_root/.yoyo-dev/setup/yoyo.sh" --help
                fi
            fi
            # Fallback to quick help
            show_quick_help
            exit 0
            ;;
        launch|*)
            # Find project root
            local project_root
            if ! project_root=$(find_project_root); then
                echo ""
                echo -e "${YELLOW}⚠️  Not in a Yoyo Dev project${RESET}"
                echo ""
                echo "You must run ${CYAN}yoyo${RESET} from within a project that has Yoyo Dev installed."
                echo ""
                echo "To install Yoyo Dev in the current project:"
                echo -e "  ${GREEN}git clone https://github.com/your-org/yoyo-dev .yoyo-dev${RESET}"
                echo ""
                exit 1
            fi

            # Launch project-local yoyo script
            if [ -f "$project_root/.yoyo-dev/setup/yoyo.sh" ]; then
                exec bash "$project_root/.yoyo-dev/setup/yoyo.sh" "$@"
            else
                echo ""
                echo -e "${RED}ERROR: Yoyo Dev installation corrupted${RESET}"
                echo ""
                echo "Missing: $project_root/.yoyo-dev/setup/yoyo.sh"
                echo ""
                echo "Please reinstall Yoyo Dev."
                echo ""
                exit 1
            fi
            ;;
    esac
}

main "$@"
