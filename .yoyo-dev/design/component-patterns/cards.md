# Card Patterns

Terminal-styled card components for Yoyo Dev GUI.

## Base Card

Non-interactive container for content.

```html
<div class="terminal-card p-4">
  <h3 class="terminal-header">Section Title</h3>
  <!-- content -->
</div>
```

**Tailwind equivalent:**
```
bg-white dark:bg-terminal-card
border border-gray-200 dark:border-terminal-border
rounded transition-all duration-fast
```

## Hover Card

Card with hover effect for browsing lists.

```html
<div class="terminal-card-hover p-4">
  <!-- content -->
</div>
```

**Tailwind equivalent:**
```
terminal-card
hover:border-gray-300 dark:hover:border-terminal-border-emphasis
hover:shadow-md cursor-pointer
```

## Interactive Card

Card for clickable actions with active state.

```html
<button class="terminal-card-interactive p-4">
  <!-- content -->
</button>
```

**Tailwind equivalent:**
```
terminal-card-hover active:scale-[0.99]
```

## Stat Card

Dashboard-style stat display.

```jsx
<button className="terminal-card-interactive p-4 group">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1">
      <span className="terminal-stat-label">Title</span>
      <div className="terminal-stat">42</div>
      <p className="text-xs text-terminal-text-muted">Subtitle</p>
    </div>
    <div className="p-2.5 rounded bg-brand/10 border border-brand/20">
      <Icon className="h-5 w-5 text-brand" />
    </div>
  </div>
  <div className="mt-3 flex items-center gap-1 text-xs text-terminal-text-muted group-hover:text-brand">
    <span>View details</span>
    <ChevronRight className="h-3 w-3" />
  </div>
</button>
```

## Task Card (Kanban)

Card for task items in kanban board.

```jsx
<div className="terminal-card-interactive p-3 group">
  <h4 className="text-sm font-medium line-clamp-2">{title}</h4>
  <div className="mt-2 flex items-center gap-2">
    <span className="terminal-badge-info">{status}</span>
    <span className="terminal-code">{taskId}</span>
  </div>
  {hasSubtasks && (
    <div className="mt-2 terminal-progress">
      <div className="terminal-progress-bar bg-terminal-green" style="width: 50%" />
    </div>
  )}
</div>
```

## System Status Card

Card showing system/service status.

```jsx
<div className="terminal-card p-4">
  <div className="terminal-header">System Status</div>
  <div className="space-y-2">
    {systems.map(system => (
      <div className="flex items-center justify-between py-1.5">
        <div className="flex items-center gap-2">
          <system.icon className="h-4 w-4 text-terminal-text-muted" />
          <span className="text-sm text-terminal-text-secondary">{system.name}</span>
        </div>
        <span className={system.active ? 'terminal-badge-success' : 'terminal-badge-neutral'}>
          {system.active ? 'Active' : 'Inactive'}
        </span>
      </div>
    ))}
  </div>
</div>
```

## Card with Glow Effect

For highlighting important items.

```html
<div class="terminal-card-interactive p-4 hover:shadow-glow-brand">
  <!-- high priority content -->
</div>
```

Available glow shadows:
- `shadow-glow-brand` - Yellow/amber glow
- `shadow-glow-success` - Green glow
- `shadow-glow-error` - Red glow
- `shadow-glow-info` - Blue glow

## Card Sections

Dividing card content into sections.

```html
<div class="terminal-card">
  <div class="p-4">
    <!-- header content -->
  </div>
  <div class="terminal-divider"></div>
  <div class="p-4">
    <!-- main content -->
  </div>
  <div class="terminal-divider"></div>
  <div class="p-4">
    <!-- footer content -->
  </div>
</div>
```

## Empty State Card

When no content is available.

```jsx
<div className="terminal-card p-8 text-center">
  <Terminal className="h-10 w-10 mx-auto mb-3 text-terminal-text-muted opacity-50" />
  <p className="text-terminal-text-secondary">No items found</p>
  <p className="text-sm text-terminal-text-muted mt-1">
    Create one using <code className="terminal-code">/create-new</code>
  </p>
</div>
```
