#!/bin/bash

# Yoyo Dev Status Display
# Shows current project status, tasks, or getting started guide
# Auto-refreshes every 10 seconds to show real-time progress
#
# Configuration:
#   YOYO_STATUS_REFRESH - Custom refresh interval in seconds
#
# Examples:
#   YOYO_STATUS_REFRESH=5 yoyo-status.sh   # Faster updates (higher CPU)
#   YOYO_STATUS_REFRESH=30 yoyo-status.sh  # Slower updates (lower CPU)
#
# Default: 10 seconds (balanced between responsiveness and CPU usage)

set -uo pipefail

# Color codes
readonly CYAN='\033[0;36m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

# Refresh interval in seconds
readonly REFRESH_INTERVAL="${YOYO_STATUS_REFRESH:-10}"

# Function to clear screen properly
clear_screen() {
    clear
    # Move cursor to top-left
    printf '\033[H'
}

# Function to parse state.json
parse_state_json() {
    local state_file="$1"

    if [ ! -f "$state_file" ]; then
        echo ""
        return 1
    fi

    # Extract current_phase using grep and basic parsing
    local phase=$(grep '"current_phase"' "$state_file" 2>/dev/null | sed 's/.*"current_phase"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    echo "$phase"
}

# Function to find active tasks
find_active_tasks() {
    ACTIVE_TASKS=()
    ACTIVE_SPECS=()
    ACTIVE_FIXES=()

    if [ -d "./yoyo-dev" ]; then
        # Find most recent spec with tasks
        if [ -d "./yoyo-dev/specs" ]; then
            ACTIVE_SPECS=($(find ./yoyo-dev/specs -name "tasks.md" -o -name "MASTER-TASKS.md" 2>/dev/null | sort -r))
        fi

        # Find most recent fix with tasks
        if [ -d "./yoyo-dev/fixes" ]; then
            ACTIVE_FIXES=($(find ./yoyo-dev/fixes -name "tasks.md" -o -name "MASTER-TASKS.md" 2>/dev/null | sort -r))
        fi

        # Combine all tasks
        ACTIVE_TASKS=("${ACTIVE_SPECS[@]}" "${ACTIVE_FIXES[@]}")
    fi
}

# Function to display header
display_header() {
    echo ""
    echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────┐${RESET}"
    echo -e "${BOLD}${CYAN}│${RESET}     ${BOLD}YOYO DEV - PROJECT STATUS${RESET}        ${BOLD}${CYAN}│${RESET}"
    echo -e "${BOLD}${CYAN}└─────────────────────────────────────────┘${RESET}"
    echo ""

    # Show last update time
    local current_time=$(date '+%H:%M:%S')
    echo -e "${DIM}Last updated: $current_time (refreshes every ${REFRESH_INTERVAL}s)${RESET}"
    echo ""
}

# Function to display task status
show_task_status() {
    local task_file="$1"
    local task_dir=$(dirname "$task_file")
    local task_name=$(basename "$task_dir")

    echo -e "${BOLD}${GREEN}📋 Active Task:${RESET} $task_name"
    echo ""

    # Count total and completed tasks (optimized with single awk pass)
    local counts=$(awk '
        /^##[[:space:]]*Task/ { total_tasks++ }
        /^-[[:space:]]*\[x\]/ { completed_subtasks++; total_subtasks++ }
        /^-[[:space:]]*\[[[:space:]]\]/ { total_subtasks++; remaining++ }
        END {
            printf "%d %d %d %d",
                total_tasks+0,
                completed_subtasks+0,
                total_subtasks+0,
                remaining+0
        }
    ' "$task_file" 2>/dev/null || echo "0 0 0 0")

    # Parse results
    read -r total_tasks completed_tasks total_subtasks remaining <<< "$counts"
    local completed_subtasks="$completed_tasks"

    # Validate numeric (set to 0 if not a number)
    [[ "$total_tasks" =~ ^[0-9]+$ ]] || total_tasks=0
    [[ "$completed_tasks" =~ ^[0-9]+$ ]] || completed_tasks=0
    [[ "$total_subtasks" =~ ^[0-9]+$ ]] || total_subtasks=0
    [[ "$completed_subtasks" =~ ^[0-9]+$ ]] || completed_subtasks=0

    # Progress bar
    if [[ $total_subtasks -gt 0 ]]; then
        local progress=$(( (completed_subtasks * 100) / total_subtasks ))
        local bar_filled=$(( progress / 5 ))
        local bar_empty=$(( 20 - bar_filled ))

        echo -e "${BOLD}Progress:${RESET}"
        echo -n "["
        for ((i=0; i<bar_filled; i++)); do echo -n "█"; done
        for ((i=0; i<bar_empty; i++)); do echo -n "░"; done
        echo -e "] ${BOLD}$progress%${RESET}"
        echo ""
        echo -e "${DIM}Tasks: $completed_tasks/$total_tasks complete${RESET}"
        echo -e "${DIM}Subtasks: $completed_subtasks/$total_subtasks complete${RESET}"
        echo ""
    fi

    # Show current task
    echo -e "${BOLD}Current Tasks:${RESET}"
    echo ""

    # Get completed and incomplete counts
    local completed_count=$(grep -c "^- \[x\]" "$task_file" 2>/dev/null || echo "0")
    local incomplete_count=$(grep -c "^- \[ \]" "$task_file" 2>/dev/null || echo "0")

    # Show last 2 completed tasks if any
    if [[ $completed_count -gt 0 ]]; then
        echo -e "${DIM}Recently completed:${RESET}"
        grep "^- \[x\]" "$task_file" | tail -2 | while read -r line; do
            echo -e "  ${GREEN}✓${RESET} ${DIM}${line#- [x] }${RESET}"
        done
        echo ""
    fi

    # Show up to 5 incomplete subtasks
    if [[ $incomplete_count -gt 0 ]]; then
        if [[ $completed_count -gt 0 ]]; then
            echo -e "${DIM}Up next:${RESET}"
        fi
        grep "^- \[ \]" "$task_file" | head -5 | while read -r line; do
            echo -e "  ${YELLOW}○${RESET} ${line#- [ ] }"
        done
        echo ""

        # Show remaining count if more than 5
        if [[ $incomplete_count -gt 5 ]]; then
            echo -e "${DIM}  ... and $((incomplete_count - 5)) more${RESET}"
            echo ""
        fi
    else
        if [[ $completed_count -eq 0 ]]; then
            echo -e "  ${DIM}No tasks found${RESET}"
        else
            echo -e "  ${GREEN}✓ All tasks completed!${RESET}"
        fi
        echo ""
    fi

    # Show file path
    echo -e "${DIM}Task file: $task_file${RESET}"
    echo ""

    # Next action - use state.json for accurate phase detection
    echo -e "${BOLD}${CYAN}Next Action:${RESET}"

    # Find state.json in the same directory as tasks
    local state_file="$task_dir/state.json"
    local current_phase=$(parse_state_json "$state_file")

    # Determine next action based on phase and completion
    if [ "$current_phase" = "completed" ] || [ "$completed_subtasks" -eq "$total_subtasks" ] && [ "$total_subtasks" -gt 0 ]; then
        echo -e "  ${GREEN}✓${RESET} Complete - Ready for review/merge"
    elif [ "$current_phase" = "ready_for_execution" ] || [ "$current_phase" = "implementation" ]; then
        echo -e "  ${GREEN}/execute-tasks${RESET}  - Continue implementation"
    elif [ -n "$current_phase" ]; then
        echo -e "  ${GREEN}/execute-tasks${RESET}  - Start implementation"
    else
        # Fallback to completion-based logic
        if [ "$completed_subtasks" -lt "$total_subtasks" ]; then
            echo -e "  ${GREEN}/execute-tasks${RESET}  - Continue implementation"
        else
            echo -e "  ${GREEN}✓${RESET} Complete - Ready for review/merge"
        fi
    fi
}

# Function to show getting started guide
show_getting_started() {
    echo -e "${BOLD}${YELLOW}🚀 Getting Started${RESET}"
    echo ""
    echo -e "${DIM}No active tasks found. Start your workflow:${RESET}"
    echo ""

    # Check if product is configured
    if [ -f "./yoyo-dev/product/mission-lite.md" ] || [ -f "./yoyo-dev/product/mission.md" ]; then
        echo -e "${BOLD}${GREEN}✓ Product Configured${RESET}"
        echo ""
        echo -e "${BOLD}Create Your First Feature:${RESET}"
        echo ""
        echo -e "  ${CYAN}1.${RESET} ${GREEN}/create-new${RESET} \"feature name\""
        echo -e "     ${DIM}Creates spec + tasks in one workflow${RESET}"
        echo ""
        echo -e "  ${CYAN}2.${RESET} ${GREEN}/create-fix${RESET} \"problem description\""
        echo -e "     ${DIM}Systematic bug fix workflow${RESET}"
        echo ""
        echo -e "  ${CYAN}3.${RESET} ${GREEN}/create-spec${RESET}"
        echo -e "     ${DIM}Create detailed spec only (no tasks)${RESET}"
        echo ""

        # Show roadmap items if available
        if [ -f "./yoyo-dev/product/roadmap.md" ]; then
            local next_item=$(grep "^- \[ \]" "./yoyo-dev/product/roadmap.md" | head -1 | sed 's/^- \[ \] //' || echo "")
            if [ -n "$next_item" ]; then
                echo -e "${BOLD}${MAGENTA}📍 Next on Roadmap:${RESET}"
                echo -e "  $next_item"
                echo ""
            fi
        fi
    else
        echo -e "${BOLD}${YELLOW}⚠ Product Not Configured${RESET}"
        echo ""
        echo -e "${BOLD}Start Here:${RESET}"
        echo ""
        echo -e "  ${CYAN}1.${RESET} ${GREEN}/plan-product${RESET}"
        echo -e "     ${DIM}Set mission & roadmap for new product${RESET}"
        echo ""
        echo -e "  ${CYAN}2.${RESET} ${GREEN}/analyze-product${RESET}"
        echo -e "     ${DIM}Setup for existing codebase${RESET}"
        echo ""
    fi

    echo -e "${BOLD}${BLUE}Optional Features:${RESET}"
    echo ""
    echo -e "  ${GREEN}/design-init${RESET}  - Initialize design system"
    echo -e "  ${GREEN}/review${RESET}       - Code review with specialized modes"
    echo ""
}

# Function to calculate completion percentage
calculate_completion() {
    local task_file="$1"

    if [ ! -f "$task_file" ]; then
        echo "0"
        return
    fi

    local total=$(grep -c "^- \[[x ]\]" "$task_file" 2>/dev/null || echo "0")
    local completed=$(grep -c "^- \[x\]" "$task_file" 2>/dev/null || echo "0")

    if [ "$total" -eq 0 ]; then
        echo "0"
    else
        echo $(( (completed * 100) / total ))
    fi
}

# Function to show spec status
show_spec_status() {
    echo -e "${BOLD}${BLUE}📄 Recent Specifications:${RESET}"
    echo ""

    # Find recent specs
    if [ -d "./yoyo-dev/specs" ]; then
        local spec_count=0
        for spec_dir in $(find ./yoyo-dev/specs -mindepth 1 -maxdepth 1 -type d | sort -r | head -3); do
            local spec_name=$(basename "$spec_dir")
            local status_text=""

            # Find task file
            local task_file=""
            if [ -f "$spec_dir/MASTER-TASKS.md" ]; then
                task_file="$spec_dir/MASTER-TASKS.md"
            elif [ -f "$spec_dir/tasks.md" ]; then
                task_file="$spec_dir/tasks.md"
            fi

            if [ -n "$task_file" ]; then
                local completion=$(calculate_completion "$task_file")

                if [ "$completion" -eq 100 ]; then
                    status_text=" ${GREEN}[Complete 100%]${RESET}"
                elif [ "$completion" -gt 0 ]; then
                    status_text=" ${YELLOW}[In Progress ${completion}%]${RESET}"
                else
                    status_text=" ${DIM}[Pending 0%]${RESET}"
                fi
            else
                status_text=" ${DIM}[No tasks yet]${RESET}"
            fi

            echo -e "  ${CYAN}•${RESET} $spec_name$status_text"
            spec_count=$((spec_count + 1))
        done

        if [ "$spec_count" -eq 0 ]; then
            echo -e "  ${DIM}No specifications found${RESET}"
        fi
        echo ""
    fi
}

# Function to display footer
display_footer() {
    echo ""
    echo "─────────────────────────────────────────"
    echo ""
    echo -e "${BOLD}${CYAN}💡 Quick Tips:${RESET}"
    echo -e "${DIM}• Use ${CYAN}/execute-tasks${RESET}${DIM} to continue implementation${RESET}"
    echo -e "${DIM}• Progress updates every ${REFRESH_INTERVAL} seconds automatically${RESET}"
    echo -e "${DIM}• Press ${CYAN}Ctrl+C${RESET}${DIM} to stop auto-refresh${RESET}"
    echo ""
}

# Main display function
render_status() {
    clear_screen
    display_header
    find_active_tasks

    # Main display logic
    if [ ${#ACTIVE_TASKS[@]} -gt 0 ]; then
        # Show most recent active task
        show_task_status "${ACTIVE_TASKS[0]}"
        echo ""
        echo "─────────────────────────────────────────"
        echo ""
        show_spec_status
    else
        # Show getting started guide
        show_getting_started
    fi

    display_footer
}

# Trap Ctrl+C to exit gracefully
trap 'echo ""; echo "Status monitor stopped."; exit 0' INT TERM

# Main loop - auto-refresh
while true; do
    render_status
    sleep "$REFRESH_INTERVAL"
done
