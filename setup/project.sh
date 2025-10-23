#!/bin/bash

# Yoyo Dev Project Installation Script
# This script installs Yoyo Dev in a project directory

set -e  # Exit on error

# Initialize flags
NO_BASE=false
OVERWRITE_INSTRUCTIONS=false
OVERWRITE_STANDARDS=false
CLAUDE_CODE=false
CURSOR=false
PROJECT_TYPE=""

# Parse command line arguments
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
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-base                   Install from GitHub (not from a base Yoyo Devinstallation on your system)"
            echo "  --overwrite-instructions    Overwrite existing instruction files"
            echo "  --overwrite-standards       Overwrite existing standards files"
            echo "  --claude-code               Add Claude Code support"
            echo "  --cursor                    Add Cursor support"
            echo "  --project-type=TYPE         Use specific project type for installation"
            echo "  -h, --help                  Show this help message"
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
echo "🚀 Yoyo Dev Project Installation"
echo "================================"
echo ""

# Get project directory info
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")
INSTALL_DIR="./.yoyo-dev"

echo "📍 Installing Yoyo Dev to this project's root directory ($PROJECT_NAME)"
echo ""

# Determine if running from base installation or GitHub
if [ "$NO_BASE" = true ]; then
    IS_FROM_BASE=false
    echo "📦 Installing directly from GitHub (no base installation)"
    # Set BASE_URL for GitHub downloads
    BASE_URL=
    # Download and source functions when running from GitHub
    TEMP_FUNCTIONS="/tmp/yoyo-dev-functions-$$.sh"
    curl -sSL "${BASE_URL}/setup/functions.sh" -o "$TEMP_FUNCTIONS"
    source "$TEMP_FUNCTIONS"
    rm "$TEMP_FUNCTIONS"
else
    IS_FROM_BASE=true
    # Get the base Yoyo Dev directory
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    BASE_AGENT_OS="$(dirname "$SCRIPT_DIR")"
    echo "✓ Using Yoyo Dev base installation at $BASE_AGENT_OS"
    # Source shared functions from base installation
    source "$SCRIPT_DIR/functions.sh"
fi

echo ""
echo "📁 Creating project directories..."
echo ""
mkdir -p "$INSTALL_DIR"

# Configure tools and project type based on installation type
if [ "$IS_FROM_BASE" = true ]; then
    # Auto-enable tools based on base config if no flags provided
    if [ "$CLAUDE_CODE" = false ]; then
        # Check if claude_code is enabled in base config
        if grep -q "claude_code:" "$BASE_AGENT_OS/config.yml" && \
           grep -A1 "claude_code:" "$BASE_AGENT_OS/config.yml" | grep -q "enabled: true"; then
            CLAUDE_CODE=true
            echo "  ✓ Auto-enabling Claude Code support (from Yoyo Dev config)"
        fi
    fi

    if [ "$CURSOR" = false ]; then
        # Check if cursor is enabled in base config
        if grep -q "cursor:" "$BASE_AGENT_OS/config.yml" && \
           grep -A1 "cursor:" "$BASE_AGENT_OS/config.yml" | grep -q "enabled: true"; then
            CURSOR=true
            echo "  ✓ Auto-enabling Cursor support (from Yoyo Dev config)"
        fi
    fi

    # Read project type from config or use flag
    if [ -z "$PROJECT_TYPE" ] && [ -f "$BASE_AGENT_OS/config.yml" ]; then
        # Try to read default_project_type from config
        PROJECT_TYPE=$(grep "^default_project_type:" "$BASE_AGENT_OS/config.yml" | cut -d' ' -f2 | tr -d ' ')
        if [ -z "$PROJECT_TYPE" ]; then
            PROJECT_TYPE="default"
        fi
    elif [ -z "$PROJECT_TYPE" ]; then
        PROJECT_TYPE="default"
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
                echo "  ⚠️  Project type '$PROJECT_TYPE' paths not found, falling back to default instructions and standards"
                INSTRUCTIONS_SOURCE="$BASE_AGENT_OS/instructions"
                STANDARDS_SOURCE="$BASE_AGENT_OS/standards"
            fi
        else
            echo "  ⚠️  Project type '$PROJECT_TYPE' not found in config, using default instructions and standards"
            INSTRUCTIONS_SOURCE="$BASE_AGENT_OS/instructions"
            STANDARDS_SOURCE="$BASE_AGENT_OS/standards"
        fi
    fi

    # Copy instructions and standards from determined sources
    echo ""
    echo "📥 Installing instruction files to $INSTALL_DIR/instructions/"
    copy_directory "$INSTRUCTIONS_SOURCE" "$INSTALL_DIR/instructions" "$OVERWRITE_INSTRUCTIONS"

    echo ""
    echo "📥 Installing standards files to $INSTALL_DIR/standards/"
    copy_directory "$STANDARDS_SOURCE" "$INSTALL_DIR/standards" "$OVERWRITE_STANDARDS"
else
    # Running directly from GitHub - download from GitHub
    if [ -z "$PROJECT_TYPE" ]; then
        PROJECT_TYPE="default"
    fi

    echo "📦 Using project type: $PROJECT_TYPE (default when installing from GitHub)"

    # Install instructions and standards from GitHub (no commands folder needed)
    install_from_github "$INSTALL_DIR" "$OVERWRITE_INSTRUCTIONS" "$OVERWRITE_STANDARDS" false
fi

# Handle Claude Code installation for project
if [ "$CLAUDE_CODE" = true ]; then
    echo ""
    echo "📥 Installing Claude Code support..."
    mkdir -p "./.claude/commands"
    mkdir -p "./.claude/agents"

    if [ "$IS_FROM_BASE" = true ]; then
        # Copy from base installation
        echo "  📂 Commands:"
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
            if [ -f "$BASE_AGENT_OS/commands/${cmd}.md" ]; then
                copy_file "$BASE_AGENT_OS/commands/${cmd}.md" "./.claude/commands/${cmd}.md" "false" "commands/${cmd}.md"
            else
                echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
            fi
        done

        echo ""
        echo "  📂 Agents:"
        for agent in context-fetcher date-checker file-creator git-workflow project-manager test-runner design-analyzer design-validator; do
            if [ -f "$BASE_AGENT_OS/claude-code/agents/${agent}.md" ]; then
                copy_file "$BASE_AGENT_OS/claude-code/agents/${agent}.md" "./.claude/agents/${agent}.md" "false" "agents/${agent}.md"
            else
                echo "  ⚠️  Warning: ${agent}.md not found in base installation"
            fi
        done
    else
        # Download from GitHub when using --no-base
        echo "  Downloading Claude Code files from GitHub..."
        echo ""
        echo "  📂 Commands:"
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
            download_file "${BASE_URL}/commands/${cmd}.md" \
                "./.claude/commands/${cmd}.md" \
                "false" \
                "commands/${cmd}.md"
        done

        echo ""
        echo "  📂 Agents:"
        for agent in context-fetcher date-checker file-creator git-workflow project-manager test-runner design-analyzer design-validator; do
            download_file "${BASE_URL}/claude-code/agents/${agent}.md" \
                "./.claude/agents/${agent}.md" \
                "false" \
                "agents/${agent}.md"
        done
    fi

    # Install yoyo command launcher
    echo ""
    echo "  📂 CLI Launcher:"
    if [ "$IS_FROM_BASE" = true ]; then
        if [ -f "$BASE_AGENT_OS/setup/yoyo.sh" ]; then
            # Create setup directory if it doesn't exist
            mkdir -p "./.yoyo-dev/setup"

            copy_file "$BASE_AGENT_OS/setup/yoyo.sh" "./.yoyo-dev/setup/yoyo.sh" "true" "setup/yoyo.sh"
            chmod +x "./.yoyo-dev/setup/yoyo.sh"

            # Create global symlink (requires sudo)
            if [ -L "/usr/local/bin/yoyo" ] || [ -f "/usr/local/bin/yoyo" ]; then
                echo "  ✓ yoyo command already installed globally"
            else
                echo "  → Creating global 'yoyo' command..."
                if sudo ln -sf "$HOME/.yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
                    echo "  ✓ yoyo command installed globally"
                else
                    echo "  ⚠️  Could not create global symlink (sudo required)"
                    echo "     Run manually: sudo ln -sf ~/.yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
                fi
            fi

            # Install yoyo-update command
            if [ -f "$BASE_AGENT_OS/setup/yoyo-update-wrapper.sh" ]; then
                if [ -L "/usr/local/bin/yoyo-update" ] || [ -f "/usr/local/bin/yoyo-update" ]; then
                    echo "  ✓ yoyo-update command already installed globally"
                else
                    echo "  → Creating global 'yoyo-update' command..."
                    if sudo ln -sf "$HOME/.yoyo-dev/setup/yoyo-update-wrapper.sh" /usr/local/bin/yoyo-update 2>/dev/null; then
                        echo "  ✓ yoyo-update command installed globally"
                    else
                        echo "  ⚠️  Could not create global symlink (sudo required)"
                        echo "     Run manually: sudo ln -sf ~/.yoyo-dev/setup/yoyo-update-wrapper.sh /usr/local/bin/yoyo-update"
                    fi
                fi
            fi
        else
            echo "  ⚠️  Warning: yoyo.sh not found in base installation"
        fi
    else
        # Download from GitHub
        # Create setup directory if it doesn't exist
        mkdir -p "./.yoyo-dev/setup"

        download_file "${BASE_URL}/setup/yoyo.sh" \
            "./.yoyo-dev/setup/yoyo.sh" \
            "true" \
            "setup/yoyo.sh"
        chmod +x "./.yoyo-dev/setup/yoyo.sh"

        # Create global symlink
        echo "  → Creating global 'yoyo' command..."
        if sudo ln -sf "$HOME/.yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
            echo "  ✓ yoyo command installed globally"
        else
            echo "  ⚠️  Could not create global symlink (sudo required)"
            echo "     Run manually: sudo ln -sf ~/.yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
        fi
    fi

    # Install v2.0 support files
    echo ""
    echo "  📂 v2.0 Support Files:"
    mkdir -p "./.yoyo-dev/lib"
    mkdir -p "./.yoyo-dev/templates"

    if [ "$IS_FROM_BASE" = true ]; then
        # Copy task monitor scripts
        if [ -f "$BASE_AGENT_OS/lib/task-monitor.sh" ]; then
            copy_file "$BASE_AGENT_OS/lib/task-monitor.sh" "./.yoyo-dev/lib/task-monitor.sh" "true" "lib/task-monitor.sh"
            chmod +x "./.yoyo-dev/lib/task-monitor.sh"
        fi

        if [ -f "$BASE_AGENT_OS/lib/task-monitor-tmux.sh" ]; then
            copy_file "$BASE_AGENT_OS/lib/task-monitor-tmux.sh" "./.yoyo-dev/lib/task-monitor-tmux.sh" "true" "lib/task-monitor-tmux.sh"
            chmod +x "./.yoyo-dev/lib/task-monitor-tmux.sh"
        fi

        # Copy status display scripts (visual mode)
        if [ -f "$BASE_AGENT_OS/lib/yoyo-status.sh" ]; then
            copy_file "$BASE_AGENT_OS/lib/yoyo-status.sh" "./.yoyo-dev/lib/yoyo-status.sh" "true" "lib/yoyo-status.sh (Bash fallback)"
            chmod +x "./.yoyo-dev/lib/yoyo-status.sh"
        fi

        # Copy Python dashboard (new in v2.1)
        if [ -f "$BASE_AGENT_OS/lib/yoyo-dashboard.py" ]; then
            copy_file "$BASE_AGENT_OS/lib/yoyo-dashboard.py" "./.yoyo-dev/lib/yoyo-dashboard.py" "true" "lib/yoyo-dashboard.py (Python dashboard)"
            chmod +x "./.yoyo-dev/lib/yoyo-dashboard.py"
        fi

        # Copy Textual TUI launcher (new in v2.2 - event-driven architecture)
        if [ -f "$BASE_AGENT_OS/lib/yoyo-tui.py" ]; then
            copy_file "$BASE_AGENT_OS/lib/yoyo-tui.py" "./.yoyo-dev/lib/yoyo-tui.py" "true" "lib/yoyo-tui.py (TUI launcher)"
            chmod +x "./.yoyo-dev/lib/yoyo-tui.py"
        fi

        # Copy Python requirements
        if [ -f "$BASE_AGENT_OS/requirements.txt" ]; then
            copy_file "$BASE_AGENT_OS/requirements.txt" "./.yoyo-dev/requirements.txt" "true" "requirements.txt (Python deps)"
        fi

        # Copy dashboard dependency installer
        if [ -f "$BASE_AGENT_OS/setup/install-dashboard-deps.sh" ]; then
            copy_file "$BASE_AGENT_OS/setup/install-dashboard-deps.sh" "./.yoyo-dev/setup/install-dashboard-deps.sh" "true" "setup/install-dashboard-deps.sh"
            chmod +x "./.yoyo-dev/setup/install-dashboard-deps.sh"
        fi

        # Copy yoyo-tmux.sh launcher (visual mode)
        if [ -f "$BASE_AGENT_OS/setup/yoyo-tmux.sh" ]; then
            copy_file "$BASE_AGENT_OS/setup/yoyo-tmux.sh" "./.yoyo-dev/setup/yoyo-tmux.sh" "true" "setup/yoyo-tmux.sh (visual mode)"
            chmod +x "./.yoyo-dev/setup/yoyo-tmux.sh"
        fi

        # Copy MASTER-TASKS template
        if [ -f "$BASE_AGENT_OS/templates/MASTER-TASKS.md" ]; then
            copy_file "$BASE_AGENT_OS/templates/MASTER-TASKS.md" "./.yoyo-dev/templates/MASTER-TASKS.md" "true" "templates/MASTER-TASKS.md"
        fi

        # Copy COMMAND-REFERENCE.md
        if [ -f "$BASE_AGENT_OS/COMMAND-REFERENCE.md" ]; then
            copy_file "$BASE_AGENT_OS/COMMAND-REFERENCE.md" "./.yoyo-dev/COMMAND-REFERENCE.md" "true" "COMMAND-REFERENCE.md"
        fi
    else
        # Download from GitHub
        download_file "${BASE_URL}/lib/task-monitor.sh" \
            "./.yoyo-dev/lib/task-monitor.sh" \
            "true" \
            "lib/task-monitor.sh"
        chmod +x "./.yoyo-dev/lib/task-monitor.sh"

        download_file "${BASE_URL}/lib/task-monitor-tmux.sh" \
            "./.yoyo-dev/lib/task-monitor-tmux.sh" \
            "true" \
            "lib/task-monitor-tmux.sh"
        chmod +x "./.yoyo-dev/lib/task-monitor-tmux.sh"

        # Download status display scripts
        download_file "${BASE_URL}/lib/yoyo-status.sh" \
            "./.yoyo-dev/lib/yoyo-status.sh" \
            "true" \
            "lib/yoyo-status.sh (Bash fallback)"
        chmod +x "./.yoyo-dev/lib/yoyo-status.sh"

        download_file "${BASE_URL}/lib/yoyo-dashboard.py" \
            "./.yoyo-dev/lib/yoyo-dashboard.py" \
            "true" \
            "lib/yoyo-dashboard.py (Python dashboard)"
        chmod +x "./.yoyo-dev/lib/yoyo-dashboard.py"

        download_file "${BASE_URL}/lib/yoyo-tui.py" \
            "./.yoyo-dev/lib/yoyo-tui.py" \
            "true" \
            "lib/yoyo-tui.py (TUI launcher)"
        chmod +x "./.yoyo-dev/lib/yoyo-tui.py"

        download_file "${BASE_URL}/requirements.txt" \
            "./.yoyo-dev/requirements.txt" \
            "true" \
            "requirements.txt (Python deps)"

        download_file "${BASE_URL}/setup/install-dashboard-deps.sh" \
            "./.yoyo-dev/setup/install-dashboard-deps.sh" \
            "true" \
            "setup/install-dashboard-deps.sh"
        chmod +x "./.yoyo-dev/setup/install-dashboard-deps.sh"

        download_file "${BASE_URL}/setup/yoyo-tmux.sh" \
            "./.yoyo-dev/setup/yoyo-tmux.sh" \
            "true" \
            "setup/yoyo-tmux.sh (visual mode)"
        chmod +x "./.yoyo-dev/setup/yoyo-tmux.sh"

        download_file "${BASE_URL}/templates/MASTER-TASKS.md" \
            "./.yoyo-dev/templates/MASTER-TASKS.md" \
            "true" \
            "templates/MASTER-TASKS.md"

        download_file "${BASE_URL}/COMMAND-REFERENCE.md" \
            "./.yoyo-dev/COMMAND-REFERENCE.md" \
            "true" \
            "COMMAND-REFERENCE.md"
    fi

    # Copy MCP installation scripts to project (for yoyo --install-mcps)
    echo ""
    echo "  📂 MCP Installation Scripts:"
    mkdir -p "./.yoyo-dev/setup"

    if [ "$IS_FROM_BASE" = true ]; then
        if [ -f "$BASE_AGENT_OS/setup/mcp-prerequisites.sh" ]; then
            copy_file "$BASE_AGENT_OS/setup/mcp-prerequisites.sh" "./.yoyo-dev/setup/mcp-prerequisites.sh" "true" "setup/mcp-prerequisites.sh"
            chmod +x "./.yoyo-dev/setup/mcp-prerequisites.sh"
        fi

        if [ -f "$BASE_AGENT_OS/setup/mcp-installer.sh" ]; then
            copy_file "$BASE_AGENT_OS/setup/mcp-installer.sh" "./.yoyo-dev/setup/mcp-installer.sh" "true" "setup/mcp-installer.sh"
            chmod +x "./.yoyo-dev/setup/mcp-installer.sh"
        fi

        # Copy parse-utils.sh (needed by yoyo.sh for project context parsing)
        if [ -f "$BASE_AGENT_OS/setup/parse-utils.sh" ]; then
            copy_file "$BASE_AGENT_OS/setup/parse-utils.sh" "./.yoyo-dev/setup/parse-utils.sh" "true" "setup/parse-utils.sh"
        fi
    else
        # Download from GitHub when using --no-base
        download_file "${BASE_URL}/setup/mcp-prerequisites.sh" \
            "./.yoyo-dev/setup/mcp-prerequisites.sh" \
            "true" \
            "setup/mcp-prerequisites.sh"
        chmod +x "./.yoyo-dev/setup/mcp-prerequisites.sh"

        download_file "${BASE_URL}/setup/mcp-installer.sh" \
            "./.yoyo-dev/setup/mcp-installer.sh" \
            "true" \
            "setup/mcp-installer.sh"
        chmod +x "./.yoyo-dev/setup/mcp-installer.sh"

        download_file "${BASE_URL}/setup/parse-utils.sh" \
            "./.yoyo-dev/setup/parse-utils.sh" \
            "true" \
            "setup/parse-utils.sh"
    fi

    # Copy TUI library if available
    echo ""
    echo "  📂 TUI Library (Optional):"
    if [ "$IS_FROM_BASE" = true ]; then
        if [ -d "$BASE_AGENT_OS/lib/yoyo_tui" ]; then
            mkdir -p "./.yoyo-dev/lib"
            # Copy TUI library (excluding venv and cache)
            cp -r "$BASE_AGENT_OS/lib/yoyo_tui" "./.yoyo-dev/lib/" 2>/dev/null || true
            # Remove venv and cache if they were copied
            rm -rf "./.yoyo-dev/lib/yoyo_tui/venv" 2>/dev/null || true
            rm -rf "./.yoyo-dev/lib/yoyo_tui/__pycache__" 2>/dev/null || true
            find "./.yoyo-dev/lib/yoyo_tui" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
            echo "  ✓ TUI library installed (lib/yoyo_tui/)"
        else
            echo "  ⚠️  TUI library not found in base installation"
        fi
    else
        echo "  ⚠️  TUI library not available from GitHub installation"
        echo "     Clone from repository to get TUI support"
    fi
fi

# Handle Cursor installation for project
if [ "$CURSOR" = true ]; then
    echo ""
    echo "📥 Installing Cursor support..."
    mkdir -p "./.cursor/rules"

    echo "  📂 Rules:"

    if [ "$IS_FROM_BASE" = true ]; then
        # Convert commands from base installation to Cursor rules
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
            if [ -f "$BASE_AGENT_OS/commands/${cmd}.md" ]; then
                convert_to_cursor_rule "$BASE_AGENT_OS/commands/${cmd}.md" "./.cursor/rules/${cmd}.mdc"
            else
                echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
            fi
        done
    else
        # Download from GitHub and convert when using --no-base
        echo "  Downloading and converting from GitHub..."
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
            TEMP_FILE="/tmp/${cmd}.md"
            curl -s -o "$TEMP_FILE" "${BASE_URL}/commands/${cmd}.md"
            if [ -f "$TEMP_FILE" ]; then
                convert_to_cursor_rule "$TEMP_FILE" "./.cursor/rules/${cmd}.mdc"
                rm "$TEMP_FILE"
            fi
        done
    fi
fi

# Handle MCP installation (optional)
if [ "$CLAUDE_CODE" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔌 MCP Server Installation (Optional)"
    echo ""
    echo "Model Context Protocol (MCP) servers extend Claude Code with powerful capabilities:"
    echo "  • Context7: Intelligent context loading (30%+ token reduction)"
    echo "  • Memory: Pattern persistence across sessions"
    echo "  • Playwright: Browser automation and testing"
    echo "  • Chrome DevTools: Performance profiling"
    echo "  • Shadcn: Component scaffolding"
    echo "  • Containerization: Docker generation"
    echo ""
    read -p "Install MCP servers now? [Y/n] " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        # Use the local copied MCP scripts from project .yoyo-dev/setup/
        MCP_PREREQUISITES="$INSTALL_DIR/setup/mcp-prerequisites.sh"
        MCP_INSTALLER="$INSTALL_DIR/setup/mcp-installer.sh"

        # Run prerequisite check
        if bash "$MCP_PREREQUISITES"; then
            # Prerequisites met, run installer
            bash "$MCP_INSTALLER" prompt --config "$INSTALL_DIR/config.yml"
            MCP_STATUS=$?
        else
            echo ""
            echo "⚠️  MCP prerequisite check failed"
            echo "You can install MCPs later by running: yoyo --install-mcps"
            MCP_STATUS=1
        fi

        if [ $MCP_STATUS -eq 0 ]; then
            echo ""
            echo "✅ MCP installation complete"
        fi
    else
        echo ""
        echo "⏭️  Skipping MCP installation"
        echo "You can install MCPs later by running: yoyo --install-mcps"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# Success message
echo ""
echo "✅ Yoyo Dev has been installed in your project ($PROJECT_NAME)!"
echo ""
echo "📍 Project-level files installed to:"
echo "   .yoyo-dev/instructions/    - Yoyo Dev instructions"
echo "   .yoyo-dev/standards/       - Development standards"

if [ "$CLAUDE_CODE" = true ]; then
    echo "   .claude/commands/          - Claude Code commands"
    echo "   .claude/agents/            - Claude Code specialized agents"
    echo "   .yoyo-dev/setup/yoyo.sh    - Yoyo CLI launcher"
fi

if [ "$CURSOR" = true ]; then
    echo "   .cursor/rules/             - Cursor command rules"
fi

echo ""
echo "--------------------------------"
echo ""
echo "Next steps:"
echo ""

if [ "$CLAUDE_CODE" = true ]; then
    echo "Quick launch:"
    echo "  yoyo                 - Launch Claude Code with branded Yoyo Dev interface"
    echo ""
    echo "Claude Code usage:"
    echo "  /plan-product      - Set the mission & roadmap for a new product"
    echo "  /analyze-product   - Set up the mission and roadmap for an existing product"
    echo "  /create-new        - Create feature spec + tasks in one streamlined workflow"
    echo "  /create-fix        - Analyze and fix bugs with systematic investigation"
    echo "  /execute-tasks     - Build and ship code for a feature or fix"
    echo ""
    echo "  Design System (NEW v1.5.0):"
    echo "  /design-init       - Initialize design system for UI consistency"
    echo "  /design-audit      - Audit design compliance and violations"
    echo "  /design-fix        - Fix design inconsistencies systematically"
    echo "  /design-component  - Create UI components with strict validation"
    echo ""
fi

if [ "$CURSOR" = true ]; then
    echo "Cursor usage:"
    echo "  @plan-product    - Set the mission & roadmap for a new product"
    echo "  @analyze-product - Set up the mission and roadmap for an existing product"
    echo "  @create-new      - Create feature spec + tasks in one streamlined workflow"
    echo "  @create-fix      - Analyze and fix bugs with systematic investigation"
    echo "  @create-spec     - Create a detailed spec for a new feature (advanced)"
    echo "  @create-tasks    - Create tasks from a spec (advanced)"
    echo "  @execute-tasks   - Build and ship code for a feature or fix"
    echo ""
fi

echo "--------------------------------"
echo ""
echo "Refer to the official Yoyo Dev docs at:"
echo "yoyo-dev"
echo ""
echo "Keep building! 🚀"
echo ""
