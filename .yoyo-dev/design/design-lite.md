# Yoyo Dev Design System (Lite)

Terminal-inspired design system for Claude Code-style interface.

## Quick Reference

### Colors (Dark Mode Priority)

**Brand (Yellow):**
- `text-brand` / `bg-brand` - Primary accent (#f59e0b)
- `text-brand-light` / `bg-brand-light` - Hover (#fbbf24)
- `text-brand-dark` / `bg-brand-dark` - Active (#d97706)

**Semantic:**
- `terminal-green` - Success (#4ade80)
- `terminal-yellow` - Warning (#fbbf24)
- `terminal-red` - Error (#f87171)
- `terminal-blue` - Info (#60a5fa)
- `terminal-cyan` - Accent (#22d3ee)
- `terminal-magenta` - Special (#e879f9)

**Surfaces:**
- `terminal-bg` - Background (#0a0a0a)
- `terminal-card` - Cards (#171717)
- `terminal-elevated` - Elevated (#262626)
- `terminal-border` - Borders (#3f3f46)

**Text:**
- `terminal-text` - Primary (#fafafa)
- `terminal-text-secondary` - Secondary (#a1a1aa)
- `terminal-text-muted` - Muted (#71717a)

### Typography

Font: JetBrains Mono (monospace throughout)

- `text-xs` - 11px
- `text-sm` - 13px
- `text-base` - 14px
- `text-lg` - 16px
- `text-xl` - 18px

### Component Classes

**Cards:**
- `.terminal-card` - Base card
- `.terminal-card-hover` - Hoverable card
- `.terminal-card-interactive` - Clickable card

**Buttons:**
- `.terminal-btn-primary` - Yellow bg, dark text
- `.terminal-btn-secondary` - Gray bg, border
- `.terminal-btn-ghost` - Transparent, hover bg
- `.terminal-btn-danger` - Red bg

**Inputs:**
- `.terminal-input` - Text input, select

**Badges:**
- `.terminal-badge-success` - Green
- `.terminal-badge-warning` - Yellow
- `.terminal-badge-error` - Red
- `.terminal-badge-info` - Blue
- `.terminal-badge-neutral` - Gray

**Other:**
- `.terminal-code` - Inline code
- `.terminal-link` - Styled link
- `.terminal-header` - Section header with ">"
- `.terminal-progress` - Progress bar container
- `.terminal-progress-bar` - Progress fill
- `.terminal-divider` - Horizontal divider

### Glow Effects

- `shadow-glow-brand` - Yellow glow
- `shadow-glow-success` - Green glow
- `shadow-glow-error` - Red glow
- `shadow-glow-info` - Blue glow

### Animations

- `animate-fade-in` - Fade in
- `animate-slide-up` - Slide up
- `animate-slide-down` - Slide down
- `animate-cursor-blink` - Cursor blink
- `animate-terminal-glow` - Pulsing glow

### Validation Rules

1. Always use design tokens (no hardcoded colors)
2. Use monospace font everywhere
3. WCAG AA contrast minimum (4.5:1)
4. Focus states on all interactive elements
5. Support both light and dark mode
6. Minimum touch target: 36x36px

### Quick Examples

**Interactive Card:**
```jsx
<button className="terminal-card-interactive p-4 hover:shadow-glow-brand group">
  <span className="terminal-stat-label">Title</span>
  <div className="terminal-stat">42</div>
  <div className="text-xs text-terminal-text-muted group-hover:text-brand">
    View details >
  </div>
</button>
```

**Form Input:**
```jsx
<div>
  <label className="block text-xs uppercase tracking-wider text-terminal-text-muted mb-1.5">
    Field Label
  </label>
  <input type="text" className="terminal-input" />
</div>
```

**Status Badge:**
```jsx
<span className="terminal-badge-success">Active</span>
```
