#!/bin/bash

# Yoyo Dev Update Script v3
# Claude Code native interface update workflow

set -e  # Exit on error

# Trap Ctrl+C for clean exit
trap 'echo ""; ui_warning "Update interrupted by user"; exit 130' INT TERM

# ============================================================================
# Load UI Library
# ============================================================================

# Resolve symlink to get actual script location
SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
source "$SCRIPT_DIR/ui-library.sh" 2>/dev/null || {
    # Fallback UI functions (complete set)
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_WARNING='\033[0;33m'
    UI_INFO='\033[0;36m'
    UI_BOLD='\033[1m'
    UI_DIM='\033[2m'
    UI_RESET='\033[0m'
    ICON_CHECK='✓'
    ICON_ERROR='✗'
    ICON_ARROW='→'
    ICON_FOLDER='📁'
    ICON_PACKAGE='📦'
    ICON_SPARKLES='✨'
    ICON_INFO='ℹ'
    ICON_ROCKET='🚀'

    ui_error() { echo -e "${UI_ERROR}${ICON_ERROR}${UI_RESET} $1"; }
    ui_success() { echo -e "${UI_SUCCESS}${ICON_CHECK}${UI_RESET} $1"; }
    ui_warning() { echo -e "${UI_WARNING}⚠${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_INFO}${ICON_INFO}${UI_RESET} $1"; }
    ui_clear_screen() { clear; echo -e "\n${UI_PRIMARY}${UI_BOLD}Yoyo Dev ${1}${UI_RESET}\n"; }
    ui_box_header() { echo -e "\n${UI_BOLD}$1${UI_RESET}\n"; }
    ui_section() { echo -e "\n${UI_BOLD}$1${UI_RESET}"; }
    ui_kv() { echo -e "  ${UI_DIM}$1:${UI_RESET} $2"; }
    ui_step() { echo -e "${UI_PRIMARY}[$1/$2]${UI_RESET} $3"; }
    ui_spinner() { wait $1; }
    ui_ask() { return 0; }
    ui_complete() { echo -e "\n${UI_SUCCESS}${UI_BOLD}$1${UI_RESET}\n"; }
}

# ============================================================================
# Load Wave Install Functions
# ============================================================================

# Source wave-install.sh for config deployment functions
if [ -f "$SCRIPT_DIR/wave-install.sh" ]; then
    source "$SCRIPT_DIR/wave-install.sh"
    # wave-install.sh sets -euo pipefail; restore to just -e for this script
    set +u +o pipefail
    WAVE_INSTALL_AVAILABLE=true
else
    WAVE_INSTALL_AVAILABLE=false
fi

# ============================================================================
# Configuration
# ============================================================================

VERSION="7.0.0"

# Load shared base detection (sets DEFAULT_BASE_DIR, YOYO_BASE_DIR, detect_base_installation)
source "$SCRIPT_DIR/lib/detect-base.sh"

# Phase configuration for progress display
readonly PHASE_BASE_SYNC=1
readonly PHASE_BACKUP=2
readonly PHASE_UPDATE=3
readonly PHASE_VERIFY=4
CURRENT_PHASE=0

# Track timing for summary
UPDATE_START_TIME=0

# Track file counts for summary
TOTAL_FILES_UPDATED=0
TOTAL_FILES_CREATED=0
TOTAL_FILES_PRESERVED=0

OVERWRITE_INSTRUCTIONS=true
OVERWRITE_STANDARDS=true
OVERWRITE_COMMANDS=true
OVERWRITE_AGENTS=true
OVERWRITE_HOOKS=true
REGENERATE_CLAUDE_MD=false
VERBOSE=false
SKIP_MCP_CHECK=false
SKIP_WAVE_CONFIG=false
# Track files changed during update
declare -a CHANGED_FILES=()
declare -a CREATED_FILES=()
declare -a DELETED_FILES=()

# ============================================================================
# Parse Arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-overwrite-instructions)
            OVERWRITE_INSTRUCTIONS=false
            shift
            ;;
        --no-overwrite-standards)
            OVERWRITE_STANDARDS=false
            shift
            ;;
        --no-overwrite-commands)
            OVERWRITE_COMMANDS=false
            shift
            ;;
        --no-overwrite-agents)
            OVERWRITE_AGENTS=false
            shift
            ;;
        --no-overwrite-hooks)
            OVERWRITE_HOOKS=false
            shift
            ;;
        --no-overwrite)
            OVERWRITE_INSTRUCTIONS=false
            OVERWRITE_STANDARDS=false
            OVERWRITE_COMMANDS=false
            OVERWRITE_AGENTS=false
            OVERWRITE_HOOKS=false
            shift
            ;;
        --skip-mcp-check)
            SKIP_MCP_CHECK=true
            shift
            ;;
        --skip-wave-config)
            SKIP_WAVE_CONFIG=true
            shift
            ;;
        --regenerate-claude)
            REGENERATE_CLAUDE_MD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            cat << EOF

Usage: $0 [OPTIONS]

${UI_BOLD}Yoyo Dev Update${UI_RESET}

Updates Yoyo Dev installation in the current project.

${UI_DIM}By default, all framework files are overwritten (instructions, standards, commands, agents).
User data (specs, fixes, recaps, patterns) is ALWAYS protected.${UI_RESET}

Options:
  ${UI_PRIMARY}--no-overwrite-instructions${UI_RESET}    Keep existing instruction files
  ${UI_PRIMARY}--no-overwrite-standards${UI_RESET}       Keep existing standards files
  ${UI_PRIMARY}--no-overwrite-commands${UI_RESET}        Keep existing command files
  ${UI_PRIMARY}--no-overwrite-agents${UI_RESET}          Keep existing agent files
  ${UI_PRIMARY}--no-overwrite-hooks${UI_RESET}           Keep existing orchestration hooks
  ${UI_PRIMARY}--no-overwrite${UI_RESET}                 Keep all existing framework files
  ${UI_PRIMARY}--skip-mcp-check${UI_RESET}               Skip MCP server verification
  ${UI_PRIMARY}--skip-wave-config${UI_RESET}             Skip Wave Terminal configuration update
  ${UI_PRIMARY}--regenerate-claude${UI_RESET}            Regenerate project CLAUDE.md from template
  ${UI_PRIMARY}-v, --verbose${UI_RESET}                  Show detailed update information
  ${UI_PRIMARY}-h, --help${UI_RESET}                     Show this help message

Examples:
  $0                       # Update all framework files
  $0 --no-overwrite        # Keep all customizations
  $0 --skip-wave-config    # Skip Wave Terminal config update
  $0 --verbose             # Show detailed output

EOF
            exit 0
            ;;
        *)
            ui_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ============================================================================
# Welcome Screen
# ============================================================================

# Capture start time for summary
UPDATE_START_TIME=$(date +%s)

# Get project info
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")

# Get base installation path early for display
BASE_YOYO_DEV=""
if BASE_YOYO_DEV=$(detect_base_installation); then
    : # BASE found
else
    ui_error "BASE installation not found"
    echo ""
    echo "  Yoyo Dev BASE should be installed at ~/.yoyo-dev"
    echo ""
    echo "  To install BASE:"
    echo "    ${UI_PRIMARY}git clone https://github.com/daverjorge46/yoyo-dev-ai.git ~/.yoyo-dev${UI_RESET}"
    echo ""
    exit 1
fi

# Get current version before showing banner
CURRENT_VERSION="unknown"
if [ -f ".yoyo-dev/config.yml" ]; then
    CURRENT_VERSION=$(grep 'yoyo_dev_version:' .yoyo-dev/config.yml 2>/dev/null | cut -d: -f2 | tr -d ' "' || echo 'unknown')
fi

# Clear screen and show branded update banner
clear
ui_update_banner "$CURRENT_VERSION" "$VERSION"

# Show source/destination paths panel
ui_source_destination_panel "$BASE_YOYO_DEV" "$CURRENT_DIR/.yoyo-dev"

# Validation - check if Yoyo Dev is installed
if [ ! -d "./.yoyo-dev" ]; then
    ui_warning "Yoyo Dev is not installed in this project"
    echo ""
    echo "  Would you like to install Yoyo Dev instead?"
    echo ""
    echo -e "    ${UI_PRIMARY}1.${UI_RESET} Install Yoyo Dev (recommended)"
    echo -e "    ${UI_PRIMARY}2.${UI_RESET} Exit"
    echo ""
    echo -n "  Choice [1]: "
    read -r install_choice
    install_choice="${install_choice:-1}"

    if [ "$install_choice" = "1" ]; then
        echo ""
        ui_info "Starting initialization..."
        echo ""

        # Use detected BASE installation
        local init_script="$BASE_YOYO_DEV/setup/init.sh"
        local install_script="$BASE_YOYO_DEV/setup/install.sh"

        if [ -f "$init_script" ]; then
            exec bash "$init_script" --claude-code
        elif [ -f "$install_script" ]; then
            exec bash "$install_script" --claude-code
        else
            ui_error "Initialization script not found at: $BASE_YOYO_DEV/setup/"
            echo ""
            echo "  Please ensure Yoyo Dev BASE is properly installed at ~/.yoyo-dev/"
            echo ""
            exit 1
        fi
    else
        echo ""
        ui_info "Update cancelled"
        echo ""
        exit 0
    fi
fi

# Check for deprecated .yoyo/ directory (v1-v3)
if [ -d "./.yoyo" ]; then
    ui_warning "Found deprecated .yoyo/ directory (v1-v3)"
    echo ""
    echo "  The .yoyo/ directory is from Yoyo v1-v3."
    echo "  It should be deleted - no data can be migrated."
    echo ""
fi

# Check for deprecated .yoyo-ai/ directory (v4-v5) and migrate
NEEDS_MEMORY_MIGRATION=false
if [ -d "./.yoyo-ai" ]; then
    ui_warning "Found .yoyo-ai/ directory from v4-v5"
    echo ""
    echo "  Memory is now stored in .yoyo-dev/memory/"
    echo "  Will migrate automatically during update."
    echo ""
    NEEDS_MEMORY_MIGRATION=true
fi

# Count protected files for summary
TOTAL_FILES_PRESERVED=$(find .yoyo-dev/specs .yoyo-dev/fixes .yoyo-dev/recaps .yoyo-dev/patterns .yoyo-dev/product .yoyo-dev/memory -type f 2>/dev/null | wc -l || true)
TOTAL_FILES_PRESERVED="${TOTAL_FILES_PRESERVED// /}"
TOTAL_FILES_PRESERVED="${TOTAL_FILES_PRESERVED:-0}"

# Check if memory migration is needed (show warning if applicable)
if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    ui_warning "Memory migration required (.yoyo-ai → .yoyo-dev/memory)"
fi

# ============================================================================
# Update Steps
# ============================================================================

# Helper function to log verbose output
log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "  ${UI_DIM}$1${UI_RESET}"
    fi
}

# Helper function to show progress with optional details
show_progress() {
    local message="$1"
    local detail="${2:-}"
    if [ -n "$detail" ]; then
        echo -e "  ${ICON_ARROW} ${message}: ${UI_DIM}${detail}${UI_RESET}"
    else
        echo -e "  ${ICON_ARROW} ${message}"
    fi
}

# Helper function to track file changes
track_file_change() {
    local file="$1"
    local action="${2:-changed}"  # changed, created, deleted
    case $action in
        created)
            CREATED_FILES+=("$file")
            ;;
        deleted)
            DELETED_FILES+=("$file")
            ;;
        *)
            CHANGED_FILES+=("$file")
            ;;
    esac
}

# Helper function to count files changed in rsync
track_rsync_changes() {
    local dest="$1"
    local count="$2"
    # Track the directory as a group change
    CHANGED_FILES+=("$dest ($count files)")
}

# ============================================================================
# Comprehensive Backup Function
# ============================================================================

# Create a full backup of all framework files before updating
# Usage: create_comprehensive_backup backup_dir
# Returns: Number of files backed up
create_comprehensive_backup() {
    local backup_dir="$1"
    local files_backed_up=0
    local current=0
    local total=0

    mkdir -p "$backup_dir"

    # First, count total files to backup
    [ -d ".yoyo-dev/instructions" ] && total=$((total + $(find ".yoyo-dev/instructions" -type f 2>/dev/null | wc -l)))
    [ -d ".yoyo-dev/standards" ] && total=$((total + $(find ".yoyo-dev/standards" -type f 2>/dev/null | wc -l)))
    [ -d ".claude/commands" ] && total=$((total + $(find ".claude/commands" -type f 2>/dev/null | wc -l)))
    [ -d ".claude/agents" ] && total=$((total + $(find ".claude/agents" -type f 2>/dev/null | wc -l)))
    [ -d ".claude/hooks" ] && total=$((total + $(find ".claude/hooks" -type f 2>/dev/null | wc -l)))
    [ -f ".yoyo-dev/config.yml" ] && total=$((total + 1))

    # Redirect all display output to stderr so $() capture only gets the final count
    # Backup instructions
    if [ -d ".yoyo-dev/instructions" ]; then
        local inst_count=$(find ".yoyo-dev/instructions" -type f 2>/dev/null | wc -l)
        echo -e "  ${UI_DIM}📁 Instructions${UI_RESET} ${UI_DIM}($inst_count files)${UI_RESET}" >&2
        while IFS= read -r -d '' file; do
            current=$((current + 1))
            local rel_path="${file#.yoyo-dev/}"
            mkdir -p "$backup_dir/$(dirname "$rel_path")"
            cp "$file" "$backup_dir/$rel_path"
            ui_update_progress "Backup" "$current" "$total" "$rel_path" "$VERBOSE" >&2
        done < <(find ".yoyo-dev/instructions" -type f -print0 2>/dev/null)
        files_backed_up=$((files_backed_up + inst_count))
    fi

    # Backup standards
    if [ -d ".yoyo-dev/standards" ]; then
        local std_count=$(find ".yoyo-dev/standards" -type f 2>/dev/null | wc -l)
        echo -e "  ${UI_DIM}📁 Standards${UI_RESET} ${UI_DIM}($std_count files)${UI_RESET}" >&2
        while IFS= read -r -d '' file; do
            current=$((current + 1))
            local rel_path="${file#.yoyo-dev/}"
            mkdir -p "$backup_dir/$(dirname "$rel_path")"
            cp "$file" "$backup_dir/$rel_path"
            ui_update_progress "Backup" "$current" "$total" "$rel_path" "$VERBOSE" >&2
        done < <(find ".yoyo-dev/standards" -type f -print0 2>/dev/null)
        files_backed_up=$((files_backed_up + std_count))
    fi

    # Backup commands
    if [ -d ".claude/commands" ]; then
        local cmd_count=$(find ".claude/commands" -type f 2>/dev/null | wc -l)
        echo -e "  ${UI_DIM}📁 Commands${UI_RESET} ${UI_DIM}($cmd_count files)${UI_RESET}" >&2
        mkdir -p "$backup_dir/commands"
        while IFS= read -r -d '' file; do
            current=$((current + 1))
            local rel_path="${file#.claude/commands/}"
            mkdir -p "$backup_dir/commands/$(dirname "$rel_path")"
            cp "$file" "$backup_dir/commands/$rel_path"
            ui_update_progress "Backup" "$current" "$total" "commands/$rel_path" "$VERBOSE" >&2
        done < <(find ".claude/commands" -type f -print0 2>/dev/null)
        files_backed_up=$((files_backed_up + cmd_count))
    fi

    # Backup agents
    if [ -d ".claude/agents" ]; then
        local agent_count=$(find ".claude/agents" -type f 2>/dev/null | wc -l)
        echo -e "  ${UI_DIM}📁 Agents${UI_RESET} ${UI_DIM}($agent_count files)${UI_RESET}" >&2
        mkdir -p "$backup_dir/agents"
        while IFS= read -r -d '' file; do
            current=$((current + 1))
            local rel_path="${file#.claude/agents/}"
            mkdir -p "$backup_dir/agents/$(dirname "$rel_path")"
            cp "$file" "$backup_dir/agents/$rel_path"
            ui_update_progress "Backup" "$current" "$total" "agents/$rel_path" "$VERBOSE" >&2
        done < <(find ".claude/agents" -type f -print0 2>/dev/null)
        files_backed_up=$((files_backed_up + agent_count))
    fi

    # Backup hooks
    if [ -d ".claude/hooks" ]; then
        local hook_count=$(find ".claude/hooks" -type f 2>/dev/null | wc -l)
        echo -e "  ${UI_DIM}📁 Hooks${UI_RESET} ${UI_DIM}($hook_count files)${UI_RESET}" >&2
        mkdir -p "$backup_dir/hooks"
        while IFS= read -r -d '' file; do
            current=$((current + 1))
            local rel_path="${file#.claude/hooks/}"
            mkdir -p "$backup_dir/hooks/$(dirname "$rel_path")"
            cp "$file" "$backup_dir/hooks/$rel_path"
            ui_update_progress "Backup" "$current" "$total" "hooks/$rel_path" "$VERBOSE" >&2
        done < <(find ".claude/hooks" -type f -print0 2>/dev/null)
        files_backed_up=$((files_backed_up + hook_count))
    fi

    # Backup config
    if [ -f ".yoyo-dev/config.yml" ]; then
        echo -e "  ${UI_DIM}📁 Config${UI_RESET} ${UI_DIM}(1 file)${UI_RESET}" >&2
        current=$((current + 1))
        cp ".yoyo-dev/config.yml" "$backup_dir/config.yml"
        ui_update_progress "Backup" "$current" "$total" "config.yml" "$VERBOSE" >&2
        files_backed_up=$((files_backed_up + 1))
    fi

    echo "$files_backed_up"
}

# ============================================================================
# File Update with Progress Function
# ============================================================================

# Update files from source to destination with real-time progress display
# Usage: update_with_progress src_dir dest_dir category
# Returns: Number of files copied (sets UPDATE_ERRORS for error count)
UPDATE_ERRORS=0

update_with_progress() {
    local src_dir="${1%/}"  # Strip trailing slash to ensure correct path stripping
    local dest_dir="${2%/}"
    local category="$3"
    local files_copied=0
    local errors=0

    # Get list of files
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$src_dir" -type f -print0 2>/dev/null)

    local total=${#files[@]}
    local current=0

    # Ensure destination exists
    mkdir -p "$dest_dir"

    for file in "${files[@]}"; do
        current=$((current + 1))
        local relative_path="${file#$src_dir/}"

        # Create directory structure and copy file
        mkdir -p "$(dirname "$dest_dir/$relative_path")"
        if cp "$file" "$dest_dir/$relative_path" 2>/dev/null; then
            files_copied=$((files_copied + 1))
        else
            errors=$((errors + 1))
        fi

        # Update progress display
        ui_update_progress "$category" "$current" "$total" "$relative_path" "$VERBOSE" >&2
    done

    # Show completion
    ui_progress_complete "$category" "$files_copied" "$errors" >&2

    UPDATE_ERRORS=$errors
    echo "$files_copied"
}

TOTAL_STEPS=15
CURRENT_STEP=0

# Note: BASE_YOYO_DEV was defined earlier in Welcome Screen section

# Backup directory path (used throughout)
BACKUP_DIR=".yoyo-dev/backups/$(date +%Y%m%d_%H%M%S)"

# Installation target directory (for GUI updates)
INSTALL_DIR="./.yoyo-dev"

# ============================================================================
# PHASE 1: BASE Sync - Pull latest from repository
# ============================================================================

CURRENT_PHASE=$PHASE_BASE_SYNC
ui_phase_indicator $CURRENT_PHASE "BASE Sync" "Backup" "Update" "Verify"

CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Pulling latest from BASE installation..."

if [ -d "$BASE_YOYO_DEV/.git" ]; then
    cd "$BASE_YOYO_DEV"

    # Get current branch and show it
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    show_progress "Branch" "$CURRENT_BRANCH"

    # Fetch and show status
    show_progress "Fetching latest changes..."
    if git fetch origin 2>&1 | head -3; then
        # Check if there are updates
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")

        if [ "$LOCAL" = "$REMOTE" ]; then
            ui_success "Already up to date"
        else
            show_progress "Pulling updates..."
            git pull 2>&1 | head -5
            ui_success "Updates pulled"
        fi
    fi

    cd "$CURRENT_DIR"
else
    ui_info "No git repository found, using current base files"
fi

echo ""

# Step: Reinstall global commands (yoyo, yoyo-cli, etc.)
CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Verifying global commands (yoyo-dev, yoyo-ai, yoyo-cli)..."

if [ -f "$BASE_YOYO_DEV/setup/install-global-command.sh" ]; then
    # Check all critical commands (yoyo-dev, yoyo-ai, yoyo-cli)
    NEED_REINSTALL=false
    for critical_cmd in yoyo-dev yoyo-ai yoyo-cli yoyoclaw; do
        if ! command -v "$critical_cmd" &>/dev/null; then
            show_progress "$critical_cmd not found"
            NEED_REINSTALL=true
        else
            # Verify symlink is valid
            CMD_PATH=$(command -v "$critical_cmd" 2>/dev/null)
            if [ -L "$CMD_PATH" ] && [ ! -e "$CMD_PATH" ]; then
                show_progress "$critical_cmd symlink broken"
                NEED_REINSTALL=true
            fi
        fi
    done

    if [ "$NEED_REINSTALL" = true ]; then
        show_progress "Installing/reinstalling global commands..."
        bash "$BASE_YOYO_DEV/setup/install-global-command.sh" 2>&1 | grep -E "Installing|OK|SKIP|FAILED" | head -10
        ui_success "Global commands installed"
    else
        show_progress "All critical commands verified (yoyo-dev, yoyo-ai, yoyo-cli)"
        ui_success "Global commands verified"
    fi
else
    ui_warning "install-global-command.sh not found, skipping global command installation"
fi

echo ""

# ============================================================================
# PHASE 2: Backup - Create comprehensive backup before changes
# ============================================================================

CURRENT_PHASE=$PHASE_BACKUP
ui_phase_indicator $CURRENT_PHASE "BASE Sync" "Backup" "Update" "Verify"

CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Creating comprehensive backup..."

show_progress "Backup location" "$BACKUP_DIR"

# Create comprehensive backup with progress display
BACKUP_COUNT=$(create_comprehensive_backup "$BACKUP_DIR")
ui_progress_complete "Backup" "$BACKUP_COUNT" 0

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")

# Show backup confirmation panel
echo ""
echo -e "  ${UI_YOYO_YELLOW}╭───────────────────────────────────────────────────────────────╮${UI_RESET}"
echo -e "  ${UI_YOYO_YELLOW}│${UI_RESET}  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${UI_BOLD}BACKUP COMPLETE${UI_RESET}                                        ${UI_YOYO_YELLOW}│${UI_RESET}"
echo -e "  ${UI_YOYO_YELLOW}├───────────────────────────────────────────────────────────────┤${UI_RESET}"
echo -e "  ${UI_YOYO_YELLOW}│${UI_RESET}  Files backed up:  ${UI_PRIMARY}$BACKUP_COUNT${UI_RESET} files                              ${UI_YOYO_YELLOW}│${UI_RESET}"
echo -e "  ${UI_YOYO_YELLOW}│${UI_RESET}  Backup size:      ${UI_PRIMARY}$BACKUP_SIZE${UI_RESET}                                     ${UI_YOYO_YELLOW}│${UI_RESET}"
echo -e "  ${UI_YOYO_YELLOW}│${UI_RESET}  Location:         ${UI_DIM}$BACKUP_DIR${UI_RESET}  ${UI_YOYO_YELLOW}│${UI_RESET}"
echo -e "  ${UI_YOYO_YELLOW}╰───────────────────────────────────────────────────────────────╯${UI_RESET}"
echo ""

ui_success "Your data is safe - proceeding with update"
echo ""

# Show protected user data that won't be touched
ui_protected_data_panel ".yoyo-dev"
echo ""

# ============================================================================
# PHASE 3: Update - Apply framework updates
# ============================================================================

CURRENT_PHASE=$PHASE_UPDATE
ui_phase_indicator $CURRENT_PHASE "BASE Sync" "Backup" "Update" "Verify"

# Step: Update instructions
if [ "$OVERWRITE_INSTRUCTIONS" = true ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Updating instructions..."

    FILE_COUNT=$(update_with_progress "$BASE_YOYO_DEV/instructions/" ".yoyo-dev/instructions/" "Instructions")
    track_rsync_changes ".yoyo-dev/instructions/" "$FILE_COUNT"
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Keeping existing instructions..."
    echo -e "     ${UI_YOYO_YELLOW}⊘${UI_RESET} ${UI_YOYO_YELLOW}Preserved${UI_RESET} ${UI_DIM}(--no-overwrite-instructions)${UI_RESET}"
    echo ""
fi

# Step 4: Update standards
if [ "$OVERWRITE_STANDARDS" = true ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Updating standards..."

    FILE_COUNT=$(update_with_progress "$BASE_YOYO_DEV/standards/" ".yoyo-dev/standards/" "Standards")
    track_rsync_changes ".yoyo-dev/standards/" "$FILE_COUNT"
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Keeping existing standards..."
    echo -e "     ${UI_YOYO_YELLOW}⊘${UI_RESET} ${UI_YOYO_YELLOW}Preserved${UI_RESET} ${UI_DIM}(--no-overwrite-standards)${UI_RESET}"
    echo ""
fi

# Step 5: Update commands (from claude-code/ canonical source)
if [ "$OVERWRITE_COMMANDS" = true ] && [ -d ".claude/commands" ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Updating CLI commands..."

    FILE_COUNT=$(update_with_progress "$BASE_YOYO_DEV/claude-code/commands/" ".claude/commands/" "Commands")
    track_rsync_changes ".claude/commands/" "$FILE_COUNT"
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Skipping command update..."
    if [ ! -d ".claude/commands" ]; then
        echo -e "     ${UI_DIM}⊘ Skipped${UI_RESET} ${UI_DIM}(.claude/commands not found)${UI_RESET}"
    else
        echo -e "     ${UI_YOYO_YELLOW}⊘${UI_RESET} ${UI_YOYO_YELLOW}Preserved${UI_RESET} ${UI_DIM}(--no-overwrite-commands)${UI_RESET}"
    fi
    echo ""
fi

# Step 6: Update agents (from claude-code/ canonical source)
if [ "$OVERWRITE_AGENTS" = true ] && [ -d ".claude/agents" ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Updating agents..."

    FILE_COUNT=$(update_with_progress "$BASE_YOYO_DEV/claude-code/agents/" ".claude/agents/" "Agents")
    track_rsync_changes ".claude/agents/" "$FILE_COUNT"
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Skipping agent update..."
    if [ ! -d ".claude/agents" ]; then
        echo -e "     ${UI_DIM}⊘ Skipped${UI_RESET} ${UI_DIM}(.claude/agents not found)${UI_RESET}"
    else
        echo -e "     ${UI_YOYO_YELLOW}⊘${UI_RESET} ${UI_YOYO_YELLOW}Preserved${UI_RESET} ${UI_DIM}(--no-overwrite-agents)${UI_RESET}"
    fi
    echo ""
fi

# Step 7: Update orchestration hooks (from claude-code/ canonical source)
# Note: settings.json is NOT copied during updates - projects manage their own settings
if [ "$OVERWRITE_HOOKS" = true ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Updating orchestration hooks..."

    # Ensure .claude/hooks directory exists
    mkdir -p ".claude/hooks"

    # Copy hook bundle from claude-code/ canonical source
    if [ -f "$BASE_YOYO_DEV/claude-code/hooks/orchestrate.cjs" ]; then
        show_progress "Copying orchestration hook bundle"
        cp "$BASE_YOYO_DEV/claude-code/hooks/orchestrate.cjs" ".claude/hooks/"
        track_file_change ".claude/hooks/orchestrate.cjs"
    else
        show_progress "Hook bundle not found at $BASE_YOYO_DEV/claude-code/hooks/orchestrate.cjs"
    fi

    # Note: settings.json is intentionally NOT copied during updates
    # Projects should manage their own .claude/settings.json configuration
    # Only fresh installs receive a settings.json template

    ui_success "Orchestration hooks updated"
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "📁 Skipping hooks update..."
    echo -e "     ${UI_YOYO_YELLOW}⊘${UI_RESET} ${UI_YOYO_YELLOW}Preserved${UI_RESET} ${UI_DIM}(--no-overwrite-hooks)${UI_RESET}"
    echo ""
fi

# Step 8: Regenerate CLAUDE.md (optional, only if --regenerate-claude flag set)
if [ "$REGENERATE_CLAUDE_MD" = true ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Regenerating project CLAUDE.md..."

    TEMPLATE_FILE="$BASE_YOYO_DEV/setup/templates/PROJECT-CLAUDE.md"
    OUTPUT_FILE="./CLAUDE.md"

    if [ -f "$TEMPLATE_FILE" ]; then
        # Backup existing CLAUDE.md if present
        if [ -f "$OUTPUT_FILE" ]; then
            cp "$OUTPUT_FILE" "${OUTPUT_FILE}.backup"
            show_progress "Existing CLAUDE.md backed up to CLAUDE.md.backup"
            track_file_change "CLAUDE.md.backup" "created"
        fi

        # Read tech stack from config.yml if available
        TECH_STACK_FRAMEWORK=$(grep 'framework:' .yoyo-dev/config.yml 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' "' || echo "not specified")
        TECH_STACK_DATABASE=$(grep 'database:' .yoyo-dev/config.yml 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' "' || echo "none")
        TECH_STACK_STYLING=$(grep 'styling:' .yoyo-dev/config.yml 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' "' || echo "not specified")

        # Generate CLAUDE.md from template with variable substitution
        show_progress "Applying template with project settings"
        sed -e "s/{{VERSION}}/$VERSION/g" \
            -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
            -e "s/{{TECH_STACK_FRAMEWORK}}/${TECH_STACK_FRAMEWORK:-not specified}/g" \
            -e "s/{{TECH_STACK_DATABASE}}/${TECH_STACK_DATABASE:-none}/g" \
            -e "s/{{TECH_STACK_STYLING}}/${TECH_STACK_STYLING:-not specified}/g" \
            "$TEMPLATE_FILE" > "$OUTPUT_FILE"

        track_file_change "CLAUDE.md"
        ui_success "Project CLAUDE.md regenerated"
    else
        ui_warning "Template not found at $TEMPLATE_FILE"
    fi
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "CLAUDE.md check..."
    if [ -f "./CLAUDE.md" ]; then
        show_progress "CLAUDE.md exists and is protected"
    else
        show_progress "No CLAUDE.md found (use --regenerate-claude to create)"
    fi
    echo ""
fi

# Step 9: Merge config
CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Merging configuration..."
track_file_change ".yoyo-dev/config.yml"

# Update version number
show_progress "Updating version to" "$VERSION"
sed -i.bak "s/yoyo_dev_version:.*/yoyo_dev_version: $VERSION/" .yoyo-dev/config.yml
rm -f .yoyo-dev/config.yml.bak

# Add new config options if missing
if ! grep -q "^backend:" .yoyo-dev/config.yml 2>/dev/null; then
    show_progress "Adding backend configuration block"
    cat >> .yoyo-dev/config.yml << EOF

# Backend API (for browser GUI)
backend:
  enabled: true
  port: 3457
  host: "localhost"
EOF
else
    show_progress "Backend config already exists"
fi

ui_success "Configuration merged"
echo ""

# Step 10: Migrate memory from .yoyo-ai/ to .yoyo-dev/memory/
if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Migrating memory system..."

    # Create new directories
    show_progress "Creating .yoyo-dev/memory/"
    mkdir -p .yoyo-dev/memory
    mkdir -p .yoyo-dev/skills

    # Move memory database if exists
    if [ -f ".yoyo-ai/memory/memory.db" ]; then
        show_progress "Moving memory.db to new location"
        mv .yoyo-ai/memory/memory.db .yoyo-dev/memory/
        mv .yoyo-ai/memory/memory.db-wal .yoyo-dev/memory/ 2>/dev/null || true
        mv .yoyo-ai/memory/memory.db-shm .yoyo-dev/memory/ 2>/dev/null || true
        ui_success "Memory database migrated"
    else
        show_progress "No memory database found in .yoyo-ai/"
    fi

    # Move skills if exist
    if [ -d ".yoyo-ai/.skills" ] && [ "$(ls -A .yoyo-ai/.skills 2>/dev/null)" ]; then
        show_progress "Moving skills to new location"
        mv .yoyo-ai/.skills/* .yoyo-dev/skills/ 2>/dev/null || true
        ui_success "Skills migrated"
    fi

    # Remove old directory
    show_progress "Removing old .yoyo-ai/ directory"
    rm -rf .yoyo-ai/
    ui_success "Memory migration complete"
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Memory system check..."

    # Ensure memory directories exist
    if [ ! -d ".yoyo-dev/memory" ]; then
        show_progress "Creating .yoyo-dev/memory/"
        mkdir -p .yoyo-dev/memory
    fi
    if [ ! -d ".yoyo-dev/skills" ]; then
        show_progress "Creating .yoyo-dev/skills/"
        mkdir -p .yoyo-dev/skills
    fi
    # Ensure cleanup and archive directories exist (v6.1+)
    if [ ! -d ".yoyo-dev/cleanup" ]; then
        show_progress "Creating .yoyo-dev/cleanup/"
        mkdir -p .yoyo-dev/cleanup
    fi
    if [ ! -d ".yoyo-dev/archive" ]; then
        show_progress "Creating .yoyo-dev/archive/"
        mkdir -p .yoyo-dev/archive/specs
        mkdir -p .yoyo-dev/archive/fixes
        mkdir -p .yoyo-dev/archive/recaps
        mkdir -p .yoyo-dev/archive/patterns
    fi
    show_progress "All directories OK"
    echo ""
fi

# Step 11: Update Wave Terminal configuration
CURRENT_STEP=$((CURRENT_STEP + 1))
if [ "$SKIP_WAVE_CONFIG" = true ]; then
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping Wave Terminal configuration..."
    echo -e "     ${UI_YOYO_YELLOW}⊘${UI_RESET} ${UI_YOYO_YELLOW}Skipped${UI_RESET} ${UI_DIM}(--skip-wave-config)${UI_RESET}"
    echo ""
elif [ "$WAVE_INSTALL_AVAILABLE" = true ]; then
    ui_step $CURRENT_STEP $TOTAL_STEPS "Checking Wave Terminal configuration..."

    # Check if Wave config needs update
    if check_config_version 2>/dev/null; then
        # Update needed
        show_progress "Wave configuration update available"

        # Get current installed version for reporting
        WAVE_CURRENT_VERSION="none"
        if [ -f "$WAVE_VERSION_FILE" ]; then
            WAVE_CURRENT_VERSION=$(cat "$WAVE_VERSION_FILE" 2>/dev/null || echo "unknown")
        fi

        # Deploy updated configuration
        if deploy_wave_config 2>/dev/null; then
            ui_success "Wave config updated from v${WAVE_CURRENT_VERSION} to v${WAVE_CONFIG_VERSION}"
            track_file_change "Wave Terminal config (v${WAVE_CONFIG_VERSION})"
        else
            ui_warning "Wave config update failed - continuing with update"
        fi
    else
        # Already up to date
        ui_success "Wave configuration already up to date (v${WAVE_CONFIG_VERSION})"
    fi
    echo ""
else
    ui_step $CURRENT_STEP $TOTAL_STEPS "Wave Terminal configuration..."
    echo -e "     ${UI_DIM}⊘ Skipped${UI_RESET} ${UI_DIM}(wave-install.sh not found)${UI_RESET}"
    echo ""
fi

# Step 12: Check MCP servers
if [ "$SKIP_MCP_CHECK" = false ]; then
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Checking MCP servers..."

    if [ -f "$SCRIPT_DIR/docker-mcp-setup.sh" ]; then
        show_progress "Running Docker MCP setup check"

        # Run MCP check and capture output
        MCP_OUTPUT=$(bash "$SCRIPT_DIR/docker-mcp-setup.sh" --skip-if-no-docker 2>&1 || true)

        # Show the output
        if [ -n "$MCP_OUTPUT" ]; then
            echo "$MCP_OUTPUT" | head -30
        fi

        ui_success "MCP check complete"
    else
        show_progress "MCP setup script not found at" "$SCRIPT_DIR/docker-mcp-setup.sh"
        ui_info "MCP setup script not found"
    fi
    echo ""
else
    CURRENT_STEP=$((CURRENT_STEP + 1))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping MCP server check..."
    show_progress "Skipped (--skip-mcp-check)"
    echo ""
fi

# Step 13: Update Yoyo Claw (yoyo-ai) — local OpenClaw fork
CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Updating Yoyo Claw (yoyo-ai)..."

YOYO_AI_STATUS="failed:unknown"

# Source functions.sh for yoyo-claw helpers
if [ -f "$SCRIPT_DIR/functions.sh" ]; then
    source "$SCRIPT_DIR/functions.sh"
fi

# Migrate ~/.openclaw or ~/.yoyo-ai → ~/.yoyo-claw (one-time, preserves all data)
show_progress "Checking home directory migration..."
migrate_yoyo_claw_home

# Config YAML migration: openclaw: → yoyo_claw:
if [ -f ".yoyo-dev/config.yml" ]; then
    if grep -q "^yoyo_ai:" .yoyo-dev/config.yml 2>/dev/null; then
        if grep -q "  openclaw:" .yoyo-dev/config.yml 2>/dev/null; then
            # Old format detected — replace entire yoyo_ai: block with new format
            show_progress "Migrating config: openclaw → yoyo_claw"
            # Remove old yoyo_ai block (indented lines + header comment)
            awk '
                /^# Yoyo AI/ { next }
                /^yoyo_ai:/ { in_block=1; next }
                in_block && /^[a-zA-Z]/ { in_block=0 }
                in_block { next }
                { print }
            ' .yoyo-dev/config.yml > .yoyo-dev/config.yml.tmp 2>/dev/null && \
                mv .yoyo-dev/config.yml.tmp .yoyo-dev/config.yml
            # Append new block
            cat >> .yoyo-dev/config.yml << 'YOYO_AI_EOF'

# Yoyo AI (Yoyo Claw - local OpenClaw fork)
yoyo_ai:
  enabled: true
  yoyo_claw:
    source: "local"
    build_dir: "yoyo-claw/"
    port: 18789
    config_path: "~/.yoyo-claw/openclaw.json"
    security:
      localhost_only: true
      credential_encryption: true
      command_allowlist: true
      audit_logging: true
    daemon:
      auto_start: false
      service_type: "auto"
YOYO_AI_EOF
            track_file_change ".yoyo-dev/config.yml (yoyo_ai: openclaw → yoyo_claw)"
        fi
        # else: yoyo_claw: already present — already migrated, nothing to do
    else
        # No yoyo_ai section at all — add it fresh
        show_progress "Adding yoyo_ai config section"
        cat >> .yoyo-dev/config.yml << 'YOYO_AI_EOF'

# Yoyo AI (Yoyo Claw - local OpenClaw fork)
yoyo_ai:
  enabled: true
  yoyo_claw:
    source: "local"
    build_dir: "yoyo-claw/"
    port: 18789
    config_path: "~/.yoyo-claw/openclaw.json"
    security:
      localhost_only: true
      credential_encryption: true
      command_allowlist: true
      audit_logging: true
    daemon:
      auto_start: false
      service_type: "auto"
YOYO_AI_EOF
        track_file_change ".yoyo-dev/config.yml (yoyo_ai section added)"
    fi
fi

# Build yoyo-claw from source
if is_yoyo_claw_built; then
    # Already built — rebuild to pick up updates from git pull
    current_claw_ver=$(yoyo_claw --version 2>/dev/null || echo "unknown")
    show_progress "Current Yoyo Claw version" "$current_claw_ver"
    show_progress "Rebuilding from source..."

    if build_yoyo_claw 2>&1 | tail -3; then
        new_claw_ver=$(yoyo_claw --version 2>/dev/null || echo "unknown")
        ui_success "Yoyo Claw rebuilt (${new_claw_ver})"
        track_file_change "Yoyo Claw (${current_claw_ver} → ${new_claw_ver})"
        if [ "$current_claw_ver" = "$new_claw_ver" ]; then
            YOYO_AI_STATUS="already-up-to-date"
        else
            YOYO_AI_STATUS="rebuilt"
        fi
    else
        ui_warning "Yoyo Claw rebuild failed — continuing with existing build"
        YOYO_AI_STATUS="failed:build"
    fi
else
    # First build — check Node.js and build from source
    if node_ver=$(check_node_version 22 2>/dev/null); then
        show_progress "Building Yoyo Claw from source (first build)..."
        ui_info "Building Yoyo Claw (yoyo-ai)..."
        if build_yoyo_claw 2>&1 | tail -3; then
            ui_success "Yoyo Claw built successfully"
            ensure_yoyo_claw_token
            if ! is_yoyo_onboarded; then
                run_yoyo_claw_onboard
            fi
            show_yoyo_claw_dashboard_info
            track_file_change "Yoyo Claw (first build from source)"
            YOYO_AI_STATUS="built"
        else
            ui_warning "Yoyo Claw build failed — check pnpm/node setup"
            YOYO_AI_STATUS="failed:build"
        fi
    else
        if [ "$node_ver" = "not_installed" ]; then
            ui_warning "Node.js not installed — yoyo-ai requires Node.js >= 22"
            YOYO_AI_STATUS="failed:Node.js not installed"
        else
            ui_warning "Node.js v${node_ver} too old — yoyo-ai requires Node.js >= 22"
            YOYO_AI_STATUS="failed:Node.js >= 22 required"
        fi
        echo -e "  ${UI_DIM}Install Node.js >= 22 and re-run to enable yoyo-ai${UI_RESET}"
    fi
fi

# Post-build setup (token, systemd, gateway mode)
if is_yoyo_claw_built; then
    ensure_yoyo_claw_token
    patch_yoyo_claw_systemd_service
    set_yoyo_claw_gateway_mode
fi
echo ""

# Step: Update YoYo AI Dashboard GUI
CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Updating YoYo AI Dashboard GUI..."

# GUI lives in the BASE installation and is served directly from there by yoyo-gui.sh.
# Phase 1 (git pull) already updated the source files, so we just need to rebuild.
GUI_AI_DIR="$BASE_YOYO_DEV/gui-ai"

if [ -d "$GUI_AI_DIR" ]; then
    # Install dependencies and rebuild
    if command -v npm &>/dev/null; then
        show_progress "Installing GUI dependencies"
        cd "$GUI_AI_DIR"
        if npm install --silent 2>&1 | tail -2; then
            show_progress "Building GUI for production"
            if npm run build --silent 2>&1 | tail -2; then
                ui_success "YoYo AI Dashboard GUI updated"
                track_file_change "$GUI_AI_DIR (GUI rebuilt)"
            else
                ui_warning "GUI build failed - run 'npm run build' in $GUI_AI_DIR manually"
            fi
        else
            ui_warning "GUI dependencies installation failed"
        fi
        cd "$CURRENT_DIR"
    else
        ui_warning "npm not found - GUI not rebuilt"
        echo -e "  ${UI_DIM}Run 'npm install && npm run build' in $GUI_AI_DIR${UI_RESET}"
    fi
else
    show_progress "GUI source not found at $GUI_AI_DIR"
    ui_info "YoYo AI Dashboard GUI not available in this version"
fi

echo ""

# ============================================================================
# Phase 4: VERIFY
# ============================================================================

CURRENT_PHASE=$PHASE_VERIFY
ui_phase_indicator $CURRENT_PHASE "BASE Sync" "Backup" "Update" "Verify"
echo ""

# Step: Verify update
CURRENT_STEP=$((CURRENT_STEP + 1))
ui_step $CURRENT_STEP $TOTAL_STEPS "Verifying update..."

errors=()

show_progress "Checking version in config.yml"
if ! grep -q "yoyo_dev_version: $VERSION" .yoyo-dev/config.yml; then
    errors+=("Version number not updated")
fi

show_progress "Checking instructions directory"
if [ ! -d ".yoyo-dev/instructions" ]; then
    errors+=("Instructions directory missing")
fi

show_progress "Checking standards directory"
if [ ! -d ".yoyo-dev/standards" ]; then
    errors+=("Standards directory missing")
fi

if [ ${#errors[@]} -gt 0 ]; then
    ui_error "Update verification failed"
    for error in "${errors[@]}"; do
        echo "  ${UI_ERROR}${ICON_ERROR}${UI_RESET} $error"
    done
    echo ""
    echo "  Backup available at: $BACKUP_DIR"
    exit 1
fi

show_progress "All checks passed"
ui_success "Update verified"
echo ""

# ============================================================================
# Files Changed Summary
# ============================================================================

ui_section "Files Changed" "$ICON_FOLDER"

if [ ${#CHANGED_FILES[@]} -gt 0 ]; then
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${UI_BOLD}Updated:${UI_RESET}"
    for file in "${CHANGED_FILES[@]}"; do
        echo -e "     ${UI_DIM}${file}${UI_RESET}"
    done
fi

if [ ${#CREATED_FILES[@]} -gt 0 ]; then
    echo -e "  ${UI_PRIMARY}+${UI_RESET} ${UI_BOLD}Created:${UI_RESET}"
    for file in "${CREATED_FILES[@]}"; do
        echo -e "     ${UI_DIM}${file}${UI_RESET}"
    done
fi

if [ ${#DELETED_FILES[@]} -gt 0 ]; then
    echo -e "  ${UI_ERROR}-${UI_RESET} ${UI_BOLD}Deleted:${UI_RESET}"
    for file in "${DELETED_FILES[@]}"; do
        echo -e "     ${UI_DIM}${file}${UI_RESET}"
    done
fi

if [ ${#CHANGED_FILES[@]} -eq 0 ] && [ ${#CREATED_FILES[@]} -eq 0 ] && [ ${#DELETED_FILES[@]} -eq 0 ]; then
    echo -e "  ${UI_DIM}No files were changed${UI_RESET}"
fi

echo ""

# ============================================================================
# Completion
# ============================================================================

# Calculate update duration
UPDATE_END_TIME=$(date +%s)
UPDATE_DURATION=$((UPDATE_END_TIME - UPDATE_START_TIME))

# Calculate file counts
TOTAL_FILES_UPDATED=${#CHANGED_FILES[@]}
TOTAL_FILES_CREATED=${#CREATED_FILES[@]}

# Determine yoyo-dev status
if [ "$CURRENT_VERSION" = "$VERSION" ]; then
    YOYO_DEV_STATUS="already-up-to-date"
else
    YOYO_DEV_STATUS="updated"
fi

# Show summary panel
ui_update_summary_panel "$CURRENT_VERSION" "$VERSION" "$UPDATE_DURATION" "$TOTAL_FILES_UPDATED" "$TOTAL_FILES_CREATED" "$TOTAL_FILES_PRESERVED" "$BACKUP_DIR"

ui_component_status_panel "$YOYO_DEV_STATUS" "$YOYO_AI_STATUS"
echo ""

# Memory migration note if applicable
if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} Memory migrated to ${UI_BOLD}.yoyo-dev/memory/${UI_RESET}"
    echo ""
fi

# ============================================================================
# Check Global Commands
# ============================================================================

echo ""
ui_info "Checking global commands..."

if ! command -v yoyo-cli &>/dev/null; then
    echo ""
    ui_warning "Global command 'yoyo-cli' not found"
    echo ""
    echo -e "  Would you like to install global yoyo commands?"
    echo ""
    echo -e "    ${UI_PRIMARY}1.${UI_RESET} Install global commands (recommended)"
    echo -e "    ${UI_PRIMARY}2.${UI_RESET} Skip"
    echo ""
    echo -n "  Choice [1]: "
    read -r install_choice
    install_choice="${install_choice:-1}"

    if [ "$install_choice" = "1" ]; then
        if bash "$BASE_YOYO_DEV/setup/install-global-command.sh"; then
            ui_success "Global commands installed"
        else
            ui_warning "Installation failed"
        fi
    fi
    echo ""
fi

ui_section "Next Steps" "$ICON_ROCKET"

echo -e "  ${UI_PRIMARY}1.${UI_RESET} Launch Claude Code with Yoyo Dev:"
echo -e "     ${UI_DIM}\$ yoyo${UI_RESET}"
echo ""

echo -e "  ${UI_PRIMARY}2.${UI_RESET} Initialize memory system (if not done):"
echo -e "     ${UI_DIM}In Claude Code: /yoyo-ai-memory${UI_RESET}"
echo ""

echo -e "  ${UI_PRIMARY}3.${UI_RESET} Check for breaking changes:"
echo -e "     ${UI_DIM}\$ cat $BASE_YOYO_DEV/CHANGELOG.md${UI_RESET}"
echo ""
