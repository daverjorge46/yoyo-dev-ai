#!/bin/bash

# Yoyo Dev Launcher v6.0
# Claude Code Native Interface - launches Claude Code directly with GUI

set -euo pipefail

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
YOYO_INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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
    # Fallback banner function
    ui_yoyo_banner() {
        echo ""
        echo -e "${UI_YELLOW}YOYO AI${UI_RESET} v${1:-6.2.0}"
        echo ""
    }
    # Fallback dashboard function
    ui_project_dashboard() { :; }
fi

# ============================================================================
# Load Wave Install Functions
# ============================================================================

if [ -f "$SCRIPT_DIR/wave-install.sh" ]; then
    source "$SCRIPT_DIR/wave-install.sh"
fi

# ============================================================================
# Configuration
# ============================================================================

readonly VERSION="6.2.0"
readonly USER_PROJECT_DIR="$(pwd)"

# BASE installation location (can be overridden with YOYO_BASE_DIR env var)
DEFAULT_BASE_DIR="$HOME/.yoyo-dev-base"
YOYO_BASE_DIR="${YOYO_BASE_DIR:-$DEFAULT_BASE_DIR}"

# Detect BASE installation
detect_base_installation() {
    # Priority order for finding BASE:
    # 1. YOYO_BASE_DIR environment variable
    # 2. ~/.yoyo-dev-base (new canonical location)
    # 3. ~/yoyo-dev (legacy location)
    # 4. Script parent directory (running from cloned repo)

    if [ -d "$YOYO_BASE_DIR/instructions" ] && [ -d "$YOYO_BASE_DIR/standards" ]; then
        echo "$YOYO_BASE_DIR"
        return 0
    fi

    if [ -d "$HOME/.yoyo-dev-base/instructions" ] && [ -d "$HOME/.yoyo-dev-base/standards" ]; then
        echo "$HOME/.yoyo-dev-base"
        return 0
    fi

    if [ -d "$HOME/yoyo-dev/instructions" ] && [ -d "$HOME/yoyo-dev/standards" ]; then
        echo "$HOME/yoyo-dev"
        return 0
    fi

    # Check if running from within cloned repo
    if [ -d "$YOYO_INSTALL_DIR/instructions" ] && [ -d "$YOYO_INSTALL_DIR/standards" ]; then
        echo "$YOYO_INSTALL_DIR"
        return 0
    fi

    return 1
}

GUI_ENABLED=true
GUI_PORT=5173
ORCHESTRATION_ENABLED=true
BANNER_ENABLED=true
CLEAR_TERMINAL=true

# Wave Terminal Configuration
WAVE_ENABLED=true
WAVE_FALLBACK=true  # Fallback to standard terminal if Wave unavailable
WAVE_ONLY=false     # Launch Wave without Claude Code

# Ralph Autonomous Development Configuration
RALPH_MODE=false
RALPH_MONITOR=false
RALPH_CALLS=100
RALPH_TIMEOUT=30
RALPH_VERBOSE=false
RALPH_FORCE=false
RALPH_COMMAND=""
RALPH_ARGS=""

# ============================================================================
# Utility Functions
# ============================================================================

# Check if output is going to a terminal (not piped/redirected)
is_interactive_terminal() {
    [ -t 1 ] && [ -t 2 ]
}

# Clear terminal screen (only in interactive mode)
clear_terminal() {
    if [ "$CLEAR_TERMINAL" = true ] && is_interactive_terminal; then
        clear
    fi
}

# ============================================================================
# Claude Code Detection
# ============================================================================

check_claude_code() {
    if command -v claude &> /dev/null; then
        return 0
    fi
    return 1
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
# GUI Functions
# ============================================================================

launch_gui_background() {
    local gui_script="$SCRIPT_DIR/yoyo-gui.sh"

    if [ ! -f "$gui_script" ]; then
        return 1
    fi

    # Launch GUI in background with dev mode
    # Pass explicit project root to avoid picking up gui/.yoyo-dev
    bash "$gui_script" --dev --background --no-open --project-root "$USER_PROJECT_DIR" 2>/dev/null &
    return 0
}

stop_gui() {
    local gui_script="$SCRIPT_DIR/yoyo-gui.sh"
    if [ -f "$gui_script" ]; then
        bash "$gui_script" --stop
    fi
}

check_gui_status() {
    local gui_script="$SCRIPT_DIR/yoyo-gui.sh"
    if [ -f "$gui_script" ]; then
        bash "$gui_script" --status
    fi
}

# ============================================================================
# Ralph Functions
# ============================================================================

check_ralph_installed() {
    local detect_script="$SCRIPT_DIR/ralph-detect.sh"
    if [ -f "$detect_script" ]; then
        if bash "$detect_script" --quiet; then
            return 0
        fi
    fi
    # Fallback direct check
    if command -v ralph &> /dev/null; then
        return 0
    fi
    return 1
}

install_ralph_prompt() {
    echo ""
    ui_warning "Ralph not installed"
    echo ""
    echo "  Ralph is required for autonomous development mode."
    echo "  It provides rate limiting, circuit breakers, and exit detection."
    echo ""
    echo -e "  ${UI_PRIMARY}1.${UI_RESET} Install Ralph now (recommended)"
    echo -e "  ${UI_PRIMARY}2.${UI_RESET} Exit and install manually"
    echo ""
    echo -n "  Choice [1]: "
    read -r install_choice
    install_choice="${install_choice:-1}"

    if [ "$install_choice" = "1" ]; then
        local setup_script="$SCRIPT_DIR/ralph-setup.sh"
        if [ -f "$setup_script" ]; then
            bash "$setup_script" --yes
            return $?
        else
            ui_error "Ralph setup script not found"
            return 1
        fi
    else
        echo ""
        echo "  To install manually:"
        echo -e "    ${UI_PRIMARY}git clone https://github.com/frankbria/ralph-claude-code.git${UI_RESET}"
        echo -e "    ${UI_PRIMARY}cd ralph-claude-code && ./install.sh${UI_RESET}"
        echo ""
        return 1
    fi
}

generate_ralph_prompt() {
    local command="$1"
    local args="$2"

    local generator="$SCRIPT_DIR/ralph-prompt-generator.sh"
    if [ -f "$generator" ]; then
        bash "$generator" --command "$command" --args "$args"
    else
        ui_error "PROMPT.md generator not found"
        return 1
    fi
}

run_ralph_loop() {
    local ralph_args=()

    # Add rate limit
    ralph_args+=("--calls" "$RALPH_CALLS")

    # Add timeout
    ralph_args+=("--timeout" "$RALPH_TIMEOUT")

    # Add monitor flag
    if [ "$RALPH_MONITOR" = true ]; then
        ralph_args+=("--monitor")
    fi

    # Add verbose flag
    if [ "$RALPH_VERBOSE" = true ]; then
        ralph_args+=("--verbose")
    fi

    echo ""
    ui_info "Starting Ralph autonomous loop..."
    echo -e "  ${UI_DIM}Rate limit:${UI_RESET} $RALPH_CALLS calls/hour"
    echo -e "  ${UI_DIM}Timeout:${UI_RESET} $RALPH_TIMEOUT minutes/loop"
    echo -e "  ${UI_DIM}Monitor:${UI_RESET} $RALPH_MONITOR"
    echo ""

    # Run Ralph
    ralph "${ralph_args[@]}"
}

# ============================================================================
# Lock File Management (Single Execution Enforcement)
# ============================================================================

# Generate project hash for lock file path
get_project_hash() {
    echo -n "$USER_PROJECT_DIR" | md5sum | cut -c1-12
}

# Get lock file path
get_lock_file_path() {
    echo "/tmp/yoyo-ralph-$(get_project_hash).lock"
}

# Get PID file path
get_pid_file_path() {
    echo "/tmp/yoyo-ralph-$(get_project_hash).pid"
}

# Check if a process is running
is_process_running() {
    local pid=$1
    kill -0 "$pid" 2>/dev/null
}

# Check if lock file is valid (process still running)
is_ralph_locked() {
    local lock_file
    lock_file=$(get_lock_file_path)

    if [ ! -f "$lock_file" ]; then
        return 1  # Not locked
    fi

    # Read PID from lock file
    local pid
    pid=$(grep -o '"pid":[[:space:]]*[0-9]*' "$lock_file" 2>/dev/null | grep -o '[0-9]*')

    if [ -z "$pid" ]; then
        # Invalid lock file, clean up
        rm -f "$lock_file"
        return 1
    fi

    # Check if process is running
    if is_process_running "$pid"; then
        return 0  # Locked and process running
    fi

    # Stale lock (process dead), clean up
    ui_info "Cleaning up stale lock file..."
    rm -f "$lock_file"
    rm -f "$(get_pid_file_path)"
    return 1
}

# Get lock file info for display
get_lock_info() {
    local lock_file
    lock_file=$(get_lock_file_path)

    if [ ! -f "$lock_file" ]; then
        return 1
    fi

    # Extract fields from JSON
    local pid phase_id started_at
    pid=$(grep -o '"pid":[[:space:]]*[0-9]*' "$lock_file" 2>/dev/null | grep -o '[0-9]*')
    phase_id=$(grep -o '"phaseId":[[:space:]]*"[^"]*"' "$lock_file" 2>/dev/null | cut -d'"' -f4)
    started_at=$(grep -o '"startedAt":[[:space:]]*"[^"]*"' "$lock_file" 2>/dev/null | cut -d'"' -f4)

    echo "PID: $pid"
    echo "Phase: $phase_id"
    echo "Started: $started_at"
}

# Create lock file
create_lock_file() {
    local phase_id="${1:-unknown}"
    local execution_id="${2:-$(date +%s)}"
    local lock_file
    lock_file=$(get_lock_file_path)

    cat > "$lock_file" <<EOF
{
  "pid": $$,
  "startedAt": "$(date -Iseconds)",
  "phaseId": "$phase_id",
  "projectPath": "$USER_PROJECT_DIR",
  "executionId": "$execution_id"
}
EOF

    # Create PID file
    echo $$ > "$(get_pid_file_path)"
}

# Clean up lock files
cleanup_lock_files() {
    rm -f "$(get_lock_file_path)"
    rm -f "$(get_pid_file_path)"
}

# Set up cleanup trap
setup_lock_cleanup() {
    trap cleanup_lock_files EXIT INT TERM
}

launch_ralph_mode() {
    # Check for existing lock (single execution enforcement)
    if is_ralph_locked; then
        if [ "$RALPH_FORCE" = true ]; then
            ui_warning "Force override: killing existing Ralph execution..."
            # Get PID from lock file and kill it
            local lock_file
            lock_file=$(get_lock_file_path)
            local pid
            pid=$(grep -o '"pid":[[:space:]]*[0-9]*' "$lock_file" 2>/dev/null | grep -o '[0-9]*')
            if [ -n "$pid" ]; then
                kill -TERM "$pid" 2>/dev/null || true
                sleep 1
                kill -KILL "$pid" 2>/dev/null || true
            fi
            cleanup_lock_files
        else
            echo ""
            ui_error "Another Ralph execution is already running for this project"
            echo ""
            echo -e "  ${UI_DIM}Lock file:${UI_RESET} $(get_lock_file_path)"
            echo ""
            get_lock_info | while read -r line; do
                echo -e "  ${UI_DIM}$line${UI_RESET}"
            done
            echo ""
            echo -e "  Use ${UI_PRIMARY}--force${UI_RESET} to override (will kill existing process)"
            echo ""
            exit 1
        fi
    fi

    # Check Ralph is installed
    if ! check_ralph_installed; then
        if ! install_ralph_prompt; then
            exit 1
        fi
        # Re-check after installation
        if ! check_ralph_installed; then
            ui_error "Ralph installation failed"
            exit 1
        fi
    fi

    # Create lock file
    create_lock_file "$RALPH_COMMAND" "$(date +%s)"
    setup_lock_cleanup

    # Generate PROMPT.md for the command
    if ! generate_ralph_prompt "$RALPH_COMMAND" "$RALPH_ARGS"; then
        ui_error "Failed to generate PROMPT.md"
        cleanup_lock_files
        exit 1
    fi

    # Clear terminal before launch (default behavior)
    clear_terminal

    # Show launch banner
    echo ""
    echo -e "${UI_PRIMARY}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
    echo -e "${UI_PRIMARY}│${UI_RESET}               ${UI_SUCCESS}YOYO DEV - RALPH MODE${UI_RESET}                         ${UI_PRIMARY}│${UI_RESET}"
    echo -e "${UI_PRIMARY}│${UI_RESET}          ${UI_DIM}Autonomous Development Enabled${UI_RESET}                      ${UI_PRIMARY}│${UI_RESET}"
    echo -e "${UI_PRIMARY}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
    echo ""

    echo -e "  ${UI_DIM}Project:${UI_RESET}  $(basename "$USER_PROJECT_DIR")"
    echo -e "  ${UI_DIM}Command:${UI_RESET}  $RALPH_COMMAND"
    echo -e "  ${UI_DIM}Mode:${UI_RESET}     Autonomous (Ralph)"

    # Change to project directory
    cd "$USER_PROJECT_DIR"

    # Run Ralph loop
    run_ralph_loop
}

# ============================================================================
# Wave Terminal Functions
# ============================================================================

# Check if Wave Terminal functions are available
is_wave_available() {
    # Check if wave-install.sh was sourced and detect_wave function exists
    if type detect_wave &>/dev/null; then
        return 0
    fi
    return 1
}

# Prompt user to install Wave Terminal
prompt_wave_installation() {
    echo ""
    ui_warning "Wave Terminal not found"
    echo ""
    echo "  Wave Terminal provides an enhanced development experience:"
    echo ""
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Multi-pane layouts in a single window"
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Built-in web browser for GUI dashboard"
    echo -e "  ${UI_SUCCESS}*${UI_RESET} File browser with previews"
    echo -e "  ${UI_SUCCESS}*${UI_RESET} Custom yoyo-dev themed interface"
    echo ""
    echo -e "  ${UI_PRIMARY}1.${UI_RESET} Install Wave Terminal now (recommended)"
    echo -e "  ${UI_PRIMARY}2.${UI_RESET} Continue with standard terminal"
    echo -e "  ${UI_PRIMARY}3.${UI_RESET} Exit"
    echo ""
    echo -n "  Choice [1]: "
    read -r install_choice
    install_choice="${install_choice:-1}"

    case "$install_choice" in
        1)
            echo ""
            if install_wave --force; then
                return 0
            else
                ui_warning "Wave installation failed, falling back to standard terminal"
                return 1
            fi
            ;;
        2)
            ui_info "Using standard terminal mode"
            return 1
            ;;
        3|*)
            ui_info "Exiting"
            exit 0
            ;;
    esac
}

# Launch yoyo-dev with Wave Terminal
launch_with_wave() {
    local wave_path=""

    # Get Wave binary path
    if ! wave_path=$(detect_wave); then
        ui_error "Wave detection failed"
        return 1
    fi

    # Deploy Wave configuration
    ui_info "Deploying yoyo-dev Wave configuration..."
    if ! deploy_wave_config; then
        ui_warning "Wave config deployment failed, continuing anyway"
    fi

    # Clear terminal before launch (default behavior)
    clear_terminal

    # Show branded ASCII art banner (if enabled and terminal is interactive)
    if [ "$BANNER_ENABLED" = true ] && is_interactive_terminal; then
        ui_yoyo_banner "v${VERSION}"

        # Show project dashboard
        if [ -d "./.yoyo-dev" ]; then
            ui_project_dashboard ".yoyo-dev"
        fi
    fi

    echo -e "  ${UI_DIM}Project:${UI_RESET}  $(basename "$USER_PROJECT_DIR")"
    echo -e "  ${UI_DIM}Mode:${UI_RESET}     Wave Terminal"

    # Launch GUI in background if enabled
    if [ "$GUI_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Starting on port $GUI_PORT..."
        if launch_gui_background; then
            sleep 1
            local network_ip
            network_ip=$(get_network_ip)
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_SUCCESS}http://localhost:$GUI_PORT${UI_RESET}"
            if [ -n "$network_ip" ]; then
                echo -e "  ${UI_DIM}Network:${UI_RESET}  ${UI_SUCCESS}http://${network_ip}:$GUI_PORT${UI_RESET}"
            fi
        else
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_YELLOW}Not available${UI_RESET}"
        fi
    else
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Disabled"
    fi

    echo ""
    echo -e "  ${UI_DIM}Commands:${UI_RESET} /yoyo-status /specs /tasks /fixes"
    echo -e "  ${UI_DIM}Help:${UI_RESET}     /yoyo-help"

    # Show orchestration status
    if [ "$ORCHESTRATION_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}Orchestration:${UI_RESET} ${UI_SUCCESS}Global Mode (v6.1)${UI_RESET}"
    else
        echo -e "  ${UI_DIM}Orchestration:${UI_RESET} ${UI_YELLOW}Disabled${UI_RESET}"
    fi
    echo ""

    ui_info "Launching Wave Terminal..."
    echo ""

    # Change to project directory
    cd "$USER_PROJECT_DIR"

    # Set orchestration environment variable
    if [ "$ORCHESTRATION_ENABLED" = false ]; then
        export YOYO_ORCHESTRATION=false
    fi

    # Export project directory for Wave widgets
    export YOYO_PROJECT_DIR="$USER_PROJECT_DIR"

    # Launch layout setup in background (runs every time to set up default panes)
    # This will run after Wave opens and set up the yoyo-dev layout
    ui_info "Setting up yoyo-dev layout..."
    (
        # Run layout setup in background
        setup_yoyo_layout "$USER_PROJECT_DIR"
    ) &
    disown

    # Launch Wave Terminal
    # Wave will use the deployed configuration from ~/.config/waveterm/
    exec "$wave_path"
}

# ============================================================================
# Claude Code Native Launch
# ============================================================================

launch_claude_code() {
    # Check if Yoyo Dev is installed in this project
    if [ ! -d "./.yoyo-dev" ]; then
        echo ""
        ui_warning "Yoyo Dev not detected in this directory"
        echo ""
        echo -e "  Would you like to initialize Yoyo Dev in this project?"
        echo ""
        echo -e "    ${UI_PRIMARY}1.${UI_RESET} Initialize Yoyo Dev (recommended)"
        echo -e "    ${UI_PRIMARY}2.${UI_RESET} Exit"
        echo ""
        echo -n "  Choice [1]: "
        read -r install_choice
        install_choice="${install_choice:-1}"

        if [ "$install_choice" = "1" ]; then
            echo ""
            ui_info "Starting initialization..."
            echo ""

            # Detect BASE installation
            local base_dir
            if base_dir=$(detect_base_installation); then
                local init_script="$base_dir/setup/init.sh"
                if [ -f "$init_script" ]; then
                    exec bash "$init_script" --claude-code
                fi
                # Fallback to install.sh for legacy installations
                local install_script="$base_dir/setup/install.sh"
                if [ -f "$install_script" ]; then
                    exec bash "$install_script" --claude-code
                fi
            fi

            # BASE not found
            ui_error "BASE installation not found"
            echo ""
            echo "  Yoyo Dev BASE should be installed at ~/.yoyo-dev-base"
            echo ""
            echo "  To install BASE:"
            echo "    ${UI_PRIMARY}git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev-base${UI_RESET}"
            echo "    ${UI_PRIMARY}~/.yoyo-dev-base/setup/install-global-command.sh${UI_RESET}"
            echo ""
            echo "  Then initialize this project:"
            echo "    ${UI_PRIMARY}yoyo-init --claude-code${UI_RESET}"
            echo ""
            exit 1
        else
            echo ""
            ui_info "Initialization cancelled"
            echo ""
            echo "  To initialize manually:"
            echo "    ${UI_PRIMARY}yoyo-init --claude-code${UI_RESET}"
            echo ""
            exit 0
        fi
    fi

    # Check Claude Code is installed
    if ! check_claude_code; then
        echo ""
        ui_error "Claude Code CLI not found"
        echo ""
        echo "  Install from: ${UI_PRIMARY}https://claude.ai/download${UI_RESET}"
        echo ""
        exit 1
    fi

    # Clear terminal before launch (default behavior)
    clear_terminal

    # Show branded ASCII art banner (if enabled and terminal is interactive)
    if [ "$BANNER_ENABLED" = true ] && is_interactive_terminal; then
        ui_yoyo_banner "v${VERSION}"

        # Show project dashboard
        if [ -d "./.yoyo-dev" ]; then
            ui_project_dashboard ".yoyo-dev"
        fi
    fi

    echo -e "  ${UI_DIM}Project:${UI_RESET}  $(basename "$USER_PROJECT_DIR")"
    echo -e "  ${UI_DIM}Mode:${UI_RESET}     Claude Code Native"

    # Launch GUI in background if enabled
    if [ "$GUI_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Starting on port $GUI_PORT..."
        if launch_gui_background; then
            sleep 1
            local network_ip
            network_ip=$(get_network_ip)
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_SUCCESS}http://localhost:$GUI_PORT${UI_RESET}"
            if [ -n "$network_ip" ]; then
                echo -e "  ${UI_DIM}Network:${UI_RESET}  ${UI_SUCCESS}http://${network_ip}:$GUI_PORT${UI_RESET}"
            fi
        else
            echo -e "  ${UI_DIM}GUI:${UI_RESET}      ${UI_YELLOW}Not available${UI_RESET}"
        fi
    else
        echo -e "  ${UI_DIM}GUI:${UI_RESET}      Disabled"
    fi

    echo ""
    echo -e "  ${UI_DIM}Commands:${UI_RESET} /yoyo-status /specs /tasks /fixes"
    echo -e "  ${UI_DIM}Help:${UI_RESET}     /yoyo-help"

    # Show orchestration status
    if [ "$ORCHESTRATION_ENABLED" = true ]; then
        echo -e "  ${UI_DIM}Orchestration:${UI_RESET} ${UI_SUCCESS}Global Mode (v6.1)${UI_RESET}"
    else
        echo -e "  ${UI_DIM}Orchestration:${UI_RESET} ${UI_YELLOW}Disabled${UI_RESET}"
    fi
    echo ""

    # Change to project directory
    cd "$USER_PROJECT_DIR"

    # Set orchestration environment variable
    if [ "$ORCHESTRATION_ENABLED" = false ]; then
        export YOYO_ORCHESTRATION=false
    fi

    # Launch Claude Code
    exec claude
}

# ============================================================================
# UI Functions
# ============================================================================

show_version() {
    echo ""
    echo -e "${UI_PRIMARY}Yoyo Dev${UI_RESET} v${VERSION}"
    echo -e "${UI_DIM}Claude Code Native Interface${UI_RESET}"
    echo ""
}

show_help() {
    local show_full_header=true

    # Use the branded help panel for Claude Code commands if available
    if type ui_help_panel &>/dev/null; then
        ui_help_panel
        show_full_header=false
    fi

    # CLI options help
    echo ""
    if [ "$show_full_header" = true ]; then
        echo -e "${UI_PRIMARY}╭──────────────────────────────────────────────────────────────────╮${UI_RESET}"
        echo -e "${UI_PRIMARY}│${UI_RESET}                    ${UI_SUCCESS}YOYO DEV HELP${UI_RESET}                              ${UI_PRIMARY}│${UI_RESET}"
        echo -e "${UI_PRIMARY}╰──────────────────────────────────────────────────────────────────╯${UI_RESET}"
        echo ""
    fi

    echo -e "  ${UI_SUCCESS}LAUNCH MODES${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo${UI_RESET}"
    echo -e "    ${UI_DIM}Launch with Wave Terminal + GUI (default if Wave installed)${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --no-gui${UI_RESET}"
    echo -e "    ${UI_DIM}Launch without browser GUI${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --gui-only${UI_RESET}"
    echo -e "    ${UI_DIM}Open browser GUI only (no terminal)${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --no-banner${UI_RESET}"
    echo -e "    ${UI_DIM}Skip branded banner (for CI/scripts)${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --no-clear${UI_RESET}"
    echo -e "    ${UI_DIM}Don't clear terminal before launch${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}WAVE TERMINAL${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_DIM}Wave Terminal provides an enhanced multi-pane development${UI_RESET}"
    echo -e "  ${UI_DIM}environment with built-in GUI dashboard, file browser,${UI_RESET}"
    echo -e "  ${UI_DIM}and custom yoyo-dev theming.${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --no-wave${UI_RESET}"
    echo -e "    ${UI_DIM}Skip Wave and use standard terminal with Claude Code${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --install-wave${UI_RESET}"
    echo -e "    ${UI_DIM}Force Wave Terminal installation/reinstallation${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --wave-only${UI_RESET}"
    echo -e "    ${UI_DIM}Launch Wave Terminal without Claude Code${UI_RESET}"
    echo ""
    echo -e "  ${UI_DIM}Wave config location: ~/.config/waveterm/${UI_RESET}"
    echo -e "  ${UI_DIM}Yoyo-dev deploys custom themes, widgets, and settings.${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}ORCHESTRATION${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_DIM}Global orchestration mode is enabled by default (v6.1+).${UI_RESET}"
    echo -e "  ${UI_DIM}All user messages are classified and routed to agents.${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --no-orchestration${UI_RESET}"
    echo -e "    ${UI_DIM}Disable global orchestration for this session${UI_RESET}"
    echo ""
    echo -e "  ${UI_DIM}Other disable methods:${UI_RESET}"
    echo -e "    ${UI_DIM}* Set YOYO_ORCHESTRATION=false in environment${UI_RESET}"
    echo -e "    ${UI_DIM}* Set orchestration.enabled: false in config.yml${UI_RESET}"
    echo -e "    ${UI_DIM}* Prefix message with \"directly:\" for one-time bypass${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}GUI MANAGEMENT${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --stop-gui${UI_RESET}"
    echo -e "    ${UI_DIM}Stop background GUI server${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --gui-status${UI_RESET}"
    echo -e "    ${UI_DIM}Check if GUI server is running${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}CLAUDE CODE COMMANDS${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}/yoyo-status${UI_RESET}     ${UI_DIM}Project dashboard${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/specs${UI_RESET}           ${UI_DIM}List all specifications${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/spec <n>${UI_RESET}        ${UI_DIM}View spec details${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/tasks${UI_RESET}           ${UI_DIM}Show current tasks${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/fixes${UI_RESET}           ${UI_DIM}List bug fixes${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/fix <n>${UI_RESET}         ${UI_DIM}View fix details${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}/create-new${UI_RESET}      ${UI_DIM}Create new feature spec${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/execute-tasks${UI_RESET}   ${UI_DIM}Execute current tasks${UI_RESET}"
    echo -e "  ${UI_PRIMARY}/create-fix${UI_RESET}      ${UI_DIM}Create bug fix workflow${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}INFORMATION${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --version${UI_RESET}   ${UI_DIM}Show version${UI_RESET}"
    echo -e "  ${UI_PRIMARY}yoyo --help${UI_RESET}      ${UI_DIM}Show this help${UI_RESET}"
    echo ""

    echo -e "  ${UI_SUCCESS}RALPH (Autonomous Mode)${UI_RESET}"
    echo -e "  ─────────────────────────────────────────────────────────────────"
    echo ""
    echo -e "  ${UI_PRIMARY}yoyo --ralph <command>${UI_RESET}"
    echo -e "    ${UI_DIM}Run command in autonomous mode with Ralph${UI_RESET}"
    echo ""
    echo -e "  ${UI_DIM}Example:${UI_RESET}"
    echo -e "    ${UI_PRIMARY}yoyo --ralph execute-tasks${UI_RESET}         ${UI_DIM}Auto-execute all tasks${UI_RESET}"
    echo -e "    ${UI_PRIMARY}yoyo --ralph create-spec \"auth\"${UI_RESET}   ${UI_DIM}Auto-create spec${UI_RESET}"
    echo ""
    echo -e "  ${UI_DIM}Ralph Options:${UI_RESET}"
    echo -e "    ${UI_PRIMARY}--ralph-calls N${UI_RESET}      ${UI_DIM}API calls/hour (default: 100)${UI_RESET}"
    echo -e "    ${UI_PRIMARY}--ralph-timeout N${UI_RESET}    ${UI_DIM}Minutes/loop (default: 30)${UI_RESET}"
    echo -e "    ${UI_PRIMARY}--ralph-monitor${UI_RESET}      ${UI_DIM}Enable tmux dashboard${UI_RESET}"
    echo -e "    ${UI_PRIMARY}--ralph-verbose${UI_RESET}      ${UI_DIM}Detailed output${UI_RESET}"
    echo -e "    ${UI_PRIMARY}--force${UI_RESET}              ${UI_DIM}Override existing lock (kill running process)${UI_RESET}"
    echo ""

    echo -e "  ${UI_DIM}Documentation: https://github.com/daverjorge46/yoyo-dev-ai${UI_RESET}"
    echo ""
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    # Parse all arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --version|-v)
                show_version
                exit 0
                ;;
            --no-gui)
                GUI_ENABLED=false
                shift
                ;;
            --no-orchestration)
                ORCHESTRATION_ENABLED=false
                shift
                ;;
            --no-banner)
                BANNER_ENABLED=false
                shift
                ;;
            --no-clear)
                CLEAR_TERMINAL=false
                shift
                ;;
            --no-wave)
                WAVE_ENABLED=false
                shift
                ;;
            --install-wave)
                # Force Wave installation
                if is_wave_available; then
                    install_wave --force
                    exit $?
                else
                    ui_error "Wave install script not available"
                    echo ""
                    echo "  Please ensure setup/wave-install.sh exists"
                    exit 1
                fi
                ;;
            --wave-only)
                WAVE_ONLY=true
                shift
                ;;
            --gui-only)
                local gui_script="$SCRIPT_DIR/yoyo-gui.sh"
                if [ -f "$gui_script" ]; then
                    bash "$gui_script" --dev
                else
                    ui_error "GUI launcher not found"
                    exit 1
                fi
                exit 0
                ;;
            --stop-gui)
                stop_gui
                exit 0
                ;;
            --gui-status)
                check_gui_status
                exit 0
                ;;
            --ralph)
                RALPH_MODE=true
                # Next argument is the command
                if [ -n "${2:-}" ] && [[ ! "$2" =~ ^-- ]]; then
                    RALPH_COMMAND="$2"
                    shift
                else
                    ui_error "--ralph requires a command (execute-tasks, create-spec, create-fix, create-new)"
                    exit 1
                fi
                shift
                ;;
            --ralph-calls)
                RALPH_CALLS="${2:-100}"
                shift 2
                ;;
            --ralph-timeout)
                RALPH_TIMEOUT="${2:-30}"
                shift 2
                ;;
            --ralph-monitor)
                RALPH_MONITOR=true
                shift
                ;;
            --ralph-verbose)
                RALPH_VERBOSE=true
                shift
                ;;
            --force|-f)
                RALPH_FORCE=true
                shift
                ;;
            launch|"")
                shift
                ;;
            *)
                # Collect remaining args as RALPH_ARGS if in ralph mode
                if [ "$RALPH_MODE" = true ]; then
                    RALPH_ARGS="$RALPH_ARGS $1"
                    shift
                else
                    ui_error "Unknown option: $1"
                    echo ""
                    echo "  Use ${UI_PRIMARY}yoyo --help${UI_RESET} for available options"
                    exit 1
                fi
                ;;
        esac
    done

    # Trim RALPH_ARGS
    RALPH_ARGS="${RALPH_ARGS# }"

    # Execute based on mode
    if [ "$RALPH_MODE" = true ]; then
        launch_ralph_mode
        exit 0
    fi

    # Wave-only mode: just launch Wave without Claude Code
    if [ "$WAVE_ONLY" = true ]; then
        if is_wave_available; then
            local wave_path
            if wave_path=$(detect_wave); then
                ui_info "Launching Wave Terminal..."
                deploy_wave_config 2>/dev/null || true
                cd "$USER_PROJECT_DIR"
                exec "$wave_path"
            else
                ui_error "Wave Terminal not installed"
                echo ""
                echo "  Install with: ${UI_PRIMARY}yoyo --install-wave${UI_RESET}"
                exit 1
            fi
        else
            ui_error "Wave install script not available"
            exit 1
        fi
    fi

    # Check if Yoyo Dev is installed in this project (required for all modes)
    if [ ! -d "./.yoyo-dev" ]; then
        echo ""
        ui_warning "Yoyo Dev not detected in this directory"
        echo ""
        echo -e "  Would you like to initialize Yoyo Dev in this project?"
        echo ""
        echo -e "    ${UI_PRIMARY}1.${UI_RESET} Initialize Yoyo Dev (recommended)"
        echo -e "    ${UI_PRIMARY}2.${UI_RESET} Exit"
        echo ""
        echo -n "  Choice [1]: "
        read -r init_choice
        init_choice="${init_choice:-1}"

        if [ "$init_choice" = "1" ]; then
            echo ""
            ui_info "Starting initialization..."
            echo ""

            # Detect BASE installation
            local base_dir
            if base_dir=$(detect_base_installation); then
                local init_script="$base_dir/setup/init.sh"
                if [ -f "$init_script" ]; then
                    exec bash "$init_script" --claude-code
                fi
                # Fallback to install.sh for legacy installations
                local install_script="$base_dir/setup/install.sh"
                if [ -f "$install_script" ]; then
                    exec bash "$install_script" --claude-code
                fi
            fi

            # BASE not found
            ui_error "BASE installation not found"
            echo ""
            echo "  Yoyo Dev BASE should be installed at ~/.yoyo-dev-base"
            echo ""
            echo "  To install BASE:"
            echo "    ${UI_PRIMARY}git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev-base${UI_RESET}"
            echo "    ${UI_PRIMARY}~/.yoyo-dev-base/setup/install-global-command.sh${UI_RESET}"
            echo ""
            echo "  Then initialize this project:"
            echo "    ${UI_PRIMARY}yoyo-init --claude-code${UI_RESET}"
            echo ""
            exit 1
        else
            echo ""
            ui_info "Initialization cancelled"
            echo ""
            echo "  To initialize manually:"
            echo "    ${UI_PRIMARY}yoyo-init --claude-code${UI_RESET}"
            echo ""
            exit 0
        fi
    fi

    # Determine launch mode: Wave or standard terminal
    if [ "$WAVE_ENABLED" = true ] && is_wave_available; then
        # Check if Wave is installed
        local wave_path
        if wave_path=$(detect_wave 2>/dev/null); then
            # Wave is installed - use it
            launch_with_wave
        else
            # Wave not installed
            if [ "$WAVE_FALLBACK" = true ]; then
                # Prompt to install or fallback
                if prompt_wave_installation; then
                    # Installation succeeded, try launching with Wave
                    if wave_path=$(detect_wave 2>/dev/null); then
                        launch_with_wave
                    else
                        # Still can't find Wave, fallback
                        ui_warning "Wave still not detected, using standard terminal"
                        launch_claude_code
                    fi
                else
                    # User chose to skip or installation failed
                    launch_claude_code
                fi
            else
                # No fallback - just fail
                ui_error "Wave Terminal not installed and fallback disabled"
                echo ""
                echo "  Install with: ${UI_PRIMARY}yoyo --install-wave${UI_RESET}"
                echo "  Or use: ${UI_PRIMARY}yoyo --no-wave${UI_RESET} for standard terminal"
                exit 1
            fi
        fi
    else
        # Wave disabled or not available - use standard terminal
        launch_claude_code
    fi
}

main "$@"
