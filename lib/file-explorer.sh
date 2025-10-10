#!/bin/bash

# File Explorer for Yoyo Dev
# Displays interactive file tree with syntax highlighting and filtering

set -euo pipefail

# Colors
readonly COLOR_BOLD="\033[1m"
readonly COLOR_DIM="\033[2m"
readonly COLOR_CYAN="\033[36m"
readonly COLOR_GREEN="\033[32m"
readonly COLOR_YELLOW="\033[33m"
readonly COLOR_BLUE="\033[34m"
readonly COLOR_MAGENTA="\033[35m"
readonly COLOR_RED="\033[31m"
readonly COLOR_RESET="\033[0m"

# File type icons (using standard characters for compatibility)
readonly ICON_FOLDER="📁"
readonly ICON_FILE="📄"
readonly ICON_CODE="⚡"
readonly ICON_CONFIG="⚙️"
readonly ICON_DOCS="📝"
readonly ICON_TEST="🧪"
readonly ICON_YOYO="🚀"

# Configuration
readonly MAX_DEPTH="${FILE_EXPLORER_DEPTH:-3}"
readonly WATCH_INTERVAL="${FILE_EXPLORER_WATCH_INTERVAL:-2}"
readonly SHOW_HIDDEN="${FILE_EXPLORER_SHOW_HIDDEN:-false}"

# Get file icon based on extension
get_file_icon() {
    local file="$1"
    local basename="${file##*/}"

    # Check file extension
    case "${basename##*.}" in
        js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|hpp)
            echo "$ICON_CODE"
            ;;
        json|yaml|yml|toml|ini|conf|config)
            echo "$ICON_CONFIG"
            ;;
        md|txt|rst|adoc)
            echo "$ICON_DOCS"
            ;;
        test.js|test.ts|spec.js|spec.ts|test.py|spec.py)
            echo "$ICON_TEST"
            ;;
        *)
            if [[ -d "$file" ]]; then
                echo "$ICON_FOLDER"
            else
                echo "$ICON_FILE"
            fi
            ;;
    esac
}

# Get color for file based on type
get_file_color() {
    local file="$1"
    local basename="${file##*/}"

    # Yoyo Dev files
    if [[ "$file" == *".yoyo-dev"* ]]; then
        echo "$COLOR_CYAN"
        return
    fi

    # Directories
    if [[ -d "$file" ]]; then
        echo "$COLOR_BLUE"
        return
    fi

    # Code files
    case "${basename##*.}" in
        js|jsx|ts|tsx)
            echo "$COLOR_YELLOW"
            ;;
        py|rb|go|rs)
            echo "$COLOR_GREEN"
            ;;
        json|yaml|yml)
            echo "$COLOR_MAGENTA"
            ;;
        md|txt)
            echo "$COLOR_CYAN"
            ;;
        test.*|spec.*)
            echo "$COLOR_RED"
            ;;
        *)
            echo "$COLOR_RESET"
            ;;
    esac
}

# Check if path should be excluded
should_exclude() {
    local path="$1"
    local basename="${path##*/}"

    # Always exclude these
    case "$basename" in
        node_modules|.git|.next|.turbo|dist|build|coverage|.DS_Store)
            return 0
            ;;
    esac

    # Exclude hidden files/dirs if configured
    if [[ "$SHOW_HIDDEN" == "false" && "$basename" == .* && "$basename" != ".yoyo-dev" ]]; then
        return 0
    fi

    return 1
}

# Count files in directory (excluding hidden)
count_files() {
    local dir="$1"
    local count=0

    if [[ -d "$dir" ]]; then
        while IFS= read -r item; do
            if ! should_exclude "$item"; then
                ((count++)) || true
            fi
        done < <(find "$dir" -maxdepth 1 -mindepth 1 2>/dev/null)
    fi

    echo "$count"
}

# Build file tree
build_tree() {
    local dir="${1:-.}"
    local prefix="${2:-}"
    local depth="${3:-0}"
    local max_depth="${4:-$MAX_DEPTH}"

    # Stop if max depth reached
    if [[ $depth -ge $max_depth ]]; then
        return
    fi

    # Get all items in directory (sorted)
    local items=()
    while IFS= read -r item; do
        if ! should_exclude "$item"; then
            items+=("$item")
        fi
    done < <(find "$dir" -maxdepth 1 -mindepth 1 2>/dev/null | sort)

    local item_count="${#items[@]}"
    local current=0

    for item in "${items[@]}"; do
        ((current++)) || true
        local basename="${item##*/}"
        local is_last=false
        [[ $current -eq $item_count ]] && is_last=true

        # Determine tree characters
        local branch="├──"
        local extension="│   "
        if $is_last; then
            branch="└──"
            extension="    "
        fi

        # Get icon and color
        local icon=$(get_file_icon "$item")
        local color=$(get_file_color "$item")

        # Print item
        if [[ -d "$item" ]]; then
            local file_count=$(count_files "$item")
            echo -e "${COLOR_DIM}${prefix}${branch}${COLOR_RESET} ${icon} ${color}${basename}${COLOR_RESET} ${COLOR_DIM}($file_count)${COLOR_RESET}"

            # Recurse into directory
            build_tree "$item" "${prefix}${extension}" $((depth + 1)) "$max_depth"
        else
            echo -e "${COLOR_DIM}${prefix}${branch}${COLOR_RESET} ${icon} ${color}${basename}${COLOR_RESET}"
        fi
    done
}

# Display header
display_header() {
    local project_name="${1:-$(basename "$(pwd)")}"
    local project_path="${2:-$(pwd)}"

    clear
    echo ""
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  📂 ${COLOR_BOLD}FILE EXPLORER${COLOR_RESET}                     ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════╝${COLOR_RESET}"
    echo ""
    echo -e " ${COLOR_BOLD}Project:${COLOR_RESET} $project_name"
    echo -e " ${COLOR_DIM}Path: $project_path${COLOR_RESET}"
    echo -e " ${COLOR_DIM}Depth: $MAX_DEPTH | Hidden: $SHOW_HIDDEN${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_DIM}────────────────────────────────────────${COLOR_RESET}"
    echo ""
}

# Display footer
display_footer() {
    echo ""
    echo -e "${COLOR_DIM}────────────────────────────────────────${COLOR_RESET}"
    echo ""
    echo -e " ${COLOR_DIM}Updating every ${WATCH_INTERVAL}s...${COLOR_RESET}"
    echo ""
}

# Watch mode - refresh file tree periodically
watch_mode() {
    local target_dir="${1:-.}"
    local project_name="$(basename "$(pwd)")"
    local project_path="$(pwd)"

    while true; do
        display_header "$project_name" "$project_path"

        # Special handling for Yoyo Dev directory
        if [[ -d ".yoyo-dev" ]]; then
            echo -e " ${ICON_YOYO} ${COLOR_BOLD}${COLOR_CYAN}.yoyo-dev${COLOR_RESET}"
            build_tree ".yoyo-dev" " " 1 2
            echo ""
        fi

        # Show main project files
        build_tree "$target_dir" "" 0 "$MAX_DEPTH"

        display_footer

        sleep "$WATCH_INTERVAL"
    done
}

# Single render mode
once_mode() {
    local target_dir="${1:-.}"
    local project_name="$(basename "$(pwd)")"
    local project_path="$(pwd)"

    display_header "$project_name" "$project_path"

    # Special handling for Yoyo Dev directory
    if [[ -d ".yoyo-dev" ]]; then
        echo -e " ${ICON_YOYO} ${COLOR_BOLD}${COLOR_CYAN}.yoyo-dev${COLOR_RESET}"
        build_tree ".yoyo-dev" " " 1 2
        echo ""
    fi

    # Show main project files
    build_tree "$target_dir" "" 0 "$MAX_DEPTH"

    echo ""
}

# Main
main() {
    local mode="${1:-once}"
    local target_dir="${2:-.}"

    case "$mode" in
        watch)
            watch_mode "$target_dir"
            ;;
        once)
            once_mode "$target_dir"
            ;;
        *)
            echo "Usage: file-explorer.sh <mode> [directory]"
            echo ""
            echo "Modes:"
            echo "  watch - Continuously update file tree (for tmux pane)"
            echo "  once  - Render file tree once"
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
