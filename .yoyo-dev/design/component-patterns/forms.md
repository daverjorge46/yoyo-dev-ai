# Form Patterns

Terminal-styled form components for Yoyo Dev GUI.

## Text Input

```html
<input type="text" class="terminal-input" placeholder="Enter value..." />
```

**Tailwind equivalent:**
```
w-full px-3 py-2
bg-white dark:bg-terminal-black
border border-gray-300 dark:border-terminal-border
rounded text-sm font-mono
text-gray-900 dark:text-terminal-text
placeholder:text-gray-400 dark:placeholder:text-terminal-text-muted
focus:outline-none focus:border-brand dark:focus:border-brand
focus:ring-1 focus:ring-brand/30
transition-colors duration-fast
```

## Text Input with Icon

```jsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-text-muted" />
  <input
    type="text"
    className="terminal-input pl-9"
    placeholder="Search..."
  />
</div>
```

## Select Dropdown

```jsx
<div className="relative">
  <select className="terminal-input pr-8 appearance-none cursor-pointer">
    <option value="">Select option...</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
  </select>
  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-text-muted pointer-events-none" />
</div>
```

## Custom Dropdown (for complex options)

See `TaskDetailPanel.tsx` for `StatusDropdown` component pattern.

```jsx
function CustomDropdown({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="terminal-card-hover w-full flex items-center justify-between px-3 py-2"
      >
        <span>{value}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 terminal-card shadow-lg animate-slide-down">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => { onChange(option.id); setIsOpen(false); }}
              className="w-full px-3 py-2 text-left hover:bg-terminal-elevated"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Textarea

```html
<textarea
  class="terminal-input min-h-[100px] resize-y"
  placeholder="Enter description..."
></textarea>
```

## Checkbox

```jsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="
      h-4 w-4 rounded border-terminal-border
      text-brand focus:ring-brand focus:ring-offset-terminal-bg
      bg-terminal-black
    "
  />
  <span className="text-sm text-terminal-text-secondary">Option label</span>
</label>
```

## Toggle/Switch

```jsx
<button
  onClick={toggle}
  className={`
    relative inline-flex h-6 w-11 items-center rounded-full
    transition-colors duration-fast
    ${enabled ? 'bg-brand' : 'bg-terminal-border'}
  `}
>
  <span
    className={`
      inline-block h-4 w-4 transform rounded-full bg-white shadow
      transition-transform duration-fast
      ${enabled ? 'translate-x-6' : 'translate-x-1'}
    `}
  />
</button>
```

## Form Layout

```jsx
<form className="space-y-4">
  <div>
    <label className="block text-xs font-medium uppercase tracking-wider text-terminal-text-muted mb-1.5">
      Field Label
    </label>
    <input type="text" className="terminal-input" />
    <p className="mt-1 text-xs text-terminal-text-muted">Helper text</p>
  </div>

  <div>
    <label className="block text-xs font-medium uppercase tracking-wider text-terminal-text-muted mb-1.5">
      Another Field
    </label>
    <input type="text" className="terminal-input" />
  </div>

  <div className="flex items-center gap-2 pt-2">
    <button type="submit" className="terminal-btn-primary">Save</button>
    <button type="button" className="terminal-btn-secondary">Cancel</button>
  </div>
</form>
```

## Inline Edit

```jsx
function InlineEdit({ value, onSave, onCancel }) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(editValue);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => editValue !== value ? onSave(editValue) : onCancel()}
      className="terminal-input"
    />
  );
}
```

## Error State

```jsx
<div>
  <input
    type="text"
    className="terminal-input border-error focus:border-error focus:ring-error/30"
  />
  <p className="mt-1 text-xs text-error flex items-center gap-1">
    <AlertCircle className="h-3 w-3" />
    This field is required
  </p>
</div>
```

## Disabled State

```html
<input
  type="text"
  class="terminal-input opacity-50 cursor-not-allowed"
  disabled
/>
```
