#!/bin/bash

# Yoyo Dev Update Script
# This script updates Yoyo Dev installation in a project directory

set -e  # Exit on error

# Initialize flags (default to overwriting framework files)
OVERWRITE_INSTRUCTIONS=true
OVERWRITE_STANDARDS=true
OVERWRITE_COMMANDS=true
OVERWRITE_AGENTS=true

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
    echo "Please run the installation script first:"
    echo "  ~/.yoyo-dev/setup/project.sh --claude-code"
    echo ""
    exit 1
fi

echo "📍 Updating Yoyo Dev in project: $PROJECT_NAME"
echo ""

# Get the base Yoyo Dev directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
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

    # Update yoyo command launcher
    echo ""
    echo "  📂 CLI Launcher:"
    if [ -f "$BASE_AGENT_OS/setup/yoyo.sh" ]; then
        # Create setup directory if it doesn't exist
        mkdir -p "./.yoyo-dev/setup"

        copy_file "$BASE_AGENT_OS/setup/yoyo.sh" \
            "./.yoyo-dev/setup/yoyo.sh" \
            "true" \
            "setup/yoyo.sh"
        chmod +x "./.yoyo-dev/setup/yoyo.sh"

        # Update global symlink if it exists
        if [ -L "/usr/local/bin/yoyo" ] || [ -f "/usr/local/bin/yoyo" ]; then
            echo "  → Updating global 'yoyo' command..."
            if sudo ln -sf "$HOME/.yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
                echo "  ✓ yoyo command updated globally"
            else
                echo "  ⚠️  Could not update global symlink (sudo required)"
                echo "     Run manually: sudo ln -sf ~/.yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
            fi
        else
            echo "  → Creating global 'yoyo' command..."
            if sudo ln -sf "$HOME/.yoyo-dev/setup/yoyo.sh" /usr/local/bin/yoyo 2>/dev/null; then
                echo "  ✓ yoyo command installed globally"
            else
                echo "  ⚠️  Could not create global symlink (sudo required)"
                echo "     Run manually: sudo ln -sf ~/.yoyo-dev/setup/yoyo.sh /usr/local/bin/yoyo"
            fi
        fi

        # Install/update yoyo-update command
        if [ -f "$BASE_AGENT_OS/setup/yoyo-update-wrapper.sh" ]; then
            if [ -L "/usr/local/bin/yoyo-update" ] || [ -f "/usr/local/bin/yoyo-update" ]; then
                echo "  → Updating global 'yoyo-update' command..."
                if sudo ln -sf "$HOME/.yoyo-dev/setup/yoyo-update-wrapper.sh" /usr/local/bin/yoyo-update 2>/dev/null; then
                    echo "  ✓ yoyo-update command updated globally"
                else
                    echo "  ⚠️  Could not update global symlink (sudo required)"
                    echo "     Run manually: sudo ln -sf ~/.yoyo-dev/setup/yoyo-update-wrapper.sh /usr/local/bin/yoyo-update"
                fi
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

    # Update v2.0 support files
    echo ""
    echo "  📂 v2.0 Support Files:"
    mkdir -p "./.yoyo-dev/lib"
    mkdir -p "./.yoyo-dev/templates"

    # Update task monitor scripts
    if [ -f "$BASE_AGENT_OS/lib/task-monitor.sh" ]; then
        copy_file "$BASE_AGENT_OS/lib/task-monitor.sh" "./.yoyo-dev/lib/task-monitor.sh" "true" "lib/task-monitor.sh"
        chmod +x "./.yoyo-dev/lib/task-monitor.sh"
    fi

    if [ -f "$BASE_AGENT_OS/lib/task-monitor-tmux.sh" ]; then
        copy_file "$BASE_AGENT_OS/lib/task-monitor-tmux.sh" "./.yoyo-dev/lib/task-monitor-tmux.sh" "true" "lib/task-monitor-tmux.sh"
        chmod +x "./.yoyo-dev/lib/task-monitor-tmux.sh"
    fi

    # Update MASTER-TASKS template (always, to get latest improvements)
    if [ -f "$BASE_AGENT_OS/templates/MASTER-TASKS.md" ]; then
        copy_file "$BASE_AGENT_OS/templates/MASTER-TASKS.md" "./.yoyo-dev/templates/MASTER-TASKS.md" "true" "templates/MASTER-TASKS.md"
    fi

    # Update COMMAND-REFERENCE.md (always, to get latest commands)
    if [ -f "$BASE_AGENT_OS/COMMAND-REFERENCE.md" ]; then
        copy_file "$BASE_AGENT_OS/COMMAND-REFERENCE.md" "./.yoyo-dev/COMMAND-REFERENCE.md" "true" "COMMAND-REFERENCE.md"
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
echo "Update complete! Your Yoyo Dev installation is now up to date."
echo ""
echo "Continue building! 🚀"
echo ""
