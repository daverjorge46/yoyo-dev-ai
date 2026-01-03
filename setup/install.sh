#!/bin/bash

# Yoyo Dev Project Installation Script v2
# Beautiful, intuitive installation with TUI v4 support

set -e  # Exit on error

# ============================================================================
# Load UI Library
# ============================================================================

# Resolve symlink to get actual script location
SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
source "$SCRIPT_DIR/ui-library.sh" 2>/dev/null || {
    # Fallback if UI library not available
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_ERROR='\033[0;31m'
    UI_RESET='\033[0m'
    ui_error() { echo -e "${UI_ERROR}✗${UI_RESET} $1"; }
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
}

# ============================================================================
# Configuration
# ============================================================================

VERSION="6.1.0"
NO_BASE=false
OVERWRITE_INSTRUCTIONS=false
OVERWRITE_STANDARDS=false
CLAUDE_CODE=false
CURSOR=false
PROJECT_TYPE=""
AUTO_INSTALL_MCP=true
GENERATE_CLAUDE_MD=true
INTERACTIVE=true

# Tech Stack Configuration
TECH_STACK_FRAMEWORK=""
TECH_STACK_DATABASE=""
TECH_STACK_STYLING=""

# ============================================================================
# Parse Arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-base)
            NO_BASE=true
            shift
            ;;
        --overwrite-instructions)
            OVERWRITE_INSTRUCTIONS=true
            shift
            ;;
        --overwrite-standards)
            OVERWRITE_STANDARDS=true
            shift
            ;;
        --claude-code|--claude|--claude_code)
            CLAUDE_CODE=true
            shift
            ;;
        --cursor|--cursor-cli)
            CURSOR=true
            shift
            ;;
        --project-type=*)
            PROJECT_TYPE="${1#*=}"
            shift
            ;;
        --no-auto-mcp)
            AUTO_INSTALL_MCP=false
            shift
            ;;
        --no-claude-md)
            GENERATE_CLAUDE_MD=false
            shift
            ;;
        --non-interactive)
            INTERACTIVE=false
            shift
            ;;
        -h|--help)
            cat << EOF

Usage: $0 [OPTIONS]

${UI_BOLD}Yoyo Dev Project Installation${UI_RESET}

Options:
  ${UI_PRIMARY}--no-base${UI_RESET}                   Install from GitHub (not from base installation)
  ${UI_PRIMARY}--overwrite-instructions${UI_RESET}    Overwrite existing instruction files
  ${UI_PRIMARY}--overwrite-standards${UI_RESET}       Overwrite existing standards files
  ${UI_PRIMARY}--claude-code${UI_RESET}               Add Claude Code support
  ${UI_PRIMARY}--cursor${UI_RESET}                    Add Cursor support
  ${UI_PRIMARY}--project-type=TYPE${UI_RESET}         Use specific project type
  ${UI_PRIMARY}--no-auto-mcp${UI_RESET}               Skip automatic MCP server installation
  ${UI_PRIMARY}--no-claude-md${UI_RESET}              Skip project CLAUDE.md generation
  ${UI_PRIMARY}--non-interactive${UI_RESET}           Run without prompts (use defaults)
  ${UI_PRIMARY}-h, --help${UI_RESET}                  Show this help message

Examples:
  $0 --claude-code             # Install with Claude Code
  $0 --no-base                 # Install from GitHub
  $0 --cursor                  # Install with Cursor support

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
ui_box_header "PROJECT INSTALLATION" 70 "$UI_PRIMARY"

# Get project info
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")
INSTALL_DIR="./.yoyo-dev"

# Validation: Prevent installing in home directory
if [ "$CURRENT_DIR" = "$HOME" ]; then
    ui_error "Cannot install in home directory"
    echo ""
    echo "  This would conflict with the base installation at ~/yoyo-dev/"
    echo "  Please run this script from a project directory."
    echo ""
    exit 1
fi

# Check for old directory structure
if [ -d "yoyo-dev" ] && [ ! -d "./.yoyo-dev" ]; then
    ui_warning "Found old 'yoyo-dev/' directory"
    echo ""
    echo "  Yoyo Dev now uses '.yoyo-dev/' (hidden directory)."
    echo ""
    echo "  To migrate: ${UI_PRIMARY}mv yoyo-dev .yoyo-dev${UI_RESET}"
    echo ""
    exit 1
fi

# Show project info
ui_section "Project Information" "$ICON_FOLDER"
ui_kv "Project Name" "$PROJECT_NAME"
ui_kv "Install Path" "$INSTALL_DIR"
ui_kv "Current Directory" "$CURRENT_DIR"

# Determine installation source
if [ "$NO_BASE" = true ]; then
    IS_FROM_BASE=false
    ui_kv "Installation Source" "GitHub (no base installation)"
    BASE_URL="https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main"
else
    IS_FROM_BASE=true
    BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
    ui_kv "Installation Source" "Base installation ($BASE_YOYO_DEV)"
fi

echo ""

# ============================================================================
# Configuration Menu (Interactive Mode)
# ============================================================================

if [ "$INTERACTIVE" = true ]; then
    ui_section "Configuration Options" "$ICON_WRENCH"

    # IDE Integration
    if [ "$CLAUDE_CODE" = false ] && [ "$CURSOR" = false ]; then
        echo ""
        echo -e "${UI_BOLD}Which IDE integration would you like?${UI_RESET}"
        echo ""
        ui_option "1" "Claude Code" "Official Claude CLI integration (recommended)" true
        ui_option "2" "Cursor" "Cursor IDE integration"
        ui_option "3" "Both" "Claude Code + Cursor"
        ui_option "4" "None" "Skip IDE integration"

        echo -n "  Choice [1]: "
        read -r ide_choice
        ide_choice=${ide_choice:-1}

        case $ide_choice in
            1)
                CLAUDE_CODE=true
                ;;
            2)
                CURSOR=true
                ;;
            3)
                CLAUDE_CODE=true
                CURSOR=true
                ;;
            4)
                # No IDE integration
                ;;
        esac
    fi

    # MCP Server Installation
    if [ "$AUTO_INSTALL_MCP" = true ]; then
        echo ""
        if ui_ask "Install Docker MCP servers automatically?" "y"; then
            AUTO_INSTALL_MCP=true
        else
            AUTO_INSTALL_MCP=false
        fi
    fi

    # Tech Stack Selection
    echo ""
    echo -e "${UI_BOLD}What is your project's tech stack?${UI_RESET}"
    echo ""

    # Framework
    echo -e "  ${UI_DIM}Framework:${UI_RESET}"
    echo -e "    ${UI_PRIMARY}1.${UI_RESET} React + TypeScript (recommended)"
    echo -e "    ${UI_PRIMARY}2.${UI_RESET} Next.js"
    echo -e "    ${UI_PRIMARY}3.${UI_RESET} Vue.js"
    echo -e "    ${UI_PRIMARY}4.${UI_RESET} Node.js + Express"
    echo -e "    ${UI_PRIMARY}5.${UI_RESET} Python + FastAPI"
    echo -e "    ${UI_PRIMARY}6.${UI_RESET} Other/Skip"
    echo ""
    echo -n "  Choice [1]: "
    read -r fw_choice
    fw_choice=${fw_choice:-1}

    case $fw_choice in
        1) TECH_STACK_FRAMEWORK="react-typescript" ;;
        2) TECH_STACK_FRAMEWORK="nextjs" ;;
        3) TECH_STACK_FRAMEWORK="vuejs" ;;
        4) TECH_STACK_FRAMEWORK="nodejs-express" ;;
        5) TECH_STACK_FRAMEWORK="python-fastapi" ;;
        *) TECH_STACK_FRAMEWORK="other" ;;
    esac

    # Database
    echo ""
    echo -e "  ${UI_DIM}Database:${UI_RESET}"
    echo -e "    ${UI_PRIMARY}1.${UI_RESET} None"
    echo -e "    ${UI_PRIMARY}2.${UI_RESET} Convex (serverless)"
    echo -e "    ${UI_PRIMARY}3.${UI_RESET} PostgreSQL"
    echo -e "    ${UI_PRIMARY}4.${UI_RESET} MongoDB"
    echo -e "    ${UI_PRIMARY}5.${UI_RESET} SQLite"
    echo -e "    ${UI_PRIMARY}6.${UI_RESET} Supabase"
    echo ""
    echo -n "  Choice [1]: "
    read -r db_choice
    db_choice=${db_choice:-1}

    case $db_choice in
        1) TECH_STACK_DATABASE="none" ;;
        2) TECH_STACK_DATABASE="convex" ;;
        3) TECH_STACK_DATABASE="postgresql" ;;
        4) TECH_STACK_DATABASE="mongodb" ;;
        5) TECH_STACK_DATABASE="sqlite" ;;
        6) TECH_STACK_DATABASE="supabase" ;;
        *) TECH_STACK_DATABASE="none" ;;
    esac

    # Styling
    echo ""
    echo -e "  ${UI_DIM}Styling:${UI_RESET}"
    echo -e "    ${UI_PRIMARY}1.${UI_RESET} Tailwind CSS (recommended)"
    echo -e "    ${UI_PRIMARY}2.${UI_RESET} CSS Modules"
    echo -e "    ${UI_PRIMARY}3.${UI_RESET} Styled Components"
    echo -e "    ${UI_PRIMARY}4.${UI_RESET} Plain CSS"
    echo -e "    ${UI_PRIMARY}5.${UI_RESET} Other/Skip"
    echo ""
    echo -n "  Choice [1]: "
    read -r style_choice
    style_choice=${style_choice:-1}

    case $style_choice in
        1) TECH_STACK_STYLING="tailwindcss" ;;
        2) TECH_STACK_STYLING="css-modules" ;;
        3) TECH_STACK_STYLING="styled-components" ;;
        4) TECH_STACK_STYLING="plain-css" ;;
        *) TECH_STACK_STYLING="other" ;;
    esac

    echo ""
fi

# ============================================================================
# Installation Summary
# ============================================================================

ui_section "Installation Summary" "$ICON_PACKAGE"

summary_items=()
summary_items+=("Project: $PROJECT_NAME")

if [ "$CLAUDE_CODE" = true ]; then
    summary_items+=("IDE: Claude Code")
fi

if [ "$CURSOR" = true ]; then
    summary_items+=("IDE: Cursor")
fi

if [ "$AUTO_INSTALL_MCP" = true ]; then
    summary_items+=("MCP Servers: Auto-install")
else
    summary_items+=("MCP Servers: Skip")
fi

# Add tech stack to summary
if [ -n "$TECH_STACK_FRAMEWORK" ] && [ "$TECH_STACK_FRAMEWORK" != "other" ]; then
    summary_items+=("Framework: $TECH_STACK_FRAMEWORK")
fi
if [ -n "$TECH_STACK_DATABASE" ] && [ "$TECH_STACK_DATABASE" != "none" ]; then
    summary_items+=("Database: $TECH_STACK_DATABASE")
fi
if [ -n "$TECH_STACK_STYLING" ] && [ "$TECH_STACK_STYLING" != "other" ]; then
    summary_items+=("Styling: $TECH_STACK_STYLING")
fi

for item in "${summary_items[@]}"; do
    echo -e "  ${UI_SUCCESS}${ICON_CHECK}${UI_RESET} ${item}"
done

echo ""

if [ "$INTERACTIVE" = true ]; then
    if ! ui_ask "Proceed with installation?" "y"; then
        echo ""
        ui_warning "Installation cancelled by user"
        echo ""
        exit 0
    fi
fi

echo ""

# ============================================================================
# Installation Steps
# ============================================================================

TOTAL_STEPS=9
CURRENT_STEP=0

# Step 1: Create directories
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Creating project directories..."

mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/instructions/core"
mkdir -p "$INSTALL_DIR/instructions/meta"
mkdir -p "$INSTALL_DIR/standards"
mkdir -p "$INSTALL_DIR/product"
mkdir -p "$INSTALL_DIR/specs"
mkdir -p "$INSTALL_DIR/fixes"
mkdir -p "$INSTALL_DIR/recaps"
mkdir -p "$INSTALL_DIR/memory"
mkdir -p "$INSTALL_DIR/cleanup"
mkdir -p "$INSTALL_DIR/archive/specs"
mkdir -p "$INSTALL_DIR/archive/fixes"
mkdir -p "$INSTALL_DIR/archive/recaps"
mkdir -p "$INSTALL_DIR/archive/patterns"

if [ "$CLAUDE_CODE" = true ]; then
    mkdir -p ".claude/commands"
    mkdir -p ".claude/agents"
    mkdir -p ".claude/hooks"
fi

ui_success "Directories created"
echo ""

# Step 2: Copy framework files
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Installing framework files..."

if [ "$IS_FROM_BASE" = true ]; then
    # Copy from base installation
    cp -r "$BASE_YOYO_DEV/instructions/"* "$INSTALL_DIR/instructions/"
    cp -r "$BASE_YOYO_DEV/standards/"* "$INSTALL_DIR/standards/"

    if [ "$CLAUDE_CODE" = true ]; then
        # Copy commands, agents, skills, templates
        cp -r "$BASE_YOYO_DEV/.claude/commands/"* ".claude/commands/" 2>/dev/null || true
        cp -r "$BASE_YOYO_DEV/.claude/agents/"* ".claude/agents/" 2>/dev/null || true
        cp -r "$BASE_YOYO_DEV/.claude/skills/"* ".claude/skills/" 2>/dev/null || mkdir -p ".claude/skills"
        cp -r "$BASE_YOYO_DEV/.claude/templates/"* ".claude/templates/" 2>/dev/null || mkdir -p ".claude/templates"

        # Copy orchestration hook bundle
        if [ -f "$BASE_YOYO_DEV/.claude/hooks/orchestrate.cjs" ]; then
            cp "$BASE_YOYO_DEV/.claude/hooks/orchestrate.cjs" ".claude/hooks/"
            ui_info "Orchestration hook installed"
        fi

        # Copy settings.json with hook configuration (if not exists)
        if [ ! -f ".claude/settings.json" ] && [ -f "$BASE_YOYO_DEV/.claude/settings.json" ]; then
            cp "$BASE_YOYO_DEV/.claude/settings.json" ".claude/"
        fi
    fi
else
    # Download from GitHub
    ui_info "Downloading from GitHub..."
    # (Implementation would download files from BASE_URL)
fi

ui_success "Framework files installed"
echo ""

# Step 3: Create config file
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Creating configuration..."

cat > "$INSTALL_DIR/config.yml" << EOF
# Yoyo Dev Configuration
yoyo_dev_version: $VERSION

agents:
  claude_code:
    enabled: $CLAUDE_CODE
  cursor:
    enabled: $CURSOR

# Project Tech Stack
tech_stack:
  framework: "${TECH_STACK_FRAMEWORK:-other}"
  database: "${TECH_STACK_DATABASE:-none}"
  styling: "${TECH_STACK_STYLING:-other}"

EOF

ui_success "Configuration created"
echo ""

# Step 4: Generate project CLAUDE.md
if [ "$GENERATE_CLAUDE_MD" = true ]; then
    ((++CURRENT_STEP))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Generating project CLAUDE.md..."

    TEMPLATE_FILE="$BASE_YOYO_DEV/setup/templates/PROJECT-CLAUDE.md"
    OUTPUT_FILE="./CLAUDE.md"

    if [ "$IS_FROM_BASE" = true ] && [ -f "$TEMPLATE_FILE" ]; then
        # Backup existing CLAUDE.md if present
        if [ -f "$OUTPUT_FILE" ]; then
            cp "$OUTPUT_FILE" "${OUTPUT_FILE}.backup"
            ui_info "Existing CLAUDE.md backed up to CLAUDE.md.backup"
        fi

        # Generate CLAUDE.md from template with variable substitution
        sed -e "s/{{VERSION}}/$VERSION/g" \
            -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
            -e "s/{{TECH_STACK_FRAMEWORK}}/${TECH_STACK_FRAMEWORK:-not specified}/g" \
            -e "s/{{TECH_STACK_DATABASE}}/${TECH_STACK_DATABASE:-none}/g" \
            -e "s/{{TECH_STACK_STYLING}}/${TECH_STACK_STYLING:-not specified}/g" \
            "$TEMPLATE_FILE" > "$OUTPUT_FILE"

        ui_success "Project CLAUDE.md generated"
    else
        if [ "$IS_FROM_BASE" = false ]; then
            ui_warning "CLAUDE.md generation requires base installation"
        else
            ui_warning "Template not found at $TEMPLATE_FILE, skipping CLAUDE.md generation"
        fi
    fi
    echo ""
else
    ((++CURRENT_STEP))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping CLAUDE.md generation..."
    echo ""
fi

# Step 5: Install MCP servers
if [ "$AUTO_INSTALL_MCP" = true ]; then
    ((++CURRENT_STEP))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Installing MCP servers..."

    if [ -f "$SCRIPT_DIR/docker-mcp-setup.sh" ]; then
        bash "$SCRIPT_DIR/docker-mcp-setup.sh" --skip-if-no-docker 2>&1 | grep -E "✓|✗" || true
    else
        ui_info "MCP setup script not found, skipping..."
    fi
    echo ""
else
    ((++CURRENT_STEP))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Skipping MCP server installation..."
    echo ""
fi

# Step 6: Update .gitignore
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Updating .gitignore..."

if [ ! -f ".gitignore" ]; then
    touch ".gitignore"
fi

# Add Yoyo Dev entries if not already present
if ! grep -q ".yoyo-dev/product/" ".gitignore" 2>/dev/null; then
    cat >> ".gitignore" << 'EOF'

# Yoyo Dev
.yoyo-dev/product/
.yoyo-dev/specs/
.yoyo-dev/fixes/
.yoyo-dev/recaps/
.yoyo-dev/memory/
.yoyo-dev/.tui-session.json
.yoyo-dev/tui-errors.log
EOF
fi

ui_success ".gitignore updated"
echo ""

# Step 7: Create placeholder files
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Creating placeholder files..."

touch "$INSTALL_DIR/product/.gitkeep"
touch "$INSTALL_DIR/specs/.gitkeep"
touch "$INSTALL_DIR/fixes/.gitkeep"
touch "$INSTALL_DIR/recaps/.gitkeep"
touch "$INSTALL_DIR/memory/.gitkeep"

ui_success "Placeholders created"
echo ""

# Step 8: Verify installation
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Verifying installation..."

errors=()

if [ ! -d "$INSTALL_DIR" ]; then
    errors+=("Installation directory not created")
fi

if [ ! -f "$INSTALL_DIR/config.yml" ]; then
    errors+=("Config file not created")
fi

if [ ${#errors[@]} -gt 0 ]; then
    ui_error "Installation verification failed"
    for error in "${errors[@]}"; do
        echo "  - $error"
    done
    echo ""
    exit 1
fi

ui_success "Installation verified"
echo ""

# ============================================================================
# Completion
# ============================================================================

ui_complete "Installation Complete!"

ui_section "Next Steps" "$ICON_ROCKET"

echo -e "  ${UI_PRIMARY}1.${UI_RESET} Launch Claude Code with Yoyo Dev:"
echo -e "     ${UI_DIM}\$ yoyo${UI_RESET} ${UI_DIM}# Opens Claude Code + Browser GUI${UI_RESET}"
echo ""

echo -e "  ${UI_PRIMARY}2.${UI_RESET} Start planning your product:"
echo -e "     ${UI_DIM}Use ${UI_SUCCESS}/plan-product${UI_RESET}${UI_DIM} in Claude Code${UI_RESET}"
echo ""

echo -e "  ${UI_PRIMARY}3.${UI_RESET} View all commands:"
echo -e "     ${UI_DIM}Use ${UI_SUCCESS}/yoyo-help${UI_RESET}${UI_DIM} in Claude Code${UI_RESET}"
echo ""

ui_info "For help, run: ${UI_PRIMARY}yoyo --help${UI_RESET}"
echo ""
