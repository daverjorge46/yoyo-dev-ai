#!/bin/bash

# Yoyo Dev Status Display
# Shows current project status, tasks, or getting started guide

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

# Clear and setup
clear

# Header
echo ""
echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${CYAN}│${RESET}     ${BOLD}YOYO DEV - PROJECT STATUS${RESET}        ${BOLD}${CYAN}│${RESET}"
echo -e "${BOLD}${CYAN}└─────────────────────────────────────────┘${RESET}"
echo ""

# Find active tasks
ACTIVE_TASKS=()
ACTIVE_SPECS=()
ACTIVE_FIXES=()

if [ -d "./.yoyo-dev" ]; then
    # Find most recent spec with tasks
    if [ -d "./.yoyo-dev/specs" ]; then
        ACTIVE_SPECS=($(find ./.yoyo-dev/specs -name "tasks.md" -o -name "MASTER-TASKS.md" 2>/dev/null | sort -r))
    fi

    # Find most recent fix with tasks
    if [ -d "./.yoyo-dev/fixes" ]; then
        ACTIVE_FIXES=($(find ./.yoyo-dev/fixes -name "tasks.md" -o -name "MASTER-TASKS.md" 2>/dev/null | sort -r))
    fi

    # Combine all tasks
    ACTIVE_TASKS=("${ACTIVE_SPECS[@]}" "${ACTIVE_FIXES[@]}")
fi

# Function to display task status
show_task_status() {
    local task_file="$1"
    local task_dir=$(dirname "$task_file")
    local task_name=$(basename "$task_dir")

    echo -e "${BOLD}${GREEN}📋 Active Task:${RESET} $task_name"
    echo ""

    # Count total and completed tasks
    local total_tasks=$(grep -c "^##\s*Task" "$task_file" 2>/dev/null || echo "0")
    local completed_tasks=$(grep -c "^- \[x\]" "$task_file" 2>/dev/null || echo "0")
    local total_subtasks=$(grep -c "^- \[" "$task_file" 2>/dev/null || echo "0")
    local completed_subtasks=$(grep -c "^- \[x\]" "$task_file" 2>/dev/null || echo "0")

    # Progress bar
    if [ "$total_subtasks" -gt 0 ]; then
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

    # Get first incomplete task
    local current_task=$(grep -A 10 "^##\s*Task" "$task_file" | grep -m 1 "^- \[ \]" || echo "")

    if [ -n "$current_task" ]; then
        # Show up to 5 incomplete subtasks
        grep "^- \[ \]" "$task_file" | head -5 | while read -r line; do
            echo -e "  ${YELLOW}○${RESET} ${line#- [ ] }"
        done
        echo ""

        local remaining=$(grep -c "^- \[ \]" "$task_file" 2>/dev/null || echo "0")
        if [ "$remaining" -gt 5 ]; then
            echo -e "${DIM}  ... and $((remaining - 5)) more${RESET}"
            echo ""
        fi
    else
        echo -e "  ${GREEN}✓ All tasks completed!${RESET}"
        echo ""
    fi

    # Show file path
    echo -e "${DIM}Task file: $task_file${RESET}"
    echo ""

    # Next action
    echo -e "${BOLD}${CYAN}Next Action:${RESET}"
    if [ "$completed_subtasks" -lt "$total_subtasks" ]; then
        echo -e "  ${GREEN}/execute-tasks${RESET}  - Continue implementation"
    else
        echo -e "  ${GREEN}✓${RESET} Ready for review/merge"
    fi
}

# Function to show getting started guide
show_getting_started() {
    echo -e "${BOLD}${YELLOW}🚀 Getting Started${RESET}"
    echo ""
    echo -e "${DIM}No active tasks found. Start your workflow:${RESET}"
    echo ""

    # Check if product is configured
    if [ -f "./.yoyo-dev/product/mission-lite.md" ] || [ -f "./.yoyo-dev/product/mission.md" ]; then
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
        if [ -f "./.yoyo-dev/product/roadmap.md" ]; then
            local next_item=$(grep "^- \[ \]" "./.yoyo-dev/product/roadmap.md" | head -1 | sed 's/^- \[ \] //' || echo "")
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

# Function to show spec status
show_spec_status() {
    echo -e "${BOLD}${BLUE}📄 Recent Specifications:${RESET}"
    echo ""

    # Find recent specs
    if [ -d "./.yoyo-dev/specs" ]; then
        local spec_count=0
        for spec_dir in $(find ./.yoyo-dev/specs -mindepth 1 -maxdepth 1 -type d | sort -r | head -3); do
            local spec_name=$(basename "$spec_dir")
            local has_tasks=""

            if [ -f "$spec_dir/tasks.md" ] || [ -f "$spec_dir/MASTER-TASKS.md" ]; then
                has_tasks=" ${GREEN}[Has tasks]${RESET}"
            else
                has_tasks=" ${YELLOW}[No tasks yet]${RESET}"
            fi

            echo -e "  ${CYAN}•${RESET} $spec_name$has_tasks"
            spec_count=$((spec_count + 1))
        done

        if [ "$spec_count" -eq 0 ]; then
            echo -e "  ${DIM}No specifications found${RESET}"
        fi
        echo ""
    fi
}

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

# Footer
echo ""
echo "─────────────────────────────────────────"
echo ""
echo -e "${DIM}Press ${CYAN}Ctrl+B${RESET}${DIM} then arrows to switch panes${RESET}"
echo -e "${DIM}Press ${CYAN}Ctrl+C${RESET}${DIM} then ${CYAN}Ctrl+D${RESET}${DIM} to close this pane${RESET}"
echo -e "${DIM}Type ${CYAN}/yoyo-help${RESET}${DIM} for complete reference${RESET}"
echo ""

# Keep monitoring (refresh every 5 seconds)
while true; do
    sleep 5

    # Re-run this script to refresh
    exec "$0"
done
