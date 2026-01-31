#!/bin/bash
# Wave Widget Toggle Script for Yoyo Dev
# Toggles visibility of widget panes instead of creating duplicates
#
# Usage: wave-toggle.sh <widget-name> [--self-delete]
# Widget names: yoyo-cli, files, gui, system
#
# When invoked from a widget button's blockdef, use --self-delete so the
# ephemeral term block created by the widget click is removed after toggling.
# The script uses $WAVETERM_BLOCKID (set by Wave) to identify its own block.

set -euo pipefail

# ============================================================================
# Constants
# ============================================================================

readonly STATE_FILE="${HOME}/.yoyo-dev-base/.wave-widget-state.json"
readonly STATE_DIR="${HOME}/.yoyo-dev-base"
readonly META_KEY="yoyo:widget"

# ============================================================================
# State File Functions
# ============================================================================

init_state_file() {
    mkdir -p "$STATE_DIR"
    if [ ! -f "$STATE_FILE" ]; then
        echo '{}' > "$STATE_FILE"
    fi
}

# Read a widget's block_id from state file
get_widget_block_id() {
    local widget="$1"
    if [ -f "$STATE_FILE" ] && command -v jq &>/dev/null; then
        jq -r --arg w "$widget" '.[$w].block_id // empty' "$STATE_FILE" 2>/dev/null
    fi
}

# Update widget state in state file
set_widget_state() {
    local widget="$1"
    local block_id="$2"
    local visible="$3"

    init_state_file

    if command -v jq &>/dev/null; then
        local tmp="${STATE_FILE}.tmp"
        jq --arg w "$widget" --arg bid "$block_id" --argjson vis "$visible" \
            '.[$w] = {"block_id": $bid, "visible": $vis}' \
            "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
    fi
}

# ============================================================================
# Block Detection Functions
# ============================================================================

# Check if a block exists by trying to read its metadata
# More reliable than blocks list (which is tab-scoped)
block_exists() {
    local block_id="$1"
    if [ -z "$block_id" ]; then
        return 1
    fi
    # getmeta succeeds if block exists, fails with "not found" if it doesn't
    wsh getmeta -b "block:${block_id}" view 2>/dev/null | grep -q . 2>/dev/null
}

# ============================================================================
# Block ID Parsing
# ============================================================================

# Parse block ID from wsh command output
# Handles formats like:
#   "run block created: block:UUID"
#   "created block block:UUID"
#   "block:UUID"
#   (empty - for commands like wsh view that don't print)
parse_block_id() {
    local output="$1"
    local block_id=""

    # Extract block:UUID pattern
    block_id=$(echo "$output" | grep -oP 'block:[a-f0-9-]+' | head -1)
    # Strip "block:" prefix
    block_id="${block_id#block:}"

    echo "$block_id"
}

# ============================================================================
# Widget Creation Functions
# ============================================================================

get_project_dir() {
    echo "${YOYO_PROJECT_DIR:-$PWD}"
}

# Create a widget block and return its block_id
create_widget_block() {
    local widget="$1"
    local project_dir
    project_dir=$(get_project_dir)
    local output=""
    local block_id=""

    case "$widget" in
        yoyo-cli)
            output=$(wsh run -c "clear && cd '$project_dir' && (command -v yoyo-cli >/dev/null && yoyo-cli || command -v claude >/dev/null && claude || bash)" 2>&1) || true
            block_id=$(parse_block_id "$output")
            ;;
        files)
            # wsh view doesn't print block ID to stdout
            # Collect block IDs before opening, excluding our own ephemeral block
            local before_ids self_id
            self_id="${WAVETERM_BLOCKID:-}"
            before_ids=$(wsh blocks list --json --timeout=3000 2>/dev/null | jq -r '.[].blockid' 2>/dev/null) || true
            wsh view "$project_dir" &>/dev/null || true
            sleep 0.8
            local after_ids new_id
            after_ids=$(wsh blocks list --json --timeout=3000 2>/dev/null | jq -r '.[].blockid' 2>/dev/null) || true
            # Find new ID that wasn't in before and isn't our own ephemeral block
            for new_id in $after_ids; do
                [ "$new_id" = "$self_id" ] && continue
                if ! echo "$before_ids" | grep -qF "$new_id"; then
                    block_id="$new_id"
                    break
                fi
            done
            # If diff detection failed, the file browser still opened via wsh view
            # Use a placeholder so create_widget_block doesn't return failure
            if [ -z "$block_id" ]; then
                echo ""
                return 0
            fi
            ;;
        gui)
            output=$(wsh web open "http://localhost:5173" 2>&1) || true
            block_id=$(parse_block_id "$output")
            ;;
        system)
            # Create a term block and immediately convert it to sysinfo view
            output=$(wsh run -c "sleep infinity" 2>&1) || true
            block_id=$(parse_block_id "$output")
            if [ -n "$block_id" ]; then
                sleep 0.3
                # Convert the term block to sysinfo view
                wsh setmeta -b "block:${block_id}" view=sysinfo "sysinfo:type=CPU + Mem" &>/dev/null || true
            fi
            ;;
        terminal)
            output=$(wsh run -c "cd '$project_dir' && bash" 2>&1) || true
            block_id=$(parse_block_id "$output")
            ;;
        *)
            echo "Unknown widget: $widget" >&2
            return 1
            ;;
    esac

    if [ -n "$block_id" ]; then
        # Tag the block with widget name for fallback identification
        wsh setmeta -b "block:${block_id}" "${META_KEY}=${widget}" &>/dev/null || true
        echo "$block_id"
        return 0
    fi

    return 1
}

# ============================================================================
# Toggle Logic
# ============================================================================

toggle_widget() {
    local widget="$1"

    init_state_file

    # Step 1: Check state file for known block
    local block_id
    block_id=$(get_widget_block_id "$widget")

    # Step 2: If we have a block_id, check if it still exists
    if [ -n "$block_id" ] && block_exists "$block_id"; then
        # Block exists and is visible - delete it (toggle off)
        wsh deleteblock -b "block:${block_id}" &>/dev/null || true
        set_widget_state "$widget" "$block_id" false
        return 0
    fi

    # Step 3: No existing block found (or it was manually closed) - create fresh (toggle on)
    local new_id
    new_id=$(create_widget_block "$widget") || {
        echo "Failed to create widget block: $widget" >&2
        return 1
    }

    if [ -n "$new_id" ]; then
        set_widget_state "$widget" "$new_id" true
    fi

    return 0
}

# ============================================================================
# Main
# ============================================================================

main() {
    local widget=""
    local self_delete=false

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --self-delete)
                self_delete=true
                shift
                ;;
            *)
                widget="$1"
                shift
                ;;
        esac
    done

    if [ -z "$widget" ]; then
        echo "Usage: wave-toggle.sh <widget-name> [--self-delete]" >&2
        echo "Widget names: yoyo-cli, files, gui, system, terminal" >&2
        exit 1
    fi

    # Validate widget name
    case "$widget" in
        yoyo-cli|files|gui|system|terminal) ;;
        *)
            echo "Unknown widget: $widget" >&2
            echo "Valid names: yoyo-cli, files, gui, system, terminal" >&2
            exit 1
            ;;
    esac

    # Ensure wsh is available
    if ! command -v wsh &>/dev/null; then
        echo "Error: wsh command not found. Is Wave Terminal running?" >&2
        exit 1
    fi

    # Ensure jq is available
    if ! command -v jq &>/dev/null; then
        echo "Error: jq is required for wave-toggle.sh" >&2
        exit 1
    fi

    toggle_widget "$widget"

    # Clean up: delete the ephemeral block created by the widget button click
    # When invoked from a widget blockdef with --self-delete, remove our own block
    if [ "$self_delete" = true ] && [ -n "${WAVETERM_BLOCKID:-}" ]; then
        wsh deleteblock -b "block:${WAVETERM_BLOCKID}" 2>/dev/null || true
    fi
}

main "$@"
