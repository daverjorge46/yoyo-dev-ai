# YoYo Dev AI Theme for OpenClaw

This directory contains custom branding assets and scripts to apply YoYo Dev AI styling to the OpenClaw control panel dashboard.

## Design Philosophy

**Minimal Branding Approach**: The theme adds YoYo Dev AI identity (orange/gold colors, JetBrains Mono typography) while preserving OpenClaw's native light/dark theme system. This ensures compatibility and prevents contrast issues.

## Files

- **`yoyo-theme.css`** - Minimal CSS (114 lines, 3.2KB) - branding only
- **`favicon.svg`** - Orange/gold gradient YoYo logo (SVG format)
- **`inject.sh`** - Script to apply theme to OpenClaw installation
- **`remove.sh`** - Script to restore OpenClaw defaults

## What the Theme Adds

### 🎨 Visual Branding
- **Typography**: JetBrains Mono with ligatures
- **Buttons**: Orange/gold gradient (`#E85D04` → `#D29922`)
- **Accents**: Orange links, focus states, active navigation
- **Identity**: "YoYo Dev AI" title + custom favicon

### ✅ What the Theme Preserves
- OpenClaw's light/dark mode switching
- All background colors (cards, panels, tables)
- All text colors and contrast ratios
- Component layouts and structure
- Native theme behavior

## Usage

### Automatic Application

The theme is automatically applied during:
1. Fresh installation (`setup/install.sh`)
2. OpenClaw updates (`yoyo-ai --update`)
3. Framework updates (`setup/yoyo-update.sh`)

### Manual Application

```bash
# Apply theme
bash setup/openclaw-theme/inject.sh
# OR
yoyo-ai --theme-apply

# Remove theme
bash setup/openclaw-theme/remove.sh
# OR
yoyo-ai --theme-remove

# Check status
yoyo-ai --doctor
```

## How It Works

1. **Backup**: Original `index.html` is backed up to `index.html.yoyo-backup`
2. **Copy Assets**: Theme CSS and logo files are copied to OpenClaw's `dist/control-ui/` directory
3. **Inject CSS**: CSS link is injected into `<head>` of `index.html`
4. **Update Title**: Page title is changed from "OpenClaw Control" to "YoYo Dev AI"
5. **Update Favicon**: Favicon references are updated to use YoYo logo

## Design System

### Colors

#### YoYo Branding (Applied to accents only)
- **Primary Orange**: `#E85D04`
- **Orange Hover**: `#fb923c`
- **Gold Accent**: `#D29922`
- **Gradient**: `linear-gradient(135deg, #E85D04 0%, #D29922 100%)`

#### Backgrounds & Text (Handled by OpenClaw)
- Light mode: OpenClaw's default light theme
- Dark mode: OpenClaw's default dark theme

### Typography

- **Font Family**: JetBrains Mono (with ligatures)
- **Weights**: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Features**: Ligatures enabled (`liga`, `calt`)

## Customization Strategy

The theme uses a **minimal CSS injection** approach:

**Advantages:**
- ✅ Non-breaking (OpenClaw functionality unchanged)
- ✅ Theme-compatible (works in both light and dark modes)
- ✅ Reversible (backup + removal script)
- ✅ Update-safe (re-apply after updates)
- ✅ Low maintenance (minimal CSS, no theme conflicts)
- ✅ Accessible (preserves OpenClaw's contrast ratios)

**What We Don't Override:**
- ❌ Background colors (cards, panels, tables)
- ❌ Text colors (body, headings, muted text)
- ❌ Border colors
- ❌ Component layouts
- ❌ Light/dark theme switching logic

**What We Do Override:**
- ✅ Font family (JetBrains Mono)
- ✅ Primary button gradients (orange/gold)
- ✅ Link colors (orange)
- ✅ Focus rings (orange)
- ✅ Active navigation states (orange)
- ✅ Badges (orange gradient)

## CSS Structure

```css
/* 1. Typography - JetBrains Mono */
* { font-family: "JetBrains Mono", ... }

/* 2. Gradient Buttons */
button[class*="Button_primary"] {
  background: linear-gradient(135deg, #E85D04 0%, #D29922 100%);
}

/* 3. Orange Accents */
a { color: #E85D04; }
*:focus-visible { outline: 2px solid #E85D04; }

/* 4. Let OpenClaw handle everything else */
```

## Troubleshooting

### Theme not visible after application

1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Verify files copied: `ls ~/.nvm/versions/node/*/lib/node_modules/openclaw/dist/control-ui/yoyo-theme.css`

### Theme removed after OpenClaw update

Run `yoyo-ai --theme-apply` to re-apply (should happen automatically via `yoyo-ai --update`)

### Buttons don't have gradient

Check browser console for CSS errors. Ensure the CSS file loaded properly.

### Light mode has contrast issues

This should not happen with the minimal approach - we don't override backgrounds or text colors. If you see issues, please report them as OpenClaw bugs, not theme bugs.

## Version Compatibility

Tested with:
- **OpenClaw**: v2026.1.30
- **Node.js**: 22+
- **Browsers**: Chrome/Edge 88+, Firefox 78+, Safari 14+

## Testing Checklist

### Both Light and Dark Modes
- [x] Gradient buttons visible and clickable
- [x] Orange focus rings on interactive elements
- [x] Orange links and active nav items
- [x] JetBrains Mono font applied
- [x] Page title shows "YoYo Dev AI"
- [x] Orange/gold favicon visible
- [x] No contrast issues
- [x] No layout breaks
- [x] Theme switcher works properly

## Performance

- CSS file size: 3.2K (gzips to ~1K)
- No runtime overhead
- Instant page load
- No FOUC (Flash of Unstyled Content)
- Minimal specificity conflicts

## Contributing

To update the theme:

1. Modify `yoyo-theme.css` (keep it minimal!)
2. Test with `bash inject.sh`
3. Verify in both light and dark modes
4. Test all pages: Config, Channels, Skills, Chat, Overview, Instances
5. Run `bash remove.sh` to test rollback
6. Commit changes

**Guidelines:**
- Keep CSS minimal (branding only)
- Don't override backgrounds or text colors
- Let OpenClaw handle theme switching
- Test in both light and dark modes
- Ensure WCAG AA accessibility

## License

Part of yoyo-dev-ai framework. See repository root for license.
