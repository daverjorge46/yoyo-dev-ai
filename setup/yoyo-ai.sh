#!/bin/bash

# Yoyo AI Launcher v2.0
# YoyoClaw - Business and Personal AI Assistant
# Subcommands: --start, --stop, --update, --status, --doctor, --channels, --help

set -euo pipefail

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Source shared functions
if [ -f "$SCRIPT_DIR/functions.sh" ]; then
    source "$SCRIPT_DIR/functions.sh"
fi

# Try to load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    # Fallback colors
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_WARNING='\033[1;33m'
    UI_MAUVE='\033[0;35m'
    UI_DIM='\033[2m'
    UI_BOLD='\033[1m'
    UI_RESET='\033[0m'
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_WARNING}⚠${UI_RESET} $1"; }
    ui_yoyo_ai_banner() {
        echo ""
        echo -e "${UI_MAUVE}YOYO AI${UI_RESET} ${1:-v2.0.0}"
        echo ""
    }
    ui_yoyo_ai_status_panel() { :; }
fi

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="2.0.0"
readonly YOYO_CLAW_PORT="${YOYO_CLAW_PORT:-18789}"
readonly WORKSPACE_PORT="${WORKSPACE_PORT:-3457}"

# Migrate and set up ~/.yoyoclaw (handles ~/.yoyo-ai, ~/.yoyo-claw, and ~/.openclaw migration)
migrate_yoyo_claw_home

# ============================================================================
# Network Detection
# ============================================================================

# get_network_ip is provided by functions.sh

# ============================================================================
# Node.js Validation
# ============================================================================

check_prerequisites() {
    local node_version
    if ! node_version=$(check_node_version 22 2>/dev/null); then
        if [ "$node_version" = "not_installed" ]; then
            ui_error "Node.js is not installed"
            echo ""
            echo "  Yoyo Claw requires Node.js >= 22"
            echo ""
            echo -e "  Install via: ${UI_PRIMARY}https://nodejs.org/${UI_RESET}"
            echo -e "  Or with nvm: ${UI_PRIMARY}nvm install 22${UI_RESET}"
            echo ""
            return 1
        else
            ui_error "Node.js version $node_version is too old (need >= 22)"
            echo ""
            echo -e "  Upgrade via: ${UI_PRIMARY}nvm install 22${UI_RESET}"
            echo ""
            return 1
        fi
    fi
    return 0
}

# ============================================================================
# Yoyo Claw Detection
# ============================================================================

is_yoyo_claw_available() {
    local bin
    bin="$(_resolve_yoyo_claw_bin 2>/dev/null)" && [ -f "$bin" ]
}

get_yoyo_claw_version() {
    if is_yoyo_claw_available; then
        yoyo_claw --version 2>/dev/null || echo "unknown"
    else
        echo "not built"
    fi
}

# ============================================================================
# Daemon Management
# ============================================================================

get_daemon_pid() {
    # Try to find yoyoclaw daemon process
    pgrep -f "yoyoclaw.*daemon\|openclaw.*daemon" 2>/dev/null | head -1 || echo ""
}

is_daemon_running() {
    local pid
    pid=$(get_daemon_pid)
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

is_gateway_installed() {
    # Check if gateway service is installed (systemd user service exists)
    # Skip on systems without systemd (e.g., WSL)
    if ! has_systemd; then
        return 1
    fi
    systemctl --user is-enabled yoyoclaw-gateway.service &>/dev/null 2>&1 || \
    systemctl --user is-enabled openclaw-gateway.service &>/dev/null 2>&1
}

is_gateway_running() {
    # Check if gateway port is listening
    if command -v ss &>/dev/null; then
        ss -tlnH "sport = :${YOYO_CLAW_PORT}" 2>/dev/null | grep -q "${YOYO_CLAW_PORT}" 2>/dev/null && return 0
    elif command -v netstat &>/dev/null; then
        netstat -tlnp 2>/dev/null | grep -q ":${YOYO_CLAW_PORT}" && return 0
    fi
    # Fallback: check systemd service
    if has_systemd; then
        systemctl --user is-active yoyoclaw-gateway.service &>/dev/null 2>&1 && return 0
        systemctl --user is-active openclaw-gateway.service &>/dev/null 2>&1 && return 0
    fi
    # Fallback: check process
    pgrep -f "yoyoclaw.*gateway\|openclaw.*gateway" &>/dev/null && return 0
    return 1
}

ensure_gateway_token() {
    ensure_yoyo_claw_token
    patch_yoyo_claw_systemd_service
}

ensure_gateway_mode() {
    set_yoyo_claw_gateway_mode
}

ensure_initialized() {
    # Step 1: Ensure yoyoclaw is built
    if ! is_yoyo_claw_built; then
        ui_info "Building yoyoclaw from source..."
        if ! build_yoyo_claw 2>&1 | tail -5; then
            ui_error "Failed to build yoyoclaw"
            return 1
        fi
        ui_success "Yoyo Claw built"
        echo ""
    fi

    # Step 2: Run onboarding if yoyo-ai has never been onboarded
    if ! is_yoyo_onboarded; then
        # Back up any existing config from external/old installation
        if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
            ui_info "Found existing config — backing up before onboarding..."
            backup_yoyo_claw_config
        fi

        ui_info "Running Yoyo Claw onboarding..."
        ensure_yoyo_claw_token
        run_yoyo_claw_onboard
        ui_success "Yoyo Claw onboarded"
        echo ""
    else
        # Already onboarded — just ensure token, mode, and service
        ensure_gateway_mode
        ensure_gateway_token

        if has_systemd && ! is_gateway_installed; then
            ui_info "Installing gateway service..."
            yoyo_claw gateway install 2>&1 || {
                ui_warning "Gateway service installation failed — will run gateway directly"
                return 0
            }
            ui_success "Gateway service installed"
            echo ""
        elif ! has_systemd; then
            # No systemd (e.g., WSL) — gateway will run as background process
            true
        fi
    fi

    return 0
}

daemon_start() {
    if is_gateway_running; then
        ui_success "Gateway is already running on port ${YOYO_CLAW_PORT}"
        return 0
    fi

    if ! is_yoyo_claw_available; then
        ui_error "Yoyo Claw is not built"
        echo ""
        echo -e "  Build with: ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
        echo ""
        return 1
    fi

    # Ensure token is loaded
    ensure_gateway_token

    ui_info "Starting Yoyo Claw gateway..."

    # Try systemd service first (only if systemd is available)
    if has_systemd && is_gateway_installed; then
        # Try new service name first, fall back to legacy
        systemctl --user start yoyoclaw-gateway.service 2>&1 || \
        systemctl --user start openclaw-gateway.service 2>&1 || true
        sleep 1
        if is_gateway_running; then
            ui_success "Gateway started on port ${YOYO_CLAW_PORT}"
            show_yoyo_claw_dashboard_info
            return 0
        fi
    fi

    # Fallback: start gateway directly in background
    local gateway_log="/tmp/yoyoclaw-gateway.log"
    yoyo_claw gateway \
        --port "$YOYO_CLAW_PORT" \
        --token "${YOYO_CLAW_GATEWAY_TOKEN:-}" \
        --allow-unconfigured \
        >> "$gateway_log" 2>&1 &
    disown
    sleep 6

    if is_gateway_running; then
        ui_success "Gateway started on port ${YOYO_CLAW_PORT}"
        show_yoyo_claw_dashboard_info
    else
        ui_warning "Gateway may not have started correctly"
        echo -e "  Check log:    ${UI_PRIMARY}/tmp/yoyoclaw-gateway.log${UI_RESET}"
        echo -e "  Try manually: ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
        echo -e "  Or diagnose:  ${UI_PRIMARY}yoyo-ai --doctor${UI_RESET}"
    fi
}

daemon_stop() {
    if ! is_gateway_running && ! is_daemon_running; then
        ui_info "Gateway is not running"
        return 0
    fi

    ui_info "Stopping Yoyo Claw gateway..."

    # Try systemd service first (only if available)
    if has_systemd; then
        systemctl --user stop yoyoclaw-gateway.service 2>&1 || true
        systemctl --user stop openclaw-gateway.service 2>&1 || true
    fi

    # Also try killing any direct gateway process
    pkill -f "yoyoclaw.*gateway\|openclaw.*gateway" 2>/dev/null || true

    # Fallback: kill by PID
    local pid
    pid=$(get_daemon_pid)
    if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null || true
    fi

    ui_success "Gateway stopped"
}

# ============================================================================
# Commands
# ============================================================================

cmd_start() {
    if ! check_prerequisites; then
        exit 1
    fi

    ui_yoyo_ai_banner "v${VERSION}"

    ensure_initialized || exit 1

    daemon_start

    # Also launch the GUI
    echo ""
    ui_info "Launching Yoyo AI GUI..."
    "${SCRIPT_DIR}/yoyo-gui.sh" --ai --background --no-banner &
    disown
    sleep 3

    # Show URLs
    local network_ip
    network_ip=$(get_network_ip)
    echo ""
    ui_success "GUI available:"
    echo -e "   Local:   ${UI_PRIMARY}http://localhost:5174${UI_RESET}"
    if [ -n "$network_ip" ]; then
        echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:5174${UI_RESET}"
    fi
}

cmd_stop() {
    ui_yoyo_ai_banner "v${VERSION}"

    # Stop the GUI
    local gui_pid
    gui_pid=$(pgrep -f "yoyo-gui.sh.*--ai" 2>/dev/null || true)
    if [ -n "$gui_pid" ]; then
        ui_info "Stopping Yoyo AI GUI..."
        kill "$gui_pid" 2>/dev/null || true
        ui_success "GUI stopped"
    fi
    # Also stop the vite dev server for gui-ai
    local vite_pid
    vite_pid=$(pgrep -f "vite.*gui-ai\|gui-ai.*vite\|node.*gui-ai" 2>/dev/null | head -1 || true)
    if [ -n "$vite_pid" ]; then
        kill "$vite_pid" 2>/dev/null || true
    fi

    daemon_stop
}

cmd_status() {
    ui_yoyo_ai_banner "v${VERSION}"

    local status="stopped"
    local pid=""

    if is_daemon_running; then
        status="running"
        pid=$(get_daemon_pid)
    fi

    ui_yoyo_ai_status_panel "$status" "$YOYO_CLAW_PORT" "$pid"

    # Show Yoyo Claw version
    echo -e "  ${UI_DIM}Yoyo Claw:${UI_RESET} $(get_yoyo_claw_version)"

    # Show Node.js version
    local node_ver
    node_ver=$(node --version 2>/dev/null || echo "not found")
    echo -e "  ${UI_DIM}Node.js:${UI_RESET}   ${node_ver}"

    # Show config path
    if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
        echo -e "  ${UI_DIM}Config:${UI_RESET}    ${YOYO_CLAW_CONFIG_PATH}"
    else
        echo -e "  ${UI_DIM}Config:${UI_RESET}    ${UI_WARNING}not found${UI_RESET}"
    fi
    echo ""

    # If stopped, offer to start
    if [ "$status" = "stopped" ] && is_yoyo_claw_available; then
        echo -e "  ${UI_DIM}Start with:${UI_RESET} ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
        echo ""
    fi
}

cmd_update() {
    ui_yoyo_ai_banner "v${VERSION}"

    if ! check_prerequisites; then
        exit 1
    fi

    local current_version
    current_version=$(get_yoyo_claw_version)
    ui_info "Current version: ${current_version}"

    # Pull latest changes from yoyoclaw repo
    local claw_dir
    if claw_dir="$(_resolve_yoyo_claw_dir 2>/dev/null)" && [ -d "$claw_dir/.git" ]; then
        ui_info "Pulling latest yoyoclaw changes..."
        (cd "$claw_dir" && git pull origin "$(git branch --show-current 2>/dev/null || echo main)" 2>&1 | tail -3) || true
    fi

    ui_info "Rebuilding yoyoclaw from source..."

    if ! build_yoyo_claw 2>&1 | tail -5; then
        ui_error "Build failed"
        exit 1
    fi

    local new_version
    new_version=$(get_yoyo_claw_version)
    ui_success "Yoyo Claw rebuilt: ${new_version}"

    # Restart daemon if it was running
    if is_daemon_running; then
        echo ""
        ui_info "Restarting daemon..."
        daemon_stop
        sleep 1
        daemon_start
    fi
}

cmd_doctor() {
    ui_yoyo_ai_banner "v${VERSION}"

    echo -e "  ${UI_BOLD}Yoyo AI Diagnostics${UI_RESET}"
    echo ""

    # Check Node.js
    echo -n "  Node.js >= 22:      "
    local node_ver
    if node_ver=$(check_node_version 22 2>/dev/null); then
        echo -e "${UI_SUCCESS}✓${UI_RESET} v${node_ver}"
    else
        if [ "$node_ver" = "not_installed" ]; then
            echo -e "${UI_ERROR}✗${UI_RESET} not installed"
        else
            echo -e "${UI_ERROR}✗${UI_RESET} v${node_ver} (need >= 22)"
        fi
    fi

    # Check pnpm
    echo -n "  pnpm:               "
    if command -v pnpm &>/dev/null; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} $(pnpm --version 2>/dev/null)"
    else
        echo -e "${UI_WARNING}○${UI_RESET} not found (corepack will enable it)"
    fi

    # Check Yoyo Claw source
    echo -n "  Yoyo Claw source:   "
    local claw_dir
    if claw_dir="$(_resolve_yoyo_claw_dir 2>/dev/null)"; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} ${claw_dir}"
    else
        echo -e "${UI_ERROR}✗${UI_RESET} not found"
    fi

    # Check Yoyo Claw build
    echo -n "  Yoyo Claw build:    "
    if is_yoyo_claw_built; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} $(get_yoyo_claw_version)"
    else
        echo -e "${UI_WARNING}○${UI_RESET} not built (run yoyo-ai --start)"
    fi

    # Check daemon
    echo -n "  Gateway:            "
    if is_gateway_running; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} running on port ${YOYO_CLAW_PORT}"
    else
        echo -e "${UI_WARNING}○${UI_RESET} stopped"
    fi

    # Check config
    echo -n "  Config:             "
    if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} ${YOYO_CLAW_CONFIG_PATH}"
    else
        echo -e "${UI_WARNING}○${UI_RESET} not found"
    fi

    # Check home directory
    echo -n "  Home dir:           "
    if [ -d "$YOYO_CLAW_HOME" ]; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} ${YOYO_CLAW_HOME}"
    else
        echo -e "${UI_WARNING}○${UI_RESET} not found"
    fi

    # Check symlinks
    echo -n "  ~/.openclaw link:   "
    if [ -L "$HOME/.openclaw" ]; then
        echo -e "${UI_SUCCESS}✓${UI_RESET} -> $(readlink "$HOME/.openclaw")"
    else
        echo -e "${UI_WARNING}○${UI_RESET} not set"
    fi

    echo ""
}

cmd_channels() {
    if ! is_yoyo_claw_available; then
        ui_error "Yoyo Claw is not built"
        exit 1
    fi

    yoyo_claw channels "$@"
}

# ============================================================================
# GUI (calls yoyo-gui --ai)
# ============================================================================

cmd_gui() {
    # Ensure gateway is running first
    if ! is_gateway_running; then
        ui_yoyo_ai_banner "v${VERSION}"
        ui_info "Starting Yoyo Claw gateway first..."
        ensure_initialized || true
        daemon_start
        sleep 2
    fi

    # Show network info
    local network_ip
    network_ip=$(get_network_ip)
    echo ""
    ui_info "Launching Yoyo AI GUI..."
    echo -e "   Local:   ${UI_PRIMARY}http://localhost:5174${UI_RESET}"
    if [ -n "$network_ip" ]; then
        echo -e "   Network: ${UI_PRIMARY}http://${network_ip}:5174${UI_RESET}"
    fi
    echo ""

    # Launch GUI using yoyo-gui --ai
    exec "${SCRIPT_DIR}/yoyo-gui.sh" --ai "$@"
}

show_help() {
    ui_yoyo_ai_banner "v${VERSION}"

    echo -e "  ${UI_BOLD}USAGE${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo-ai${UI_RESET}                  ${UI_DIM}Start gateway + GUI (same as --start)${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --gui${UI_RESET}            ${UI_DIM}Launch Yoyo AI GUI (port 5174)${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai <command>${UI_RESET}        ${UI_DIM}Run any Yoyo Claw command${UI_RESET}"
    echo ""
    echo -e "  ${UI_BOLD}YOYO COMMANDS${UI_RESET} ${UI_DIM}(Custom YoYo functionality)${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo -e "  ${UI_PRIMARY}yoyo-ai --start${UI_RESET}          ${UI_DIM}Start the AI daemon${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --stop${UI_RESET}           ${UI_DIM}Stop the AI daemon${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --status${UI_RESET}         ${UI_DIM}Show daemon status${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --gui${UI_RESET}            ${UI_DIM}Launch Yoyo AI GUI${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --update${UI_RESET}         ${UI_DIM}Rebuild yoyoclaw from source${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --doctor${UI_RESET}         ${UI_DIM}Run diagnostics${UI_RESET}"
    echo ""
    echo -e "  ${UI_BOLD}YOYO CLAW COMMANDS${UI_RESET} ${UI_DIM}(Pass-through to Yoyo Claw)${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo -e "  ${UI_PRIMARY}yoyo-ai onboard${UI_RESET}          ${UI_DIM}Interactive setup wizard${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai config${UI_RESET}           ${UI_DIM}Configure credentials & settings${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai models${UI_RESET}           ${UI_DIM}Manage AI models${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai channels${UI_RESET}         ${UI_DIM}Manage messaging channels${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai skills${UI_RESET}           ${UI_DIM}Manage AI skills${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai message${UI_RESET}          ${UI_DIM}Send messages${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai dashboard${UI_RESET}        ${UI_DIM}Open control panel${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai logs${UI_RESET}             ${UI_DIM}View gateway logs${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai agent${UI_RESET}            ${UI_DIM}Run agent commands${UI_RESET}"
    echo ""

    echo -e "  ${UI_BOLD}EXAMPLES${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo -e "  ${UI_DIM}# Launch Yoyo AI GUI${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --gui${UI_RESET}"
    echo ""
    echo -e "  ${UI_DIM}# Start the AI assistant daemon${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
    echo ""
    echo -e "  ${UI_DIM}# Configure WhatsApp channel${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo-ai channels login${UI_RESET}"
    echo ""

    echo -e "  ${UI_BOLD}ABOUT${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  Yoyo AI is your Business and Personal AI Assistant powered by YoyoClaw."
    echo -e "  Built from a local, security-hardened fork, it runs as a"
    echo -e "  background daemon providing messaging, skills, and integrations."
    echo ""
    echo -e "  ${UI_DIM}Part of the yoyo-dev-ai platform.${UI_RESET}"
    echo -e "  ${UI_DIM}Dev environment: ${UI_PRIMARY}yoyo-dev --help${UI_RESET}"
    echo ""
}

show_version() {
    echo ""
    echo -e "${UI_MAUVE}Yoyo AI${UI_RESET} v${VERSION}"
    echo -e "${UI_DIM}Business and Personal AI Assistant (Yoyo Claw)${UI_RESET}"
    echo ""
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    # No arguments: ensure initialized, start gateway + GUI, show status
    if [ $# -eq 0 ]; then
        cmd_start
        exit 0
    fi

    case "${1:-}" in
        --start|-s)
            shift
            cmd_start "$@"
            ;;
        --stop)
            cmd_stop
            ;;
        --status)
            cmd_status
            ;;
        --update|-u)
            cmd_update
            ;;
        --doctor|-d)
            cmd_doctor
            ;;
        --channels)
            shift
            cmd_channels "$@"
            ;;
        --gui)
            shift
            cmd_gui "$@"
            ;;
        --help|-h)
            show_help
            ;;
        --version|-v)
            show_version
            ;;
        *)
            # Pass through all other commands to Yoyo Claw
            if ! is_yoyo_claw_available; then
                ui_error "Yoyo Claw is not built"
                echo ""
                echo -e "  Build with: ${UI_PRIMARY}yoyo-ai --start${UI_RESET}"
                exit 1
            fi

            # Show YoYo banner for pass-through commands
            if [[ ! "$1" =~ ^- ]]; then
                ui_yoyo_ai_banner "v${VERSION}"
                echo -e "  ${UI_DIM}Running: ${UI_PRIMARY}yoyoclaw $*${UI_RESET}"
                echo ""
            fi

            # Execute Yoyo Claw command
            yoyo_claw "$@"
            ;;
    esac
}

main "$@"
