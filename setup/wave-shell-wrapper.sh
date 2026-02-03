#!/bin/bash
# Wave Shell Wrapper for Yoyo Dev
# This script is used as the default shell in Wave Terminal
# It automatically runs yoyo-cli in the project directory

# Clear terminal
clear

# Change to project directory if set
if [ -n "$YOYO_PROJECT_DIR" ] && [ -d "$YOYO_PROJECT_DIR" ]; then
    cd "$YOYO_PROJECT_DIR"
fi

# Run yoyo-cli if available, with fallback paths
# Priority: PATH → standard BASE → YOYO_BASE_DIR → claude → shell
if command -v yoyo-cli &>/dev/null; then
    exec yoyo-cli "$@"
elif [ -x "$HOME/.yoyo-dev/setup/yoyo-cli.sh" ]; then
    exec "$HOME/.yoyo-dev/setup/yoyo-cli.sh" "$@"
elif [ -n "${YOYO_BASE_DIR:-}" ] && [ -x "$YOYO_BASE_DIR/setup/yoyo-cli.sh" ]; then
    exec "$YOYO_BASE_DIR/setup/yoyo-cli.sh" "$@"
elif command -v claude &>/dev/null; then
    exec claude "$@"
else
    exec "${SHELL:-/bin/bash}" "$@"
fi
