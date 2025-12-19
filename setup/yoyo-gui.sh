#!/bin/bash

# Yoyo Dev GUI Launcher
# Launches the browser-based Yoyo Dev dashboard
#
# Usage:
#   yoyo-gui              Launch GUI on default port (3456)
#   yoyo-gui --port 3000  Launch GUI on custom port
#   yoyo-gui --dev        Launch in development mode (hot reload)
#   yoyo-gui --no-open    Don't auto-open browser

set -euo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

# Yoyo Dev version
readonly VERSION="4.0.0"

# IMPORTANT: Save user's current working directory FIRST
readonly USER_PROJECT_DIR="$(pwd)"

# Determine script directory (resolve symlinks)
SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
YOYO_INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# GUI location
readonly GUI_DIR="$YOYO_INSTALL_DIR/gui"

# Default options
PORT=3456
DEV_MODE=false
OPEN_BROWSER=true

# ============================================================================
# Argument Parsing
# ============================================================================

show_help() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev GUI v${VERSION}${RESET}"
    echo ""
    echo -e "${BOLD}Usage:${RESET}"
    echo -e "  ${GREEN}yoyo-gui${RESET}                Launch browser-based dashboard"
    echo -e "  ${GREEN}yoyo-gui --port 8080${RESET}    Use custom port (default: 3456)"
    echo -e "  ${GREEN}yoyo-gui --dev${RESET}          Development mode (hot reload)"
    echo -e "  ${GREEN}yoyo-gui --no-open${RESET}      Don't auto-open browser"
    echo ""
    echo -e "${BOLD}Options:${RESET}"
    echo -e "  ${CYAN}-p, --port PORT${RESET}     Server port (default: 3456)"
    echo -e "  ${CYAN}-d, --dev${RESET}           Development mode with hot reload"
    echo -e "  ${CYAN}--no-open${RESET}           Don't automatically open browser"
    echo -e "  ${CYAN}-h, --help${RESET}          Show this help message"
    echo -e "  ${CYAN}-v, --version${RESET}       Show version"
    echo ""
    echo -e "${BOLD}Features:${RESET}"
    echo -e "  ${MAGENTA}*${RESET} Real-time project status dashboard"
    echo -e "  ${MAGENTA}*${RESET} Specifications and tasks viewer"
    echo -e "  ${MAGENTA}*${RESET} Memory system browser"
    echo -e "  ${MAGENTA}*${RESET} Skills and patterns library"
    echo -e "  ${MAGENTA}*${RESET} REST API for integrations"
    echo ""
    echo -e "${BOLD}Related Commands:${RESET}"
    echo -e "  ${GREEN}yoyo${RESET}           Launch TUI (terminal) + Claude split view"
    echo -e "  ${GREEN}yoyo --no-split${RESET} Launch TUI only"
    echo -e "  ${GREEN}yoyo-update${RESET}    Update Yoyo Dev installation"
    echo ""
}

show_version() {
    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev GUI v${VERSION}${RESET}"
    echo "Browser-based development dashboard"
    echo ""
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--version)
                show_version
                exit 0
                ;;
            -p|--port)
                PORT="$2"
                shift 2
                ;;
            -d|--dev)
                DEV_MODE=true
                shift
                ;;
            --no-open)
                OPEN_BROWSER=false
                shift
                ;;
            *)
                echo -e "${RED}Unknown option: $1${RESET}"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# ============================================================================
# Dependency Checks
# ============================================================================

check_node() {
    if ! command -v node &> /dev/null; then
        echo ""
        echo -e "${RED}ERROR: Node.js is not installed${RESET}"
        echo ""
        echo "Please install Node.js 18+ to use Yoyo Dev GUI:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
        echo "  sudo apt install -y nodejs"
        echo ""
        echo "Or use nvm:"
        echo "  nvm install 22"
        echo ""
        return 1
    fi

    # Check Node version (need 18+)
    local node_version
    node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt 18 ]; then
        echo ""
        echo -e "${YELLOW}WARNING: Node.js version $node_version detected${RESET}"
        echo "Yoyo Dev GUI requires Node.js 18 or higher"
        echo ""
        echo "Please upgrade Node.js:"
        echo "  nvm install 22"
        echo ""
        return 1
    fi

    return 0
}

check_gui_installed() {
    if [ ! -d "$GUI_DIR" ]; then
        echo ""
        echo -e "${RED}ERROR: GUI not found${RESET}"
        echo ""
        echo "Expected location: $GUI_DIR"
        echo ""
        echo "Please update your Yoyo Dev installation:"
        echo "  yoyo-update"
        echo ""
        return 1
    fi

    if [ ! -f "$GUI_DIR/package.json" ]; then
        echo ""
        echo -e "${RED}ERROR: GUI package.json not found${RESET}"
        echo ""
        echo "The GUI installation appears to be corrupted."
        echo "Please reinstall Yoyo Dev."
        echo ""
        return 1
    fi

    return 0
}

check_dependencies_installed() {
    if [ ! -d "$GUI_DIR/node_modules" ]; then
        return 1
    fi
    return 0
}

install_dependencies() {
    echo ""
    echo -e "${CYAN}Installing GUI dependencies...${RESET}"
    echo ""

    cd "$GUI_DIR"

    if command -v npm &> /dev/null; then
        npm install
    else
        echo -e "${RED}ERROR: npm not found${RESET}"
        return 1
    fi

    echo ""
    echo -e "${GREEN}Dependencies installed successfully${RESET}"
    echo ""
}

check_build_exists() {
    # Check if production build exists
    if [ -d "$GUI_DIR/dist/client" ] && [ -f "$GUI_DIR/dist/client/index.html" ]; then
        return 0
    fi
    return 1
}

build_gui() {
    echo ""
    echo -e "${CYAN}Building GUI for production...${RESET}"
    echo ""

    cd "$GUI_DIR"
    npm run build

    echo ""
    echo -e "${GREEN}Build completed successfully${RESET}"
    echo ""
}

# ============================================================================
# Project Detection
# ============================================================================

find_project_root() {
    local current_dir
    current_dir="$USER_PROJECT_DIR"

    while [ "$current_dir" != "/" ]; do
        if [ -d "$current_dir/.yoyo-dev" ]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done

    return 1
}

# ============================================================================
# Launch Functions
# ============================================================================

launch_dev() {
    local project_root="$1"

    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev GUI - Development Mode${RESET}"
    echo ""
    echo -e "  ${GREEN}Project:${RESET} $project_root"
    echo -e "  ${GREEN}Server:${RESET}  http://localhost:$PORT"
    echo -e "  ${GREEN}Mode:${RESET}    Development (hot reload)"
    echo ""
    echo -e "  ${DIM}Press Ctrl+C to stop${RESET}"
    echo ""

    cd "$GUI_DIR"

    # Set environment variables
    export YOYO_PROJECT_ROOT="$project_root"
    export PORT="$PORT"

    # Open browser if requested
    if [ "$OPEN_BROWSER" = true ]; then
        (sleep 2 && open_browser "http://localhost:$PORT") &
    fi

    # Run development server
    npm run dev
}

launch_production() {
    local project_root="$1"

    echo ""
    echo -e "${BOLD}${CYAN}Yoyo Dev GUI${RESET}"
    echo ""
    echo -e "  ${GREEN}Project:${RESET} $project_root"
    echo -e "  ${GREEN}Server:${RESET}  http://localhost:$PORT"
    echo -e "  ${GREEN}API:${RESET}     http://localhost:$PORT/api"
    echo ""
    echo -e "  ${DIM}Press Ctrl+C to stop${RESET}"
    echo ""

    cd "$GUI_DIR"

    # Set environment variables
    export YOYO_PROJECT_ROOT="$project_root"

    # Open browser if requested
    if [ "$OPEN_BROWSER" = true ]; then
        (sleep 1 && open_browser "http://localhost:$PORT") &
    fi

    # Run production server using tsx (direct TypeScript execution)
    if command -v npx &> /dev/null; then
        npx tsx server/index.ts
    else
        # Fallback to node with built files
        if [ -f "$GUI_DIR/dist/server/index.js" ]; then
            node dist/server/index.js
        else
            echo -e "${RED}ERROR: Cannot find server entry point${RESET}"
            echo "Try running: yoyo-gui --dev"
            exit 1
        fi
    fi
}

open_browser() {
    local url="$1"

    # Try different browser openers
    if command -v xdg-open &> /dev/null; then
        xdg-open "$url" 2>/dev/null &
    elif command -v open &> /dev/null; then
        open "$url" 2>/dev/null &
    elif command -v start &> /dev/null; then
        start "$url" 2>/dev/null &
    fi
}

# ============================================================================
# Main
# ============================================================================

main() {
    parse_args "$@"

    # Show branded header
    echo ""
    echo -e " ${CYAN}┌─────────────────────────────────────────────────────────────────┐${RESET}"
    echo -e " ${CYAN}│${RESET}  ${BOLD}YOYO DEV GUI${RESET} - Browser-based Development Dashboard       ${CYAN}│${RESET}"
    echo -e " ${CYAN}└─────────────────────────────────────────────────────────────────┘${RESET}"

    # Check Node.js
    if ! check_node; then
        exit 1
    fi

    # Check GUI installation
    if ! check_gui_installed; then
        exit 1
    fi

    # Find project root
    local project_root
    if ! project_root=$(find_project_root); then
        echo ""
        echo -e "${YELLOW}WARNING: Not in a Yoyo Dev project${RESET}"
        echo ""
        echo "The GUI will launch but some features may be limited."
        echo "Run from a project directory with .yoyo-dev for full functionality."
        echo ""
        project_root="$USER_PROJECT_DIR"
    fi

    # Install dependencies if needed
    if ! check_dependencies_installed; then
        echo ""
        echo -e "${YELLOW}GUI dependencies not installed${RESET}"
        read -p "Install now? [Y/n] " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            install_dependencies
        else
            echo "Cannot launch GUI without dependencies."
            exit 1
        fi
    fi

    # Launch appropriate mode
    if [ "$DEV_MODE" = true ]; then
        launch_dev "$project_root"
    else
        # For production, use tsx directly (faster startup, no build required)
        launch_production "$project_root"
    fi
}

main "$@"
