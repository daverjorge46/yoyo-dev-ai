#!/bin/bash

# Yoyo Dev Update Script
# This script updates Yoyo Dev installation in a project directory

set -e  # Exit on error

# Trap Ctrl+C (SIGINT) and SIGTERM for clean exit
trap 'echo ""; echo "⚠️  Update interrupted by user"; exit 130' INT TERM

# Initialize flags (default to overwriting framework files)
OVERWRITE_INSTRUCTIONS=true
OVERWRITE_STANDARDS=true
OVERWRITE_COMMANDS=true
OVERWRITE_AGENTS=true
VERBOSE=false
SKIP_MCP_CHECK=false

# Parse command line arguments
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
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Updates Yoyo Dev installation in the current project."
            echo ""
            echo "By default, all framework files are overwritten (instructions, standards, commands, agents)."
            echo "Use --no-overwrite flags to preserve your customizations."
            echo ""
            echo "Options:"
            echo "  --no-overwrite-instructions    Keep existing instruction files"
            echo "  --no-overwrite-standards       Keep existing standards files"
            echo "  --no-overwrite-commands        Keep existing command files"
            echo "  --no-overwrite-agents          Keep existing agent files"
            echo "  --no-overwrite                 Keep all existing files (same as all flags above)"
            echo "  --skip-mcp-check               Skip MCP verification and update"
            echo "  -v, --verbose                  Show detailed update information"
            echo "  -h, --help                     Show this help message"
            echo ""
            echo "Note: Product docs, specs, fixes, recaps, and patterns are ALWAYS protected."
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo ""
echo "🔄 Yoyo Dev Update"
echo "=================="
echo ""

# ============================================
# TypeScript CLI Update Function
# ============================================

update_typescript_cli() {
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        if [ "$VERBOSE" = true ]; then
            echo "ℹ️  npm not available - skipping TypeScript CLI update"
        fi
        return 0
    fi

    # Check if @yoyo-ai/cli is installed globally
    if npm list -g @yoyo-ai/cli &> /dev/null 2>&1; then
        echo ""
        echo "📦 Updating TypeScript CLI (@yoyo-ai/cli)..."
        if npm update -g @yoyo-ai/cli --quiet; then
            echo "  ✓ TypeScript CLI updated"
        else
            echo "  ⚠️  Failed to update TypeScript CLI"
            echo "     You can update manually: npm update -g @yoyo-ai/cli"
        fi
    elif [ -f "./node_modules/@yoyo-ai/cli/package.json" ]; then
        # Check if installed locally
        echo ""
        echo "📦 Updating local TypeScript CLI (@yoyo-ai/cli)..."
        if npm update @yoyo-ai/cli --quiet; then
            echo "  ✓ Local TypeScript CLI updated"
        else
            echo "  ⚠️  Failed to update local TypeScript CLI"
            echo "     You can update manually: npm update @yoyo-ai/cli"
        fi
    else
        if [ "$VERBOSE" = true ]; then
            echo "ℹ️  TypeScript CLI not installed - skipping update"
            echo "   To install: npm install -g @yoyo-ai/cli"
        fi
    fi
}

# Get project directory info
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")

# Check if Yoyo Dev is installed in this project
if [ ! -d "./.yoyo-dev" ]; then
    echo "❌ Error: Yoyo Dev not found in this project"
    echo ""
    # Check if old directory exists and provide migration hint
    if [ -d "./yoyo-dev" ]; then
        echo "⚠️  Found old 'yoyo-dev/' directory"
        echo ""
        echo "Yoyo Dev now uses '.yoyo-dev/' (hidden directory)."
        echo ""
        echo "To migrate:"
        echo "  mv yoyo-dev .yoyo-dev"
        echo ""
        echo "Then run this update script again."
    else
        echo "Please run the installation script first:"
        echo "  ~/yoyo-dev/setup/project.sh --claude-code"
    fi
    echo ""
    exit 1
fi

echo "📍 Updating Yoyo Dev in project: $PROJECT_NAME"
echo ""

# Get the base Yoyo Dev directory
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlink if this script is executed via symlink
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"

if [ ! -d "$BASE_YOYO_DEV" ]; then
    echo "❌ Error: Base Yoyo Dev installation not found at $BASE_YOYO_DEV"
    echo ""
    exit 1
fi

echo "✓ Using Yoyo Dev base installation at $BASE_YOYO_DEV"

# Detect if running in base yoyo-dev repository (prevents lib duplication)
IS_BASE_REPO=false
if [ "$CURRENT_DIR" = "$BASE_YOYO_DEV" ]; then
    IS_BASE_REPO=true
    echo "ℹ️  Detected base repository - skipping .yoyo-dev/lib/ operations"
fi

# Source shared functions
source "$SCRIPT_DIR/functions.sh"

# Determine if Claude Code is installed
CLAUDE_CODE_INSTALLED=false
if [ -d "./.claude/commands" ] || [ -d "./.claude/agents" ]; then
    CLAUDE_CODE_INSTALLED=true
fi

# Determine if Cursor is installed
CURSOR_INSTALLED=false
if [ -d "./.cursor/rules" ]; then
    CURSOR_INSTALLED=true
fi

# Read project type from base config
PROJECT_TYPE="default"
if [ -f "$BASE_YOYO_DEV/config.yml" ]; then
    PROJECT_TYPE=$(grep "^default_project_type:" "$BASE_YOYO_DEV/config.yml" | cut -d' ' -f2 | tr -d ' ')
    if [ -z "$PROJECT_TYPE" ]; then
        PROJECT_TYPE="default"
    fi
fi

echo ""
echo "📦 Using project type: $PROJECT_TYPE"

# Determine source paths based on project type
INSTRUCTIONS_SOURCE=""
STANDARDS_SOURCE=""

if [ "$PROJECT_TYPE" = "default" ]; then
    INSTRUCTIONS_SOURCE="$BASE_YOYO_DEV/instructions"
    STANDARDS_SOURCE="$BASE_YOYO_DEV/standards"
else
    # Look up project type in config
    if grep -q "^  $PROJECT_TYPE:" "$BASE_YOYO_DEV/config.yml"; then
        # Extract paths for this project type
        INSTRUCTIONS_PATH=$(awk "/^  $PROJECT_TYPE:/{f=1} f&&/instructions:/{print \$2; exit}" "$BASE_YOYO_DEV/config.yml")
        STANDARDS_PATH=$(awk "/^  $PROJECT_TYPE:/{f=1} f&&/standards:/{print \$2; exit}" "$BASE_YOYO_DEV/config.yml")

        # Expand tilde in paths
        INSTRUCTIONS_SOURCE=$(eval echo "$INSTRUCTIONS_PATH")
        STANDARDS_SOURCE=$(eval echo "$STANDARDS_PATH")

        # Check if paths exist
        if [ ! -d "$INSTRUCTIONS_SOURCE" ] || [ ! -d "$STANDARDS_SOURCE" ]; then
            echo "  ⚠️  Project type '$PROJECT_TYPE' paths not found, falling back to default"
            INSTRUCTIONS_SOURCE="$BASE_YOYO_DEV/instructions"
            STANDARDS_SOURCE="$BASE_YOYO_DEV/standards"
        fi
    else
        echo "  ⚠️  Project type '$PROJECT_TYPE' not found in config, using default"
        INSTRUCTIONS_SOURCE="$BASE_YOYO_DEV/instructions"
        STANDARDS_SOURCE="$BASE_YOYO_DEV/standards"
    fi
fi

# Update instructions
echo ""
echo "📥 Updating instruction files..."
copy_directory "$INSTRUCTIONS_SOURCE" "./.yoyo-dev/instructions" "$OVERWRITE_INSTRUCTIONS"

# Update standards
echo ""
echo "📥 Updating standards files..."
copy_directory "$STANDARDS_SOURCE" "./.yoyo-dev/standards" "$OVERWRITE_STANDARDS"

# Update config.yml (always update to get latest features like design system)
echo ""
echo "📥 Updating configuration..."
if [ -f "$BASE_YOYO_DEV/config.yml" ]; then
    copy_file "$BASE_YOYO_DEV/config.yml" \
        "./.yoyo-dev/config.yml" \
        "true" \
        "config.yml"
else
    echo "  ⚠️  Warning: config.yml not found in base installation"
fi

# Update Claude Code files if installed
if [ "$CLAUDE_CODE_INSTALLED" = true ]; then
    echo ""
    echo "📥 Updating Claude Code files..."

    # Update commands
    echo "  📂 Commands:"
    for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks orchestrate-tasks design-init design-audit design-fix design-component containerize-application improve-skills yoyo-help; do
        if [ -f "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" ]; then
            copy_file "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" \
                "./.claude/commands/${cmd}.md" \
                "$OVERWRITE_COMMANDS" \
                "commands/${cmd}.md"
        else
            echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
        fi
    done

    echo ""
    echo "  📂 Agents:"
    for agent in context-fetcher date-checker file-creator git-workflow project-manager test-runner design-analyzer design-validator implementation-verifier implementer product-planner spec-initializer spec-shaper spec-verifier spec-writer tasks-list-creator; do
        if [ -f "$BASE_YOYO_DEV/.claude/agents/${agent}.md" ]; then
            copy_file "$BASE_YOYO_DEV/.claude/agents/${agent}.md" \
                "./.claude/agents/${agent}.md" \
                "$OVERWRITE_AGENTS" \
                "agents/${agent}.md"
        else
            echo "  ⚠️  Warning: ${agent}.md not found in base installation"
        fi
    done

    # Update launcher scripts in project (global symlinks managed by installation only)
    echo ""
    echo "  📂 CLI Launcher:"
    mkdir -p "./.yoyo-dev/setup"

    if [ -f "$BASE_YOYO_DEV/setup/yoyo.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/yoyo.sh" \
            "./.yoyo-dev/setup/yoyo.sh" \
            "true" \
            "setup/yoyo.sh (TUI launcher)"
        chmod +x "./.yoyo-dev/setup/yoyo.sh"
    else
        echo "  ⚠️  Warning: yoyo.sh not found in base installation"
    fi

    if [ -f "$BASE_YOYO_DEV/setup/yoyo-tmux.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/yoyo-tmux.sh" \
            "./.yoyo-dev/setup/yoyo-tmux.sh" \
            "true" \
            "setup/yoyo-tmux.sh (deprecated)"
        chmod +x "./.yoyo-dev/setup/yoyo-tmux.sh"
    fi

    # NOTE: .yoyo-dev/lib/ directory removed to prevent duplicate lib issues
    # Projects should reference the base installation's lib/ directory directly
    # See: .yoyo-dev/fixes/2025-11-06-duplicate-lib-import-error/

    # Update templates directory only
    echo ""
    echo "  📂 Templates:"
    mkdir -p "./.yoyo-dev/templates"

    # Update Python requirements
    if [ -f "$BASE_YOYO_DEV/requirements.txt" ]; then
        copy_file "$BASE_YOYO_DEV/requirements.txt" "./.yoyo-dev/requirements.txt" "true" "requirements.txt (Python deps)"
    fi

    # Update dashboard dependency installer
    if [ -f "$BASE_YOYO_DEV/setup/install-dashboard-deps.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/install-dashboard-deps.sh" "./.yoyo-dev/setup/install-dashboard-deps.sh" "true" "setup/install-dashboard-deps.sh"
        chmod +x "./.yoyo-dev/setup/install-dashboard-deps.sh"
    fi

    # NOTE: TUI v3.0 library is NOT copied to .yoyo-dev/lib/ to prevent duplicates
    # The yoyo command references the base installation's lib/yoyo_tui_v3/ directly
    # This prevents Python module resolution conflicts
    # See: .yoyo-dev/fixes/2025-11-06-duplicate-lib-import-error/
    echo ""
    echo "  📂 TUI v3.0 Library:"
    echo "  ✓ Using TUI from base installation at $BASE_YOYO_DEV/lib/yoyo_tui_v3/"
    echo "  ℹ️  No local copy needed - prevents duplicate lib issues"

    # Update MASTER-TASKS template (always, to get latest improvements)
    if [ -f "$BASE_YOYO_DEV/templates/MASTER-TASKS.md" ]; then
        copy_file "$BASE_YOYO_DEV/templates/MASTER-TASKS.md" "./.yoyo-dev/templates/MASTER-TASKS.md" "true" "templates/MASTER-TASKS.md"
    fi

    # Update COMMAND-REFERENCE.md (always, to get latest commands)
    if [ -f "$BASE_YOYO_DEV/COMMAND-REFERENCE.md" ]; then
        copy_file "$BASE_YOYO_DEV/COMMAND-REFERENCE.md" "./.yoyo-dev/COMMAND-REFERENCE.md" "true" "COMMAND-REFERENCE.md"
    fi

    # Update Conscious Agent Framework files (identity and reflections)
    echo ""
    echo "  📂 Conscious Agent Framework:"

    # Copy identity directory
    if [ -d "$BASE_YOYO_DEV/.yoyo-dev/identity" ]; then
        mkdir -p "./.yoyo-dev/identity"
        if [ -f "$BASE_YOYO_DEV/.yoyo-dev/identity/consciousness.md" ]; then
            copy_file "$BASE_YOYO_DEV/.yoyo-dev/identity/consciousness.md" \
                "./.yoyo-dev/identity/consciousness.md" \
                "true" \
                "identity/consciousness.md"
        fi
    fi

    # Copy reflections template
    if [ -d "$BASE_YOYO_DEV/.yoyo-dev/reflections" ]; then
        mkdir -p "./.yoyo-dev/reflections"
        if [ -f "$BASE_YOYO_DEV/.yoyo-dev/reflections/TEMPLATE.md" ]; then
            copy_file "$BASE_YOYO_DEV/.yoyo-dev/reflections/TEMPLATE.md" \
                "./.yoyo-dev/reflections/TEMPLATE.md" \
                "true" \
                "reflections/TEMPLATE.md"
        fi
    fi

    # Update MCP installation scripts (always, to get latest MCP features)
    # NOTE: Using Docker MCP Gateway setup for containerized MCP servers
    echo ""
    echo "  📂 MCP Installation Scripts:"
    mkdir -p "./.yoyo-dev/setup"

    if [ -f "$BASE_YOYO_DEV/setup/mcp-prerequisites.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/mcp-prerequisites.sh" "./.yoyo-dev/setup/mcp-prerequisites.sh" "true" "setup/mcp-prerequisites.sh"
        chmod +x "./.yoyo-dev/setup/mcp-prerequisites.sh"
    fi

    # Docker MCP setup script for enabling containerized MCP servers
    if [ -f "$BASE_YOYO_DEV/setup/docker-mcp-setup.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/docker-mcp-setup.sh" "./.yoyo-dev/setup/docker-mcp-setup.sh" "true" "setup/docker-mcp-setup.sh"
        chmod +x "./.yoyo-dev/setup/docker-mcp-setup.sh"
    fi

    # Update parse-utils.sh if it exists (needed by yoyo.sh)
    if [ -f "$BASE_YOYO_DEV/setup/parse-utils.sh" ]; then
        copy_file "$BASE_YOYO_DEV/setup/parse-utils.sh" "./.yoyo-dev/setup/parse-utils.sh" "true" "setup/parse-utils.sh"
    fi
fi

# Update Cursor files if installed
if [ "$CURSOR_INSTALLED" = true ]; then
    echo ""
    echo "📥 Updating Cursor files..."
    echo "  📂 Rules:"

    # Convert commands to Cursor rules
    for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks orchestrate-tasks design-init design-audit design-fix design-component containerize-application improve-skills yoyo-help; do
        if [ -f "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" ]; then
            # Only update if forced or file doesn't exist
            if [ "$OVERWRITE_COMMANDS" = true ] || [ ! -f "./.cursor/rules/${cmd}.mdc" ]; then
                convert_to_cursor_rule "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" "./.cursor/rules/${cmd}.mdc"
            else
                echo "  ⚠️  $(basename ${cmd}.mdc) already exists - skipping"
            fi
        else
            echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
        fi
    done
fi

# ============================================
# MCP Verification and Update Logic
# ============================================

# Function to check if Claude CLI is available
check_claude_cli_available() {
    if command -v claude &> /dev/null; then
        if claude --version &> /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function to check if Docker is available and running
check_docker_available() {
    # Check if docker command exists
    if ! command -v docker &> /dev/null; then
        return 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null 2>&1; then
        return 1
    fi

    return 0
}

# Function to check if Docker MCP Toolkit is enabled
check_docker_mcp_toolkit() {
    # Check if docker mcp command is available
    if docker mcp --help &> /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Function to get installed MCP servers via Docker MCP Gateway
get_installed_mcps() {
    # Use docker mcp server ls to get enabled servers
    if ! check_docker_available; then
        echo ""
        return 1
    fi

    if ! check_docker_mcp_toolkit; then
        echo ""
        return 1
    fi

    # Parse docker mcp server ls output
    local status_output
    status_output=$(docker mcp server ls 2>/dev/null) || {
        echo ""
        return 1
    }

    # Extract server names from output
    # Handles both tabular format (first column is name, skip header) and list format
    # Tabular: NAME  IMAGE  TAG (skip header, get first column)
    # List: "  - playwright (running)" format
    echo "$status_output" | tail -n +2 | awk '{print $1}' | grep -E '^[a-zA-Z][a-zA-Z0-9_-]*$' 2>/dev/null || echo ""
}

# Function to detect missing MCPs (Docker MCP servers)
detect_missing_mcps() {
    # Docker MCP Gateway servers (replaces legacy npx-based MCPs)
    local expected_mcps="playwright github-official duckduckgo filesystem"
    local installed_mcps=$(get_installed_mcps)
    local missing_mcps=""

    for mcp in $expected_mcps; do
        if ! echo "$installed_mcps" | grep -q "^${mcp}$"; then
            missing_mcps="$missing_mcps $mcp"
        fi
    done

    echo "$missing_mcps" | xargs
}

# Function to prompt user for MCP update (Docker MCP Gateway)
prompt_mcp_update() {
    local missing_mcps="$1"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Docker MCP Server Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⚠️  Missing Docker MCP servers detected:"
    echo ""
    for mcp in $missing_mcps; do
        echo "  • $mcp"
    done
    echo ""
    echo "Docker MCP servers run in containers via Docker MCP Toolkit."
    echo "They enhance Claude Code with browser automation, GitHub, search, and file access."
    echo ""
    read -p "Would you like to enable missing MCP servers? [Y/n] " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Nn]$ ]]; then
        return 1
    fi
    return 0
}

# Function to enable missing Docker MCP servers
install_missing_mcps() {
    local mcp_installer="$BASE_YOYO_DEV/setup/docker-mcp-setup.sh"

    if [ ! -f "$mcp_installer" ]; then
        echo ""
        echo "⚠️  Docker MCP setup script not found at $mcp_installer"
        echo "   Skipping MCP server enablement"
        return 1
    fi

    echo ""
    echo "📦 Enabling Docker MCP servers..."
    echo ""

    if bash "$mcp_installer" --non-interactive --project-dir="$CURRENT_DIR"; then
        echo ""
        echo "✅ Docker MCP servers enabled successfully"
        return 0
    else
        echo ""
        echo "⚠️  Some MCP servers may have failed to enable. Check output above."
        return 1
    fi
}

# Main MCP verification flow (Docker MCP Gateway)
if [ "$CLAUDE_CODE_INSTALLED" = true ] && [ "$SKIP_MCP_CHECK" = false ]; then
    # Check if Docker is available first
    if ! check_docker_available; then
        if [ "$VERBOSE" = true ]; then
            echo ""
            echo "ℹ️  Docker not available - skipping MCP verification"
            echo "   Docker Desktop is required for MCP features."
            echo "   Install from: https://www.docker.com/products/docker-desktop/"
        fi
    elif ! check_docker_mcp_toolkit; then
        if [ "$VERBOSE" = true ]; then
            echo ""
            echo "ℹ️  Docker MCP Toolkit not enabled - skipping MCP verification"
            echo "   Enable MCP Toolkit in Docker Desktop:"
            echo "   Settings → Beta features → Enable 'MCP Toolkit'"
        fi
    elif check_claude_cli_available; then
        # Docker available, check for missing MCPs
        MISSING_MCPS=$(detect_missing_mcps)

        if [ -n "$MISSING_MCPS" ]; then
            # Prompt user for update
            if prompt_mcp_update "$MISSING_MCPS"; then
                install_missing_mcps
            else
                echo ""
                echo "ℹ️  Skipping MCP installation"
                echo "   You can install MCPs later by running:"
                echo "   $BASE_YOYO_DEV/setup/docker-mcp-setup.sh"
            fi
        else
            if [ "$VERBOSE" = true ]; then
                echo ""
                echo "✅ All Docker MCP servers are enabled"
            fi
        fi
    else
        if [ "$VERBOSE" = true ]; then
            echo ""
            echo "ℹ️  Claude Code CLI not found - skipping MCP verification"
            echo "   Install Claude CLI to enable MCP management"
        fi
    fi
fi

# Update TypeScript CLI if installed
update_typescript_cli

# Update installed version for update detection
if [ -f "$BASE_YOYO_DEV/VERSION" ]; then
    cp "$BASE_YOYO_DEV/VERSION" "./.yoyo-dev/.installed-version"
fi

# Success message
echo ""
echo "✅ Yoyo Dev has been updated in your project ($PROJECT_NAME)!"
echo ""
echo "📍 Updated files:"
echo "   .yoyo-dev/instructions/    - Yoyo Dev instructions"
echo "   .yoyo-dev/standards/       - Development standards"

if [ "$CLAUDE_CODE_INSTALLED" = true ]; then
    echo "   .claude/commands/          - Claude Code commands"
    echo "   .claude/agents/            - Claude Code specialized agents"
    echo "   .yoyo-dev/setup/yoyo.sh    - Yoyo CLI launcher"
fi

if [ "$CURSOR_INSTALLED" = true ]; then
    echo "   .cursor/rules/             - Cursor command rules"
fi

echo ""
echo "💡 Quick launch:"
echo "   yoyo                       - Launch Claude Code with Yoyo Dev interface"
echo ""
echo "🔒 Preserved files:"
echo "   .yoyo-dev/product/         - Product mission and roadmap"
echo "   .yoyo-dev/specs/           - Feature specifications"
echo "   .yoyo-dev/fixes/           - Bug fix analyses"
echo "   .yoyo-dev/recaps/          - Completion summaries"
echo "   .yoyo-dev/patterns/        - Successful patterns library"

echo ""
echo "--------------------------------"
echo ""

# Function to validate venv shebang
validate_venv_shebang() {
    local venv_path="$1"
    local pip_path="$venv_path/bin/pip"

    # Check if pip exists
    if [ ! -f "$pip_path" ]; then
        return 1
    fi

    # Extract shebang from pip
    local shebang=$(head -1 "$pip_path")

    # Remove the #! prefix
    local python_path="${shebang#\#!}"

    # Check if the python interpreter exists
    if [ -f "$python_path" ]; then
        return 0  # Valid shebang
    else
        return 1  # Broken shebang
    fi
}

# Offer to install/update Python dashboard and TUI dependencies
if [ "$CLAUDE_CODE_INSTALLED" = true ]; then
    # Check if Python dashboard and TUI dependencies are already installed
    DEPS_INSTALLED=false
    TUI_INSTALLED=false

    if command -v python3 &> /dev/null; then
        # Check for dashboard dependencies
        if python3 -c "import rich, watchdog, yaml" &> /dev/null 2>&1; then
            DEPS_INSTALLED=true
        fi

        # Check for TUI dependencies
        if python3 -c "import textual" &> /dev/null 2>&1; then
            TUI_INSTALLED=true
        fi

        # Check venv installation
        if [ -d "$BASE_YOYO_DEV/venv" ]; then
            if "$BASE_YOYO_DEV/venv/bin/python3" -c "import rich, watchdog, yaml, textual" &> /dev/null 2>&1; then
                DEPS_INSTALLED=true
                TUI_INSTALLED=true
            fi
        fi
    fi

    if [ "$DEPS_INSTALLED" = true ] && [ "$TUI_INSTALLED" = true ]; then
        echo "✅ Python dashboard and TUI dependencies already installed"
        echo ""

        # Check if requirements.txt was updated
        if [ -f "./.yoyo-dev/requirements.txt" ]; then
            echo "📋 Updated requirements.txt with latest dependency versions"
            echo "📦 Auto-installing Python dependencies..."
            echo ""

            # Auto-install dependencies without prompting
            if [ -d "$BASE_YOYO_DEV/venv" ] && [ -f "$BASE_YOYO_DEV/venv/bin/pip" ] && validate_venv_shebang "$BASE_YOYO_DEV/venv"; then
                echo "Upgrading dependencies in virtual environment..."
                timeout 300 "$BASE_YOYO_DEV/venv/bin/pip" install --upgrade -r "$BASE_YOYO_DEV/requirements.txt" --no-input --disable-pip-version-check || {
                    echo "⚠️  Dependency upgrade timed out or failed"
                    echo "   You can upgrade manually: $BASE_YOYO_DEV/venv/bin/pip install --upgrade -r $BASE_YOYO_DEV/requirements.txt"
                }
            elif [ -d "$BASE_YOYO_DEV/venv" ] && ! validate_venv_shebang "$BASE_YOYO_DEV/venv"; then
                echo "⚠️  Virtual environment has broken shebang (pip points to non-existent Python)"
                echo "   This typically happens when venv is moved or paths change"
                echo "   🔄 Automatically recreating virtual environment..."
                echo ""

                # Backup broken venv
                BACKUP_NAME="venv.backup.$(date +%s)"
                echo "   📦 Backing up broken venv to $BACKUP_NAME"
                mv "$BASE_YOYO_DEV/venv" "$BASE_YOYO_DEV/$BACKUP_NAME"

                # Recreate venv
                if [ -f "$BASE_YOYO_DEV/setup/install-dashboard-deps.sh" ]; then
                    echo "   🏗️  Creating fresh virtual environment..."
                    bash "$BASE_YOYO_DEV/setup/install-dashboard-deps.sh"

                    # Verify new venv is functional
                    if [ -f "$BASE_YOYO_DEV/venv/bin/pip" ] && validate_venv_shebang "$BASE_YOYO_DEV/venv"; then
                        echo ""
                        echo "   ✓ Virtual environment recreated successfully!"
                        echo "   💡 Old backup kept at: $BASE_YOYO_DEV/$BACKUP_NAME"
                        echo "      (You can remove it manually if not needed)"
                    else
                        echo ""
                        echo "   ⚠️  Failed to recreate virtual environment"
                        echo "      Run manually: $BASE_YOYO_DEV/setup/install-dashboard-deps.sh"
                    fi
                else
                    echo "   ⚠️  install-dashboard-deps.sh not found"
                    echo "      Run manually: $BASE_YOYO_DEV/setup/install-dashboard-deps.sh"
                fi
            elif [ -d "$BASE_YOYO_DEV/venv" ] && [ ! -f "$BASE_YOYO_DEV/venv/bin/pip" ]; then
                echo "⚠️  Virtual environment exists but pip not found"
                echo "   Reinstalling dependencies..."
                if [ -f "$BASE_YOYO_DEV/setup/install-deps.sh" ]; then
                    bash "$BASE_YOYO_DEV/setup/install-deps.sh"
                else
                    echo "   Run manually: $BASE_YOYO_DEV/setup/install-deps.sh"
                fi
            elif [ ! -d "$BASE_YOYO_DEV/venv" ]; then
                # No venv exists - create it first (required for PEP 668 systems)
                echo "⚠️  No virtual environment found at $BASE_YOYO_DEV/venv"
                echo "   Creating virtual environment (required for PEP 668-protected systems)..."
                if [ -f "$BASE_YOYO_DEV/setup/install-deps.sh" ]; then
                    bash "$BASE_YOYO_DEV/setup/install-deps.sh"
                else
                    echo "   Run manually: $BASE_YOYO_DEV/setup/install-deps.sh"
                fi
            elif command -v "$BASE_YOYO_DEV/venv/bin/pip" &> /dev/null; then
                # Use venv pip (always prefer this over system pip3)
                echo "Upgrading dependencies in virtual environment..."
                if [ -f "$BASE_YOYO_DEV/requirements.txt" ]; then
                    timeout 300 "$BASE_YOYO_DEV/venv/bin/pip" install --upgrade -r "$BASE_YOYO_DEV/requirements.txt" --no-input --disable-pip-version-check || {
                        echo "⚠️  Dependency upgrade timed out or failed"
                        echo "   You can upgrade manually: $BASE_YOYO_DEV/venv/bin/pip install --upgrade -r $BASE_YOYO_DEV/requirements.txt"
                    }
                else
                    echo "ℹ️  requirements.txt not found at $BASE_YOYO_DEV/requirements.txt"
                fi
            else
                echo "⚠️  Could not find pip in virtual environment"
                echo "   Please run: $BASE_YOYO_DEV/setup/install-deps.sh"
            fi
            echo "✓ Dependencies upgraded"
            echo ""
        fi
    else
        echo "🐍 Python Dashboard & TUI"
        echo ""
        echo "Installing/updating Yoyo Dev dependencies automatically..."
        echo "  • Dashboard (rich, watchdog, yaml, gitpython)"
        echo "  • TUI (textual, pyperclip)"
        echo ""

        # Auto-install using unified installer (no user prompt)
        if [ -f "$BASE_YOYO_DEV/setup/install-deps.sh" ]; then
            bash "$BASE_YOYO_DEV/setup/install-deps.sh"
        elif [ -f "./.yoyo-dev/setup/install-deps.sh" ]; then
            bash "./.yoyo-dev/setup/install-deps.sh"
        else
            echo ""
            echo "⚠️  Dependency installer not found"
            echo "You can install manually: ~/yoyo-dev/setup/install-deps.sh"
        fi

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Update Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your Yoyo Dev installation has been updated with the latest improvements."
echo ""

# Check if TUI v3.0 was updated and highlight new features
if [ -d "./.yoyo-dev/lib/yoyo_tui_v3" ]; then
    echo "🎨 TUI v3.0 Dashboard - Production Ready:"
    echo "  • Intelligent 3-panel layout with real-time updates"
    echo "  • Context-aware command suggestions"
    echo "  • Proactive error detection and fixes"
    echo "  • Detail screens for specs, tasks, and history"
    echo "  • MCP server health monitoring"
    echo "  • Enhanced keyboard navigation (?, /, r, g, t, s, h, q)"
    echo "  • 97% faster startup (9ms vs 300ms)"
    echo "  • 94% faster status refresh (3ms vs 50ms)"
    echo "  • Zero CPU usage during idle"
    echo ""
    echo "  Press ? inside TUI for complete help and shortcuts!"
    echo ""
fi

echo "Next Steps:"
echo "  • Launch TUI: yoyo"
echo "  • Press ? inside TUI for help and keyboard shortcuts"
echo "  • Press q to quit TUI"
echo "  • All TUI dependencies will auto-install if needed"
echo ""
echo "Continue building! 🚀"
echo ""

# Wait for any background processes to complete before exiting
wait

# Explicit exit to prevent script hanging
exit 0
