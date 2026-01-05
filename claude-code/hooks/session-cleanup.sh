#!/usr/bin/env bash
#
# session-cleanup.sh - Clean up GUI processes when Claude Code session ends
#
# This hook is triggered by Claude Code's SessionEnd event.
# It terminates Yoyo GUI processes (Vite on 5173, API on 3456) that were
# started by yoyo.sh for the current project.
#
# Input: JSON via stdin (session_id, cwd, reason, etc.)
# Output: stderr only (for debugging)
# Exit: Always 0 (cleanup failures shouldn't block session end)

set -euo pipefail

# Redirect all output to stderr (hook should not produce stdout)
exec 1>&2

# Configuration
readonly GRACEFUL_WAIT=2  # Seconds to wait after SIGTERM
readonly PORTS=(5173 3456)  # Vite dev server and API server

# Get project directory from environment or fallback
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Log function (only outputs when DEBUG is set)
log() {
    if [ "${DEBUG:-}" = "1" ]; then
        echo "[session-cleanup] $*" >&2
    fi
}

log_warn() {
    echo "[session-cleanup] WARN: $*" >&2
}

log_error() {
    echo "[session-cleanup] ERROR: $*" >&2
}

# Calculate PID file path (must match yoyo-gui.sh logic)
get_pid_file() {
    local project_dir="$1"
    echo "/tmp/yoyo-gui-$(echo "$project_dir" | md5sum | cut -d' ' -f1).pid"
}

# Check if a process is running
is_process_running() {
    local pid="$1"
    kill -0 "$pid" 2>/dev/null
}

# Kill process gracefully, then forcefully if needed
kill_process() {
    local pid="$1"
    local name="${2:-process}"

    if ! is_process_running "$pid"; then
        log "$name (PID $pid) already terminated"
        return 0
    fi

    log "Sending SIGTERM to $name (PID $pid)"
    kill "$pid" 2>/dev/null || true

    # Wait for graceful termination
    local waited=0
    while [ $waited -lt $GRACEFUL_WAIT ]; do
        if ! is_process_running "$pid"; then
            log "$name terminated gracefully"
            return 0
        fi
        sleep 0.5
        waited=$((waited + 1))
    done

    # Force kill if still running
    if is_process_running "$pid"; then
        log "Sending SIGKILL to $name (PID $pid)"
        kill -9 "$pid" 2>/dev/null || true
    fi

    return 0
}

# Kill process tree (parent and all children)
kill_process_tree() {
    local pid="$1"
    local name="${2:-process}"

    if ! is_process_running "$pid"; then
        return 0
    fi

    # Get all child PIDs
    local children
    children=$(pgrep -P "$pid" 2>/dev/null || true)

    # Kill children first
    for child in $children; do
        kill_process "$child" "child of $name"
    done

    # Kill parent
    kill_process "$pid" "$name"
}

# Verify process belongs to Yoyo/Node.js (safety check)
is_yoyo_process() {
    local pid="$1"
    local cmdline

    # Read process cmdline
    if [ -f "/proc/$pid/cmdline" ]; then
        cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
    else
        cmdline=$(ps -p "$pid" -o args= 2>/dev/null || true)
    fi

    # Check if it's a Node.js/npm process related to Yoyo
    if echo "$cmdline" | grep -qE '(node|npm|npx|tsx|vite)'; then
        # Additional check: verify it's in a yoyo-dev context
        if echo "$cmdline" | grep -qiE '(yoyo|gui|server)'; then
            return 0
        fi
        # Check if working directory contains .yoyo-dev
        local cwd
        cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
        if [ -d "$cwd/.yoyo-dev" ]; then
            return 0
        fi
    fi

    return 1
}

# Find process on port (fallback method)
get_pid_on_port() {
    local port="$1"
    local pid

    # Try lsof first (most reliable)
    if command -v lsof &>/dev/null; then
        pid=$(lsof -ti ":$port" 2>/dev/null | head -1)
        if [ -n "$pid" ]; then
            echo "$pid"
            return 0
        fi
    fi

    # Fallback to ss
    if command -v ss &>/dev/null; then
        pid=$(ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K\d+' | head -1)
        if [ -n "$pid" ]; then
            echo "$pid"
            return 0
        fi
    fi

    # Fallback to netstat
    if command -v netstat &>/dev/null; then
        pid=$(netstat -tlnp 2>/dev/null | grep ":$port " | grep -oP '\d+(?=/)' | head -1)
        if [ -n "$pid" ]; then
            echo "$pid"
            return 0
        fi
    fi

    return 1
}

# Main cleanup using PID file
cleanup_via_pid_file() {
    local pid_file
    pid_file=$(get_pid_file "$PROJECT_DIR")

    if [ ! -f "$pid_file" ]; then
        log "PID file not found: $pid_file"
        return 1
    fi

    local pid
    pid=$(cat "$pid_file" 2>/dev/null || true)

    if [ -z "$pid" ]; then
        log_warn "PID file empty, removing"
        rm -f "$pid_file"
        return 1
    fi

    if ! is_process_running "$pid"; then
        log "Process $pid not running, cleaning up stale PID file"
        rm -f "$pid_file"
        return 1
    fi

    log "Found GUI process (PID $pid) from PID file"
    kill_process_tree "$pid" "GUI server"
    rm -f "$pid_file"

    log "GUI cleanup complete"
    return 0
}

# Fallback cleanup using port scanning
cleanup_via_ports() {
    log "Attempting port-based fallback cleanup"
    local cleaned=0

    for port in "${PORTS[@]}"; do
        local pid
        pid=$(get_pid_on_port "$port") || continue

        if [ -z "$pid" ]; then
            continue
        fi

        log "Found process on port $port (PID $pid)"

        # Safety check: verify it's a Yoyo process
        if is_yoyo_process "$pid"; then
            log "Confirmed Yoyo process, terminating"
            kill_process "$pid" "port $port server"
            cleaned=1
        else
            log_warn "Process on port $port (PID $pid) is not a Yoyo process, skipping"
        fi
    done

    if [ $cleaned -eq 1 ]; then
        log "Port-based cleanup complete"
    else
        log "No Yoyo processes found on monitored ports"
    fi

    return 0
}

# Main execution
main() {
    log "Session cleanup started for project: $PROJECT_DIR"

    # Read stdin (session info JSON) but don't require it
    # The hook receives JSON but we only need PROJECT_DIR
    cat > /dev/null 2>&1 || true

    # Try PID file method first
    if cleanup_via_pid_file; then
        exit 0
    fi

    # Fallback to port-based cleanup
    cleanup_via_ports

    exit 0
}

# Run main (always exit 0 to not block session end)
main "$@" || exit 0
