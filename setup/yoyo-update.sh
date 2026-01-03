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
# Configuration
# ============================================================================

VERSION="6.2.0"
OVERWRITE_INSTRUCTIONS=true
OVERWRITE_STANDARDS=true
OVERWRITE_COMMANDS=true
OVERWRITE_AGENTS=true
OVERWRITE_HOOKS=true
REGENERATE_CLAUDE_MD=false
VERBOSE=false
SKIP_MCP_CHECK=false

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
  ${UI_PRIMARY}--regenerate-claude${UI_RESET}            Regenerate project CLAUDE.md from template
  ${UI_PRIMARY}-v, --verbose${UI_RESET}                  Show detailed update information
  ${UI_PRIMARY}-h, --help${UI_RESET}                     Show this help message

Examples:
  $0                       # Update all framework files
  $0 --no-overwrite        # Keep all customizations
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

ui_clear_screen "$VERSION"
ui_box_header "UPDATE YOYO DEV" 70 "$UI_PRIMARY"

# Get project info
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")

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
        ui_info "Starting installation..."
        echo ""

        # Use the BASE installation at ~/yoyo-dev/
        install_script="$HOME/yoyo-dev/setup/install.sh"

        if [ -f "$install_script" ]; then
            exec bash "$install_script" --claude-code
        else
            ui_error "Installation script not found at: $install_script"
            echo ""
            echo "  Please ensure Yoyo Dev BASE is installed at ~/yoyo-dev/"
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

# Show project info
ui_section "Project Information" "$ICON_FOLDER"
ui_kv "Project Name" "$PROJECT_NAME"
ui_kv "Current Version" "$(grep 'yoyo_dev_version:' .yoyo-dev/config.yml | cut -d: -f2 | tr -d ' ' || echo 'unknown')"
ui_kv "New Version" "$VERSION"

# Check if memory migration is needed
if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    ui_kv "Memory Migration" "Required (.yoyo-ai → .yoyo-dev/memory)"
fi

echo ""

# ============================================================================
# Update Plan
# ============================================================================

ui_section "Update Plan" "$ICON_PACKAGE"

update_items=()

if [ "$OVERWRITE_INSTRUCTIONS" = true ]; then
    update_items+=("Instructions → Latest workflow files")
else
    update_items+=("Instructions → Keep existing")
fi

if [ "$OVERWRITE_STANDARDS" = true ]; then
    update_items+=("Standards → Latest best practices")
else
    update_items+=("Standards → Keep existing")
fi

if [ "$OVERWRITE_COMMANDS" = true ]; then
    update_items+=("Commands → Latest CLI commands")
else
    update_items+=("Commands → Keep existing")
fi

if [ "$OVERWRITE_AGENTS" = true ]; then
    update_items+=("Agents → Latest agent definitions")
else
    update_items+=("Agents → Keep existing")
fi

if [ "$OVERWRITE_HOOKS" = true ]; then
    update_items+=("Hooks → Latest orchestration hooks")
else
    update_items+=("Hooks → Keep existing")
fi

update_items+=("Config → Merge with new options")
update_items+=("User Data → ${UI_BOLD}Protected${UI_RESET} (specs, fixes, recaps, CLAUDE.md)")

if [ "$REGENERATE_CLAUDE_MD" = true ]; then
    update_items+=("CLAUDE.md → Regenerate from template")
fi

if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    update_items+=("Memory Migration → .yoyo-ai/ → .yoyo-dev/memory/")
fi

if [ "$SKIP_MCP_CHECK" = false ]; then
    update_items+=("MCP Servers → Verify and update")
fi

for item in "${update_items[@]}"; do
    echo -e "  ${UI_INFO}${ICON_ARROW}${UI_RESET} ${item}"
done

echo ""

# Brief pause so user can see the plan
echo -e "${UI_INFO}${ICON_INFO}${UI_RESET}  Starting update in 2 seconds..."
sleep 2
echo ""

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

TOTAL_STEPS=12
CURRENT_STEP=0

# Get base installation path
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"

# Step 1: Backup current config
((CURRENT_STEP++))
ui_step $CURRENT_STEP $TOTAL_STEPS "Creating backup..."

BACKUP_DIR=".yoyo-dev/backups/$(date +%Y%m%d_%H%M%S)"
show_progress "Creating backup directory" "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
show_progress "Copying config.yml"
cp .yoyo-dev/config.yml "$BACKUP_DIR/config.yml" 2>/dev/null || true

ui_success "Backup created: $BACKUP_DIR"
echo ""

# Step 2: Pull latest from base installation
((CURRENT_STEP++))
ui_step $CURRENT_STEP $TOTAL_STEPS "Pulling latest version..."

if [ -d "$BASE_YOYO_DEV/.git" ]; then
    show_progress "Checking for updates from" "$BASE_YOYO_DEV"
    cd "$BASE_YOYO_DEV"

    # Get current branch and show it
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    show_progress "Current branch" "$CURRENT_BRANCH"

    # Fetch and show status
    show_progress "Fetching latest changes..."
    if git fetch origin 2>&1 | head -5; then
        # Check if there are updates
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")

        if [ "$LOCAL" = "$REMOTE" ]; then
            show_progress "Already up to date"
        else
            show_progress "Pulling updates..."
            git pull 2>&1 | head -10
        fi
    fi

    cd "$CURRENT_DIR"
    ui_success "Base installation updated"
else
    show_progress "Source directory" "$BASE_YOYO_DEV"
    ui_info "No git repository found, using current base installation"
fi

echo ""

# Step 3: Update instructions
if [ "$OVERWRITE_INSTRUCTIONS" = true ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating instructions..."

    show_progress "Source" "$BASE_YOYO_DEV/instructions/"
    show_progress "Destination" ".yoyo-dev/instructions/"

    # Count files being updated
    FILE_COUNT=$(find "$BASE_YOYO_DEV/instructions/" -type f 2>/dev/null | wc -l)
    show_progress "Copying $FILE_COUNT files..."

    rsync -a --delete "$BASE_YOYO_DEV/instructions/" ".yoyo-dev/instructions/" 2>&1
    track_rsync_changes ".yoyo-dev/instructions/" "$FILE_COUNT"

    ui_success "Instructions updated ($FILE_COUNT files)"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Keeping existing instructions..."
    show_progress "Skipped (--no-overwrite-instructions)"
    echo ""
fi

# Step 4: Update standards
if [ "$OVERWRITE_STANDARDS" = true ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating standards..."

    show_progress "Source" "$BASE_YOYO_DEV/standards/"
    show_progress "Destination" ".yoyo-dev/standards/"

    # Count files being updated
    FILE_COUNT=$(find "$BASE_YOYO_DEV/standards/" -type f 2>/dev/null | wc -l)
    show_progress "Copying $FILE_COUNT files..."

    rsync -a --delete "$BASE_YOYO_DEV/standards/" ".yoyo-dev/standards/" 2>&1
    track_rsync_changes ".yoyo-dev/standards/" "$FILE_COUNT"

    ui_success "Standards updated ($FILE_COUNT files)"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Keeping existing standards..."
    show_progress "Skipped (--no-overwrite-standards)"
    echo ""
fi

# Step 5: Update commands
if [ "$OVERWRITE_COMMANDS" = true ] && [ -d ".claude/commands" ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating CLI commands..."

    show_progress "Source" "$BASE_YOYO_DEV/.claude/commands/"
    show_progress "Destination" ".claude/commands/"

    # Count files being updated
    FILE_COUNT=$(find "$BASE_YOYO_DEV/.claude/commands/" -type f 2>/dev/null | wc -l)
    show_progress "Copying $FILE_COUNT command files..."

    rsync -a "$BASE_YOYO_DEV/.claude/commands/" ".claude/commands/" 2>&1
    track_rsync_changes ".claude/commands/" "$FILE_COUNT"

    ui_success "Commands updated ($FILE_COUNT files)"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping command update..."
    if [ ! -d ".claude/commands" ]; then
        show_progress "Skipped (.claude/commands not found)"
    else
        show_progress "Skipped (--no-overwrite-commands)"
    fi
    echo ""
fi

# Step 6: Update agents
if [ "$OVERWRITE_AGENTS" = true ] && [ -d ".claude/agents" ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating agents..."

    show_progress "Source" "$BASE_YOYO_DEV/.claude/agents/"
    show_progress "Destination" ".claude/agents/"

    # Count files being updated
    FILE_COUNT=$(find "$BASE_YOYO_DEV/.claude/agents/" -type f 2>/dev/null | wc -l)
    show_progress "Copying $FILE_COUNT agent definitions..."

    rsync -a "$BASE_YOYO_DEV/.claude/agents/" ".claude/agents/" 2>&1
    track_rsync_changes ".claude/agents/" "$FILE_COUNT"

    ui_success "Agents updated ($FILE_COUNT files)"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping agent update..."
    if [ ! -d ".claude/agents" ]; then
        show_progress "Skipped (.claude/agents not found)"
    else
        show_progress "Skipped (--no-overwrite-agents)"
    fi
    echo ""
fi

# Step 7: Update orchestration hooks
if [ "$OVERWRITE_HOOKS" = true ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating orchestration hooks..."

    # Ensure .claude/hooks directory exists
    mkdir -p ".claude/hooks"

    # Copy hook bundle
    if [ -f "$BASE_YOYO_DEV/.claude/hooks/orchestrate.cjs" ]; then
        show_progress "Copying orchestration hook bundle"
        cp "$BASE_YOYO_DEV/.claude/hooks/orchestrate.cjs" ".claude/hooks/"
        track_file_change ".claude/hooks/orchestrate.cjs"
    else
        show_progress "Hook bundle not found at $BASE_YOYO_DEV/.claude/hooks/orchestrate.cjs"
    fi

    # Copy settings.json with hook configuration
    if [ -f "$BASE_YOYO_DEV/.claude/settings.json" ]; then
        if [ -f ".claude/settings.json" ]; then
            # Merge hook configuration into existing settings.json
            show_progress "Updating hook configuration in settings.json"
            # Simple approach: overwrite (user customizations should be in settings.local.json)
            cp "$BASE_YOYO_DEV/.claude/settings.json" ".claude/settings.json"
            track_file_change ".claude/settings.json"
        else
            show_progress "Creating settings.json with hook configuration"
            cp "$BASE_YOYO_DEV/.claude/settings.json" ".claude/settings.json"
            track_file_change ".claude/settings.json" "created"
        fi
    fi

    ui_success "Orchestration hooks updated"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping hooks update..."
    show_progress "Skipped (--no-overwrite-hooks)"
    echo ""
fi

# Step 8: Regenerate CLAUDE.md (optional, only if --regenerate-claude flag set)
if [ "$REGENERATE_CLAUDE_MD" = true ]; then
    ((CURRENT_STEP++))
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
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "CLAUDE.md check..."
    if [ -f "./CLAUDE.md" ]; then
        show_progress "CLAUDE.md exists and is protected"
    else
        show_progress "No CLAUDE.md found (use --regenerate-claude to create)"
    fi
    echo ""
fi

# Step 9: Merge config
((CURRENT_STEP++))
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

# Step 8: Migrate memory from .yoyo-ai/ to .yoyo-dev/memory/
if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    ((CURRENT_STEP++))
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
    ((CURRENT_STEP++))
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

# Step 9: Check MCP servers
if [ "$SKIP_MCP_CHECK" = false ]; then
    ((CURRENT_STEP++))
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
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping MCP server check..."
    show_progress "Skipped (--skip-mcp-check)"
    echo ""
fi

# Step 10: Verify update
((CURRENT_STEP++))
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

ui_complete "Update Complete!"

ui_section "What's New in v${VERSION}" "$ICON_SPARKLES"

echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} Yoyo Dev updated to ${UI_BOLD}v${VERSION}${UI_RESET}"
echo ""
echo -e "  ${ICON_SPARKLES} ${UI_SUCCESS}Global Orchestration Mode${UI_RESET}"
echo -e "     ${UI_DIM}• Intent classification on every user message${UI_RESET}"
echo -e "     ${UI_DIM}• Automatic agent delegation (research, frontend, codebase)${UI_RESET}"
echo -e "     ${UI_DIM}• Claude Code hook integration${UI_RESET}"
echo -e "     ${UI_DIM}• Browser GUI dashboard on port 5173${UI_RESET}"
echo ""

if [ "$NEEDS_MEMORY_MIGRATION" = true ]; then
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} Memory migrated to ${UI_BOLD}.yoyo-dev/memory/${UI_RESET}"
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

ui_info "Backup saved to: ${UI_PRIMARY}$BACKUP_DIR${UI_RESET}"
echo ""
