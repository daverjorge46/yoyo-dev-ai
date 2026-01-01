# Button Patterns

Terminal-styled button components for Yoyo Dev GUI.

## Classes

Use CSS classes from `index.css` for consistent styling.

## Variants

### Primary Button
Use for main actions (submit, save, create).

```html
<button class="terminal-btn-primary">
  Create Spec
</button>
```

**Tailwind equivalent:**
```
inline-flex items-center justify-center gap-2
px-3 py-1.5 rounded text-sm font-medium
bg-brand text-terminal-black
hover:bg-brand-light active:bg-brand-dark
focus:ring-2 focus:ring-brand focus:ring-offset-2
disabled:opacity-50 disabled:cursor-not-allowed
transition-all duration-fast
```

### Secondary Button
Use for secondary actions.

```html
<button class="terminal-btn-secondary">
  Cancel
</button>
```

**Tailwind equivalent:**
```
inline-flex items-center justify-center gap-2
px-3 py-1.5 rounded text-sm font-medium
bg-gray-100 dark:bg-terminal-elevated
text-gray-700 dark:text-terminal-text
border border-gray-300 dark:border-terminal-border
hover:bg-gray-200 dark:hover:bg-terminal-border-subtle
focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
```

### Ghost Button
Use for tertiary actions, icon-only buttons.

```html
<button class="terminal-btn-ghost">
  <Icon />
</button>
```

**Tailwind equivalent:**
```
inline-flex items-center justify-center gap-2
px-3 py-1.5 rounded text-sm font-medium
text-gray-600 dark:text-terminal-text-secondary
hover:bg-gray-100 dark:hover:bg-terminal-elevated
focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
```

### Danger Button
Use for destructive actions (delete, remove).

```html
<button class="terminal-btn-danger">
  Delete
</button>
```

**Tailwind equivalent:**
```
inline-flex items-center justify-center gap-2
px-3 py-1.5 rounded text-sm font-medium
bg-error text-white
hover:bg-error-dark active:bg-error-dark
focus:ring-2 focus:ring-error focus:ring-offset-2
```

## Sizes

Add size modifiers by adjusting padding:

- **Small:** `px-2 py-1 text-xs`
- **Medium (default):** `px-3 py-1.5 text-sm`
- **Large:** `px-4 py-2 text-base`

## Icon Buttons

```jsx
<button class="terminal-btn-ghost p-1.5">
  <X className="h-4 w-4" />
</button>
```

## Button Groups

```html
<div class="flex items-center gap-1">
  <button class="terminal-btn-ghost">Option 1</button>
  <button class="terminal-btn-ghost">Option 2</button>
</div>
```

## States

- **Disabled:** Add `disabled` attribute, opacity is automatically reduced
- **Loading:** Replace content with spinner, add `disabled`
- **Active:** Current selection, use filled variant

## Accessibility

- All buttons must have visible focus states
- Icon-only buttons require `aria-label`
- Minimum touch target: 36x36px
