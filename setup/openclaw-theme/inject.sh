#!/usr/bin/env bash
# inject.sh - Apply YoYo Dev AI theme to OpenClaw control panel
# Part of yoyo-dev-ai framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (setup/openclaw-theme)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_DIR="$SCRIPT_DIR"

echo -e "${BLUE}YoYo Dev AI - OpenClaw Theme Installer${NC}"
echo "=========================================="
echo ""

# Detect OpenClaw installation path
if command -v npm &> /dev/null; then
    NPM_ROOT="$(npm root -g 2>/dev/null || echo "")"
    OPENCLAW_DIR="$NPM_ROOT/openclaw"
else
    echo -e "${RED}✗ Error: npm not found${NC}"
    echo "  OpenClaw requires Node.js and npm to be installed"
    exit 1
fi

# Verify OpenClaw is installed
if [ ! -d "$OPENCLAW_DIR" ]; then
    echo -e "${RED}✗ Error: OpenClaw not found${NC}"
    echo "  Expected location: $OPENCLAW_DIR"
    echo "  Install with: npm install -g openclaw"
    exit 1
fi

# Locate control-ui directory
CONTROL_UI_DIR="$OPENCLAW_DIR/dist/control-ui"
if [ ! -d "$CONTROL_UI_DIR" ]; then
    echo -e "${RED}✗ Error: OpenClaw control-ui directory not found${NC}"
    echo "  Expected: $CONTROL_UI_DIR"
    echo "  OpenClaw installation may be incomplete"
    exit 1
fi

INDEX_HTML="$CONTROL_UI_DIR/index.html"
if [ ! -f "$INDEX_HTML" ]; then
    echo -e "${RED}✗ Error: OpenClaw index.html not found${NC}"
    echo "  Expected: $INDEX_HTML"
    exit 1
fi

echo -e "${GREEN}✓ OpenClaw installation found${NC}"
echo "  Location: $OPENCLAW_DIR"
echo ""

# Backup original index.html (only if not already backed up)
BACKUP_HTML="$CONTROL_UI_DIR/index.html.yoyo-backup"
if [ ! -f "$BACKUP_HTML" ]; then
    echo "Creating backup of index.html..."
    cp "$INDEX_HTML" "$BACKUP_HTML"
    echo -e "${GREEN}✓ Backup created: index.html.yoyo-backup${NC}"
else
    echo -e "${YELLOW}⚠ Backup already exists, skipping${NC}"
fi

# Copy theme CSS
echo ""
echo "Installing YoYo theme files..."
cp "$THEME_DIR/yoyo-theme.css" "$CONTROL_UI_DIR/"
echo -e "${GREEN}✓ Copied yoyo-theme.css${NC}"

# Copy favicon (SVG)
if [ -f "$THEME_DIR/favicon.svg" ]; then
    cp "$THEME_DIR/favicon.svg" "$CONTROL_UI_DIR/"
    echo -e "${GREEN}✓ Copied favicon.svg${NC}"
fi

# Copy PNG favicons if they exist
if [ -f "$THEME_DIR/favicon-32.png" ]; then
    cp "$THEME_DIR/favicon-32.png" "$CONTROL_UI_DIR/"
    echo -e "${GREEN}✓ Copied favicon-32.png${NC}"
fi

if [ -f "$THEME_DIR/apple-touch-icon.png" ]; then
    cp "$THEME_DIR/apple-touch-icon.png" "$CONTROL_UI_DIR/"
    echo -e "${GREEN}✓ Copied apple-touch-icon.png${NC}"
fi

# Inject CSS link into index.html (if not already present)
if grep -q "yoyo-theme.css" "$INDEX_HTML"; then
    echo -e "${YELLOW}⚠ Theme CSS already linked in index.html${NC}"
else
    echo ""
    echo "Injecting CSS link into index.html..."
    # Use sed to inject before </head> tag
    sed -i.tmp '/<\/head>/i\    <link rel="stylesheet" href="./yoyo-theme.css">' "$INDEX_HTML"
    rm -f "$INDEX_HTML.tmp"
    echo -e "${GREEN}✓ CSS link injected${NC}"
fi

# Replace title tag
if grep -q "<title>YoYo Dev AI</title>" "$INDEX_HTML"; then
    echo -e "${YELLOW}⚠ Title already updated${NC}"
else
    echo "Updating page title..."
    sed -i.tmp 's/<title>OpenClaw Control<\/title>/<title>YoYo Dev AI<\/title>/g' "$INDEX_HTML"
    sed -i.tmp 's/<title>openclaw<\/title>/<title>YoYo Dev AI<\/title>/g' "$INDEX_HTML"
    rm -f "$INDEX_HTML.tmp"
    echo -e "${GREEN}✓ Title updated to 'YoYo Dev AI'${NC}"
fi

# Update favicon links (if they exist in HTML)
if grep -q "favicon" "$INDEX_HTML"; then
    echo "Updating favicon references..."
    sed -i.tmp 's/href="[^"]*favicon[^"]*\.ico"/href=".\/favicon.svg"/g' "$INDEX_HTML"
    sed -i.tmp 's/href="[^"]*favicon[^"]*\.png"/href=".\/favicon.svg"/g' "$INDEX_HTML"
    rm -f "$INDEX_HTML.tmp"
    echo -e "${GREEN}✓ Favicon references updated${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "✓ YoYo Dev AI theme applied successfully!"
echo -e "==========================================${NC}"
echo ""
echo "The OpenClaw dashboard now uses YoYo branding and colors."
echo ""
echo "To revert to OpenClaw defaults:"
echo -e "  ${BLUE}bash setup/openclaw-theme/remove.sh${NC}"
echo -e "  ${BLUE}yoyo-ai --theme-remove${NC}"
echo ""
