#!/bin/bash

# Yoyo Dev - Deprecated 'yoyo' command
# Use 'yoyo-dev' instead.

echo -e "\033[1;33m⚠\033[0m  '\033[1myoyo\033[0m' is deprecated and will be removed in a future version."
echo -e "   Use \033[1;32myoyo-dev\033[0m instead."
echo ""

# Forward to yoyo-dev (yoyo.sh)
SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

exec bash "$SCRIPT_DIR/yoyo.sh" "$@"
