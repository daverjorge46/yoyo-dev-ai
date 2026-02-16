#!/bin/bash

# Yoyo Dev GUI Launcher
# Launches the browser-based Yoyo Dev or Yoyo AI dashboard
#
# Usage:
#   yoyo-gui              Launch Yoyo Dev GUI (port 5173)
#   yoyo-gui --dev        Launch Yoyo Dev GUI (port 5173)
#   yoyo-gui --ai         Launch Yoyo AI GUI (port 5174)
#   yoyo-gui --no-open    Don't auto-open browser
#
# Note: The script automatically kills any existing process on the target port

set -euo pipefail

# Yoyo Dev version
readonly VERSION="7.0.0"

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

# GUI locations
readonly GUI_DEV_DIR="$YOYO_INSTALL_DIR/gui"
readonly GUI_AI_DIR="$YOYO_INSTALL_DIR/gui-ai"

# Default options
DEV_MODE=false
AI_MODE=false
OPEN_BROWSER=false
BACKGROUND_MODE=false
BANNER_ENABLED=true
PROJECT_ROOT=""  # Explicit project root (when passed from yoyo.sh)

# Ports (set dynamically based on mode)
# yoyo-dev: 5173 (dev), 3456 (prod)
# yoyo-ai:  5174 (dev), 3457 (prod)

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
    echo -e "${UI_BOLD}${UI_PRIMARY}Yoyo GUI Launcher v${VERSION}${UI_RESET}"
    echo ""
    echo -e "${UI_BOLD}Usage:${UI_RESET}"
    echo -e "  ${UI_SUCCESS}yoyo-gui${UI_RESET}           Launch Yoyo Dev GUI (port 5173)"
    echo -e "  ${UI_SUCCESS}yoyo-gui --dev${UI_RESET}     Launch Yoyo Dev GUI (port 5173)"
    echo -e "  ${UI_SUCCESS}yoyo-gui --ai${UI_RESET}      Launch Yoyo AI GUI (port 5174)"
    echo ""
    echo -e "${UI_BOLD}Options:${UI_RESET}"
    echo -e "  ${UI_PRIMARY}--dev${UI_RESET}               Launch Yoyo Dev GUI (default)"
    echo -e "  ${UI_PRIMARY}--ai${UI_RESET}                Launch Yoyo AI GUI instead of Yoyo Dev"
    echo -e "  ${UI_PRIMARY}--stop${UI_RESET}              Stop background GUI server"
    echo -e "  ${UI_PRIMARY}--status${UI_RESET}            Check if GUI server is running"
    echo -e "  ${UI_PRIMARY}--no-open${UI_RESET}           Don't automatically open browser"
    echo -e "  ${UI_PRIMARY}--background${UI_RESET}        Run server in background"
    echo -e "  ${UI_PRIMARY}-h, --help${UI_RESET}          Show this help message"
    echo -e "  ${UI_PRIMARY}-v, --version${UI_RESET}       Show version"
    echo ""
    echo -e "${UI_BOLD}GUIs:${UI_RESET}"
    echo -e "  ${UI_PRIMARY}Yoyo Dev${UI_RESET}  Development dashboard (specs, tasks, roadmap) - port 5173"
    echo -e "  ${UI_PRIMARY}Yoyo AI${UI_RESET}   AI Assistant dashboard (chat, memory, skills) - port 5174"
    echo ""
    echo -e "${UI_BOLD}Related Commands:${UI_RESET}"
    echo -e "  ${UI_SUCCESS}yoyo-dev${UI_RESET}       Launch Claude Code + Yoyo Dev GUI"
    echo -e "  ${UI_SUCCESS}yoyo-ai${UI_RESET}        Launch Yoyo AI Assistant + GUI"
    echo -e "  ${UI_SUCCESS}yoyo-update${UI_RESET}    Update Yoyo Dev installation"
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
            --ai)
                AI_MODE=true
                shift
                ;;
            --dev)
                # Explicit flag for Yoyo Dev GUI (default behavior, but allows explicit usage)
                AI_MODE=false
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

# Get the appropriate GUI directory based on mode
get_gui_dir() {
    if [ "$AI_MODE" = true ]; then
        echo "$GUI_AI_DIR"
    else
        echo "$GUI_DEV_DIR"
    fi
}

# Get mode name for display
get_mode_name() {
    if [ "$AI_MODE" = true ]; then
        echo "Yoyo AI"
    else
        echo "Yoyo Dev"
    fi
}

# Get ports based on mode
get_dev_port() {
    if [ "$AI_MODE" = true ]; then
        echo "5174"
    else
        echo "5173"
    fi
}

get_prod_port() {
    if [ "$AI_MODE" = true ]; then
        echo "3457"
    else
        echo "3456"
    fi
}

check_gui_installed() {
    local gui_dir
    gui_dir=$(get_gui_dir)
    local mode_name
    mode_name=$(get_mode_name)

    if [ ! -d "$gui_dir" ]; then
        echo ""
        echo -e "${UI_ERROR}ERROR: ${mode_name} GUI not found${UI_RESET}"
        echo ""
        echo "Expected location: $gui_dir"
        echo ""
        echo "Please update your Yoyo Dev installation:"
        echo "  yoyo-update"
        echo ""
        return 1
    fi

    if [ ! -f "$gui_dir/package.json" ]; then
        echo ""
        echo -e "${UI_ERROR}ERROR: ${mode_name} GUI package.json not found${UI_RESET}"
        echo ""
        echo "The GUI installation appears to be corrupted."
        echo "Please reinstall Yoyo Dev."
        echo ""
        return 1
    fi

    return 0
}

check_dependencies_installed() {
    local gui_dir
    gui_dir=$(get_gui_dir)

    if [ ! -d "$gui_dir/node_modules" ]; then
        return 1
    fi
    return 0
}

install_dependencies() {
    local gui_dir
    gui_dir=$(get_gui_dir)
    local mode_name
    mode_name=$(get_mode_name)

    echo ""
    echo -e "${UI_PRIMARY}Installing ${mode_name} GUI dependencies...${UI_RESET}"
    echo ""

    cd "$gui_dir"

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
            # PID is alive, but also verify the dev port is actually listening
            # (the Vite client can die while the parent process stays alive)
            local dev_port
            dev_port=$(get_dev_port)
            if command -v ss &>/dev/null; then
                if ss -tlnH "sport = :${dev_port}" 2>/dev/null | grep -q "${dev_port}"; then
                    return 0
                fi
            elif command -v lsof &>/dev/null; then
                if lsof -ti ":${dev_port}" &>/dev/null; then
                    return 0
                fi
            else
                # Can't verify port, trust the PID
                return 0
            fi
            # PID alive but port not listening - stale/broken state
            # Kill the orphaned process tree and clean up
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
            rm -f "$pid_file"
            return 1
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

# Kill any existing process on the specified port (regardless of project)
# This ensures we don't have stale servers from other projects blocking the port
kill_existing_on_port() {
    local port="$1"
    local pids=""

    # Method 1: lsof (most common)
    if command -v lsof &> /dev/null; then
        pids=$(lsof -ti ":$port" 2>/dev/null || true)
    fi

    # Method 2: fuser (fallback)
    if [ -z "$pids" ] && command -v fuser &> /dev/null; then
        pids=$(fuser "$port/tcp" 2>/dev/null | tr -s ' ' '\n' | grep -v '^$' || true)
    fi

    # Method 3: ss + awk (fallback)
    if [ -z "$pids" ] && command -v ss &> /dev/null; then
        pids=$(ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
    fi

    if [ -n "$pids" ]; then
        for pid in $pids; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo -e "${UI_DIM}Killing process on port $port (PID: $pid)...${UI_RESET}"
                kill "$pid" 2>/dev/null || true
            fi
        done

        # Wait a moment for graceful shutdown
        sleep 1

        # Force kill any remaining processes
        for pid in $pids; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo -e "${UI_DIM}Force killing PID $pid...${UI_RESET}"
                kill -9 "$pid" 2>/dev/null || true
            fi
        done

        # Wait for port to be released
        local max_wait=5
        local waited=0
        while [ $waited -lt $max_wait ]; do
            if ! lsof -ti ":$port" &>/dev/null && ! fuser "$port/tcp" &>/dev/null 2>&1; then
                break
            fi
            sleep 1
            waited=$((waited + 1))
        done

        # Clean up any stale PID files
        rm -f /tmp/yoyo-gui-*.pid 2>/dev/null || true
    fi
}

launch_background() {
    local project_root="$1"
    local pid_file
    pid_file=$(get_pid_file)

    local gui_dir mode_name dev_port prod_port
    gui_dir=$(get_gui_dir)
    mode_name=$(get_mode_name)
    dev_port=$(get_dev_port)
    prod_port=$(get_prod_port)

    # Check if already running FOR THIS PROJECT
    if is_gui_running; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null)
        echo -e "${UI_DIM}${mode_name} GUI already running (PID: $pid)${UI_RESET}"
        return 0
    fi

    # Kill any existing server on our ports
    kill_existing_on_port "$prod_port"
    kill_existing_on_port "$dev_port"

    cd "$gui_dir"

    # Set environment variables
    export YOYO_PROJECT_ROOT="$project_root"
    export PORT="$prod_port"

    # Export gateway token for gui-ai server (reads from ~/.yoyo-claw)
    if [ "$AI_MODE" = true ]; then
        local token_file="${HOME}/.yoyo-claw/.gateway-token"
        # Fall back to legacy paths
        [ ! -f "$token_file" ] && token_file="${HOME}/.yoyo-ai/.gateway-token"
        [ ! -f "$token_file" ] && token_file="${HOME}/.openclaw/.gateway-token"
        if [ -f "$token_file" ]; then
            export YOYO_CLAW_GATEWAY_TOKEN="$(cat "$token_file")"
            export OPENCLAW_GATEWAY_TOKEN="$YOYO_CLAW_GATEWAY_TOKEN"
        fi
    fi

    # Create log file
    local log_file="/tmp/yoyo-gui.log"

    local network_ip
    network_ip=$(get_network_ip)

    # Always run in dev mode for simplicity (hot reload)
    nohup npm run dev > "$log_file" 2>&1 &
    local server_pid=$!
    echo "$server_pid" > "$pid_file"

    # Wait for dev mode to start
    sleep 3

    if is_gui_running; then
        echo -e "${UI_SUCCESS}${mode_name} GUI started${UI_RESET}"
        echo -e "   Local:   ${UI_PRIMARY}http://localhost:${dev_port}${UI_RESET}"
        if [ -n "$network_ip" ]; then
            echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:${dev_port}${UI_RESET}"
        fi

        # Open browser if requested
        if [ "$OPEN_BROWSER" = true ]; then
            sleep 1
            open_browser "http://localhost:${dev_port}"
        fi
        return 0
    else
        echo -e "${UI_ERROR}Failed to start ${mode_name} GUI${UI_RESET}"
        echo "   Check log: $log_file"
        rm -f "$pid_file"
        return 1
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

launch_gui() {
    local project_root="$1"

    local gui_dir mode_name dev_port prod_port
    gui_dir=$(get_gui_dir)
    mode_name=$(get_mode_name)
    dev_port=$(get_dev_port)
    prod_port=$(get_prod_port)

    local network_ip
    network_ip=$(get_network_ip)

    # Kill any existing servers on our ports to prevent EADDRINUSE
    kill_existing_on_port "$dev_port"
    kill_existing_on_port "$prod_port"

    # Show branded banner (if enabled, terminal is interactive, and UI library loaded)
    if [ "$BANNER_ENABLED" = true ] && is_interactive_terminal && [ "$UI_LIBRARY_LOADED" = true ]; then
        if [ "$AI_MODE" = true ]; then
            ui_yoyo_ai_banner "v${VERSION}" 2>/dev/null || ui_yoyo_banner "v${VERSION}"
        else
            ui_yoyo_banner "v${VERSION}"
        fi
    else
        echo ""
        echo -e "${UI_BOLD}${UI_PRIMARY}${mode_name} GUI${UI_RESET}"
    fi

    echo ""
    echo -e "  ${UI_SUCCESS}Project:${UI_RESET}  $project_root"
    echo -e "  ${UI_SUCCESS}URL:${UI_RESET}      http://localhost:${dev_port}"
    if [ -n "$network_ip" ]; then
        echo -e "  ${UI_SUCCESS}Network:${UI_RESET}  http://${network_ip}:${dev_port}"
    fi
    echo ""
    echo -e "  ${UI_DIM}Press Ctrl+C to stop${UI_RESET}"
    echo ""

    cd "$gui_dir"

    # Set environment variables
    export YOYO_PROJECT_ROOT="$project_root"
    export PORT="$prod_port"

    # Export gateway token for gui-ai server (reads from ~/.yoyo-claw)
    if [ "$AI_MODE" = true ]; then
        local token_file="${HOME}/.yoyo-claw/.gateway-token"
        [ ! -f "$token_file" ] && token_file="${HOME}/.yoyo-ai/.gateway-token"
        [ ! -f "$token_file" ] && token_file="${HOME}/.openclaw/.gateway-token"
        if [ -f "$token_file" ]; then
            export YOYO_CLAW_GATEWAY_TOKEN="$(cat "$token_file")"
            export OPENCLAW_GATEWAY_TOKEN="$YOYO_CLAW_GATEWAY_TOKEN"
        fi
    fi

    # Open browser
    if [ "$OPEN_BROWSER" = true ]; then
        (sleep 3 && open_browser "http://localhost:${dev_port}") &
    fi

    # Run development server (with hot reload)
    npm run dev
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

    local mode_name
    mode_name=$(get_mode_name)

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
            echo -e "${UI_DIM}Installing ${mode_name} GUI dependencies...${UI_RESET}"
            install_dependencies || {
                echo -e "${UI_ERROR}Failed to install dependencies${UI_RESET}"
                exit 1
            }
        else
            echo ""
            echo -e "${UI_WARNING}${mode_name} GUI dependencies not installed${UI_RESET}"
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

    # Launch GUI
    if [ "$BACKGROUND_MODE" = true ]; then
        launch_background "$project_root"
    else
        launch_gui "$project_root"
    fi
}

main "$@"
