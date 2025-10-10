#!/bin/bash

# File Explorer with Tmux Split-Pane Integration
# Creates a split terminal with file explorer in a persistent pane

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly FILE_EXPLORER="$SCRIPT_DIR/file-explorer.sh"

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

# Start file explorer in split pane
start_split_explorer() {
    local target_dir="${1:-.}"

    # Check if already in tmux
    if [[ -n "${TMUX:-}" ]]; then
        echo ""
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📂 ${COLOR_BOLD}STARTING FILE EXPLORER${COLOR_RESET}                                 ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
        echo ""

        # Split window vertically (file explorer on right)
        tmux split-window -h -p 35 "$FILE_EXPLORER watch '$target_dir'"

        # Select the left pane (main work area)
        tmux select-pane -L

        echo "✅ File explorer started in right pane"
        echo ""
        echo "Controls:"
        echo "  • Switch panes: Ctrl+B then arrow keys"
        echo "  • Close explorer: Ctrl+B then x (on explorer pane)"
        echo "  • Full screen pane: Ctrl+B then z"
        echo ""
    else
        echo ""
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  🚀 ${COLOR_BOLD}STARTING TMUX WITH FILE EXPLORER${COLOR_RESET}                       ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
        echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
        echo ""

        # Create new tmux session with split
        local session_name="yoyo-dev-$(date +%s)"

        tmux new-session -d -s "$session_name"
        tmux split-window -h -p 35 -t "$session_name" "$FILE_EXPLORER watch '$target_dir'"
        tmux select-pane -t "$session_name:0.0"

        echo "✅ Tmux session created: $session_name"
        echo ""
        echo "Attaching to session..."
        sleep 1

        tmux attach-session -t "$session_name"
    fi
}

# Start explorer in current terminal (no split)
start_inline_explorer() {
    local target_dir="${1:-.}"

    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📂 ${COLOR_BOLD}FILE EXPLORER${COLOR_RESET}                                          ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
    echo ""

    "$FILE_EXPLORER" watch "$target_dir"
}

# Show file tree (single render)
show_tree() {
    local target_dir="${1:-.}"

    "$FILE_EXPLORER" once "$target_dir"
}

# Main
main() {
    local mode="${1:-}"
    local target_dir="${2:-.}"

    case "$mode" in
        split)
            check_tmux || exit 1
            start_split_explorer "$target_dir"
            ;;
        watch)
            start_inline_explorer "$target_dir"
            ;;
        tree)
            show_tree "$target_dir"
            ;;
        *)
            echo "Usage: file-explorer-tmux.sh <mode> [directory]"
            echo ""
            echo "Modes:"
            echo "  split - Start file explorer in tmux split pane (recommended)"
            echo "  watch - Start file explorer in current terminal"
            echo "  tree  - Show file tree once (one-time)"
            echo ""
            echo "Example:"
            echo "  file-explorer-tmux.sh split ."
            echo "  file-explorer-tmux.sh tree src/"
            echo ""
            echo "Environment Variables:"
            echo "  FILE_EXPLORER_DEPTH=3              - Maximum tree depth (default: 3)"
            echo "  FILE_EXPLORER_WATCH_INTERVAL=2     - Refresh interval in seconds (default: 2)"
            echo "  FILE_EXPLORER_SHOW_HIDDEN=false    - Show hidden files (default: false)"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"
