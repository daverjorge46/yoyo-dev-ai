#!/bin/bash

# Yoyo Dev Update Script v2
# Beautiful, clear update workflow with TUI v4 support

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

VERSION="4.0.0"
OVERWRITE_INSTRUCTIONS=true
OVERWRITE_STANDARDS=true
OVERWRITE_COMMANDS=true
OVERWRITE_AGENTS=true
VERBOSE=false
SKIP_MCP_CHECK=false
INTERACTIVE=true
AUTO_UPDATE_TUI_V4=true

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
        --no-overwrite)
            OVERWRITE_INSTRUCTIONS=false
            OVERWRITE_STANDARDS=false
            OVERWRITE_COMMANDS=false
            OVERWRITE_AGENTS=false
            shift
            ;;
        --skip-mcp-check)
            SKIP_MCP_CHECK=true
            shift
            ;;
        --no-tui-update)
            AUTO_UPDATE_TUI_V4=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --non-interactive)
            INTERACTIVE=false
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
  ${UI_PRIMARY}--no-overwrite${UI_RESET}                 Keep all existing framework files
  ${UI_PRIMARY}--skip-mcp-check${UI_RESET}               Skip MCP server verification
  ${UI_PRIMARY}--no-tui-update${UI_RESET}                Skip TUI v4 dependency updates
  ${UI_PRIMARY}--non-interactive${UI_RESET}              Run without prompts
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

# Validation
if [ ! -d "./.yoyo-dev" ]; then
    ui_error "Yoyo Dev is not installed in this project"
    echo ""
    echo "  Run the installation script first:"
    echo "  ${UI_PRIMARY}~/.yoyo-dev/setup/project.sh --claude-code${UI_RESET}"
    echo ""
    exit 1
fi

# Check for deprecated .yoyo/ directory
if [ -d "./.yoyo" ]; then
    ui_warning "Found deprecated .yoyo/ directory"
    echo ""
    echo "  The .yoyo/ directory is from an old version."
    echo "  Current Yoyo Dev uses:"
    echo "    • .yoyo-dev/ for framework files"
    echo "    • .yoyo-ai/ for memory system"
    echo ""
    echo "  Run ${UI_PRIMARY}/yoyo-init${UI_RESET} in Claude Code to migrate."
    echo ""
fi

# Show project info
ui_section "Project Information" "$ICON_FOLDER"
ui_kv "Project Name" "$PROJECT_NAME"
ui_kv "Current Version" "$(grep 'yoyo_dev_version:' .yoyo-dev/config.yml | cut -d: -f2 | tr -d ' ' || echo 'unknown')"
ui_kv "New Version" "$VERSION"

# Get current TUI version
CURRENT_TUI_VERSION=$(grep -A1 '^tui:' .yoyo-dev/config.yml | grep 'version:' | cut -d: -f2 | tr -d ' "' || echo "v3")
ui_kv "TUI Version" "$CURRENT_TUI_VERSION"

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

update_items+=("Config → Merge with new options")
update_items+=("User Data → ${UI_BOLD}Protected${UI_RESET} (specs, fixes, recaps)")

if [ "$CURRENT_TUI_VERSION" = "v4" ] && [ "$AUTO_UPDATE_TUI_V4" = true ]; then
    update_items+=("TUI v4 Dependencies → Update to latest")
fi

if [ "$SKIP_MCP_CHECK" = false ]; then
    update_items+=("MCP Servers → Verify and update")
fi

for item in "${update_items[@]}"; do
    echo -e "  ${UI_INFO}${ICON_ARROW}${UI_RESET} ${item}"
done

echo ""

if [ "$INTERACTIVE" = true ]; then
    if ! ui_ask "Proceed with update?" "y"; then
        echo ""
        ui_warning "Update cancelled by user"
        echo ""
        exit 0
    fi
fi

echo ""

# ============================================================================
# Update Steps
# ============================================================================

TOTAL_STEPS=10
CURRENT_STEP=0

# Get base installation path
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"

# Step 1: Backup current config
((CURRENT_STEP++))
ui_step $CURRENT_STEP $TOTAL_STEPS "Creating backup..."

BACKUP_DIR=".yoyo-dev/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp .yoyo-dev/config.yml "$BACKUP_DIR/config.yml" 2>/dev/null || true

ui_success "Backup created: $BACKUP_DIR"
echo ""

# Step 2: Pull latest from base installation
((CURRENT_STEP++))
ui_step $CURRENT_STEP $TOTAL_STEPS "Pulling latest version..."

if [ -d "$BASE_YOYO_DEV/.git" ]; then
    (cd "$BASE_YOYO_DEV" && git pull --quiet) &
    spinner_pid=$!
    ui_spinner $spinner_pid "  Updating base installation"
    wait $spinner_pid
    ui_success "Base installation updated"
else
    ui_info "No git repository found, using current base installation"
fi

echo ""

# Step 3: Update instructions
if [ "$OVERWRITE_INSTRUCTIONS" = true ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating instructions..."

    rsync -a --delete "$BASE_YOYO_DEV/instructions/" ".yoyo-dev/instructions/" 2>&1 | grep -v "sending incremental" || true
    ui_success "Instructions updated"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Keeping existing instructions..."
    echo ""
fi

# Step 4: Update standards
if [ "$OVERWRITE_STANDARDS" = true ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating standards..."

    rsync -a --delete "$BASE_YOYO_DEV/standards/" ".yoyo-dev/standards/" 2>&1 | grep -v "sending incremental" || true
    ui_success "Standards updated"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Keeping existing standards..."
    echo ""
fi

# Step 5: Update commands
if [ "$OVERWRITE_COMMANDS" = true ] && [ -d ".claude/commands" ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating CLI commands..."

    rsync -a "$BASE_YOYO_DEV/.claude/commands/" ".claude/commands/" 2>&1 | grep -v "sending incremental" || true
    ui_success "Commands updated"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping command update..."
    echo ""
fi

# Step 6: Update agents
if [ "$OVERWRITE_AGENTS" = true ] && [ -d ".claude/agents" ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating agents..."

    rsync -a "$BASE_YOYO_DEV/.claude/agents/" ".claude/agents/" 2>&1 | grep -v "sending incremental" || true
    ui_success "Agents updated"
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping agent update..."
    echo ""
fi

# Step 7: Merge config
((CURRENT_STEP++))
ui_step $CURRENT_STEP $TOTAL_STEPS "Merging configuration..."

# Update version number
sed -i.bak "s/yoyo_dev_version:.*/yoyo_dev_version: $VERSION/" .yoyo-dev/config.yml
rm -f .yoyo-dev/config.yml.bak

# Add new config options if missing
if ! grep -q "^backend:" .yoyo-dev/config.yml 2>/dev/null; then
    cat >> .yoyo-dev/config.yml << EOF

# Backend API (for TUI v4)
backend:
  enabled: $([ "$CURRENT_TUI_VERSION" = "v4" ] && echo "true" || echo "false")
  port: 3457
  host: "localhost"
EOF
fi

ui_success "Configuration merged"
echo ""

# Step 8: Update TUI v4 dependencies
if [ "$CURRENT_TUI_VERSION" = "v4" ] && [ "$AUTO_UPDATE_TUI_V4" = true ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Updating TUI v4 dependencies..."

    if command -v npm &> /dev/null; then
        (cd "$BASE_YOYO_DEV" && npm update --silent 2>&1 | grep -v "npm WARN" || true) &
        spinner_pid=$!
        ui_spinner $spinner_pid "  Updating Node packages"
        wait $spinner_pid
        ui_success "TUI v4 dependencies updated"
    else
        ui_warning "npm not found - skipping dependency update"
    fi
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping TUI v4 dependency update..."
    echo ""
fi

# Step 9: Check MCP servers
if [ "$SKIP_MCP_CHECK" = false ]; then
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Checking MCP servers..."

    if [ -f "$SCRIPT_DIR/docker-mcp-setup.sh" ]; then
        bash "$SCRIPT_DIR/docker-mcp-setup.sh" --skip-if-no-docker 2>&1 | grep -E "✓|✗" || ui_info "MCP check complete"
    else
        ui_info "MCP setup script not found"
    fi
    echo ""
else
    ((CURRENT_STEP++))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping MCP server check..."
    echo ""
fi

# Step 10: Verify update
((CURRENT_STEP++))
ui_step $CURRENT_STEP $TOTAL_STEPS "Verifying update..."

errors=()

if ! grep -q "yoyo_dev_version: $VERSION" .yoyo-dev/config.yml; then
    errors+=("Version number not updated")
fi

if [ ${#errors[@]} -gt 0 ]; then
    ui_error "Update verification failed"
    for error in "${errors[@]}"; do
        echo "  - $error"
    done
    echo ""
    echo "  Backup available at: $BACKUP_DIR"
    exit 1
fi

ui_success "Update verified"
echo ""

# ============================================================================
# Completion
# ============================================================================

ui_complete "Update Complete!"

ui_section "What's New" "$ICON_SPARKLES"

echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} Yoyo Dev updated to ${UI_BOLD}v${VERSION}${UI_RESET}"
echo ""

if [ "$CURRENT_TUI_VERSION" = "v4" ]; then
    echo -e "  ${ICON_SPARKLES} ${UI_SUCCESS}TUI v4 Active${UI_RESET}"
    echo -e "     ${UI_DIM}• Latest React/Ink components${UI_RESET}"
    echo -e "     ${UI_DIM}• Improved performance & stability${UI_RESET}"
    echo ""
else
    echo -e "  ${UI_INFO}${ICON_INFO}${UI_RESET}  Want to try TUI v4?"
    echo -e "     ${UI_DIM}Edit .yoyo-dev/config.yml:${UI_RESET}"
    echo -e "     ${UI_DIM}tui.version: \"v4\"${UI_RESET}"
    echo ""
fi

ui_section "Next Steps" "$ICON_ROCKET"

echo -e "  ${UI_PRIMARY}1.${UI_RESET} Review changes:"
echo -e "     ${UI_DIM}\$ cat .yoyo-dev/config.yml${UI_RESET}"
echo ""

echo -e "  ${UI_PRIMARY}2.${UI_RESET} Launch the TUI:"
echo -e "     ${UI_DIM}\$ yoyo${UI_RESET}"
echo ""

echo -e "  ${UI_PRIMARY}3.${UI_RESET} Check for breaking changes:"
echo -e "     ${UI_DIM}\$ cat $BASE_YOYO_DEV/CHANGELOG.md${UI_RESET}"
echo ""

ui_info "Backup saved to: ${UI_PRIMARY}$BACKUP_DIR${UI_RESET}"
echo ""
