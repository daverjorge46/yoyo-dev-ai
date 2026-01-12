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

# Run yoyo-cli if available, otherwise run claude, otherwise fall back to regular shell
if command -v yoyo-cli &>/dev/null; then
    exec yoyo-cli "$@"
elif command -v claude &>/dev/null; then
    exec claude "$@"
else
    # Fall back to default shell
    exec "${SHELL:-/bin/bash}" "$@"
fi
