# Layout Patterns

Terminal-styled layout components for Yoyo Dev GUI.

## Three-Panel Layout

The main application layout with collapsible sidebar and detail panel.

```jsx
<div className="flex h-screen bg-surface-bg-light dark:bg-terminal-bg">
  {/* Sidebar */}
  <aside className="w-64 flex-shrink-0 border-r border-terminal-border bg-white dark:bg-terminal-card">
    <nav className="p-4">
      {/* Navigation items */}
    </nav>
  </aside>

  {/* Main Content */}
  <main className="flex-1 overflow-auto p-6">
    {/* Page content */}
  </main>

  {/* Detail Panel (conditional) */}
  {detailOpen && (
    <aside className="w-80 flex-shrink-0 border-l border-terminal-border bg-white dark:bg-terminal-card">
      {/* Detail content */}
    </aside>
  )}
</div>
```

## Page Layout

Standard page structure.

```jsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-terminal-text flex items-center gap-2">
        <Icon className="h-6 w-6 text-brand dark:text-terminal-yellow" />
        Page Title
      </h1>
      <p className="mt-1 text-sm text-terminal-text-muted">
        Page description
      </p>
    </div>
    <div className="flex items-center gap-3">
      {/* Actions */}
    </div>
  </div>

  {/* Content */}
  <div>
    {/* Main content */}
  </div>
</div>
```

## Dashboard Grid

Responsive grid for dashboard cards.

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {cards.map(card => (
    <StatCard key={card.id} {...card} />
  ))}
</div>
```

## Three-Column Dashboard

```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Left Column */}
  <div className="space-y-6">
    <Card1 />
    <Card2 />
  </div>

  {/* Middle Column */}
  <div className="space-y-6">
    <Card3 />
    <Card4 />
  </div>

  {/* Right Column */}
  <div className="space-y-6">
    <Card5 />
    <Card6 />
  </div>
</div>
```

## Kanban Board Layout

Four-column kanban board.

```jsx
<div className="grid grid-cols-4 gap-4 min-h-[500px]">
  {columns.map(column => (
    <div
      key={column.id}
      className="flex flex-col bg-gray-50 dark:bg-terminal-elevated/50 rounded-lg"
    >
      {/* Column Header */}
      <div className="p-3 border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <span className={column.iconColor}>{column.icon}</span>
            {column.label}
          </h3>
          <span className="terminal-badge-neutral">
            {column.tasks.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 space-y-2 overflow-auto">
        {column.tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  ))}
</div>
```

## List Layout

Vertical list of items.

```jsx
<div className="space-y-3">
  {items.map(item => (
    <div key={item.id} className="terminal-card-hover p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-terminal-text">{item.title}</h3>
          <p className="text-sm text-terminal-text-muted">{item.description}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-terminal-text-muted" />
      </div>
    </div>
  ))}
</div>
```

## Expandable Section

Collapsible content section.

```jsx
<div className="terminal-card">
  <button
    onClick={() => setExpanded(!expanded)}
    className="w-full flex items-center justify-between p-4"
  >
    <h3 className="font-medium text-terminal-text">{title}</h3>
    <ChevronDown
      className={`h-5 w-5 text-terminal-text-muted transition-transform ${
        expanded ? 'rotate-180' : ''
      }`}
    />
  </button>
  {expanded && (
    <div className="px-4 pb-4 pt-0">
      {/* Expanded content */}
    </div>
  )}
</div>
```

## Modal/Dialog Layout

```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
  <div className="terminal-card max-w-md w-full shadow-lg animate-scale-in">
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b border-terminal-border">
      <h2 className="text-lg font-semibold text-terminal-text">Modal Title</h2>
      <button onClick={onClose} className="terminal-btn-ghost p-1">
        <X className="h-4 w-4" />
      </button>
    </div>

    {/* Content */}
    <div className="p-4">
      {/* Modal content */}
    </div>

    {/* Footer */}
    <div className="flex items-center justify-end gap-2 p-4 border-t border-terminal-border">
      <button onClick={onClose} className="terminal-btn-secondary">Cancel</button>
      <button onClick={onSubmit} className="terminal-btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

## Split View

Two-panel horizontal split.

```jsx
<div className="flex h-full">
  {/* Left Panel */}
  <div className="w-1/2 border-r border-terminal-border overflow-auto">
    {/* Left content */}
  </div>

  {/* Right Panel */}
  <div className="w-1/2 overflow-auto">
    {/* Right content */}
  </div>
</div>
```

## Empty State Layout

```jsx
<div className="flex flex-col items-center justify-center h-64 p-8 text-center">
  <Terminal className="h-12 w-12 mb-4 text-terminal-text-muted opacity-50" />
  <h3 className="text-lg font-medium text-terminal-text-secondary">No items found</h3>
  <p className="mt-1 text-sm text-terminal-text-muted max-w-sm">
    Create your first item by running <code className="terminal-code">/create-new</code>
  </p>
  <button className="terminal-btn-primary mt-4">
    Create New
  </button>
</div>
```

## Loading State Layout

```jsx
<div className="space-y-4">
  <div className="skeleton-shimmer h-8 w-48 rounded" />
  <div className="grid grid-cols-4 gap-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="skeleton-shimmer h-24 rounded" />
    ))}
  </div>
  <div className="skeleton-shimmer h-64 rounded" />
</div>
```
