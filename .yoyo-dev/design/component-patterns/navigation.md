# Navigation Patterns

Terminal-styled navigation components for Yoyo Dev GUI.

## Sidebar Navigation

```jsx
<nav className="space-y-1">
  {navItems.map(item => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2 rounded text-sm
        transition-colors duration-fast
        ${isActive
          ? 'bg-brand/10 text-brand dark:bg-terminal-yellow/10 dark:text-terminal-yellow'
          : 'text-gray-600 dark:text-terminal-text-secondary hover:bg-gray-100 dark:hover:bg-terminal-elevated'
        }
      `}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  ))}
</nav>
```

## Breadcrumb

```jsx
<nav className="flex items-center gap-2 text-sm text-terminal-text-muted">
  <Link to="/" className="hover:text-brand transition-colors">Home</Link>
  <span>/</span>
  <Link to="/specs" className="hover:text-brand transition-colors">Specs</Link>
  <span>/</span>
  <span className="text-terminal-text">Current Page</span>
</nav>
```

## Tab Navigation

```jsx
<div className="border-b border-terminal-border">
  <nav className="flex gap-1 -mb-px">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`
          px-4 py-2 text-sm font-medium
          border-b-2 transition-colors duration-fast
          ${activeTab === tab.id
            ? 'border-brand text-brand dark:border-terminal-yellow dark:text-terminal-yellow'
            : 'border-transparent text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border'
          }
        `}
      >
        {tab.label}
      </button>
    ))}
  </nav>
</div>
```

## Page Header with Back Button

```jsx
<div className="flex items-center gap-3">
  <Link to="/parent" className="terminal-btn-ghost p-1.5">
    <ArrowLeft className="h-5 w-5" />
  </Link>
  <div>
    <h1 className="text-2xl font-semibold text-terminal-text flex items-center gap-2">
      <Icon className="h-6 w-6 text-brand dark:text-terminal-yellow" />
      Page Title
    </h1>
    <p className="text-sm text-terminal-text-muted">Subtitle or description</p>
  </div>
</div>
```

## Pagination

```jsx
<div className="flex items-center gap-2">
  <button
    onClick={prevPage}
    disabled={page === 1}
    className="terminal-btn-ghost p-1.5 disabled:opacity-30"
  >
    <ChevronLeft className="h-4 w-4" />
  </button>
  <span className="text-sm text-terminal-text-secondary">
    Page {page} of {totalPages}
  </span>
  <button
    onClick={nextPage}
    disabled={page === totalPages}
    className="terminal-btn-ghost p-1.5 disabled:opacity-30"
  >
    <ChevronRight className="h-4 w-4" />
  </button>
</div>
```

## Command Palette Link

Terminal-style command hint.

```jsx
<p className="text-sm text-terminal-text-muted">
  No items found. Run{' '}
  <code className="terminal-code">/create-new</code>
  {' '}to create one.
</p>
```

## Keyboard Shortcut Legend

```jsx
<div className="flex items-center gap-4 text-xs text-terminal-text-muted">
  <Keyboard className="h-3.5 w-3.5" />
  <span className="flex items-center gap-1.5">
    <kbd className="terminal-code px-1.5">h/j/k/l</kbd>
    Navigate
  </span>
  <span className="flex items-center gap-1.5">
    <kbd className="terminal-code px-1.5">Enter</kbd>
    Select
  </span>
  <span className="text-terminal-border">|</span>
  <span>Drag to move</span>
</div>
```

## Quick Actions Menu

```jsx
<div className="space-y-1.5">
  <a
    href="/target"
    className="
      flex items-center gap-2 px-3 py-2 rounded
      text-sm terminal-link
      hover:bg-brand/5 dark:hover:bg-terminal-yellow/5
      transition-colors
    "
  >
    <ExternalLink className="h-4 w-4" />
    Action Label
  </a>
</div>
```

## Mobile Menu Toggle

```jsx
<button
  onClick={toggleMenu}
  className="terminal-btn-ghost p-1.5 lg:hidden"
  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
>
  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
</button>
```
