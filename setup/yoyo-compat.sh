#!/bin/bash

# Yoyo Dev Compatibility Wrapper
# Deprecated: use 'yoyo-dev' instead of 'yoyo'

echo -e "\033[1;33m⚠\033[0m  \033[2m'yoyo' is deprecated. Use 'yoyo-dev' instead.\033[0m"
echo ""

# Resolve to the actual yoyo.sh (yoyo-dev) script
SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

exec bash "$SCRIPT_DIR/yoyo.sh" "$@"
