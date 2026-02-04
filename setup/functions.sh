#!/bin/bash

# Yoyo Dev Shared Functions
# Used by both base.sh and project.sh

# Function to copy files from source to destination
copy_file() {
    local source="$1"
    local dest="$2"
    local overwrite="$3"
    local desc="$4"

    if [ -f "$dest" ] && [ "$overwrite" = false ]; then
        echo "  ⚠️  $desc already exists - skipping"
        return 0
    else
        if [ -f "$source" ]; then
            cp "$source" "$dest"
            if [ -f "$dest" ] && [ "$overwrite" = true ]; then
                echo "  ✓ $desc (overwritten)"
            else
                echo "  ✓ $desc"
            fi
            return 0
        else
            return 1
        fi
    fi
}

# Function to download file from GitHub
download_file() {
    local url="$1"
    local dest="$2"
    local overwrite="$3"
    local desc="$4"

    if [ -f "$dest" ] && [ "$overwrite" = false ]; then
        echo "  ⚠️  $desc already exists - skipping"
        return 0
    else
        curl -s -o "$dest" "$url"
        if [ -f "$dest" ] && [ "$overwrite" = true ]; then
            echo "  ✓ $desc (overwritten)"
        else
            echo "  ✓ $desc"
        fi
        return 0
    fi
}

# Function to copy directory recursively
copy_directory() {
    local source="$1"
    local dest="$2"
    local overwrite="$3"

    if [ ! -d "$source" ]; then
        return 1
    fi

    mkdir -p "$dest"

    # Copy all files and subdirectories
    find "$source" -type f | while read -r file; do
        relative_path="${file#$source/}"
        dest_file="$dest/$relative_path"
        dest_dir=$(dirname "$dest_file")
        mkdir -p "$dest_dir"

        if [ -f "$dest_file" ] && [ "$overwrite" = false ]; then
            echo "  ⚠️  $relative_path already exists - skipping"
        else
            cp "$file" "$dest_file"
            if [ "$overwrite" = true ] && [ -f "$dest_file" ]; then
                echo "  ✓ $relative_path (overwritten)"
            else
                echo "  ✓ $relative_path"
            fi
        fi
    done
}

# Function to convert command file to Cursor .mdc format
convert_to_cursor_rule() {
    local source="$1"
    local dest="$2"

    if [ -f "$dest" ]; then
        echo "  ⚠️  $(basename $dest) already exists - skipping"
    else
        # Create the front-matter and append original content
        cat > "$dest" << EOF
---
alwaysApply: false
---

EOF
        cat "$source" >> "$dest"
        echo "  ✓ $(basename $dest)"
    fi
}

# Detect if running inside WSL (Windows Subsystem for Linux)
is_wsl() {
    grep -qi microsoft /proc/version 2>/dev/null
}

# Check if systemd is available and running
has_systemd() {
    command -v systemctl &>/dev/null && [ -d /run/systemd/system ] 2>/dev/null
}

# Check Node.js version meets minimum requirement
# Usage: check_node_version 22
# Returns 0 if version is sufficient, 1 otherwise
check_node_version() {
    local required_major="${1:-22}"

    if ! command -v node &>/dev/null; then
        echo "not_installed"
        return 1
    fi

    local node_version
    node_version=$(node --version 2>/dev/null | sed 's/^v//')
    local node_major
    node_major=$(echo "$node_version" | cut -d. -f1)

    if [ "$node_major" -ge "$required_major" ] 2>/dev/null; then
        echo "$node_version"
        return 0
    else
        echo "$node_version"
        return 1
    fi
}

# Function to install from GitHub
install_from_github() {
    local target_dir="$1"
    local overwrite_inst="$2"
    local overwrite_std="$3"
    local include_commands="${4:-true}"  # Default to true for base installations

    # Create directories
    mkdir -p "$target_dir/standards"
    mkdir -p "$target_dir/standards/code-style"
    mkdir -p "$target_dir/instructions"
    mkdir -p "$target_dir/instructions/core"
    mkdir -p "$target_dir/instructions/meta"

    # Download instructions
    echo ""
    echo "📥 Downloading instruction files to $target_dir/instructions/"

    # Core instructions
    echo "  📂 Core instructions:"
    for file in plan-product analyze-product create-new create-fix review post-execution-tasks create-spec create-tasks execute-tasks execute-task design-init; do
        download_file "${BASE_URL}/instructions/core/${file}.md" \
            "$target_dir/instructions/core/${file}.md" \
            "$overwrite_inst" \
            "instructions/core/${file}.md"
    done

    # Meta instructions
    echo ""
    echo "  📂 Meta instructions:"
    for file in pre-flight post-flight; do
        download_file "${BASE_URL}/instructions/meta/${file}.md" \
            "$target_dir/instructions/meta/${file}.md" \
            "$overwrite_inst" \
            "instructions/meta/${file}.md"
    done

    # Download standards
    echo ""
    echo "📥 Downloading standards files to $target_dir/standards/"

    download_file "${BASE_URL}/standards/tech-stack.md" \
        "$target_dir/standards/tech-stack.md" \
        "$overwrite_std" \
        "standards/tech-stack.md"

    download_file "${BASE_URL}/standards/code-style.md" \
        "$target_dir/standards/code-style.md" \
        "$overwrite_std" \
        "standards/code-style.md"

    download_file "${BASE_URL}/standards/best-practices.md" \
        "$target_dir/standards/best-practices.md" \
        "$overwrite_std" \
        "standards/best-practices.md"

    download_file "${BASE_URL}/standards/review-modes.md" \
        "$target_dir/standards/review-modes.md" \
        "$overwrite_std" \
        "standards/review-modes.md"

    download_file "${BASE_URL}/standards/output-formatting.md" \
        "$target_dir/standards/output-formatting.md" \
        "$overwrite_std" \
        "standards/output-formatting.md"

    download_file "${BASE_URL}/standards/formatting-helpers.md" \
        "$target_dir/standards/formatting-helpers.md" \
        "$overwrite_std" \
        "standards/formatting-helpers.md"

    download_file "${BASE_URL}/standards/parallel-execution.md" \
        "$target_dir/standards/parallel-execution.md" \
        "$overwrite_std" \
        "standards/parallel-execution.md"

    # Design system standards (NEW in v1.5.0)
    download_file "${BASE_URL}/standards/design-system.md" \
        "$target_dir/standards/design-system.md" \
        "$overwrite_std" \
        "standards/design-system.md"

    download_file "${BASE_URL}/standards/design-validation.md" \
        "$target_dir/standards/design-validation.md" \
        "$overwrite_std" \
        "standards/design-validation.md"

    download_file "${BASE_URL}/standards/component-patterns.md" \
        "$target_dir/standards/component-patterns.md" \
        "$overwrite_std" \
        "standards/component-patterns.md"

    # Download code-style subdirectory
    echo ""
    echo "📥 Downloading code style files to $target_dir/standards/code-style/"

    for file in css-style html-style javascript-style; do
        download_file "${BASE_URL}/standards/code-style/${file}.md" \
            "$target_dir/standards/code-style/${file}.md" \
            "$overwrite_std" \
            "standards/code-style/${file}.md"
    done

    # Download commands (only if requested)
    if [ "$include_commands" = true ]; then
        echo ""
        echo "📥 Downloading command files to $target_dir/commands/"
        mkdir -p "$target_dir/commands"

        for cmd in plan-product analyze-product create-new create-fix review create-spec create-tasks execute-tasks design-init design-audit design-fix design-component yoyo-help; do
            download_file "${BASE_URL}/commands/${cmd}.md" \
                "$target_dir/commands/${cmd}.md" \
                "$overwrite_std" \
                "commands/${cmd}.md"
        done
    fi

    # Download design system agents (only if requested)
    if [ "$include_commands" = true ]; then
        echo ""
        echo "📥 Downloading design system agents to $target_dir/claude-code/agents/"
        mkdir -p "$target_dir/claude-code/agents"

        for agent in design-analyzer design-validator; do
            download_file "${BASE_URL}/claude-code/agents/${agent}.md" \
                "$target_dir/claude-code/agents/${agent}.md" \
                "$overwrite_std" \
                "claude-code/agents/${agent}.md"
        done
    fi
}

# ============================================================================
# OpenClaw (yoyo-ai) Shared Helpers
# ============================================================================

# Default OpenClaw configuration (canonical home: ~/.yoyo-ai, ~/.openclaw is symlink)
YOYO_AI_HOME="${YOYO_AI_HOME:-$HOME/.yoyo-ai}"
OPENCLAW_PORT="${OPENCLAW_PORT:-18789}"
OPENCLAW_TOKEN_FILE="${OPENCLAW_TOKEN_FILE:-$YOYO_AI_HOME/.gateway-token}"
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$YOYO_AI_HOME/openclaw.json}"
OPENCLAW_ONBOARD_MARKER="${OPENCLAW_ONBOARD_MARKER:-$YOYO_AI_HOME/.yoyo-onboarded}"

# Generate or load a persistent gateway token
# Exports OPENCLAW_GATEWAY_TOKEN
ensure_openclaw_token() {
    if [ -f "$OPENCLAW_TOKEN_FILE" ]; then
        OPENCLAW_GATEWAY_TOKEN="$(cat "$OPENCLAW_TOKEN_FILE")"
        export OPENCLAW_GATEWAY_TOKEN
    else
        local token
        token="yoyo-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
        mkdir -p "$(dirname "$OPENCLAW_TOKEN_FILE")"
        echo "$token" > "$OPENCLAW_TOKEN_FILE"
        chmod 600 "$OPENCLAW_TOKEN_FILE"
        export OPENCLAW_GATEWAY_TOKEN="$token"
    fi
}

# Inject OPENCLAW_GATEWAY_TOKEN into systemd service file if missing, then daemon-reload
patch_openclaw_systemd_service() {
    # Skip if systemd is not available (e.g., WSL without systemd)
    if ! has_systemd; then
        return 0
    fi
    local service_file="$HOME/.config/systemd/user/openclaw-gateway.service"
    if [ -f "$service_file" ]; then
        if ! grep -q "OPENCLAW_GATEWAY_TOKEN" "$service_file" 2>/dev/null; then
            sed -i "/^\[Service\]/a Environment=OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}" "$service_file"
            systemctl --user daemon-reload 2>/dev/null || true
        fi
    fi
}

# Ensure gateway.mode=local is set in openclaw.json
set_openclaw_gateway_mode() {
    if [ -f "$OPENCLAW_CONFIG_PATH" ]; then
        if ! grep -q '"mode"' "$OPENCLAW_CONFIG_PATH" 2>/dev/null; then
            openclaw config set gateway.mode local 2>/dev/null || true
        fi
    fi
}

# Check if yoyo-ai onboarding has been completed
is_yoyo_onboarded() {
    [ -f "$OPENCLAW_ONBOARD_MARKER" ]
}

# Back up existing openclaw config from external/old installation
backup_openclaw_config() {
    if [ -f "$OPENCLAW_CONFIG_PATH" ]; then
        local backup="${OPENCLAW_CONFIG_PATH}.backup.$(date +%Y%m%d%H%M%S)"
        cp "$OPENCLAW_CONFIG_PATH" "$backup"
        echo "  Backed up existing config to $(basename "$backup")"
    fi
}

# Run full openclaw onboarding with token auth and daemon install
# Requires OPENCLAW_GATEWAY_TOKEN to be set (call ensure_openclaw_token first)
run_openclaw_onboard() {
    openclaw onboard \
        --non-interactive \
        --accept-risk \
        --flow quickstart \
        --mode local \
        --gateway-port "${OPENCLAW_PORT}" \
        --gateway-auth token \
        --gateway-token "${OPENCLAW_GATEWAY_TOKEN}" \
        --install-daemon 2>&1 | tail -3 || true

    # Patch systemd service with token if onboard created it
    patch_openclaw_systemd_service

    # Mark yoyo-ai onboarding as completed
    mkdir -p "$(dirname "$OPENCLAW_ONBOARD_MARKER")"
    date -Iseconds > "$OPENCLAW_ONBOARD_MARKER"
}

# Apply YoYo Dev AI theme to OpenClaw dashboard
apply_yoyo_theme() {
    local theme_inject_script="${YOYO_DEV_BASE_DIR}/setup/openclaw-theme/inject.sh"

    if [ ! -f "$theme_inject_script" ]; then
        echo -e "  \033[1;33m⚠ Theme script not found, skipping customization\033[0m" >&2
        return 0
    fi

    # Check if OpenClaw is installed
    if ! command -v openclaw &> /dev/null; then
        return 0
    fi

    # Run theme injection script silently
    if bash "$theme_inject_script" > /dev/null 2>&1; then
        echo -e "  \033[0;32m✓ YoYo Dev AI theme applied to dashboard\033[0m"
    else
        echo -e "  \033[1;33m⚠ Failed to apply theme (OpenClaw may need update)\033[0m" >&2
    fi
}

# Get network IP for LAN access
get_network_ip() {
    local ip=""

    # Method 1: ip route (most reliable on Linux)
    if command -v ip &> /dev/null; then
        ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    fi

    # Method 2: hostname -I (fallback)
    if [ -z "$ip" ] && command -v hostname &> /dev/null; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    # Method 3: ifconfig (macOS/older systems)
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    fi

    echo "$ip"
}

# Print dashboard URL (with token) to stdout
show_openclaw_dashboard_info() {
    local token=""
    if [ -f "$OPENCLAW_TOKEN_FILE" ]; then
        token="$(cat "$OPENCLAW_TOKEN_FILE")"
    fi

    local network_ip
    network_ip=$(get_network_ip)

    echo ""
    if [ -n "$token" ]; then
        echo -e "  \033[2mLocal:\033[0m   \033[0;36mhttp://localhost:${OPENCLAW_PORT}?token=${token}\033[0m"
        if [ -n "$network_ip" ]; then
            echo -e "  \033[2mNetwork:\033[0m \033[0;36mhttp://${network_ip}:${OPENCLAW_PORT}?token=${token}\033[0m"
        fi
    else
        echo -e "  \033[2mLocal:\033[0m   \033[0;36mhttp://localhost:${OPENCLAW_PORT}\033[0m"
        if [ -n "$network_ip" ]; then
            echo -e "  \033[2mNetwork:\033[0m \033[0;36mhttp://${network_ip}:${OPENCLAW_PORT}\033[0m"
        fi
    fi
    echo ""
}
