#!/bin/bash

# Task Monitor - Terminal UI for tracking task progress
# Displays a live updating panel showing task status

set -euo pipefail

# Colors
readonly COLOR_RESET="\033[0m"
readonly COLOR_BOLD="\033[1m"
readonly COLOR_DIM="\033[2m"
readonly COLOR_GREEN="\033[32m"
readonly COLOR_YELLOW="\033[33m"
readonly COLOR_BLUE="\033[34m"
readonly COLOR_CYAN="\033[36m"
readonly COLOR_GRAY="\033[90m"
readonly COLOR_RED="\033[31m"

# Icons
readonly ICON_COMPLETE="✅"
readonly ICON_IN_PROGRESS="🔄"
readonly ICON_PENDING="⏳"
readonly ICON_CURRENT="👉"
readonly ICON_ERROR="❌"

# Parse MASTER-TASKS.md and extract task information
parse_tasks() {
    local task_file="$1"

    if [[ ! -f "$task_file" ]]; then
        echo "Task file not found: $task_file"
        return 1
    fi

    # Extract feature name
    local feature_name
    feature_name=$(head -n 1 "$task_file" | sed 's/^# //')

    # Extract status
    local status
    status=$(grep "^**Status:**" "$task_file" | sed 's/\*\*Status:\*\* //')

    # Extract current task
    local current_task
    current_task=$(grep "^**Active Task:**" "$task_file" | sed 's/\*\*Active Task:\*\* //' || echo "Not started")

    # Extract progress
    local completed
    local total
    completed=$(grep -o "\[x\]" "$task_file" | wc -l)
    total=$(grep -o "\[ \]" "$task_file" | wc -l)
    total=$((completed + total))

    # Calculate percentage
    local percentage=0
    if [[ $total -gt 0 ]]; then
        percentage=$(( (completed * 100) / total ))
    fi

    # Export for rendering
    export FEATURE_NAME="$feature_name"
    export STATUS="$status"
    export CURRENT_TASK="$current_task"
    export COMPLETED="$completed"
    export TOTAL="$total"
    export PERCENTAGE="$percentage"
}

# Render progress bar
render_progress_bar() {
    local percentage=$1
    local width=30
    local filled=$(( (percentage * width) / 100 ))
    local empty=$(( width - filled ))

    echo -n "["
    for ((i=0; i<filled; i++)); do echo -n "█"; done
    for ((i=0; i<empty; i++)); do echo -n "░"; done
    echo -n "]"
}

# Render task panel
render_panel() {
    local task_file="$1"

    parse_tasks "$task_file"

    clear

    echo -e "${COLOR_BOLD}${COLOR_CYAN}╔════════════════════════════════════════════════════════════════╗${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${COLOR_BOLD}YOYO DEV - TASK MONITOR${COLOR_RESET}                                   ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╠════════════════════════════════════════════════════════════════╣${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}                                                                ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${COLOR_BOLD}Feature:${COLOR_RESET} ${FEATURE_NAME:0:45}"
    printf "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${COLOR_BOLD}Status:${COLOR_RESET} ${COLOR_YELLOW}${STATUS}${COLOR_RESET}"
    printf "                                           ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}                                                                ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╠════════════════════════════════════════════════════════════════╣${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${COLOR_BOLD}Progress:${COLOR_RESET} ${COMPLETED}/${TOTAL} tasks (${PERCENTAGE}%)"
    printf "                                ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
    echo -e -n "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  "
    render_progress_bar "$PERCENTAGE"
    printf "  ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}                                                                ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╠════════════════════════════════════════════════════════════════╣${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${COLOR_BOLD}Current Task:${COLOR_RESET}"
    printf "                                            ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${ICON_CURRENT} ${CURRENT_TASK:0:50}"
    printf "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}                                                                ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╠════════════════════════════════════════════════════════════════╣${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${COLOR_BOLD}Recent Tasks:${COLOR_RESET}"
    printf "                                             ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"

    # Extract and display last 5 tasks
    local tasks
    tasks=$(grep -E "^- \[(x| )\]" "$task_file" | tail -5 || true)

    while IFS= read -r task; do
        if [[ "$task" =~ ^\-\ \[x\] ]]; then
            local task_text="${task#- [x] }"
            echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${ICON_COMPLETE} ${COLOR_DIM}${task_text:0:50}${COLOR_RESET}"
            printf "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
        elif [[ "$task" =~ ^\-\ \[\ \] ]]; then
            local task_text="${task#- [ ] }"
            echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}  ${ICON_PENDING} ${task_text:0:50}"
            printf "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}\n"
        fi
    done <<< "$tasks"

    echo -e "${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}                                                                ${COLOR_BOLD}${COLOR_CYAN}║${COLOR_RESET}"
    echo -e "${COLOR_BOLD}${COLOR_CYAN}╚════════════════════════════════════════════════════════════════╝${COLOR_RESET}"
    echo ""
    echo -e "${COLOR_GRAY}Press Ctrl+C to stop monitoring${COLOR_RESET}"
}

# Watch mode - continuously update panel
watch_tasks() {
    local task_file="$1"
    local interval="${2:-2}"  # Default 2 seconds

    while true; do
        render_panel "$task_file"
        sleep "$interval"
    done
}

# Main
main() {
    local task_file="${1:-}"
    local mode="${2:-once}"

    if [[ -z "$task_file" ]]; then
        echo "Usage: task-monitor.sh <path-to-MASTER-TASKS.md> [watch|once]"
        exit 1
    fi

    if [[ "$mode" == "watch" ]]; then
        watch_tasks "$task_file"
    else
        render_panel "$task_file"
    fi
}

main "$@"
