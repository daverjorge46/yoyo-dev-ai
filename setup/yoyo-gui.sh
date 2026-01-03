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

# Yoyo Dev version
readonly VERSION="6.2.0"

# IMPORTANT: Save user's current working directory FIRST
readonly USER_PROJECT_DIR="$(pwd)"

# Determine script directory (resolve symlinks)
SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
YOYO_INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to load UI library for branded output
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
    UI_LIBRARY_LOADED=true
else
    # Fallback colors
    UI_LIBRARY_LOADED=false
    CYAN='\033[0;36m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'

    # Map fallback colors to UI library names
    UI_PRIMARY="$CYAN"
    UI_SUCCESS="$GREEN"
    UI_WARNING="$YELLOW"
    UI_ERROR="$RED"
    UI_DIM="$DIM"
    UI_RESET="$RESET"
    UI_BOLD="$BOLD"
fi

# GUI location
readonly GUI_DIR="$YOYO_INSTALL_DIR/gui"

# Default options
PORT=3456
DEV_PORT=5173  # Vite dev server port
DEV_MODE=false
OPEN_BROWSER=true
BACKGROUND_MODE=false
BANNER_ENABLED=true
PROJECT_ROOT=""  # Explicit project root (when passed from yoyo.sh)

# PID file for background mode
get_pid_file() {
    echo "/tmp/yoyo-gui-$(echo "$USER_PROJECT_DIR" | md5sum | cut -d' ' -f1).pid"
}

# ============================================================================
# Utility Functions
# ============================================================================

# Check if output is going to a terminal (not piped/redirected)
is_interactive_terminal() {
    [ -t 1 ] && [ -t 2 ]
}

# ============================================================================
# Network Detection
# ============================================================================

get_network_ip() {
    # Try multiple methods to get the primary network IP
    local ip=""

    # Method 1: ip route (most reliable on Linux)
    if command -v ip &> /dev/null; then
        ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    fi

    # Method 2: hostname -I (fallback)
    if [ -z "$ip" ] && command -v hostname &> /dev/null; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    # Method 3: ifconfig (macOS/older systems)
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    fi

    echo "$ip"
}

# ============================================================================
# Argument Parsing
# ============================================================================

show_help() {
    echo ""
    echo -e "${UI_BOLD}${UI_PRIMARY}Yoyo Dev GUI v${VERSION}${UI_RESET}"
    echo ""
    echo -e "${UI_BOLD}Usage:${UI_RESET}"
    echo -e "  ${UI_SUCCESS}yoyo-gui${UI_RESET}                Launch browser-based dashboard (production)"
    echo -e "  ${UI_SUCCESS}yoyo-gui --dev${UI_RESET}          Development mode with hot reload (port 5173)"
    echo -e "  ${UI_SUCCESS}yoyo-gui --port 8080${UI_RESET}    Use custom port (production mode)"
    echo -e "  ${UI_SUCCESS}yoyo-gui --no-open${UI_RESET}      Don't auto-open browser"
    echo -e "  ${UI_SUCCESS}yoyo-gui --no-banner${UI_RESET}    Skip branded banner (for CI/scripts)"
    echo -e "  ${UI_SUCCESS}yoyo-gui --background${UI_RESET}   Run in background"
    echo ""
    echo -e "${UI_BOLD}Options:${UI_RESET}"
    echo -e "  ${UI_PRIMARY}-d, --dev${UI_RESET}           Development mode with hot reload (port 5173)"
    echo -e "  ${UI_PRIMARY}-p, --port PORT${UI_RESET}     Server port for production mode (default: 3456)"
    echo -e "  ${UI_PRIMARY}--no-open${UI_RESET}           Don't automatically open browser"
    echo -e "  ${UI_PRIMARY}--no-banner${UI_RESET}         Skip branded startup banner"
    echo -e "  ${UI_PRIMARY}--background${UI_RESET}        Run server in background (for yoyo integration)"
    echo -e "  ${UI_PRIMARY}--stop${UI_RESET}              Stop background GUI server"
    echo -e "  ${UI_PRIMARY}--status${UI_RESET}            Check if GUI server is running"
    echo -e "  ${UI_PRIMARY}-h, --help${UI_RESET}          Show this help message"
    echo -e "  ${UI_PRIMARY}-v, --version${UI_RESET}       Show version"
    echo ""
    echo -e "${UI_BOLD}Features:${UI_RESET}"
    echo -e "  ${MAGENTA:-$UI_PRIMARY}*${UI_RESET} Real-time project status dashboard"
    echo -e "  ${MAGENTA:-$UI_PRIMARY}*${UI_RESET} Specifications and tasks viewer"
    echo -e "  ${MAGENTA:-$UI_PRIMARY}*${UI_RESET} Memory system browser"
    echo -e "  ${MAGENTA:-$UI_PRIMARY}*${UI_RESET} Skills and patterns library"
    echo -e "  ${MAGENTA:-$UI_PRIMARY}*${UI_RESET} REST API for integrations"
    echo ""
    echo -e "${UI_BOLD}Related Commands:${UI_RESET}"
    echo -e "  ${UI_SUCCESS}yoyo${UI_RESET}             Launch Claude Code + GUI (dev mode on port 5173)"
    echo -e "  ${UI_SUCCESS}yoyo --no-gui${UI_RESET}    Launch Claude Code without GUI"
    echo -e "  ${UI_SUCCESS}yoyo-update${UI_RESET}      Update Yoyo Dev installation"
    echo ""
}

show_version() {
    echo ""
    echo -e "${UI_BOLD}${UI_PRIMARY}Yoyo Dev GUI v${VERSION}${UI_RESET}"
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
            --no-banner)
                BANNER_ENABLED=false
                shift
                ;;
            --background|-b)
                BACKGROUND_MODE=true
                shift
                ;;
            --stop)
                stop_background_gui
                exit 0
                ;;
            --status)
                show_gui_status
                exit 0
                ;;
            --project-root)
                PROJECT_ROOT="$2"
                shift 2
                ;;
            *)
                echo -e "${UI_ERROR}Unknown option: $1${UI_RESET}"
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
        echo -e "${UI_ERROR}ERROR: Node.js is not installed${UI_RESET}"
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
        echo -e "${UI_WARNING}WARNING: Node.js version $node_version detected${UI_RESET}"
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
        echo -e "${UI_ERROR}ERROR: GUI not found${UI_RESET}"
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
        echo -e "${UI_ERROR}ERROR: GUI package.json not found${UI_RESET}"
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
    echo -e "${UI_PRIMARY}Installing GUI dependencies...${UI_RESET}"
    echo ""

    cd "$GUI_DIR"

    if command -v npm &> /dev/null; then
        npm install
    else
        echo -e "${UI_ERROR}ERROR: npm not found${UI_RESET}"
        return 1
    fi

    echo ""
    echo -e "${UI_SUCCESS}Dependencies installed successfully${UI_RESET}"
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
    echo -e "${UI_PRIMARY}Building GUI for production...${UI_RESET}"
    echo ""

    cd "$GUI_DIR"
    npm run build

    echo ""
    echo -e "${UI_SUCCESS}Build completed successfully${UI_RESET}"
    echo ""
}

# ============================================================================
# Background Mode Functions
# ============================================================================

is_gui_running() {
    local pid_file
    pid_file=$(get_pid_file)

    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    return 1
}

stop_background_gui() {
    local pid_file
    pid_file=$(get_pid_file)

    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo -e "${UI_WARNING}Stopping GUI server (PID: $pid)...${UI_RESET}"
            kill "$pid" 2>/dev/null || true
            sleep 1
            # Force kill if still running
            kill -9 "$pid" 2>/dev/null || true
            rm -f "$pid_file"
            echo -e "${UI_SUCCESS}GUI server stopped${UI_RESET}"
        else
            rm -f "$pid_file"
            echo -e "${UI_DIM}GUI server not running${UI_RESET}"
        fi
    else
        echo -e "${UI_DIM}GUI server not running${UI_RESET}"
    fi
}

show_gui_status() {
    local pid_file
    pid_file=$(get_pid_file)

    if is_gui_running; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null)
        local network_ip
        network_ip=$(get_network_ip)
        echo ""
        echo -e "${UI_SUCCESS}GUI server is running${UI_RESET}"
        echo "   PID: $pid"
        # Check if dev mode is likely running by checking for Vite process
        if pgrep -f "vite" > /dev/null 2>&1; then
            echo -e "   Local:   ${UI_PRIMARY}http://localhost:$DEV_PORT${UI_RESET} (dev mode)"
            if [ -n "$network_ip" ]; then
                echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:$DEV_PORT${UI_RESET}"
            fi
        else
            echo -e "   Local:   ${UI_PRIMARY}http://localhost:$PORT${UI_RESET}"
            if [ -n "$network_ip" ]; then
                echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:$PORT${UI_RESET}"
            fi
        fi
        echo ""
    else
        echo ""
        echo -e "${UI_DIM}GUI server is not running${UI_RESET}"
        echo ""
    fi
}

# Kill any existing GUI server on the API port (regardless of project)
# This ensures we don't have stale servers from other projects blocking the port
kill_existing_on_port() {
    local port="$1"
    local existing_pid

    # Find process listening on the port
    existing_pid=$(lsof -ti ":$port" 2>/dev/null | head -1 || true)

    if [ -n "$existing_pid" ]; then
        echo -e "${UI_DIM}Stopping existing server on port $port (PID: $existing_pid)...${UI_RESET}"
        kill "$existing_pid" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        kill -9 "$existing_pid" 2>/dev/null || true
        # Clean up any stale PID files
        rm -f /tmp/yoyo-gui-*.pid 2>/dev/null || true
    fi
}

launch_background() {
    local project_root="$1"
    local pid_file
    pid_file=$(get_pid_file)

    # Check if already running FOR THIS PROJECT
    if is_gui_running; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null)
        echo -e "${UI_DIM}GUI already running (PID: $pid)${UI_RESET}"
        return 0
    fi

    # Kill any existing server on our ports (may be from different project)
    kill_existing_on_port "$PORT"

    # In dev mode, also kill any existing Vite dev server on port 5173
    if [ "$DEV_MODE" = true ]; then
        kill_existing_on_port "$DEV_PORT"
    fi

    cd "$GUI_DIR"

    # Set environment variables
    export YOYO_PROJECT_ROOT="$project_root"
    export PORT="$PORT"

    # Create log file
    local log_file="/tmp/yoyo-gui.log"

    local network_ip
    network_ip=$(get_network_ip)

    if [ "$DEV_MODE" = true ]; then
        # Dev mode: run npm run dev in background
        # This starts both Vite (5173) and API server concurrently
        nohup npm run dev > "$log_file" 2>&1 &
        local server_pid=$!
        echo "$server_pid" > "$pid_file"

        # Wait a bit longer for dev mode to start (npm needs time)
        sleep 3

        if is_gui_running; then
            echo -e "${UI_SUCCESS}GUI (dev mode) started${UI_RESET}"
            echo -e "   Local:   ${UI_PRIMARY}http://localhost:$DEV_PORT${UI_RESET}"
            if [ -n "$network_ip" ]; then
                echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:$DEV_PORT${UI_RESET}"
            fi

            # Open browser if requested
            if [ "$OPEN_BROWSER" = true ]; then
                sleep 1
                open_browser "http://localhost:$DEV_PORT"
            fi
            return 0
        else
            echo -e "${UI_ERROR}Failed to start GUI dev server${UI_RESET}"
            echo "   Check log: $log_file"
            rm -f "$pid_file"
            return 1
        fi
    else
        # Production mode: run tsx server directly
        nohup npx tsx server/index.ts > "$log_file" 2>&1 &
        local server_pid=$!
        echo "$server_pid" > "$pid_file"

        # Wait a moment to check if it started
        sleep 2

        if is_gui_running; then
            echo -e "${UI_SUCCESS}GUI started${UI_RESET}"
            echo -e "   Local:   ${UI_PRIMARY}http://localhost:$PORT${UI_RESET}"
            if [ -n "$network_ip" ]; then
                echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:$PORT${UI_RESET}"
            fi

            # Open browser if requested
            if [ "$OPEN_BROWSER" = true ]; then
                sleep 1
                open_browser "http://localhost:$PORT"
            fi
            return 0
        else
            echo -e "${UI_ERROR}Failed to start GUI server${UI_RESET}"
            echo "   Check log: $log_file"
            rm -f "$pid_file"
            return 1
        fi
    fi
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
    local DEV_CLIENT_PORT=5173  # Vite dev server port
    local network_ip
    network_ip=$(get_network_ip)

    # Show branded banner (if enabled, terminal is interactive, and UI library loaded)
    if [ "$BANNER_ENABLED" = true ] && is_interactive_terminal && [ "$UI_LIBRARY_LOADED" = true ]; then
        ui_yoyo_banner "v${VERSION}"
    else
        echo ""
        echo -e "${UI_BOLD}${UI_PRIMARY}Yoyo Dev GUI - Development Mode${UI_RESET}"
    fi

    echo ""
    echo -e "  ${UI_SUCCESS}Project:${UI_RESET}  $project_root"
    echo -e "  ${UI_SUCCESS}Frontend:${UI_RESET} http://localhost:${DEV_CLIENT_PORT}"
    if [ -n "$network_ip" ]; then
        echo -e "  ${UI_SUCCESS}Network:${UI_RESET}  http://${network_ip}:${DEV_CLIENT_PORT}"
    fi
    echo -e "  ${UI_SUCCESS}API:${UI_RESET}      http://localhost:${PORT}"
    echo -e "  ${UI_SUCCESS}Mode:${UI_RESET}     Development (hot reload)"
    echo ""
    echo -e "  ${UI_DIM}Press Ctrl+C to stop${UI_RESET}"
    echo ""

    cd "$GUI_DIR"

    # Set environment variables
    export YOYO_PROJECT_ROOT="$project_root"
    export PORT="$PORT"

    # Open browser to Vite dev server (not API server)
    if [ "$OPEN_BROWSER" = true ]; then
        (sleep 3 && open_browser "http://localhost:${DEV_CLIENT_PORT}") &
    fi

    # Run development server (concurrently runs both backend and frontend)
    npm run dev
}

launch_production() {
    local project_root="$1"

    cd "$GUI_DIR"

    # Check if client build exists
    if [ ! -d "$GUI_DIR/dist/client" ] || [ ! -f "$GUI_DIR/dist/client/index.html" ]; then
        echo ""
        echo -e "${UI_WARNING}GUI client not built yet${UI_RESET}"
        echo ""
        echo "Options:"
        echo "  1. Build now (takes ~30 seconds)"
        echo "  2. Run in development mode (hot reload)"
        echo "  3. Cancel"
        echo ""
        read -p "Choice [1/2/3]: " -n 1 -r
        echo ""

        case $REPLY in
            1)
                echo ""
                echo -e "${UI_PRIMARY}Building GUI client...${UI_RESET}"
                npm run build:client
                echo ""
                ;;
            2)
                echo ""
                launch_dev "$project_root"
                return
                ;;
            *)
                echo "Cancelled."
                exit 0
                ;;
        esac
    fi

    local network_ip
    network_ip=$(get_network_ip)

    # Show branded banner (if enabled, terminal is interactive, and UI library loaded)
    if [ "$BANNER_ENABLED" = true ] && is_interactive_terminal && [ "$UI_LIBRARY_LOADED" = true ]; then
        ui_yoyo_banner "v${VERSION}"
    else
        echo ""
        echo -e "${UI_BOLD}${UI_PRIMARY}Yoyo Dev GUI${UI_RESET}"
    fi

    echo ""
    echo -e "  ${UI_SUCCESS}Project:${UI_RESET} $project_root"
    echo -e "  ${UI_SUCCESS}Server:${UI_RESET}  http://localhost:$PORT"
    if [ -n "$network_ip" ]; then
        echo -e "  ${UI_SUCCESS}Network:${UI_RESET} http://${network_ip}:$PORT"
    fi
    echo -e "  ${UI_SUCCESS}API:${UI_RESET}     http://localhost:$PORT/api"
    echo ""
    echo -e "  ${UI_DIM}Press Ctrl+C to stop${UI_RESET}"
    echo ""

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
            echo -e "${UI_ERROR}ERROR: Cannot find server entry point${UI_RESET}"
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

    # Show branded header (skip in background mode for cleaner output)
    if [ "$BACKGROUND_MODE" != true ] && [ "$BANNER_ENABLED" != true ]; then
        # Simple header when banner is disabled
        echo ""
        echo -e " ${UI_PRIMARY}Yoyo Dev GUI${UI_RESET} - Browser-based Development Dashboard"
    fi

    # Check Node.js
    if ! check_node; then
        exit 1
    fi

    # Check GUI installation
    if ! check_gui_installed; then
        exit 1
    fi

    # Find project root (use explicit if provided, otherwise detect)
    local project_root
    if [ -n "$PROJECT_ROOT" ]; then
        # Explicit project root provided (from yoyo.sh)
        project_root="$PROJECT_ROOT"
    elif ! project_root=$(find_project_root); then
        echo ""
        echo -e "${UI_WARNING}WARNING: Not in a Yoyo Dev project${UI_RESET}"
        echo ""
        echo "The GUI will launch but some features may be limited."
        echo "Run from a project directory with .yoyo-dev for full functionality."
        echo ""
        project_root="$USER_PROJECT_DIR"
    fi

    # Install dependencies if needed
    if ! check_dependencies_installed; then
        if [ "$BACKGROUND_MODE" = true ]; then
            # Auto-install in background mode
            echo -e "${UI_DIM}Installing GUI dependencies...${UI_RESET}"
            install_dependencies || {
                echo -e "${UI_ERROR}Failed to install dependencies${UI_RESET}"
                exit 1
            }
        else
            echo ""
            echo -e "${UI_WARNING}GUI dependencies not installed${UI_RESET}"
            read -p "Install now? [Y/n] " -n 1 -r
            echo ""

            if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
                install_dependencies
            else
                echo "Cannot launch GUI without dependencies."
                exit 1
            fi
        fi
    fi

    # Launch appropriate mode
    if [ "$BACKGROUND_MODE" = true ]; then
        # Background mode - start and return immediately
        launch_background "$project_root"
    elif [ "$DEV_MODE" = true ]; then
        launch_dev "$project_root"
    else
        # For production, use tsx directly (faster startup, no build required)
        launch_production "$project_root"
    fi
}

main "$@"
