#!/bin/bash

# Yoyo Dev v2.0 - Tmux Launcher
# Provides branded visual experience with custom colors and layout

set -euo pipefail

# Source shared parsing utilities
source "$HOME/.yoyo-dev/setup/parse-utils.sh"

# Yoyo Dev version
readonly VERSION="2.0.0"

# Yoyo Dev color scheme (grey-blue theme)
readonly BG_COLOR="#2d3748"        # Dark grey-blue background
readonly FG_COLOR="#e2e8f0"        # Light grey foreground
readonly BORDER_COLOR="#4a5568"    # Medium grey borders
readonly ACCENT_COLOR="#63b3ed"    # Bright blue accent (cyan)
readonly SUCCESS_COLOR="#68d391"   # Green
readonly WARNING_COLOR="#f6ad55"   # Orange
readonly ERROR_COLOR="#fc8181"     # Red

# Session name
readonly SESSION_NAME="yoyo-dev-$$"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo ""
    echo "⚠️  tmux is not installed."
    echo ""
    echo "Yoyo Dev visual mode requires tmux for custom colors and layout."
    echo ""
    echo "Install tmux:"
    echo "  Ubuntu/Debian: sudo apt install tmux"
    echo "  macOS: brew install tmux"
    echo "  Fedora: sudo dnf install tmux"
    echo ""
    echo "Falling back to standard mode..."
    echo ""
    exec ~/.yoyo-dev/setup/yoyo.sh "$@"
fi

# Check if we have a TTY (required for tmux)
if ! tty -s; then
    # No TTY available (running in background, via script, etc)
    # Fall back to standard mode
    exec ~/.yoyo-dev/setup/yoyo.sh "$@"
fi

# Check if we're in a Yoyo Dev project
if [ ! -d "./.yoyo-dev" ]; then
    echo ""
    echo "⚠️  Yoyo Dev not detected in this directory"
    echo ""
    echo "Would you like to:"
    echo "  1. Install Yoyo Dev in this project"
    echo "  2. Launch Claude Code anyway (standard mode)"
    echo "  3. Exit"
    echo ""
    read -p "Choice (1/2/3): " choice

    case $choice in
        1)
            echo ""
            echo "Installing Yoyo Dev..."
            ~/.yoyo-dev/setup/project.sh --claude-code
            exit 0
            ;;
        2)
            echo ""
            echo "Launching Claude Code (standard mode)..."
            exec claude
            ;;
        *)
            echo "Exiting..."
            exit 0
            ;;
    esac
fi

# Get project info
project_name=$(basename "$(pwd)")
project_path=$(pwd)

# Extract mission and tech stack using shared functions
mission=$(get_project_mission)
tech_stack=$(get_tech_stack)

# Create temporary tmux config with Yoyo Dev colors
TMUX_CONFIG=$(mktemp)
cat > "$TMUX_CONFIG" << EOF
# Yoyo Dev tmux color scheme

# Status bar colors
set -g status-style "bg=$BG_COLOR,fg=$FG_COLOR"
set -g status-left-style "bg=$ACCENT_COLOR,fg=$BG_COLOR,bold"
set -g status-right-style "bg=$BORDER_COLOR,fg=$FG_COLOR"

# Window status colors
set -g window-status-style "bg=$BORDER_COLOR,fg=$FG_COLOR"
set -g window-status-current-style "bg=$ACCENT_COLOR,fg=$BG_COLOR,bold"
set -g window-status-activity-style "bg=$WARNING_COLOR,fg=$BG_COLOR"

# Pane border colors
set -g pane-border-style "fg=$BORDER_COLOR"
set -g pane-active-border-style "fg=$ACCENT_COLOR"

# Message colors
set -g message-style "bg=$ACCENT_COLOR,fg=$BG_COLOR,bold"
set -g message-command-style "bg=$BORDER_COLOR,fg=$FG_COLOR"

# Mode colors (copy mode, etc)
set -g mode-style "bg=$ACCENT_COLOR,fg=$BG_COLOR"

# Status bar content
set -g status-left " 🚀 YOYO DEV "
set -g status-right " $project_name "
set -g status-left-length 20
set -g status-right-length 50

# Center window list
set -g status-justify centre

# Enable mouse support
set -g mouse on

# Use 256 colors
set -g default-terminal "screen-256color"

# Enable true color if available
set -ga terminal-overrides ",*256col*:Tc"

# Copy mode settings for better text selection
setw -g mode-keys vi

# Vi-style copy/paste bindings
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind-key -T copy-mode-vi y send-keys -X copy-selection-and-cancel
bind-key -T copy-mode-vi r send-keys -X rectangle-toggle

# Allow xterm-style function key sequences
setw -g xterm-keys on

# Don't rename windows automatically
set -g allow-rename off

# Visual bell
set -g visual-bell off
set -g bell-action none

# Renumber windows
set -g renumber-windows on

# Start windows at 1
set -g base-index 1
set -g pane-base-index 1

# No delay for escape key
set -sg escape-time 0

# Increase scrollback
set -g history-limit 50000

# Custom keybindings
# Ctrl+B r - Force refresh status pane (send Ctrl+C then restart)
# Note: Will use venv Python > system Python > Bash fallback
bind-key r run-shell "tmux send-keys -t 1 C-c && tmux respawn-pane -t 1 -k 'if [ -f ~/.yoyo-dev/venv/bin/python3 ] && ~/.yoyo-dev/venv/bin/python3 -c \"import rich, watchdog, yaml\" 2>/dev/null; then ~/.yoyo-dev/venv/bin/python3 ~/.yoyo-dev/lib/yoyo-dashboard.py; elif command -v python3 >/dev/null && python3 -c \"import rich, watchdog, yaml\" 2>/dev/null; then python3 ~/.yoyo-dev/lib/yoyo-dashboard.py; else ~/.yoyo-dev/lib/yoyo-status.sh; fi'"
EOF

# Create startup script that displays header and launches Claude
STARTUP_SCRIPT=$(mktemp)
cat > "$STARTUP_SCRIPT" << 'EOFSTART'
#!/bin/bash

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

VERSION="2.0.0"
PROJECT_NAME="__PROJECT_NAME__"
PROJECT_PATH="__PROJECT_PATH__"
MISSION="__MISSION__"
TECH_STACK="__TECH_STACK__"

# Display branded header
clear
echo ""
echo -e " ${CYAN}┌───────────────────────────────────────────────────────────────────────┐${RESET}"
echo -e " ${CYAN}│                                                                       │${RESET}"
echo -e " ${CYAN}│${RESET} ${BOLD}██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗       ██████╗ ███████╗██╗   ██╗${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET} ${BOLD}╚██╗ ██╔╝██╔═══██╗╚██╗ ██╔╝██╔═══██╗      ██╔══██╗██╔════╝██║   ██║${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}  ${BOLD}╚████╔╝ ██║   ██║ ╚████╔╝ ██║   ██║█████╗██║  ██║█████╗  ██║   ██║${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}   ${BOLD}╚██╔╝  ██║   ██║  ╚██╔╝  ██║   ██║╚════╝██║  ██║██╔══╝  ╚██╗ ██╔╝${RESET} ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}    ${BOLD}██║   ╚██████╔╝   ██║   ╚██████╔╝      ██████╔╝███████╗ ╚████╔╝${RESET}  ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}    ${BOLD}╚═╝    ╚═════╝    ╚═╝    ╚═════╝       ╚═════╝ ╚══════╝  ╚═══╝${RESET}   ${CYAN}│${RESET}"
echo -e " ${CYAN}│                                                                       │${RESET}"
echo -e " ${CYAN}│${RESET}              ${BOLD}v${VERSION} - AI-Assisted Development Framework${RESET}           ${CYAN}│${RESET}"
echo -e " ${CYAN}│${RESET}          ${DIM}\"Powerful when you need it. Invisible when you don't.\"${RESET}  ${CYAN}│${RESET}"
echo -e " ${CYAN}└───────────────────────────────────────────────────────────────────────┘${RESET}"
echo ""
echo -e " ${GREEN}📍 Project:${RESET} ${BOLD}$PROJECT_NAME${RESET}"
echo -e " ${BLUE}📂 Location:${RESET} $PROJECT_PATH"
echo -e " ${MAGENTA}🎯 Mission:${RESET} $MISSION"
echo -e " ${YELLOW}🛠️  Stack:${RESET} $TECH_STACK"
echo ""
echo " ──────────────────────────────────────────────────────────────────────────"
echo ""
echo -e " ${BOLD}Quick Start:${RESET}"
echo -e "   • ${GREEN}/create-new${RESET} \"feature name\" ${CYAN}--lite --monitor${RESET}  ${DIM}# Fast feature creation${RESET}"
echo -e "   • ${GREEN}/create-fix${RESET} \"problem\" ${CYAN}--monitor${RESET}            ${DIM}# Fix bugs systematically${RESET}"
echo -e "   • ${GREEN}/execute-tasks${RESET}                            ${DIM}# Build (interactive by default)${RESET}"
echo ""
echo -e " ${BOLD}New in v2.0:${RESET}"
echo -e "   ${CYAN}✨${RESET} Interactive mode by default (pause after each subtask)"
echo -e "   ${CYAN}✨${RESET} MASTER-TASKS.md (single source of truth)"
echo -e "   ${CYAN}✨${RESET} Task monitor with tmux split-pane"
echo -e "   ${CYAN}✨${RESET} Lite mode for fast iteration"
echo -e "   ${CYAN}✨${RESET} Comprehensive flag documentation"
echo ""
echo " ──────────────────────────────────────────────────────────────────────────"
echo ""
echo -e " ${DIM}Run ${CYAN}/yoyo-help${RESET}${DIM} for complete command reference${RESET}"
echo -e " ${DIM}Docs: ${CYAN}.yoyo-dev/COMMAND-REFERENCE.md${RESET}"
echo ""
echo -e " ${DIM}Layout: Main (left) | Task Status (right - auto-refreshes every 5s)${RESET}"
echo -e " ${DIM}Switch panes: ${CYAN}Ctrl+B${RESET}${DIM} + arrows | Copy: Hold ${CYAN}Shift${RESET}${DIM} + click & drag${RESET}"
echo ""
echo -e " ${YELLOW}Launching Claude Code...${RESET}"
echo ""

# Launch Claude Code
exec claude
EOFSTART

# Replace placeholders
sed -i "s|__PROJECT_NAME__|$project_name|g" "$STARTUP_SCRIPT"
sed -i "s|__PROJECT_PATH__|$project_path|g" "$STARTUP_SCRIPT"
sed -i "s|__MISSION__|$mission|g" "$STARTUP_SCRIPT"
sed -i "s|__TECH_STACK__|$tech_stack|g" "$STARTUP_SCRIPT"

chmod +x "$STARTUP_SCRIPT"

# Determine which dashboard to use (Python with fallback to Bash)
DASHBOARD_CMD="$HOME/.yoyo-dev/lib/yoyo-status.sh"

# Check for venv Python first (if installed via venv method)
VENV_PYTHON="$HOME/.yoyo-dev/venv/bin/python3"

if [ -f "$VENV_PYTHON" ]; then
    # Check if Python dashboard dependencies are available in venv
    if "$VENV_PYTHON" -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
        # Use Python dashboard with venv Python
        DASHBOARD_CMD="$VENV_PYTHON $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
    fi
elif command -v python3 &> /dev/null; then
    # Check if Python dashboard dependencies are available in system Python
    if python3 -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
        # Use Python dashboard with system Python
        DASHBOARD_CMD="python3 $HOME/.yoyo-dev/lib/yoyo-dashboard.py"
    fi
fi

# Launch tmux session with Yoyo Dev colors and status pane
# Layout: Main (left 65%) | Status (right 35%)
tmux -f "$TMUX_CONFIG" new-session -s "$SESSION_NAME" -n "Yoyo Dev" "$STARTUP_SCRIPT" \; \
    split-window -h -p 35 "$DASHBOARD_CMD" \; \
    select-pane -t 0 \; \
    set-option -t "$SESSION_NAME" destroy-unattached on

# Cleanup
rm -f "$TMUX_CONFIG" "$STARTUP_SCRIPT"
