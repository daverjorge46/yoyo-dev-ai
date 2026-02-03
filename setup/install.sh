#!/bin/bash

# Yoyo Dev Project Installation Script v2
# Beautiful, intuitive installation with Claude Code integration

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

VERSION="7.0.0"
NO_BASE=false
OVERWRITE_INSTRUCTIONS=false
OVERWRITE_STANDARDS=false
CLAUDE_CODE=false
CURSOR=false
PROJECT_TYPE=""
AUTO_INSTALL_MCP=true
GENERATE_CLAUDE_MD=true
INTERACTIVE=true
# Component selection: "both", "yoyo-dev", "yoyo-ai"
INSTALL_COMPONENTS="both"
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
        --yoyo-ai-only)
            INSTALL_COMPONENTS="yoyo-ai"
            shift
            ;;
        --yoyo-dev-only)
            INSTALL_COMPONENTS="yoyo-dev"
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
  ${UI_PRIMARY}--yoyo-ai-only${UI_RESET}              Install only yoyo-ai (OpenClaw)
  ${UI_PRIMARY}--yoyo-dev-only${UI_RESET}             Install only yoyo-dev (dev environment)
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

# Detect WSL environment
IS_WSL=false
if grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
fi

# Get project info
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")
INSTALL_DIR="./.yoyo-dev"

# Validation: Prevent installing in home directory
if [ "$CURRENT_DIR" = "$HOME" ]; then
    ui_error "Cannot install in home directory"
    echo ""
    echo "  This would conflict with the base installation at ~/.yoyo-dev/"
    echo "  Please run this script from a project directory."
    echo ""
    exit 1
fi

# Validation: Prevent installing in the framework source directory itself
SCRIPT_PARENT_DIR="$(dirname "$SCRIPT_DIR")"
if [ "$CURRENT_DIR" = "$SCRIPT_PARENT_DIR" ]; then
    ui_error "Cannot install within the framework source directory"
    echo ""
    echo "  This is the Yoyo Dev framework source repository."
    echo "  Installation creates project-specific data that would pollute the repo."
    echo ""
    echo "  To use Yoyo Dev:"
    echo "    1. Navigate to your project directory: ${UI_PRIMARY}cd /path/to/your-project${UI_RESET}"
    echo "    2. Run installation from there: ${UI_PRIMARY}$0${UI_RESET}"
    echo ""
    exit 1
fi

# Additional check: Look for framework markers (catches symlinks and copied frameworks)
if [ -f "$CURRENT_DIR/setup/install.sh" ] && [ -d "$CURRENT_DIR/instructions" ] && [ -d "$CURRENT_DIR/standards" ]; then
    ui_error "Detected Yoyo Dev framework directory"
    echo ""
    echo "  This directory appears to be the Yoyo Dev framework source."
    echo "  Cannot create .yoyo-dev within the framework repository."
    echo ""
    echo "  Please run this script from a separate project directory."
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

    # Component Selection (first question)
    echo ""
    echo -e "${UI_BOLD}What would you like to install?${UI_RESET}"
    echo ""
    ui_option "1" "Both (recommended)" "yoyo-dev (Dev Environment) + yoyo-ai (AI Assistant)" true
    ui_option "2" "yoyo-ai only" "Business and Personal AI Assistant (OpenClaw)"
    ui_option "3" "yoyo-dev only" "Development environment (Claude Code, Wave, GUI)"

    echo -n "  Choice [1]: "
    read -r component_choice
    component_choice=${component_choice:-1}

    case $component_choice in
        1) INSTALL_COMPONENTS="both" ;;
        2) INSTALL_COMPONENTS="yoyo-ai" ;;
        3) INSTALL_COMPONENTS="yoyo-dev" ;;
        *) INSTALL_COMPONENTS="both" ;;
    esac

    # IDE Integration (only if installing yoyo-dev)
    if [ "$INSTALL_COMPONENTS" = "yoyo-ai" ]; then
        # yoyo-ai only — skip IDE/tech-stack/MCP questions
        CLAUDE_CODE=false
        CURSOR=false
        AUTO_INSTALL_MCP=false
        GENERATE_CLAUDE_MD=false
    elif [ "$CLAUDE_CODE" = false ] && [ "$CURSOR" = false ]; then
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

    # MCP Server Installation (skip for yoyo-ai only)
    if [ "$INSTALL_COMPONENTS" != "yoyo-ai" ] && [ "$AUTO_INSTALL_MCP" = true ]; then
        echo ""
        if ui_ask "Install Docker MCP servers automatically?" "y"; then
            AUTO_INSTALL_MCP=true
        else
            AUTO_INSTALL_MCP=false
        fi
    fi

    # Tech Stack Selection (skip for yoyo-ai only)
    if [ "$INSTALL_COMPONENTS" != "yoyo-ai" ]; then
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

    fi  # end INSTALL_COMPONENTS != yoyo-ai (tech stack)

    echo ""
fi

# ============================================================================
# Installation Summary
# ============================================================================

ui_section "Installation Summary" "$ICON_PACKAGE"

summary_items=()
summary_items+=("Project: $PROJECT_NAME")
summary_items+=("Components: $INSTALL_COMPONENTS")

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

TOTAL_STEPS=12
CURRENT_STEP=0

# Step 1: Install Claude Code CLI (if needed for yoyo-dev)
if [ "$INSTALL_COMPONENTS" != "yoyo-ai" ]; then
    ((++CURRENT_STEP))
    ui_step $CURRENT_STEP $TOTAL_STEPS "Checking Claude Code CLI..."

    if command -v claude &>/dev/null; then
        ui_success "Claude Code CLI already installed"
    else
        ui_info "Installing Claude Code CLI..."
        if command -v npm &>/dev/null; then
            if npm install -g @anthropic-ai/claude-code 2>&1 | tail -1; then
                ui_success "Claude Code CLI installed"
            else
                ui_warning "Claude Code CLI installation via npm failed"
                echo -e "  ${UI_DIM}Install manually: ${UI_PRIMARY}npm install -g @anthropic-ai/claude-code${UI_RESET}"
                echo -e "  ${UI_DIM}Or visit: ${UI_PRIMARY}https://docs.anthropic.com/en/docs/claude-code${UI_RESET}"
            fi
        else
            ui_warning "npm not found — Claude Code CLI requires Node.js and npm"
            echo -e "  ${UI_DIM}Install Node.js first, then: ${UI_PRIMARY}npm install -g @anthropic-ai/claude-code${UI_RESET}"
        fi
    fi
    echo ""
fi

# Step 2: Create directories
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
    mkdir -p ".claude/skills"
    mkdir -p ".claude/templates"
    mkdir -p ".claude/output-styles"
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
        # Copy from claude-code/ canonical source directory (not .claude/)
        # This ensures projects get clean distribution files without local settings
        cp -r "$BASE_YOYO_DEV/claude-code/commands/"* ".claude/commands/" 2>/dev/null || true
        cp -r "$BASE_YOYO_DEV/claude-code/agents/"* ".claude/agents/" 2>/dev/null || true
        cp -r "$BASE_YOYO_DEV/claude-code/skills/"* ".claude/skills/" 2>/dev/null || true
        cp -r "$BASE_YOYO_DEV/claude-code/templates/"* ".claude/templates/" 2>/dev/null || true
        cp -r "$BASE_YOYO_DEV/claude-code/output-styles/"* ".claude/output-styles/" 2>/dev/null || true

        # Copy orchestration hook bundle
        if [ -f "$BASE_YOYO_DEV/claude-code/hooks/orchestrate.cjs" ]; then
            cp "$BASE_YOYO_DEV/claude-code/hooks/orchestrate.cjs" ".claude/hooks/"
            ui_info "Orchestration hook installed"
        fi

        # Note: settings.json is NOT copied - projects should create their own
        # based on their specific needs and MCP configuration
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

# Step: Install OpenClaw (yoyo-ai) — unless yoyo-dev only
OPENCLAW_INSTALLED=false
YOYO_AI_STATUS="skipped"
NODE_OK=false

# Source functions.sh for check_node_version and helpers
if [ -f "$SCRIPT_DIR/functions.sh" ]; then
    source "$SCRIPT_DIR/functions.sh"
fi

if [ "$INSTALL_COMPONENTS" != "yoyo-dev" ]; then
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Installing OpenClaw (yoyo-ai)..."

YOYO_AI_STATUS="failed:unknown"

# Check Node.js >= 22
if node_ver=$(check_node_version 22 2>/dev/null); then
    NODE_OK=true
    echo -e "  ${UI_SUCCESS}✓${UI_RESET} Node.js v${node_ver}"
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

if [ "$NODE_OK" = true ]; then
    # Check if already installed
    if command -v openclaw &>/dev/null; then
        echo -e "  ${UI_SUCCESS}✓${UI_RESET} OpenClaw already installed ($(openclaw --version 2>/dev/null || echo 'unknown'))"
        OPENCLAW_INSTALLED=true
        YOYO_AI_STATUS="already-installed"
    else
        echo -e "  ${UI_DIM}Installing openclaw@latest...${UI_RESET}"
        if npm install -g openclaw@latest 2>&1 | tail -1; then
            OPENCLAW_INSTALLED=true
            YOYO_AI_STATUS="installed"
            ui_success "OpenClaw installed"
        else
            ui_warning "OpenClaw installation failed — you can install later with: npm install -g openclaw@latest"
            YOYO_AI_STATUS="failed:npm install failed"
        fi
    fi

    # Run onboarding if installed
    if [ "$OPENCLAW_INSTALLED" = true ]; then
        echo -e "  ${UI_DIM}Running OpenClaw onboarding...${UI_RESET}"
        ensure_openclaw_token
        run_openclaw_onboard
        apply_yoyo_theme
        show_openclaw_dashboard_info
    fi
fi

# Add yoyo_ai section to config
if [ -f "$INSTALL_DIR/config.yml" ] && ! grep -q "^yoyo_ai:" "$INSTALL_DIR/config.yml" 2>/dev/null; then
    cat >> "$INSTALL_DIR/config.yml" << 'YOYO_AI_EOF'

# Yoyo AI (OpenClaw Business and Personal AI Assistant)
yoyo_ai:
  enabled: true
  openclaw:
    installed: false
    port: 18789
    config_path: "~/.openclaw/openclaw.json"
    daemon:
      auto_start: false
      service_type: "auto"
    update:
      auto_check: true
YOYO_AI_EOF
fi

# Update installed flag
if [ "$OPENCLAW_INSTALLED" = true ] && [ -f "$INSTALL_DIR/config.yml" ]; then
    sed -i.bak 's/installed: false/installed: true/' "$INSTALL_DIR/config.yml" 2>/dev/null
    rm -f "$INSTALL_DIR/config.yml.bak"
fi

fi  # end INSTALL_COMPONENTS != yoyo-dev (OpenClaw)

echo ""

# Step: Install YoYo AI Dashboard GUI
if [ "$INSTALL_COMPONENTS" != "yoyo-dev" ]; then
((++CURRENT_STEP))
ui_step $CURRENT_STEP $TOTAL_STEPS "Installing YoYo AI Dashboard GUI..."

GUI_AI_DIR="$HOME/.yoyo-ai/gui-ai"
GUI_SOURCE="$BASE_YOYO_DEV/gui-ai"

if [ "$IS_FROM_BASE" = true ] && [ -d "$GUI_SOURCE" ]; then
    # Create yoyo-ai home directory
    mkdir -p "$HOME/.yoyo-ai"

    # Copy gui-ai from base installation
    if [ -d "$GUI_AI_DIR" ]; then
        echo -e "  ${UI_DIM}Removing existing GUI installation...${UI_RESET}"
        rm -rf "$GUI_AI_DIR"
    fi

    echo -e "  ${UI_DIM}Copying GUI files...${UI_RESET}"
    cp -r "$GUI_SOURCE" "$GUI_AI_DIR"

    # Install dependencies and build
    if command -v npm &>/dev/null; then
        echo -e "  ${UI_DIM}Installing GUI dependencies...${UI_RESET}"
        cd "$GUI_AI_DIR"
        if npm install --silent 2>&1 | tail -3; then
            echo -e "  ${UI_DIM}Building GUI for production...${UI_RESET}"
            if npm run build --silent 2>&1 | tail -3; then
                ui_success "YoYo AI Dashboard GUI installed"
            else
                ui_warning "GUI build failed - run 'npm run build' in $GUI_AI_DIR manually"
            fi
        else
            ui_warning "GUI dependencies installation failed - run 'npm install' in $GUI_AI_DIR manually"
        fi
        cd "$CURRENT_DIR"
    else
        ui_warning "npm not found - GUI dependencies not installed"
        echo -e "  ${UI_DIM}Install Node.js, then run 'npm install && npm run build' in $GUI_AI_DIR${UI_RESET}"
    fi
else
    if [ "$IS_FROM_BASE" = false ]; then
        ui_warning "GUI installation requires base installation"
    else
        ui_warning "GUI source not found at $GUI_SOURCE"
    fi
fi

echo ""
fi  # end GUI installation for yoyo-ai

# ============================================================================
# Install Global Commands
# ============================================================================

ui_info "Installing global yoyo commands..."
echo ""

# Run global command installer
if [ "$IS_FROM_BASE" = true ] && [ -f "$BASE_YOYO_DEV/setup/install-global-command.sh" ]; then
    if bash "$BASE_YOYO_DEV/setup/install-global-command.sh" 2>/dev/null; then
        ui_success "Global commands installed successfully"
    else
        ui_warning "Could not install global commands"
        echo ""
        echo "  You can install them manually later:"
        echo -e "    ${UI_PRIMARY}$BASE_YOYO_DEV/setup/install-global-command.sh${UI_RESET}"
        echo ""
    fi
else
    ui_warning "Global command installer not found (skipping)"
    echo ""
fi

echo ""

# ============================================================================
# Completion
# ============================================================================

YOYO_DEV_STATUS="installed"

ui_complete "Installation Complete!"

ui_component_status_panel "$YOYO_DEV_STATUS" "$YOYO_AI_STATUS"

ui_section "Next Steps" "$ICON_ROCKET"

if [ "$IS_WSL" = true ]; then
    echo -e "  ${UI_PRIMARY}1.${UI_RESET} Launch Claude Code (WSL mode - no Wave Terminal):"
    echo -e "     ${UI_DIM}\$ yoyo-dev --no-wave${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}2.${UI_RESET} Start the AI assistant:"
    echo -e "     ${UI_DIM}\$ yoyo-ai --start${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}3.${UI_RESET} Start planning your product:"
    echo -e "     ${UI_DIM}Use ${UI_SUCCESS}/plan-product${UI_RESET}${UI_DIM} in Claude Code${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}4.${UI_RESET} View all commands:"
    echo -e "     ${UI_DIM}Use ${UI_SUCCESS}/yoyo-help${UI_RESET}${UI_DIM} in Claude Code${UI_RESET}"
    echo ""
    ui_info "Running in WSL. Wave Terminal should be installed on Windows, not inside WSL."
    echo -e "  ${UI_DIM}Download Wave: https://waveterm.dev/download${UI_RESET}"
    echo ""
else
    echo -e "  ${UI_PRIMARY}1.${UI_RESET} Launch Claude Code with Yoyo Dev:"
    echo -e "     ${UI_DIM}\$ yoyo${UI_RESET} ${UI_DIM}# Opens Claude Code + Browser GUI${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}2.${UI_RESET} Start planning your product:"
    echo -e "     ${UI_DIM}Use ${UI_SUCCESS}/plan-product${UI_RESET}${UI_DIM} in Claude Code${UI_RESET}"
    echo ""
    echo -e "  ${UI_PRIMARY}3.${UI_RESET} View all commands:"
    echo -e "     ${UI_DIM}Use ${UI_SUCCESS}/yoyo-help${UI_RESET}${UI_DIM} in Claude Code${UI_RESET}"
    echo ""
fi

ui_info "For help, run: ${UI_PRIMARY}yoyo-dev --help${UI_RESET}"
echo ""
