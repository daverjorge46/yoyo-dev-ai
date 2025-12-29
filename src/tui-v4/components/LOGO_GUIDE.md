# Yoyo Dev Spiral Logo Guide

## Overview

The Yoyo Dev logo features a **spiral design** symbolizing continuous iteration, growth, and the cyclical nature of development. The spiral metaphor represents:
- **Iterative development** - Building in cycles, improving with each iteration
- **Growth and evolution** - Starting from a central point and expanding outward
- **Continuous learning** - The journey never ends, always spiraling forward

---

## ASCII Versions (Terminal/TUI)

### Compact Logo (Header Use)

**Primary Design:**
```
◉◎○ Yoyo Dev
```

**Color:** `#89b4fa` (Catppuccin Mocha Blue - Primary)

**Alternative Designs:**
```
⊚⊙○ Yoyo Dev    (Double circle to single)
◉⟲ Yoyo Dev     (Spiral with circular arrow)
◉◠◡ Yoyo Dev    (Spiral with curves)
◉∿∾ Yoyo Dev    (Spiral with waves)
⊛⊚⊙ Yoyo Dev    (Decreasing circles)
```

### Minimal Logo (Icon Only)

```
◉
```

Used when space is limited (buttons, status indicators, etc.)

### Full Logo (Splash Screen)

```
╭─◉─╮
│ ◎ │
╰─○─╯

Yoyo Dev
```

---

## GUI/Web Versions

### SVG Spiral Design Specifications

**Concept:** A smooth, flowing spiral that starts tight and expands outward.

#### Design Parameters:

- **Shape:** Archimedean spiral (constant spacing between turns)
- **Rotation:** 3-4 complete rotations
- **Direction:** Clockwise expansion (representing forward progress)
- **Stroke:** Gradient from solid (center) to lighter (outer edges)

#### Colors (Catppuccin Mocha Theme):

- **Primary:** `#89b4fa` (Blue)
- **Gradient End:** `#b4befe` (Lavender)
- **Accent:** `#74c7ec` (Sapphire)
- **Background (Dark):** `#1e1e2e`
- **Background (Light):** `#eff1f5`

#### Size Variants:

| Use Case | Size | Format |
|----------|------|--------|
| Favicon | 16x16, 32x32 | ICO/PNG |
| App Icon | 64x64, 128x128, 256x256 | PNG |
| Header Logo | 40x40 | SVG |
| Hero Logo | 200x200 | SVG |
| Full Splash | 400x400 | SVG |

---

## Implementation Examples

### React (TSX/JSX)

```tsx
// Terminal (Ink component)
import { Logo } from './components/Logo';

<Logo variant="compact" showText={true} />
```

### Web (React)

```tsx
// Placeholder for future GUI implementation
export const WebLogo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Spiral path */}
      <path
        d="M50,50 Q50,30 60,30 T70,40 Q70,60 60,70 T40,70 Q30,70 30,50"
        fill="none"
        stroke="#89b4fa"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="#89b4fa" />
    </svg>
  );
};
```

### CSS (Icon Font - Future)

```css
.yoyo-logo::before {
  content: "◉";
  font-size: 1.5em;
  color: #89b4fa;
}
```

---

## Usage Guidelines

### Do's ✓

- **Maintain aspect ratio** - Never stretch or distort the spiral
- **Use approved colors** - Stick to Catppuccin Mocha palette
- **Ensure visibility** - Maintain contrast against background (min 4.5:1 ratio)
- **Keep spacing consistent** - Minimum clearspace = 1/4 of logo height around all sides

### Don'ts ✗

- **Don't rotate** - The spiral is designed with a specific orientation
- **Don't add effects** - No drop shadows, outlines, or glows (keep it clean)
- **Don't alter proportions** - Maintain the spiral's mathematical accuracy
- **Don't mix variants** - Use one variant per context (compact OR full, not both)

---

## Accessibility

### Alt Text Examples:

- **Compact:** "Yoyo Dev spiral logo"
- **Full:** "Yoyo Dev spiral logo with text"
- **Icon Only:** "Yoyo Dev logo"

### High Contrast Mode:

When `prefers-contrast: high` is detected, use solid colors instead of gradients:
- **Light background:** Black spiral (`#11111b`)
- **Dark background:** White spiral (`#eff1f5`)

---

## File Naming Convention

```
yoyo-logo-{variant}-{size}.{format}

Examples:
- yoyo-logo-compact-40px.svg
- yoyo-logo-full-200px.png
- yoyo-logo-icon-64px.ico
```

---

## Future Enhancements

### Animated Logo (Loading States)

```
◉     →    ◎     →    ○     →    ◉
(Rotating spiral animation, 1.5s loop)
```

### Interactive Logo (Hover/Click)

- **Hover:** Gentle rotation (5° clockwise)
- **Click:** Full 360° spin animation
- **Loading:** Pulsing spiral from center outward

---

## Logo Component Location

**TUI:** `src/tui-v4/components/Logo.tsx`
**GUI:** (To be created) `gui/client/src/components/Logo.tsx`

**Theme Colors:** `src/tui-v4/theme/colors.ts`

---

## Contact

For logo design updates or questions, refer to:
- Design System: `.yoyo-dev/standards/design-system.md`
- Color Palette: `src/tui-v4/theme/colors.ts`
