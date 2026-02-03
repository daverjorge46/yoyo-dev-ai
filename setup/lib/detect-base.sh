#!/usr/bin/env bash
# Shared base installation detection and migration
# Source this file — do not execute directly

# Canonical base installation directory
DEFAULT_BASE_DIR="$HOME/.yoyo-dev"
YOYO_BASE_DIR="${YOYO_BASE_DIR:-$DEFAULT_BASE_DIR}"

# Legacy paths that trigger migration
_LEGACY_BASE_1="$HOME/.yoyo-dev-base"
_LEGACY_BASE_2="$HOME/yoyo-dev"

# Validate a directory looks like a yoyo-dev base installation
_is_valid_base() {
    [ -d "$1/instructions" ] && [ -d "$1/standards" ]
}

# Migrate legacy base paths to ~/.yoyo-dev (idempotent)
migrate_legacy_paths() {
    # Skip if canonical location already exists and is valid
    if _is_valid_base "$DEFAULT_BASE_DIR"; then
        return 0
    fi

    # Migrate ~/.yoyo-dev-base -> ~/.yoyo-dev
    if [ -d "$_LEGACY_BASE_1" ] && _is_valid_base "$_LEGACY_BASE_1"; then
        mv "$_LEGACY_BASE_1" "$DEFAULT_BASE_DIR" 2>/dev/null && \
            echo "[migrate] Moved $_LEGACY_BASE_1 -> $DEFAULT_BASE_DIR" >&2
        return 0
    fi

    # Migrate ~/yoyo-dev -> ~/.yoyo-dev
    if [ -d "$_LEGACY_BASE_2" ] && _is_valid_base "$_LEGACY_BASE_2"; then
        mv "$_LEGACY_BASE_2" "$DEFAULT_BASE_DIR" 2>/dev/null && \
            echo "[migrate] Moved $_LEGACY_BASE_2 -> $DEFAULT_BASE_DIR" >&2
        return 0
    fi

    return 1
}

# Detect base installation, returning the path on stdout
# Runs migration automatically if needed
detect_base_installation() {
    # 1. Check YOYO_BASE_DIR (env override or default ~/.yoyo-dev)
    if _is_valid_base "$YOYO_BASE_DIR"; then
        echo "$YOYO_BASE_DIR"
        return 0
    fi

    # 2. Check canonical path explicitly (covers case where YOYO_BASE_DIR was overridden)
    if _is_valid_base "$DEFAULT_BASE_DIR"; then
        echo "$DEFAULT_BASE_DIR"
        return 0
    fi

    # 3. Try migrating legacy paths
    if migrate_legacy_paths && _is_valid_base "$DEFAULT_BASE_DIR"; then
        YOYO_BASE_DIR="$DEFAULT_BASE_DIR"
        echo "$DEFAULT_BASE_DIR"
        return 0
    fi

    return 1
}
