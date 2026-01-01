# Yoyo Dev Design System

Terminal-inspired design system for the Yoyo Dev GUI, providing a Claude Code-like interface with monospace typography, dark theme support, and consistent component patterns.

## Overview

This design system provides:
- **Design tokens:** Single source of truth for colors, spacing, typography
- **Component classes:** Ready-to-use Tailwind CSS utilities
- **Component patterns:** Documented UI patterns for common components
- **Validation rules:** Guidelines for maintaining consistency

## Quick Start

### 1. Tailwind Config

The design system is integrated into the GUI's Tailwind configuration at `gui/tailwind.config.js`. Key additions:

- Terminal color palette (`terminal-*`)
- Brand colors (`brand-*`)
- Semantic colors (`success`, `warning`, `error`, `info`)
- JetBrains Mono font family
- Custom animations and glow effects

### 2. CSS Utilities

Component classes are defined in `gui/client/src/index.css`:

```css
/* Cards */
.terminal-card          /* Base card */
.terminal-card-hover    /* Hoverable card */
.terminal-card-interactive /* Clickable card */

/* Buttons */
.terminal-btn-primary   /* Primary action */
.terminal-btn-secondary /* Secondary action */
.terminal-btn-ghost     /* Tertiary/icon */
.terminal-btn-danger    /* Destructive */

/* Forms */
.terminal-input         /* Text inputs, selects */

/* Badges */
.terminal-badge-success
.terminal-badge-warning
.terminal-badge-error
.terminal-badge-info
.terminal-badge-neutral

/* Utilities */
.terminal-code          /* Inline code */
.terminal-link          /* Styled links */
.terminal-header        /* Section headers */
.terminal-progress      /* Progress bar */
.terminal-divider       /* Horizontal line */
```

### 3. Use Component Patterns

Check the `component-patterns/` directory for ready-to-use patterns:

- `buttons.md` - Button variants and sizes
- `cards.md` - Card layouts and states
- `forms.md` - Form inputs and layouts
- `navigation.md` - Nav patterns
- `layouts.md` - Page and panel layouts

## Design Principles

### Terminal Aesthetic

- **Monospace typography:** JetBrains Mono throughout
- **Dark theme first:** Optimized for dark mode
- **Sharp corners:** Minimal border radius (2-8px)
- **Subtle borders:** Using `terminal-border` colors
- **Glow effects:** Brand-colored shadows for highlights

### Color Usage

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `gray-50` | `terminal-bg` |
| Cards | `white` | `terminal-card` |
| Borders | `gray-200` | `terminal-border` |
| Primary text | `gray-900` | `terminal-text` |
| Secondary text | `gray-600` | `terminal-text-secondary` |
| Muted text | `gray-400` | `terminal-text-muted` |
| Accent | `brand` | `terminal-yellow` |

### Spacing Scale

Using Tailwind's 4px base scale:
- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px
- `6` = 24px
- `8` = 32px

### Typography Scale

| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 11px | Labels, metadata |
| `text-sm` | 13px | Body text, UI elements |
| `text-base` | 14px | Default body |
| `text-lg` | 16px | Subheadings |
| `text-xl` | 18px | Section titles |
| `text-2xl` | 20px | Page titles |

## Accessibility

### Requirements

- WCAG AA contrast ratio (4.5:1 minimum)
- Visible focus states on all interactive elements
- Minimum touch target: 36x36px
- Support for `prefers-reduced-motion`
- Support for `prefers-contrast: high`

### Focus States

All interactive elements receive:
- Yellow outline on focus-visible
- Ring offset for buttons and links

### Keyboard Navigation

- Tab order follows visual layout
- Arrow keys for list/grid navigation
- Escape to close modals/panels
- Enter/Space for selection

## File Structure

```
.yoyo-dev/design/
├── tokens.json              # Design tokens (source of truth)
├── tailwind.config.js       # Generated Tailwind config
├── design-lite.md           # Quick reference for AI
├── README.md                # This file
├── component-patterns/      # Component documentation
│   ├── buttons.md
│   ├── cards.md
│   ├── forms.md
│   ├── navigation.md
│   └── layouts.md
└── audits/                  # Design audit reports
    └── baseline-audit.json
```

## Usage with Yoyo Dev Commands

```bash
# Audit design consistency
/design-audit

# Fix design violations
/design-fix

# Create component with design enforcement
/design-component "Component Name"
```

## Examples

### Interactive Stat Card

```jsx
<button
  onClick={() => navigate('/specs')}
  className="terminal-card-interactive p-4 hover:shadow-glow-brand group"
>
  <div className="flex items-start justify-between gap-3">
    <div>
      <span className="terminal-stat-label">Specs</span>
      <div className="terminal-stat">12</div>
      <p className="text-xs text-terminal-text-muted">Feature specs</p>
    </div>
    <div className="p-2.5 rounded bg-brand/10 border border-brand/20">
      <FileText className="h-5 w-5 text-brand" />
    </div>
  </div>
  <div className="mt-3 flex items-center gap-1 text-xs text-terminal-text-muted group-hover:text-brand">
    View details <ChevronRight className="h-3 w-3" />
  </div>
</button>
```

### Terminal-Style Form

```jsx
<form className="space-y-4">
  <div>
    <label className="block text-xs font-medium uppercase tracking-wider text-terminal-text-muted mb-1.5">
      Spec Name
    </label>
    <input
      type="text"
      className="terminal-input"
      placeholder="Enter spec name..."
    />
  </div>
  <div className="flex gap-2 pt-2">
    <button type="submit" className="terminal-btn-primary">Create</button>
    <button type="button" className="terminal-btn-secondary">Cancel</button>
  </div>
</form>
```

### Status Dropdown

```jsx
<StatusDropdown
  currentColumn={task.column}
  onSelect={(column) => moveTask(task.id, column)}
/>
```

See `TaskDetailPanel.tsx` for the full implementation.

## Contributing

When adding new components:

1. Use existing design tokens
2. Follow terminal aesthetic
3. Support both light and dark mode
4. Include focus states
5. Document in appropriate pattern file
