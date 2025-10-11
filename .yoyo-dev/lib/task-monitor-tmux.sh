#!/bin/bash

# Task Monitor with Tmux Split-Pane Integration
# Creates a split terminal with task monitoring in a persistent pane

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TASK_MONITOR="$SCRIPT_DIR/task-monitor.sh"

# Colors
readonly COLOR_BOLD="\033[1m"
readonly COLOR_CYAN="\033[36m"
readonly COLOR_RESET="\033[0m"

# Check if tmux is available
check_tmux() {
    if ! command -v tmux &> /dev/null; then
        echo "❌ tmux is not installed. Install it with:"
        echo "   Ubuntu/Debian: sudo apt install tmux"
        echo "   Fedora: sudo dnf install tmux"
        echo "   Arch: sudo pacman -S tmux"
        return 1
    fi
}

# Start monitoring in split pane
start_split_monitor() {
    local task_file="$1"

    if [[ ! -f "$task_file" ]]; then
        echo "❌ Task file not found: $task_file"
        return 1
    fi

    # Check if already in tmux
    if [[ -n "${TMUX:-}" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  🎯 ${COLOR_BOLD}STARTING TASK MONITOR${COLOR_RESET}                                   ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
        echo ""

        # Split window vertically (task monitor on right, 35% width)
        tmux split-window -h -p 35 "$TASK_MONITOR '$task_file' watch"

        # Select the left pane (main work area)
        tmux select-pane -L

        echo "✅ Task monitor started in right pane"
        echo ""
        echo "Controls:"
        echo "  • Switch panes: Ctrl+B then arrow keys"
        echo "  • Close monitor: Ctrl+B then x (on monitor pane)"
        echo "  • Full screen pane: Ctrl+B then z"
        echo ""
    else
        echo ""
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  🚀 ${COLOR_BOLD}STARTING TMUX WITH TASK MONITOR${COLOR_RESET}                        ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
        echo ""

        # Create new tmux session with split
        local session_name="yoyo-dev-$(date +%s)"

        tmux new-session -d -s "$session_name"
        tmux split-window -h -p 35 -t "$session_name" "$TASK_MONITOR '$task_file' watch"
        tmux select-pane -t "$session_name:0.0"

        echo "✅ Tmux session created: $session_name"
        echo ""
        echo "Attaching to session..."
        sleep 1

        tmux attach-session -t "$session_name"
    fi
}

# Start monitor in current terminal (no split)
start_inline_monitor() {
    local task_file="$1"

    if [[ ! -f "$task_file" ]]; then
        echo "❌ Task file not found: $task_file"
        return 1
    fi

    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📊 ${COLOR_BOLD}TASK MONITOR${COLOR_RESET}                                            ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
    echo ""

    "$TASK_MONITOR" "$task_file" watch
}

# Show current task status (single render)
show_status() {
    local task_file="$1"

    if [[ ! -f "$task_file" ]]; then
        echo "❌ Task file not found: $task_file"
        return 1
    fi

    "$TASK_MONITOR" "$task_file" once
}

# Main
main() {
    local mode="${1:-}"
    local task_file="${2:-}"

    case "$mode" in
        split)
            check_tmux || exit 1
            start_split_monitor "$task_file"
            ;;
        watch)
            start_inline_monitor "$task_file"
            ;;
        status)
            show_status "$task_file"
            ;;
        *)
            echo "Usage: task-monitor-tmux.sh <mode> <path-to-MASTER-TASKS.md>"
            echo ""
            echo "Modes:"
            echo "  split   - Start task monitor in tmux split pane (recommended)"
            echo "  watch   - Start task monitor in current terminal"
            echo "  status  - Show current task status (one-time)"
            echo ""
            echo "Example:"
            echo "  task-monitor-tmux.sh split .yoyo-dev/specs/2025-10-10-profile/MASTER-TASKS.md"
            exit 1
            ;;
    esac
}

main "$@"
