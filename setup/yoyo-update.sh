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
BASE_AGENT_OS="$(dirname "$SCRIPT_DIR")"

if [ ! -d "$BASE_AGENT_OS" ]; then
    echo "❌ Error: Base Yoyo Dev installation not found at $BASE_AGENT_OS"
    echo ""
    exit 1
fi

echo "✓ Using Yoyo Dev base installation at $BASE_AGENT_OS"

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
if [ -f "$BASE_AGENT_OS/config.yml" ]; then
    PROJECT_TYPE=$(grep "^default_project_type:" "$BASE_AGENT_OS/config.yml" | cut -d' ' -f2 | tr -d ' ')
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
    INSTRUCTIONS_SOURCE="$BASE_AGENT_OS/instructions"
    STANDARDS_SOURCE="$BASE_AGENT_OS/standards"
else
    # Look up project type in config
    if grep -q "^  $PROJECT_TYPE:" "$BASE_AGENT_OS/config.yml"; then
        # Extract paths for this project type
        INSTRUCTIONS_PATH=$(awk "/^  $PROJECT_TYPE:/{f=1} f&&/instructions:/{print \$2; exit}" "$BASE_AGENT_OS/config.yml")
        STANDARDS_PATH=$(awk "/^  $PROJECT_TYPE:/{f=1} f&&/standards:/{print \$2; exit}" "$BASE_AGENT_OS/config.yml")

        # Expand tilde in paths
        INSTRUCTIONS_SOURCE=$(eval echo "$INSTRUCTIONS_PATH")
        STANDARDS_SOURCE=$(eval echo "$STANDARDS_PATH")

        # Check if paths exist
        if [ ! -d "$INSTRUCTIONS_SOURCE" ] || [ ! -d "$STANDARDS_SOURCE" ]; then
            echo "  ⚠️  Project type '$PROJECT_TYPE' paths not found, falling back to default"
            INSTRUCTIONS_SOURCE="$BASE_AGENT_OS/instructions"
            STANDARDS_SOURCE="$BASE_AGENT_OS/standards"
        fi
    else
        echo "  ⚠️  Project type '$PROJECT_TYPE' not found in config, using default"
        INSTRUCTIONS_SOURCE="$BASE_AGENT_OS/instructions"
        STANDARDS_SOURCE="$BASE_AGENT_OS/standards"
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
if [ -f "$BASE_AGENT_OS/config.yml" ]; then
    copy_file "$BASE_AGENT_OS/config.yml" \
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
    for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
        if [ -f "$BASE_AGENT_OS/commands/${cmd}.md" ]; then
            copy_file "$BASE_AGENT_OS/commands/${cmd}.md" \
                "./.claude/commands/${cmd}.md" \
                "$OVERWRITE_COMMANDS" \
                "commands/${cmd}.md"
        else
            echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
        fi
    done

    echo ""
    echo "  📂 Agents:"
    for agent in context-fetcher date-checker file-creator git-workflow project-manager test-runner design-analyzer design-validator; do
        if [ -f "$BASE_AGENT_OS/claude-code/agents/${agent}.md" ]; then
            copy_file "$BASE_AGENT_OS/claude-code/agents/${agent}.md" \
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

    if [ -f "$BASE_AGENT_OS/setup/yoyo.sh" ]; then
        copy_file "$BASE_AGENT_OS/setup/yoyo.sh" \
            "./.yoyo-dev/setup/yoyo.sh" \
            "true" \
            "setup/yoyo.sh (TUI launcher)"
        chmod +x "./.yoyo-dev/setup/yoyo.sh"
    else
        echo "  ⚠️  Warning: yoyo.sh not found in base installation"
    fi

    if [ -f "$BASE_AGENT_OS/setup/yoyo-tmux.sh" ]; then
        copy_file "$BASE_AGENT_OS/setup/yoyo-tmux.sh" \
            "./.yoyo-dev/setup/yoyo-tmux.sh" \
            "true" \
            "setup/yoyo-tmux.sh (deprecated)"
        chmod +x "./.yoyo-dev/setup/yoyo-tmux.sh"
    fi

    # Update v2.0 support files
    echo ""
    echo "  📂 v2.0 Support Files:"
    mkdir -p "./.yoyo-dev/lib"
    mkdir -p "./.yoyo-dev/templates"

    # Update status display scripts (visual mode)
    if [ -f "$BASE_AGENT_OS/lib/yoyo-status.sh" ]; then
        copy_file "$BASE_AGENT_OS/lib/yoyo-status.sh" "./.yoyo-dev/lib/yoyo-status.sh" "true" "lib/yoyo-status.sh (Bash fallback)"
        chmod +x "./.yoyo-dev/lib/yoyo-status.sh"
    fi

    # Update Python dashboard (new in v2.1)
    if [ -f "$BASE_AGENT_OS/lib/yoyo-dashboard.py" ]; then
        copy_file "$BASE_AGENT_OS/lib/yoyo-dashboard.py" "./.yoyo-dev/lib/yoyo-dashboard.py" "true" "lib/yoyo-dashboard.py (Python dashboard)"
        chmod +x "./.yoyo-dev/lib/yoyo-dashboard.py"
    fi

    # Update yoyo_tui_v3 (modern TUI implementation)
    if [ -d "$BASE_AGENT_OS/lib/yoyo_tui_v3" ]; then
        echo "  📦 Updating yoyo_tui_v3..."
        mkdir -p "./.yoyo-dev/lib/yoyo_tui_v3"
        cp -r "$BASE_AGENT_OS/lib/yoyo_tui_v3"/* "./.yoyo-dev/lib/yoyo_tui_v3/"
    fi

    # Update Python requirements
    if [ -f "$BASE_AGENT_OS/requirements.txt" ]; then
        copy_file "$BASE_AGENT_OS/requirements.txt" "./.yoyo-dev/requirements.txt" "true" "requirements.txt (Python deps)"
    fi

    # Update dashboard dependency installer
    if [ -f "$BASE_AGENT_OS/setup/install-dashboard-deps.sh" ]; then
        copy_file "$BASE_AGENT_OS/setup/install-dashboard-deps.sh" "./.yoyo-dev/setup/install-dashboard-deps.sh" "true" "setup/install-dashboard-deps.sh"
        chmod +x "./.yoyo-dev/setup/install-dashboard-deps.sh"
    fi

    # Update TUI v3.0 library if it exists
    if [ -d "$BASE_AGENT_OS/lib/yoyo_tui_v3" ]; then
        echo ""
        echo "  📂 TUI v3.0 Library:"
        if [ -d "./.yoyo-dev/lib/yoyo_tui_v3" ]; then
            # Preserve venv but update TUI code
            echo "  → Updating TUI v3.0 library (preserving venv)..."

            # Copy TUI library files (excluding venv and __pycache__)
            if [ "$VERBOSE" = true ]; then
                echo "  → Verbose mode: showing file updates..."
                rsync -av --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
                    "$BASE_AGENT_OS/lib/yoyo_tui_v3/" "./.yoyo-dev/lib/yoyo_tui_v3/"
            else
                # Silent mode, just show summary
                rsync -a --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' \
                    "$BASE_AGENT_OS/lib/yoyo_tui_v3/" "./.yoyo-dev/lib/yoyo_tui_v3/"
            fi

            # List key files that were updated
            echo "  → Updated components:"
            echo "    • app.py - TUI v3.0 application core"
            echo "    • screens/ - SpecDetail, TaskDetail, HistoryDetail screens"
            echo "    • widgets/ - ProjectOverview, StatusBar, etc."
            echo "    • services/ - DataManager, EventBus, CacheManager, etc."
            echo "    • parsers/ - SpecParser, TaskParser, HistoryParser"
            echo "    • models.py - Enhanced data models with v3.0 features"
            echo "  ✓ TUI v3.0 library updated successfully"
        else
            # First time TUI v3.0 installation
            echo "  → Installing TUI v3.0 library..."
            mkdir -p "./.yoyo-dev/lib"
            cp -r "$BASE_AGENT_OS/lib/yoyo_tui_v3" "./.yoyo-dev/lib/"
            echo "  ✓ TUI v3.0 library installed"
        fi
    fi

    # Update MASTER-TASKS template (always, to get latest improvements)
    if [ -f "$BASE_AGENT_OS/templates/MASTER-TASKS.md" ]; then
        copy_file "$BASE_AGENT_OS/templates/MASTER-TASKS.md" "./.yoyo-dev/templates/MASTER-TASKS.md" "true" "templates/MASTER-TASKS.md"
    fi

    # Update COMMAND-REFERENCE.md (always, to get latest commands)
    if [ -f "$BASE_AGENT_OS/COMMAND-REFERENCE.md" ]; then
        copy_file "$BASE_AGENT_OS/COMMAND-REFERENCE.md" "./.yoyo-dev/COMMAND-REFERENCE.md" "true" "COMMAND-REFERENCE.md"
    fi

    # Update MCP installation scripts (always, to get latest MCP features)
    echo ""
    echo "  📂 MCP Installation Scripts:"
    mkdir -p "./.yoyo-dev/setup"

    if [ -f "$BASE_AGENT_OS/setup/mcp-prerequisites.sh" ]; then
        copy_file "$BASE_AGENT_OS/setup/mcp-prerequisites.sh" "./.yoyo-dev/setup/mcp-prerequisites.sh" "true" "setup/mcp-prerequisites.sh"
        chmod +x "./.yoyo-dev/setup/mcp-prerequisites.sh"
    fi

    if [ -f "$BASE_AGENT_OS/setup/mcp-installer.sh" ]; then
        copy_file "$BASE_AGENT_OS/setup/mcp-installer.sh" "./.yoyo-dev/setup/mcp-installer.sh" "true" "setup/mcp-installer.sh"
        chmod +x "./.yoyo-dev/setup/mcp-installer.sh"
    fi

    # Update parse-utils.sh if it exists (needed by yoyo.sh)
    if [ -f "$BASE_AGENT_OS/setup/parse-utils.sh" ]; then
        copy_file "$BASE_AGENT_OS/setup/parse-utils.sh" "./.yoyo-dev/setup/parse-utils.sh" "true" "setup/parse-utils.sh"
    fi
fi

# Update Cursor files if installed
if [ "$CURSOR_INSTALLED" = true ]; then
    echo ""
    echo "📥 Updating Cursor files..."
    echo "  📂 Rules:"

    # Convert commands to Cursor rules
    for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
        if [ -f "$BASE_AGENT_OS/commands/${cmd}.md" ]; then
            # Only update if forced or file doesn't exist
            if [ "$OVERWRITE_COMMANDS" = true ] || [ ! -f "./.cursor/rules/${cmd}.mdc" ]; then
                convert_to_cursor_rule "$BASE_AGENT_OS/commands/${cmd}.md" "./.cursor/rules/${cmd}.mdc"
            else
                echo "  ⚠️  $(basename ${cmd}.mdc) already exists - skipping"
            fi
        else
            echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
        fi
    done
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
        if [ -d "$BASE_AGENT_OS/venv" ]; then
            if "$BASE_AGENT_OS/venv/bin/python3" -c "import rich, watchdog, yaml, textual" &> /dev/null 2>&1; then
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
            if [ -d "$BASE_AGENT_OS/venv" ] && [ -f "$BASE_AGENT_OS/venv/bin/pip" ] && validate_venv_shebang "$BASE_AGENT_OS/venv"; then
                echo "Upgrading dependencies in virtual environment..."
                timeout 300 "$BASE_AGENT_OS/venv/bin/pip" install --upgrade -r "$BASE_AGENT_OS/requirements.txt" --no-input --disable-pip-version-check || {
                    echo "⚠️  Dependency upgrade timed out or failed"
                    echo "   You can upgrade manually: $BASE_AGENT_OS/venv/bin/pip install --upgrade -r $BASE_AGENT_OS/requirements.txt"
                }
            elif [ -d "$BASE_AGENT_OS/venv" ] && ! validate_venv_shebang "$BASE_AGENT_OS/venv"; then
                echo "⚠️  Virtual environment has broken shebang (pip points to non-existent Python)"
                echo "   This typically happens when venv is moved or paths change"
                echo "   🔄 Automatically recreating virtual environment..."
                echo ""

                # Backup broken venv
                BACKUP_NAME="venv.backup.$(date +%s)"
                echo "   📦 Backing up broken venv to $BACKUP_NAME"
                mv "$BASE_AGENT_OS/venv" "$BASE_AGENT_OS/$BACKUP_NAME"

                # Recreate venv
                if [ -f "$BASE_AGENT_OS/setup/install-dashboard-deps.sh" ]; then
                    echo "   🏗️  Creating fresh virtual environment..."
                    bash "$BASE_AGENT_OS/setup/install-dashboard-deps.sh"

                    # Verify new venv is functional
                    if [ -f "$BASE_AGENT_OS/venv/bin/pip" ] && validate_venv_shebang "$BASE_AGENT_OS/venv"; then
                        echo ""
                        echo "   ✓ Virtual environment recreated successfully!"
                        echo "   💡 Old backup kept at: $BASE_AGENT_OS/$BACKUP_NAME"
                        echo "      (You can remove it manually if not needed)"
                    else
                        echo ""
                        echo "   ⚠️  Failed to recreate virtual environment"
                        echo "      Run manually: $BASE_AGENT_OS/setup/install-dashboard-deps.sh"
                    fi
                else
                    echo "   ⚠️  install-dashboard-deps.sh not found"
                    echo "      Run manually: $BASE_AGENT_OS/setup/install-dashboard-deps.sh"
                fi
            elif [ -d "$BASE_AGENT_OS/venv" ] && [ ! -f "$BASE_AGENT_OS/venv/bin/pip" ]; then
                echo "⚠️  Virtual environment exists but pip not found"
                echo "   Reinstalling dependencies..."
                if [ -f "$BASE_AGENT_OS/setup/install-deps.sh" ]; then
                    bash "$BASE_AGENT_OS/setup/install-deps.sh"
                else
                    echo "   Run manually: $BASE_AGENT_OS/setup/install-deps.sh"
                fi
            elif command -v pip3 &> /dev/null; then
                echo "Upgrading dependencies..."
                if [ -f "$BASE_AGENT_OS/requirements.txt" ]; then
                    timeout 300 pip3 install --upgrade -r "$BASE_AGENT_OS/requirements.txt" --user --no-input --disable-pip-version-check || {
                        echo "⚠️  Dependency upgrade timed out or failed"
                        echo "   You can upgrade manually: pip3 install --upgrade -r $BASE_AGENT_OS/requirements.txt --user"
                    }
                else
                    echo "ℹ️  requirements.txt not found at $BASE_AGENT_OS/requirements.txt"
                fi
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
        if [ -f "$BASE_AGENT_OS/setup/install-deps.sh" ]; then
            bash "$BASE_AGENT_OS/setup/install-deps.sh"
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
