#!/usr/bin/env bash
# remove.sh - Remove YoYo Dev AI theme from OpenClaw control panel
# Restores original OpenClaw branding and styling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}YoYo Dev AI - OpenClaw Theme Remover${NC}"
echo "========================================"
echo ""

# Detect OpenClaw installation path
if command -v npm &> /dev/null; then
    NPM_ROOT="$(npm root -g 2>/dev/null || echo "")"
    OPENCLAW_DIR="$NPM_ROOT/openclaw"
else
    echo -e "${RED}✗ Error: npm not found${NC}"
    exit 1
fi

# Verify OpenClaw is installed
if [ ! -d "$OPENCLAW_DIR" ]; then
    echo -e "${RED}✗ Error: OpenClaw not found at $OPENCLAW_DIR${NC}"
    exit 1
fi

CONTROL_UI_DIR="$OPENCLAW_DIR/dist/control-ui"
if [ ! -d "$CONTROL_UI_DIR" ]; then
    echo -e "${RED}✗ Error: OpenClaw control-ui directory not found${NC}"
    exit 1
fi

INDEX_HTML="$CONTROL_UI_DIR/index.html"
BACKUP_HTML="$CONTROL_UI_DIR/index.html.yoyo-backup"

echo -e "${GREEN}✓ OpenClaw installation found${NC}"
echo "  Location: $OPENCLAW_DIR"
echo ""

# Restore backup if it exists
if [ -f "$BACKUP_HTML" ]; then
    echo "Restoring original index.html from backup..."
    cp "$BACKUP_HTML" "$INDEX_HTML"
    echo -e "${GREEN}✓ index.html restored${NC}"

    # Remove backup file
    rm -f "$BACKUP_HTML"
    echo -e "${GREEN}✓ Backup file removed${NC}"
else
    echo -e "${YELLOW}⚠ No backup found - index.html may already be original${NC}"
fi

# Remove custom theme files
echo ""
echo "Removing YoYo theme files..."

if [ -f "$CONTROL_UI_DIR/yoyo-theme.css" ]; then
    rm -f "$CONTROL_UI_DIR/yoyo-theme.css"
    echo -e "${GREEN}✓ Removed yoyo-theme.css${NC}"
fi

if [ -f "$CONTROL_UI_DIR/favicon.svg" ]; then
    # Only remove if it's our custom one (basic check)
    if grep -q "E85D04" "$CONTROL_UI_DIR/favicon.svg" 2>/dev/null; then
        rm -f "$CONTROL_UI_DIR/favicon.svg"
        echo -e "${GREEN}✓ Removed custom favicon.svg${NC}"
    fi
fi

if [ -f "$CONTROL_UI_DIR/favicon-32.png" ]; then
    rm -f "$CONTROL_UI_DIR/favicon-32.png"
    echo -e "${GREEN}✓ Removed favicon-32.png${NC}"
fi

if [ -f "$CONTROL_UI_DIR/apple-touch-icon.png" ]; then
    rm -f "$CONTROL_UI_DIR/apple-touch-icon.png"
    echo -e "${GREEN}✓ Removed apple-touch-icon.png${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "✓ YoYo Dev AI theme removed successfully!"
echo -e "==========================================${NC}"
echo ""
echo "OpenClaw dashboard has been restored to defaults."
echo ""
echo "To re-apply the YoYo theme:"
echo -e "  ${BLUE}bash setup/openclaw-theme/inject.sh${NC}"
echo -e "  ${BLUE}yoyo-ai --theme-apply${NC}"
echo ""
