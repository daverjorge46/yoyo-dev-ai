#!/bin/bash
# Wave Widget Toggle Script for Yoyo Dev
# Toggles visibility of widget panes instead of creating duplicates
#
# Usage: wave-toggle.sh <widget-name> [--self-delete]
# Widget names: yoyo-cli, files, gui, terminal
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
readonly LOCK_FILE="${STATE_DIR}/.wave-toggle.lock"
readonly META_KEY="yoyo:widget"

# The block ID of the ephemeral term block that Wave created to run this script.
# We must exclude it from all block scans to avoid confusing it with real widgets.
readonly SELF_BLOCK="${WAVETERM_BLOCKID:-}"

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

# Read a widget's visible flag from state file
get_widget_visible() {
    local widget="$1"
    if [ -f "$STATE_FILE" ] && command -v jq &>/dev/null; then
        jq -r --arg w "$widget" '.[$w].visible // empty' "$STATE_FILE" 2>/dev/null
    fi
}

# Update widget state in state file (atomic write)
set_widget_state() {
    local widget="$1"
    local block_id="$2"
    local visible="$3"

    init_state_file

    if command -v jq &>/dev/null; then
        local tmp="${STATE_FILE}.tmp.$$"
        jq --arg w "$widget" --arg bid "$block_id" --argjson vis "$visible" \
            '.[$w] = {"block_id": $bid, "visible": $vis}' \
            "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
    fi
}

# Remove a widget entry from the state file
clear_widget_state() {
    local widget="$1"

    if [ -f "$STATE_FILE" ] && command -v jq &>/dev/null; then
        local tmp="${STATE_FILE}.tmp.$$"
        jq --arg w "$widget" 'del(.[$w])' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
    fi
}

# ============================================================================
# Block Detection Functions
# ============================================================================

# Check if a block exists by trying to read its metadata.
# Retries once after a short delay for Wave API latency.
block_exists() {
    local block_id="$1"
    if [ -z "$block_id" ]; then
        return 1
    fi
    # First attempt
    if wsh getmeta -b "block:${block_id}" view 2>/dev/null | grep -q . 2>/dev/null; then
        return 0
    fi
    # Retry after brief delay
    sleep 0.3
    wsh getmeta -b "block:${block_id}" view 2>/dev/null | grep -q . 2>/dev/null
}

# Find a block by its yoyo:widget metadata tag (fallback when state file is stale).
# Excludes the ephemeral self-block ($SELF_BLOCK) from the scan.
# Returns the block ID if found, empty string otherwise.
find_block_by_meta() {
    local widget="$1"
    local all_blocks bid meta_val
    all_blocks=$(wsh blocks list --json --timeout=3000 2>/dev/null) || true
    if [ -z "$all_blocks" ] || [ "$all_blocks" = "null" ]; then
        return 1
    fi
    for bid in $(echo "$all_blocks" | jq -r '.[].blockid' 2>/dev/null); do
        # Skip our own ephemeral block
        [ -n "$SELF_BLOCK" ] && [ "$bid" = "$SELF_BLOCK" ] && continue
        meta_val=$(wsh getmeta -b "block:${bid}" "${META_KEY}" 2>/dev/null) || true
        if [ "$meta_val" = "$widget" ]; then
            echo "$bid"
            return 0
        fi
    done
    return 1
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
            local before_ids
            before_ids=$(wsh blocks list --json --timeout=3000 2>/dev/null | jq -r '.[].blockid' 2>/dev/null) || true
            wsh view "$project_dir" &>/dev/null || true
            sleep 0.8
            local after_ids new_id
            after_ids=$(wsh blocks list --json --timeout=3000 2>/dev/null | jq -r '.[].blockid' 2>/dev/null) || true
            # Find new ID that wasn't in before and isn't our own ephemeral block
            for new_id in $after_ids; do
                [ -n "$SELF_BLOCK" ] && [ "$new_id" = "$SELF_BLOCK" ] && continue
                if ! echo "$before_ids" | grep -qF "$new_id"; then
                    block_id="$new_id"
                    break
                fi
            done
            # If diff detection failed, the file browser still opened via wsh view
            if [ -z "$block_id" ]; then
                echo ""
                return 0
            fi
            ;;
        gui)
            output=$(wsh web open "http://localhost:5173" 2>&1) || true
            block_id=$(parse_block_id "$output")
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

# Resolve the real block ID for a widget, checking state file then metadata scan.
# Clears stale state entries. Returns block ID on stdout or empty + return 1.
resolve_widget_block() {
    local widget="$1"

    # Step 1: Check state file for known block
    local block_id
    block_id=$(get_widget_block_id "$widget")

    if [ -n "$block_id" ]; then
        # Verify block still exists in Wave
        if block_exists "$block_id"; then
            echo "$block_id"
            return 0
        fi
        # Stale entry - clear it
        clear_widget_state "$widget"
    fi

    # Step 2: Fallback - scan blocks by metadata tag
    local meta_id
    meta_id=$(find_block_by_meta "$widget") || true
    if [ -n "$meta_id" ]; then
        # Update state file with the found block
        set_widget_state "$widget" "$meta_id" true
        echo "$meta_id"
        return 0
    fi

    return 1
}

toggle_widget() {
    local widget="$1"

    init_state_file

    # Try to find an existing block for this widget
    local block_id
    block_id=$(resolve_widget_block "$widget") || true

    if [ -n "$block_id" ]; then
        # Block exists - toggle OFF (delete it)
        wsh deleteblock -b "block:${block_id}" &>/dev/null || true
        clear_widget_state "$widget"
        return 0
    fi

    # No existing block - toggle ON (create it)
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
# Main (with flock to prevent concurrent toggles)
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
        echo "Widget names: yoyo-cli, files, gui, terminal" >&2
        exit 1
    fi

    # Validate widget name
    case "$widget" in
        yoyo-cli|files|gui|terminal) ;;
        *)
            echo "Unknown widget: $widget" >&2
            echo "Valid names: yoyo-cli, files, gui, terminal" >&2
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

    # Use flock to prevent concurrent toggles from rapid button clicks.
    # The lock is per-widget to allow different widgets to toggle in parallel.
    mkdir -p "$STATE_DIR"
    local widget_lock="${LOCK_FILE}.${widget}"
    (
        # Wait up to 5 seconds for the lock
        if ! flock -w 5 200; then
            echo "Timeout waiting for toggle lock: $widget" >&2
            exit 1
        fi

        toggle_widget "$widget"

    ) 200>"$widget_lock"

    # Clean up: delete the ephemeral block created by the widget button click.
    # Run in a background subshell with a small delay so the toggle fully
    # completes before the block disappears.
    if [ "$self_delete" = true ] && [ -n "${SELF_BLOCK}" ]; then
        (
            sleep 0.3
            wsh deleteblock -b "block:${SELF_BLOCK}" 2>/dev/null || true
        ) &
    fi
}

main "$@"
