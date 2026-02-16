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
# Yoyo Claw (yoyo-ai) Shared Helpers
# ============================================================================

# Yoyo Claw configuration (canonical home: ~/.yoyo-claw, ~/.openclaw is symlink)
YOYO_CLAW_HOME="${YOYO_CLAW_HOME:-$HOME/.yoyo-claw}"
YOYO_CLAW_PORT="${YOYO_CLAW_PORT:-18789}"
YOYO_CLAW_TOKEN_FILE="$YOYO_CLAW_HOME/.gateway-token"
YOYO_CLAW_CONFIG_PATH="$YOYO_CLAW_HOME/yoyoclaw.json"
YOYO_CLAW_ONBOARD_MARKER="$YOYO_CLAW_HOME/.yoyo-onboarded"

# Resolve the yoyo-claw source directory
# Prefers YOYO_CLAW_DIR env, then looks relative to this script
_resolve_yoyo_claw_dir() {
    if [ -n "${YOYO_CLAW_DIR:-}" ]; then
        echo "$YOYO_CLAW_DIR"
        return 0
    fi
    # Determine script directory if not set
    local sdir
    if [ -n "${SCRIPT_DIR:-}" ]; then
        sdir="$SCRIPT_DIR"
    elif [ -n "${BASH_SOURCE[0]:-}" ]; then
        local spath="${BASH_SOURCE[0]}"
        [ -L "$spath" ] && spath="$(readlink -f "$spath")"
        sdir="$(cd "$(dirname "$spath")" && pwd)"
    else
        sdir="$(pwd)"
    fi
    # yoyoclaw lives next to setup/ in the repo root
    local candidate="$(cd "$sdir/.." && pwd)/yoyoclaw"
    if [ -d "$candidate" ]; then
        echo "$candidate"
        return 0
    fi
    # Also check base installation dir
    local base="${YOYO_BASE_DIR:-$HOME/.yoyo-dev}"
    if [ -d "$base/yoyoclaw" ]; then
        echo "$base/yoyoclaw"
        return 0
    fi
    return 1
}

# Resolve the yoyo-claw binary (node entry point)
_resolve_yoyo_claw_bin() {
    local claw_dir
    claw_dir="$(_resolve_yoyo_claw_dir)" || return 1
    echo "$claw_dir/yoyoclaw.mjs"
}

# Run yoyo-claw CLI command (replaces global `openclaw` binary)
yoyo_claw() {
    local bin
    bin="$(_resolve_yoyo_claw_bin)" || {
        echo "ERROR: yoyo-claw source not found" >&2
        return 1
    }
    node "$bin" "$@"
}

# Build yoyo-claw from source
build_yoyo_claw() {
    local claw_dir
    claw_dir="$(_resolve_yoyo_claw_dir)" || {
        echo "ERROR: yoyo-claw source not found" >&2
        return 1
    }

    # Ensure pnpm via corepack
    if ! command -v pnpm &>/dev/null; then
        corepack enable pnpm 2>/dev/null || {
            echo "ERROR: corepack not available — install pnpm manually" >&2
            return 1
        }
    fi

    # Build from source
    (cd "$claw_dir" && pnpm install --frozen-lockfile && pnpm build)
}

# Check if yoyo-claw is built (dist/ exists)
is_yoyo_claw_built() {
    local claw_dir
    claw_dir="$(_resolve_yoyo_claw_dir)" || return 1
    [ -d "$claw_dir/dist" ]
}

# Migrate ~/.yoyo-ai or ~/.openclaw -> ~/.yoyo-claw
migrate_yoyo_claw_home() {
    # Step 1: Move ~/.yoyo-ai -> ~/.yoyo-claw (if real dir and target missing)
    if [ -d "$HOME/.yoyo-ai" ] && [ ! -L "$HOME/.yoyo-ai" ] && [ ! -d "$YOYO_CLAW_HOME" ]; then
        mv "$HOME/.yoyo-ai" "$YOYO_CLAW_HOME" 2>/dev/null && \
            echo "[migrate] Moved ~/.yoyo-ai -> $YOYO_CLAW_HOME" >&2
    fi
    # Step 2: Move ~/.openclaw -> ~/.yoyo-claw (if real dir and target missing)
    if [ -d "$HOME/.openclaw" ] && [ ! -L "$HOME/.openclaw" ] && [ ! -d "$YOYO_CLAW_HOME" ]; then
        mv "$HOME/.openclaw" "$YOYO_CLAW_HOME" 2>/dev/null && \
            echo "[migrate] Moved ~/.openclaw -> $YOYO_CLAW_HOME" >&2
    fi
    # Step 3: Ensure ~/.yoyo-claw exists
    mkdir -p "$YOYO_CLAW_HOME"
    # Step 4: Fallback - if config missing in ~/.yoyo-claw, copy from ~/.openclaw
    if [ ! -f "$YOYO_CLAW_CONFIG_PATH" ] && [ -d "$HOME/.openclaw" ] && [ ! -L "$HOME/.openclaw" ]; then
        if [ -f "$HOME/.openclaw/openclaw.json" ]; then
            cp -a "$HOME/.openclaw/." "$YOYO_CLAW_HOME/" 2>/dev/null && \
                echo "[migrate] Copied ~/.openclaw contents -> $YOYO_CLAW_HOME" >&2
        fi
    fi
    # Step 4b: Rename openclaw.json → yoyoclaw.json within ~/.yoyo-claw
    if [ -f "$YOYO_CLAW_HOME/openclaw.json" ] && [ ! -f "$YOYO_CLAW_HOME/yoyoclaw.json" ]; then
        mv "$YOYO_CLAW_HOME/openclaw.json" "$YOYO_CLAW_HOME/yoyoclaw.json"
        echo "[migrate] Renamed openclaw.json -> yoyoclaw.json" >&2
    fi
    # Step 5: Replace real ~/.openclaw dir with symlink (after migration)
    if [ -d "$HOME/.openclaw" ] && [ ! -L "$HOME/.openclaw" ]; then
        # Config is now in ~/.yoyo-claw, replace real dir with symlink
        rm -rf "$HOME/.openclaw"
        ln -sf "$YOYO_CLAW_HOME" "$HOME/.openclaw"
    elif [ ! -e "$HOME/.openclaw" ]; then
        ln -sf "$YOYO_CLAW_HOME" "$HOME/.openclaw"
    fi
    # Step 6: Create ~/.yoyo-ai symlink for backwards compat
    if [ ! -e "$HOME/.yoyo-ai" ]; then
        ln -sf "$YOYO_CLAW_HOME" "$HOME/.yoyo-ai"
    fi
    # Step 7: Set file permissions
    chmod 700 "$YOYO_CLAW_HOME" 2>/dev/null || true
    [ -f "$YOYO_CLAW_CONFIG_PATH" ] && chmod 600 "$YOYO_CLAW_CONFIG_PATH" 2>/dev/null || true
    [ -f "$YOYO_CLAW_TOKEN_FILE" ] && chmod 600 "$YOYO_CLAW_TOKEN_FILE" 2>/dev/null || true
}

# Generate or load a persistent gateway token
# Prefers token from yoyoclaw.json config (set by onboarding), syncs to .gateway-token file.
# Exports YOYO_CLAW_GATEWAY_TOKEN (and YOYOCLAW_GATEWAY_TOKEN + OPENCLAW_GATEWAY_TOKEN for compat)
ensure_yoyo_claw_token() {
    local config_token=""

    # Prefer token from config (source of truth, set during onboarding/doctor)
    if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
        config_token="$(yoyo_claw config get gateway.auth.token 2>/dev/null || echo "")"
        # Filter out "undefined" or empty responses
        if [ "$config_token" = "undefined" ] || [ -z "$config_token" ]; then
            config_token=""
        fi
    fi

    if [ -n "$config_token" ]; then
        # Use config token and sync to .gateway-token file
        YOYO_CLAW_GATEWAY_TOKEN="$config_token"
        mkdir -p "$(dirname "$YOYO_CLAW_TOKEN_FILE")"
        echo "$config_token" > "$YOYO_CLAW_TOKEN_FILE"
        chmod 600 "$YOYO_CLAW_TOKEN_FILE"
    elif [ -f "$YOYO_CLAW_TOKEN_FILE" ]; then
        # Fall back to .gateway-token file
        YOYO_CLAW_GATEWAY_TOKEN="$(cat "$YOYO_CLAW_TOKEN_FILE")"
        # Sync token back to config if config exists but token is missing
        if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
            yoyo_claw config set gateway.auth.token "$YOYO_CLAW_GATEWAY_TOKEN" 2>/dev/null || true
        fi
    else
        # Generate a new token
        local token
        token="yoyo-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
        mkdir -p "$(dirname "$YOYO_CLAW_TOKEN_FILE")"
        echo "$token" > "$YOYO_CLAW_TOKEN_FILE"
        chmod 600 "$YOYO_CLAW_TOKEN_FILE"
        YOYO_CLAW_GATEWAY_TOKEN="$token"
        # Also set in config
        if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
            yoyo_claw config set gateway.auth.token "$token" 2>/dev/null || true
        fi
    fi
    export YOYO_CLAW_GATEWAY_TOKEN
    # Export under branded and legacy names for compatibility
    export YOYOCLAW_GATEWAY_TOKEN="$YOYO_CLAW_GATEWAY_TOKEN"
    export OPENCLAW_GATEWAY_TOKEN="$YOYO_CLAW_GATEWAY_TOKEN"
}

# Inject gateway token into systemd service file if missing, then daemon-reload
patch_yoyo_claw_systemd_service() {
    # Skip if systemd is not available (e.g., WSL without systemd)
    if ! has_systemd; then
        return 0
    fi
    # Check both new and legacy service names
    local service_file=""
    for candidate in \
        "$HOME/.config/systemd/user/yoyoclaw-gateway.service" \
        "$HOME/.config/systemd/user/yoyo-claw-gateway.service" \
        "$HOME/.config/systemd/user/openclaw-gateway.service"; do
        if [ -f "$candidate" ]; then
            service_file="$candidate"
            break
        fi
    done
    if [ -n "$service_file" ]; then
        if ! grep -q "YOYOCLAW_GATEWAY_TOKEN" "$service_file" 2>/dev/null; then
            sed -i "/^\[Service\]/a Environment=YOYOCLAW_GATEWAY_TOKEN=${YOYO_CLAW_GATEWAY_TOKEN}" "$service_file"
            systemctl --user daemon-reload 2>/dev/null || true
        fi
    fi
}

# Ensure gateway.mode=local is set in yoyoclaw.json
set_yoyo_claw_gateway_mode() {
    if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
        # Check for gateway.mode specifically (not auth.mode which is a different field)
        local current_mode
        current_mode="$(yoyo_claw config get gateway.mode 2>/dev/null || echo "")"
        if [ -z "$current_mode" ] || [ "$current_mode" = "undefined" ]; then
            yoyo_claw config set gateway.mode local 2>/dev/null || true
        fi
    fi
}

# Check if yoyo-ai onboarding has been completed
is_yoyo_onboarded() {
    [ -f "$YOYO_CLAW_ONBOARD_MARKER" ]
}

# Back up existing config
backup_yoyo_claw_config() {
    if [ -f "$YOYO_CLAW_CONFIG_PATH" ]; then
        local backup="${YOYO_CLAW_CONFIG_PATH}.backup.$(date +%Y%m%d%H%M%S)"
        cp "$YOYO_CLAW_CONFIG_PATH" "$backup"
        echo "  Backed up existing config to $(basename "$backup")"
    fi
}

# Run full onboarding with token auth and daemon install
# Requires YOYO_CLAW_GATEWAY_TOKEN to be set (call ensure_yoyo_claw_token first)
run_yoyo_claw_onboard() {
    yoyo_claw onboard \
        --non-interactive \
        --accept-risk \
        --flow quickstart \
        --mode local \
        --gateway-port "${YOYO_CLAW_PORT}" \
        --gateway-auth token \
        --gateway-token "${YOYO_CLAW_GATEWAY_TOKEN}" \
        --install-daemon 2>&1 | tail -3 || true

    # Patch systemd service with token if onboard created it
    patch_yoyo_claw_systemd_service

    # Mark yoyo-ai onboarding as completed
    mkdir -p "$(dirname "$YOYO_CLAW_ONBOARD_MARKER")"
    date -Iseconds > "$YOYO_CLAW_ONBOARD_MARKER"
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
show_yoyo_claw_dashboard_info() {
    local token=""
    if [ -f "$YOYO_CLAW_TOKEN_FILE" ]; then
        token="$(cat "$YOYO_CLAW_TOKEN_FILE")"
    fi

    local network_ip
    network_ip=$(get_network_ip)

    echo ""
    if [ -n "$token" ]; then
        echo -e "  \033[2mLocal:\033[0m   \033[0;36mhttp://localhost:${YOYO_CLAW_PORT}?token=${token}\033[0m"
        if [ -n "$network_ip" ]; then
            echo -e "  \033[2mNetwork:\033[0m \033[0;36mhttp://${network_ip}:${YOYO_CLAW_PORT}?token=${token}\033[0m"
        fi
    else
        echo -e "  \033[2mLocal:\033[0m   \033[0;36mhttp://localhost:${YOYO_CLAW_PORT}\033[0m"
        if [ -n "$network_ip" ]; then
            echo -e "  \033[2mNetwork:\033[0m \033[0;36mhttp://${network_ip}:${YOYO_CLAW_PORT}\033[0m"
        fi
    fi
    echo ""

}

# Legacy aliases for backwards compatibility
ensure_openclaw_token() { ensure_yoyo_claw_token; }
patch_openclaw_systemd_service() { patch_yoyo_claw_systemd_service; }
set_openclaw_gateway_mode() { set_yoyo_claw_gateway_mode; }
backup_openclaw_config() { backup_yoyo_claw_config; }
run_openclaw_onboard() { run_yoyo_claw_onboard; }
show_openclaw_dashboard_info() { show_yoyo_claw_dashboard_info; }
