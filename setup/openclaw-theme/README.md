# YoYo Dev AI Theme for OpenClaw

This directory contains custom branding assets and scripts to apply YoYo Dev AI styling to the OpenClaw control panel dashboard.

## Files

- **`yoyo-theme.css`** - Custom CSS overrides (colors, fonts, branding)
- **`favicon.svg`** - Orange/gold gradient YoYo logo (SVG format)
- **`inject.sh`** - Script to apply theme to OpenClaw installation
- **`remove.sh`** - Script to restore OpenClaw defaults

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

- **Primary Orange**: `#E85D04`
- **Gold Accent**: `#D29922`
- **Gradient**: `linear-gradient(135deg, #E85D04 0%, #D29922 100%)`

### Backgrounds (Dark Theme)

- **Base**: `#0d1117`
- **Accent**: `#161b22`
- **Card Hover**: `#21262d`

### Typography

- **Font Family**: JetBrains Mono (with ligatures)
- **Weights**: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)

## Customization Strategy

The theme uses CSS injection rather than modifying OpenClaw source code:

**Advantages:**
- ✅ Non-breaking (OpenClaw functionality unchanged)
- ✅ Reversible (backup + removal script)
- ✅ Update-safe (re-apply after updates)
- ✅ Low maintenance (clear separation of customizations)

**Trade-offs:**
- ⚠️ Some bundled text may remain "OpenClaw" (React components)
- ⚠️ Major OpenClaw UI changes may require CSS updates

## PNG Favicons

The current implementation uses SVG favicon only. To generate PNG favicons:

```bash
# Using ImageMagick (if installed)
convert -background none -size 32x32 favicon.svg favicon-32.png
convert -background none -size 180x180 favicon.svg apple-touch-icon.png

# Using Inkscape (if installed)
inkscape -w 32 -h 32 favicon.svg -o favicon-32.png
inkscape -w 180 -h 180 favicon.svg -o apple-touch-icon.png

# Using online converter
# Upload favicon.svg to https://cloudconvert.com/svg-to-png
```

Once generated, place `favicon-32.png` and `apple-touch-icon.png` in this directory. The injection script will automatically copy them if they exist.

## Troubleshooting

### Theme not visible after application

1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for CSS errors
4. Verify files copied: `ls ~/.nvm/versions/node/*/lib/node_modules/openclaw/dist/control-ui/yoyo-theme.css`

### Theme removed after OpenClaw update

Run `yoyo-ai --theme-apply` to re-apply (should happen automatically via `yoyo-ai --update`)

### Original OpenClaw styling still visible

Some elements may be in Shadow DOM or dynamically generated. The CSS uses high-specificity selectors and `!important` flags, but 100% coverage is not guaranteed.

## Version Compatibility

Tested with:
- **OpenClaw**: v0.1.x - v0.3.x
- **Node.js**: 22+

For issues with newer OpenClaw versions, CSS selectors may need updating to match new HTML structure.

## Contributing

To update the theme:

1. Modify `yoyo-theme.css`
2. Test with `bash inject.sh`
3. Verify in browser at `http://127.0.0.1:18789?token=<token>`
4. Run `bash remove.sh` to test rollback
5. Commit changes

## License

Part of yoyo-dev-ai framework. See repository root for license.
