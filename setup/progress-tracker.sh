#!/bin/bash
# Progress Tracker for Yoyo Dev
# Writes execution progress to .yoyo-dev/.cache/execution-progress.json
# Used by GUI dashboard and /ralph-status command

set -euo pipefail

# Determine project root
YOYO_PROJECT_ROOT="${YOYO_PROJECT_ROOT:-$(pwd)}"
CACHE_DIR="$YOYO_PROJECT_ROOT/.yoyo-dev/.cache"
PROGRESS_FILE="$CACHE_DIR/execution-progress.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure cache directory exists
ensure_cache_dir() {
    mkdir -p "$CACHE_DIR"
}

# Get current ISO timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Initialize or reset progress tracking
init_progress() {
    local spec_or_fix_name="${1:-}"
    local type="${2:-spec}"  # spec or fix
    local total_tasks="${3:-0}"

    ensure_cache_dir

    cat > "$PROGRESS_FILE" << EOF
{
    "is_running": true,
    "spec_or_fix_name": "$spec_or_fix_name",
    "type": "$type",
    "current_phase": "initialization",
    "current_parent_task": null,
    "current_subtask": null,
    "total_parent_tasks": $total_tasks,
    "completed_parent_tasks": 0,
    "total_subtasks": 0,
    "completed_subtasks": 0,
    "percentage": 0,
    "current_action": "Starting execution",
    "started_at": "$(get_timestamp)",
    "last_updated": "$(get_timestamp)"
}
EOF
    echo -e "${GREEN}Progress tracking initialized for $spec_or_fix_name${NC}"
}

# Update current task
update_task() {
    local task_description="${1:-}"
    local task_index="${2:-0}"
    local total_tasks="${3:-0}"

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        echo -e "${YELLOW}Warning: Progress file not found. Call 'init' first.${NC}" >&2
        return 1
    fi

    local percentage=0
    if [[ $total_tasks -gt 0 ]]; then
        percentage=$(( (task_index * 100) / total_tasks ))
    fi

    # Update JSON file
    local temp_file=$(mktemp)
    jq --arg task "$task_description" \
       --arg phase "implementation" \
       --argjson idx "$task_index" \
       --argjson total "$total_tasks" \
       --argjson pct "$percentage" \
       --arg ts "$(get_timestamp)" \
       '.current_parent_task = $task |
        .current_phase = $phase |
        .completed_parent_tasks = $idx |
        .total_parent_tasks = $total |
        .percentage = $pct |
        .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    mv "$temp_file" "$PROGRESS_FILE"
}

# Update subtask
update_subtask() {
    local subtask_description="${1:-}"
    local subtask_index="${2:-0}"
    local total_subtasks="${3:-0}"

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        return 1
    fi

    local temp_file=$(mktemp)
    jq --arg subtask "$subtask_description" \
       --argjson idx "$subtask_index" \
       --argjson total "$total_subtasks" \
       --arg ts "$(get_timestamp)" \
       '.current_subtask = $subtask |
        .completed_subtasks = $idx |
        .total_subtasks = $total |
        .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    mv "$temp_file" "$PROGRESS_FILE"
}

# Mark task as completed
complete_task() {
    local task_index="${1:-0}"
    local total_tasks="${2:-0}"

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        return 1
    fi

    local percentage=0
    if [[ $total_tasks -gt 0 ]]; then
        percentage=$(( ((task_index + 1) * 100) / total_tasks ))
    fi

    local temp_file=$(mktemp)
    jq --argjson idx "$((task_index + 1))" \
       --argjson total "$total_tasks" \
       --argjson pct "$percentage" \
       --arg ts "$(get_timestamp)" \
       '.completed_parent_tasks = $idx |
        .total_parent_tasks = $total |
        .percentage = $pct |
        .current_subtask = null |
        .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    mv "$temp_file" "$PROGRESS_FILE"
}

# Set current action (brief status message)
set_action() {
    local action="${1:-}"

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        return 1
    fi

    local temp_file=$(mktemp)
    jq --arg action "$action" \
       --arg ts "$(get_timestamp)" \
       '.current_action = $action | .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    mv "$temp_file" "$PROGRESS_FILE"
}

# Set phase
set_phase() {
    local phase="${1:-}"

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        return 1
    fi

    local temp_file=$(mktemp)
    jq --arg phase "$phase" \
       --arg ts "$(get_timestamp)" \
       '.current_phase = $phase | .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    mv "$temp_file" "$PROGRESS_FILE"
}

# Mark execution as complete
finish_progress() {
    local success="${1:-true}"

    if [[ ! -f "$PROGRESS_FILE" ]]; then
        return 1
    fi

    local temp_file=$(mktemp)
    if [[ "$success" == "true" ]]; then
        jq --arg ts "$(get_timestamp)" \
           '.is_running = false |
            .percentage = 100 |
            .current_phase = "completed" |
            .current_action = "Execution completed" |
            .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    else
        jq --arg ts "$(get_timestamp)" \
           '.is_running = false |
            .current_phase = "failed" |
            .current_action = "Execution failed" |
            .last_updated = $ts' "$PROGRESS_FILE" > "$temp_file"
    fi
    mv "$temp_file" "$PROGRESS_FILE"
    echo -e "${GREEN}Progress tracking finished${NC}"
}

# Get current status (for /ralph-status command)
get_status() {
    if [[ ! -f "$PROGRESS_FILE" ]]; then
        echo -e "${YELLOW}No active execution found${NC}"

        # Check for recent state.json files
        local specs_dir="$YOYO_PROJECT_ROOT/.yoyo-dev/specs"
        if [[ -d "$specs_dir" ]]; then
            local latest_spec=$(ls -1t "$specs_dir" 2>/dev/null | head -1)
            if [[ -n "$latest_spec" ]]; then
                local state_file="$specs_dir/$latest_spec/state.json"
                if [[ -f "$state_file" ]]; then
                    echo ""
                    echo -e "${CYAN}Last spec: $latest_spec${NC}"
                    local phase=$(jq -r '.current_phase // "unknown"' "$state_file" 2>/dev/null)
                    local completed=$(jq -r '.execution_completed // false' "$state_file" 2>/dev/null)
                    echo -e "  Phase: $phase"
                    echo -e "  Completed: $completed"
                fi
            fi
        fi
        return 0
    fi

    local is_running=$(jq -r '.is_running' "$PROGRESS_FILE")
    local spec_name=$(jq -r '.spec_or_fix_name // "Unknown"' "$PROGRESS_FILE")
    local type=$(jq -r '.type // "spec"' "$PROGRESS_FILE")
    local phase=$(jq -r '.current_phase // "unknown"' "$PROGRESS_FILE")
    local task=$(jq -r '.current_parent_task // "None"' "$PROGRESS_FILE")
    local subtask=$(jq -r '.current_subtask // "None"' "$PROGRESS_FILE")
    local completed=$(jq -r '.completed_parent_tasks // 0' "$PROGRESS_FILE")
    local total=$(jq -r '.total_parent_tasks // 0' "$PROGRESS_FILE")
    local percentage=$(jq -r '.percentage // 0' "$PROGRESS_FILE")
    local action=$(jq -r '.current_action // ""' "$PROGRESS_FILE")
    local started=$(jq -r '.started_at // ""' "$PROGRESS_FILE")
    local updated=$(jq -r '.last_updated // ""' "$PROGRESS_FILE")

    # Calculate elapsed time
    local elapsed=""
    if [[ -n "$started" && "$started" != "null" ]]; then
        local start_epoch=$(date -d "$started" +%s 2>/dev/null || echo "0")
        local now_epoch=$(date +%s)
        local diff=$((now_epoch - start_epoch))
        local mins=$((diff / 60))
        local secs=$((diff % 60))
        elapsed="${mins}m ${secs}s"
    fi

    # Display status
    echo ""
    echo -e "${CYAN}╭──────────────────────────────────────────────────────────────────╮${NC}"
    echo -e "${CYAN}│                      EXECUTION STATUS                            │${NC}"
    echo -e "${CYAN}╰──────────────────────────────────────────────────────────────────╯${NC}"
    echo ""

    if [[ "$is_running" == "true" ]]; then
        echo -e "  ${GREEN}●${NC} Status:       ${GREEN}Running${NC}"
    else
        echo -e "  ${YELLOW}○${NC} Status:       ${YELLOW}Idle${NC}"
    fi

    echo -e "  📁 ${type^}:        ${BLUE}$spec_name${NC}"
    echo -e "  🔄 Phase:        $phase"
    echo -e "  ⏱️  Elapsed:      $elapsed"
    echo ""
    echo -e "  ${CYAN}Progress:${NC}       $completed/$total tasks ($percentage%)"

    # Progress bar
    local bar_width=40
    local filled=$((percentage * bar_width / 100))
    local empty=$((bar_width - filled))
    printf "  ["
    printf "${GREEN}%0.s█${NC}" $(seq 1 $filled 2>/dev/null || echo "")
    printf "%0.s░" $(seq 1 $empty 2>/dev/null || echo "")
    printf "]\n"

    echo ""
    if [[ "$task" != "null" && "$task" != "None" ]]; then
        echo -e "  ${YELLOW}Current Task:${NC}"
        echo -e "    $task"
    fi

    if [[ "$subtask" != "null" && "$subtask" != "None" ]]; then
        echo -e "  ${YELLOW}Current Subtask:${NC}"
        echo -e "    $subtask"
    fi

    if [[ -n "$action" && "$action" != "null" ]]; then
        echo ""
        echo -e "  ${CYAN}Action:${NC} $action"
    fi

    echo ""
    echo -e "  Last updated: $updated"
    echo ""
}

# Show JSON output (for programmatic use)
get_json() {
    if [[ -f "$PROGRESS_FILE" ]]; then
        cat "$PROGRESS_FILE"
    else
        echo '{"is_running": false, "error": "No progress file found"}'
    fi
}

# Main command dispatcher
main() {
    local cmd="${1:-status}"
    shift || true

    case "$cmd" in
        init)
            init_progress "$@"
            ;;
        update-task|task)
            update_task "$@"
            ;;
        update-subtask|subtask)
            update_subtask "$@"
            ;;
        complete-task|complete)
            complete_task "$@"
            ;;
        action)
            set_action "$@"
            ;;
        phase)
            set_phase "$@"
            ;;
        finish)
            finish_progress "$@"
            ;;
        status)
            get_status
            ;;
        json)
            get_json
            ;;
        help|-h|--help)
            echo "Usage: progress-tracker.sh <command> [args]"
            echo ""
            echo "Commands:"
            echo "  init <name> <type> <total>   Initialize progress tracking"
            echo "  task <desc> <idx> <total>    Update current task"
            echo "  subtask <desc> <idx> <total> Update current subtask"
            echo "  complete <idx> <total>       Mark task as completed"
            echo "  action <message>             Set current action message"
            echo "  phase <phase_name>           Set current phase"
            echo "  finish [true|false]          Mark execution as finished"
            echo "  status                       Show current status (default)"
            echo "  json                         Output status as JSON"
            ;;
        *)
            echo "Unknown command: $cmd"
            echo "Use 'progress-tracker.sh help' for usage"
            exit 1
            ;;
    esac
}

main "$@"
