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

# Validation: Prevent installing in home directory (base installation location)
if [ "$CURRENT_DIR" = "$HOME" ]; then
    echo "❌ Error: Cannot run project installation in home directory"
    echo ""
    echo "This would conflict with the base installation at ~/yoyo-dev/"
    echo ""
    echo "Please run this script from a project directory, not from ~/"
    exit 1
fi

# Check for old 'yoyo-dev/' directory (without dot) and provide migration instructions
if [ -d "$INSTALL_DIR" ] && [ ! -d "./.yoyo-dev" ]; then
    echo "⚠️  Warning: Found old 'yoyo-dev/' directory"
    echo ""
    echo "Yoyo Dev now uses '.yoyo-dev/' (hidden directory) for project installations."
    echo ""
    echo "To migrate your existing installation:"
    echo "  mv yoyo-dev .yoyo-dev"
    echo ""
    echo "Then run this installation script again."
    exit 1
fi

echo "📍 Installing Yoyo Dev to this project's root directory ($PROJECT_NAME)"
echo ""

# Determine if running from base installation or GitHub
if [ "$NO_BASE" = true ]; then
    IS_FROM_BASE=false
    echo "📦 Installing directly from GitHub (no base installation)"
    # Set BASE_URL for GitHub downloads
    BASE_URL="https://raw.githubusercontent.com/daverjorge46/yoyo-dev-ai/main"
    # Download and source functions when running from GitHub
    TEMP_FUNCTIONS="/tmp/yoyo-dev-functions-$$.sh"
    curl -sSL "${BASE_URL}/setup/functions.sh" -o "$TEMP_FUNCTIONS"
    source "$TEMP_FUNCTIONS"
    rm "$TEMP_FUNCTIONS"
else
    IS_FROM_BASE=true
    # Get the base Yoyo Dev directory
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    BASE_YOYO_DEV="$(dirname "$SCRIPT_DIR")"
    echo "✓ Using Yoyo Dev base installation at $BASE_YOYO_DEV"
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
        if grep -q "claude_code:" "$BASE_YOYO_DEV/config.yml" && \
           grep -A1 "claude_code:" "$BASE_YOYO_DEV/config.yml" | grep -q "enabled: true"; then
            CLAUDE_CODE=true
            echo "  ✓ Auto-enabling Claude Code support (from Yoyo Dev config)"
        fi
    fi

    if [ "$CURSOR" = false ]; then
        # Check if cursor is enabled in base config
        if grep -q "cursor:" "$BASE_YOYO_DEV/config.yml" && \
           grep -A1 "cursor:" "$BASE_YOYO_DEV/config.yml" | grep -q "enabled: true"; then
            CURSOR=true
            echo "  ✓ Auto-enabling Cursor support (from Yoyo Dev config)"
        fi
    fi

    # Read project type from config or use flag
    if [ -z "$PROJECT_TYPE" ] && [ -f "$BASE_YOYO_DEV/config.yml" ]; then
        # Try to read default_project_type from config
        PROJECT_TYPE=$(grep "^default_project_type:" "$BASE_YOYO_DEV/config.yml" | cut -d' ' -f2 | tr -d ' ')
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
                echo "  ⚠️  Project type '$PROJECT_TYPE' paths not found, falling back to default instructions and standards"
                INSTRUCTIONS_SOURCE="$BASE_YOYO_DEV/instructions"
                STANDARDS_SOURCE="$BASE_YOYO_DEV/standards"
            fi
        else
            echo "  ⚠️  Project type '$PROJECT_TYPE' not found in config, using default instructions and standards"
            INSTRUCTIONS_SOURCE="$BASE_YOYO_DEV/instructions"
            STANDARDS_SOURCE="$BASE_YOYO_DEV/standards"
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
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks orchestrate-tasks design-init design-audit design-fix design-component containerize-application improve-skills yoyo-help yoyo-init; do
            if [ -f "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" ]; then
                copy_file "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" "./.claude/commands/${cmd}.md" "false" "commands/${cmd}.md"
            else
                echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
            fi
        done

        echo ""
        echo "  📂 Agents:"
        for agent in context-fetcher date-checker file-creator git-workflow project-manager test-runner design-analyzer design-validator implementation-verifier implementer product-planner spec-initializer spec-shaper spec-verifier spec-writer tasks-list-creator; do
            if [ -f "$BASE_YOYO_DEV/.claude/agents/${agent}.md" ]; then
                copy_file "$BASE_YOYO_DEV/.claude/agents/${agent}.md" "./.claude/agents/${agent}.md" "false" "agents/${agent}.md"
            else
                echo "  ⚠️  Warning: ${agent}.md not found in base installation"
            fi
        done
    else
        # Download from GitHub when using --no-base
        echo "  Downloading Claude Code files from GitHub..."
        echo ""
        echo "  📂 Commands:"
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks orchestrate-tasks design-init design-audit design-fix design-component containerize-application improve-skills yoyo-help yoyo-init; do
            download_file "${BASE_URL}/.claude/commands/${cmd}.md" \
                "./.claude/commands/${cmd}.md" \
                "false" \
                "commands/${cmd}.md"
        done

        echo ""
        echo "  📂 Agents:"
        for agent in context-fetcher date-checker file-creator git-workflow project-manager test-runner design-analyzer design-validator implementation-verifier implementer product-planner spec-initializer spec-shaper spec-verifier spec-writer tasks-list-creator; do
            download_file "${BASE_URL}/.claude/agents/${agent}.md" \
                "./.claude/agents/${agent}.md" \
                "false" \
                "agents/${agent}.md"
        done
    fi

    # Install yoyo command launcher
    echo ""
    echo "  📂 CLI Launcher:"
    if [ "$IS_FROM_BASE" = true ]; then
        if [ -f "$BASE_YOYO_DEV/setup/yoyo.sh" ]; then
            # Create setup directory if it doesn't exist
            mkdir -p "$INSTALL_DIR/setup"

            copy_file "$BASE_YOYO_DEV/setup/yoyo.sh" "$INSTALL_DIR/setup/yoyo.sh" "true" "setup/yoyo.sh"
            chmod +x "$INSTALL_DIR/setup/yoyo.sh"

            # Create global symlink (requires sudo)
            if [ -L "/usr/local/bin/yoyo" ] || [ -f "/usr/local/bin/yoyo" ]; then
                echo "  ✓ yoyo command already installed globally"
            else
                echo "  → Creating global 'yoyo' command..."
                if sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
                    echo "  ✓ yoyo command installed globally"
                else
                    echo "  ⚠️  Could not create global symlink (sudo required)"
                    echo "     Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
                fi
            fi

            # Install yoyo-update command
            if [ -f "$BASE_YOYO_DEV/setup/yoyo-update.sh" ]; then
                if [ -L "/usr/local/bin/yoyo-update" ] || [ -f "/usr/local/bin/yoyo-update" ]; then
                    echo "  ✓ yoyo-update command already installed globally"
                else
                    echo "  → Creating global 'yoyo-update' command..."
                    if sudo ln -sf "$HOME/yoyo-dev/setup/yoyo-update.sh" /usr/local/bin/yoyo-update 2>/dev/null; then
                        echo "  ✓ yoyo-update command installed globally"
                    else
                        echo "  ⚠️  Could not create global symlink (sudo required)"
                        echo "     Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo-update.sh /usr/local/bin/yoyo-update"
                    fi
                fi
            fi
        else
            echo "  ⚠️  Warning: yoyo.sh not found in base installation"
        fi
    else
        # Download from GitHub
        # Create setup directory if it doesn't exist
        mkdir -p "$INSTALL_DIR/setup"

        download_file "${BASE_URL}/setup/yoyo.sh" \
            "$INSTALL_DIR/setup/yoyo.sh" \
            "true" \
            "setup/yoyo.sh"
        chmod +x "$INSTALL_DIR/setup/yoyo.sh"

        # Create global symlink
        echo "  → Creating global 'yoyo' command..."
        if sudo ln -sf "$HOME/yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
            echo "  ✓ yoyo command installed globally"
        else
            echo "  ⚠️  Could not create global symlink (sudo required)"
            echo "     Run manually: sudo ln -sf ~/yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
        fi
    fi

    # Install v2.0 support files
    echo ""
    echo "  📂 v2.0 Support Files:"
    mkdir -p "$INSTALL_DIR/lib"
    mkdir -p "$INSTALL_DIR/templates"

    if [ "$IS_FROM_BASE" = true ]; then
        # Copy status display scripts (visual mode)
        if [ -f "$BASE_YOYO_DEV/lib/yoyo-status.sh" ]; then
            copy_file "$BASE_YOYO_DEV/lib/yoyo-status.sh" "$INSTALL_DIR/lib/yoyo-status.sh" "true" "lib/yoyo-status.sh (Bash fallback)"
            chmod +x "$INSTALL_DIR/lib/yoyo-status.sh"
        fi

        # Copy Python dashboard (new in v2.1)
        if [ -f "$BASE_YOYO_DEV/lib/yoyo-dashboard.py" ]; then
            copy_file "$BASE_YOYO_DEV/lib/yoyo-dashboard.py" "$INSTALL_DIR/lib/yoyo-dashboard.py" "true" "lib/yoyo-dashboard.py (Python dashboard)"
            chmod +x "$INSTALL_DIR/lib/yoyo-dashboard.py"
        fi

        # Copy Python requirements
        if [ -f "$BASE_YOYO_DEV/requirements.txt" ]; then
            copy_file "$BASE_YOYO_DEV/requirements.txt" "$INSTALL_DIR/requirements.txt" "true" "requirements.txt (Python deps)"
        fi

        # Copy dashboard dependency installer
        if [ -f "$BASE_YOYO_DEV/setup/install-dashboard-deps.sh" ]; then
            copy_file "$BASE_YOYO_DEV/setup/install-dashboard-deps.sh" "$INSTALL_DIR/setup/install-dashboard-deps.sh" "true" "setup/install-dashboard-deps.sh"
            chmod +x "$INSTALL_DIR/setup/install-dashboard-deps.sh"
        fi

        # Copy yoyo-tmux.sh launcher (visual mode)
        if [ -f "$BASE_YOYO_DEV/setup/yoyo-tmux.sh" ]; then
            copy_file "$BASE_YOYO_DEV/setup/yoyo-tmux.sh" "$INSTALL_DIR/setup/yoyo-tmux.sh" "true" "setup/yoyo-tmux.sh (visual mode)"
            chmod +x "$INSTALL_DIR/setup/yoyo-tmux.sh"
        fi

        # Copy MASTER-TASKS template
        if [ -f "$BASE_YOYO_DEV/templates/MASTER-TASKS.md" ]; then
            copy_file "$BASE_YOYO_DEV/templates/MASTER-TASKS.md" "$INSTALL_DIR/templates/MASTER-TASKS.md" "true" "templates/MASTER-TASKS.md"
        fi

        # Copy COMMAND-REFERENCE.md
        if [ -f "$BASE_YOYO_DEV/COMMAND-REFERENCE.md" ]; then
            copy_file "$BASE_YOYO_DEV/COMMAND-REFERENCE.md" "$INSTALL_DIR/COMMAND-REFERENCE.md" "true" "COMMAND-REFERENCE.md"
        fi
    else
        # Download from GitHub
        download_file "${BASE_URL}/lib/task-monitor.sh" \
            "$INSTALL_DIR/lib/task-monitor.sh" \
            "true" \
            "lib/task-monitor.sh"
        chmod +x "$INSTALL_DIR/lib/task-monitor.sh"

        download_file "${BASE_URL}/lib/task-monitor-tmux.sh" \
            "$INSTALL_DIR/lib/task-monitor-tmux.sh" \
            "true" \
            "lib/task-monitor-tmux.sh"
        chmod +x "$INSTALL_DIR/lib/task-monitor-tmux.sh"

        # Download status display scripts
        download_file "${BASE_URL}/lib/yoyo-status.sh" \
            "$INSTALL_DIR/lib/yoyo-status.sh" \
            "true" \
            "lib/yoyo-status.sh (Bash fallback)"
        chmod +x "$INSTALL_DIR/lib/yoyo-status.sh"

        download_file "${BASE_URL}/lib/yoyo-dashboard.py" \
            "$INSTALL_DIR/lib/yoyo-dashboard.py" \
            "true" \
            "lib/yoyo-dashboard.py (Python dashboard)"
        chmod +x "$INSTALL_DIR/lib/yoyo-dashboard.py"

        echo "  ⚠️  Note: yoyo_tui_v3 (advanced TUI) requires base installation"
        echo "     Clone repository for full TUI support"

        download_file "${BASE_URL}/requirements.txt" \
            "$INSTALL_DIR/requirements.txt" \
            "true" \
            "requirements.txt (Python deps)"

        download_file "${BASE_URL}/setup/install-dashboard-deps.sh" \
            "$INSTALL_DIR/setup/install-dashboard-deps.sh" \
            "true" \
            "setup/install-dashboard-deps.sh"
        chmod +x "$INSTALL_DIR/setup/install-dashboard-deps.sh"

        download_file "${BASE_URL}/setup/yoyo-tmux.sh" \
            "$INSTALL_DIR/setup/yoyo-tmux.sh" \
            "true" \
            "setup/yoyo-tmux.sh (visual mode)"
        chmod +x "$INSTALL_DIR/setup/yoyo-tmux.sh"

        download_file "${BASE_URL}/templates/MASTER-TASKS.md" \
            "$INSTALL_DIR/templates/MASTER-TASKS.md" \
            "true" \
            "templates/MASTER-TASKS.md"

        download_file "${BASE_URL}/COMMAND-REFERENCE.md" \
            "$INSTALL_DIR/COMMAND-REFERENCE.md" \
            "true" \
            "COMMAND-REFERENCE.md"
    fi

    # Copy MCP installation scripts to project (for yoyo --install-mcps)
    echo ""
    echo "  📂 MCP Installation Scripts:"
    mkdir -p "$INSTALL_DIR/setup"

    if [ "$IS_FROM_BASE" = true ]; then
        if [ -f "$BASE_YOYO_DEV/setup/mcp-prerequisites.sh" ]; then
            copy_file "$BASE_YOYO_DEV/setup/mcp-prerequisites.sh" "$INSTALL_DIR/setup/mcp-prerequisites.sh" "true" "setup/mcp-prerequisites.sh"
            chmod +x "$INSTALL_DIR/setup/mcp-prerequisites.sh"
        fi

        if [ -f "$BASE_YOYO_DEV/setup/docker-mcp-setup.sh" ]; then
            copy_file "$BASE_YOYO_DEV/setup/docker-mcp-setup.sh" "$INSTALL_DIR/setup/docker-mcp-setup.sh" "true" "setup/docker-mcp-setup.sh"
            chmod +x "$INSTALL_DIR/setup/docker-mcp-setup.sh"
        fi

        # Copy parse-utils.sh (needed by yoyo.sh for project context parsing)
        if [ -f "$BASE_YOYO_DEV/setup/parse-utils.sh" ]; then
            copy_file "$BASE_YOYO_DEV/setup/parse-utils.sh" "$INSTALL_DIR/setup/parse-utils.sh" "true" "setup/parse-utils.sh"
        fi
    else
        # Download from GitHub when using --no-base
        download_file "${BASE_URL}/setup/mcp-prerequisites.sh" \
            "$INSTALL_DIR/setup/mcp-prerequisites.sh" \
            "true" \
            "setup/mcp-prerequisites.sh"
        chmod +x "$INSTALL_DIR/setup/mcp-prerequisites.sh"

        download_file "${BASE_URL}/setup/docker-mcp-setup.sh" \
            "$INSTALL_DIR/setup/docker-mcp-setup.sh" \
            "true" \
            "setup/docker-mcp-setup.sh"
        chmod +x "$INSTALL_DIR/setup/docker-mcp-setup.sh"

        download_file "${BASE_URL}/setup/parse-utils.sh" \
            "$INSTALL_DIR/setup/parse-utils.sh" \
            "true" \
            "setup/parse-utils.sh"
    fi

    # TUI library is NOT copied to projects - it's accessed from base installation via PYTHONPATH
    # This prevents duplicate lib issues and reduces project size
    echo ""
    echo "  📂 TUI Library v3.0:"
    if [ "$IS_FROM_BASE" = true ]; then
        if [ -d "$BASE_YOYO_DEV/lib/yoyo_tui_v3" ]; then
            echo "  ✓ TUI v3.0 will be used from base installation"
            echo "    Location: $BASE_YOYO_DEV/lib/yoyo_tui_v3/"
        else
            echo "  ⚠️  TUI v3.0 library not found in base installation"
        fi
    else
        echo "  ⚠️  TUI requires base installation (clone repository first)"
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
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks orchestrate-tasks design-init design-audit design-fix design-component containerize-application improve-skills yoyo-help yoyo-init; do
            if [ -f "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" ]; then
                convert_to_cursor_rule "$BASE_YOYO_DEV/.claude/commands/${cmd}.md" "./.cursor/rules/${cmd}.mdc"
            else
                echo "  ⚠️  Warning: ${cmd}.md not found in base installation"
            fi
        done
    else
        # Download from GitHub and convert when using --no-base
        echo "  Downloading and converting from GitHub..."
        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks orchestrate-tasks design-init design-audit design-fix design-component containerize-application improve-skills yoyo-help yoyo-init; do
            TEMP_FILE="/tmp/${cmd}.md"
            curl -s -o "$TEMP_FILE" "${BASE_URL}/.claude/commands/${cmd}.md"
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
    echo "🔌 Docker MCP Server Installation (Optional)"
    echo ""
    echo "Docker MCP Gateway provides containerized MCP servers via Docker Desktop:"
    echo "  • Playwright: Browser automation and testing"
    echo "  • GitHub Official: Repository and issue management"
    echo "  • DuckDuckGo: Web search integration"
    echo "  • Filesystem: File system access"
    echo ""
    echo "Requirements: Docker Desktop 4.32+ with MCP Toolkit enabled"
    echo ""
    read -p "Install MCP servers now? [Y/n] " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        # Use the local copied MCP scripts from project .yoyo-dev/setup/
        MCP_PREREQUISITES="$INSTALL_DIR/setup/mcp-prerequisites.sh"
        MCP_INSTALLER="$INSTALL_DIR/setup/docker-mcp-setup.sh"

        # Run prerequisite check
        if bash "$MCP_PREREQUISITES"; then
            # Prerequisites met, run installer
            bash "$MCP_INSTALLER" --project-dir="$CURRENT_DIR"
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

# Record installed version for update detection
if [ "$IS_FROM_BASE" = true ] && [ -f "$BASE_YOYO_DEV/VERSION" ]; then
    cp "$BASE_YOYO_DEV/VERSION" "$INSTALL_DIR/.installed-version"
    echo ""
    echo "📌 Version $(cat "$BASE_YOYO_DEV/VERSION" | tr -d '\n') installed"
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
echo "https://github.com/daverjorge46/yoyo-dev-ai"
echo ""
echo "Keep building! 🚀"
echo ""
