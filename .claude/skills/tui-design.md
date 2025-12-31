# TUI Design & UX Expert

Design and build terminal user interfaces with layouts, widgets, keyboard navigation, and responsive styling.

**Keywords:** tui, terminal ui, textual css, widget, layout, panel, screen, keyboard shortcuts, bindings, focus, styling, colors, theme

## When to use this skill

Use this skill when:
- Designing new TUI screens or widgets
- Improving TUI layout and visual hierarchy
- Implementing keyboard navigation and shortcuts
- Optimizing TUI performance and responsiveness
- Adding interactive elements (buttons, inputs, tables)
- Creating command palettes or modal dialogs
- Need help with TUI color schemes and styling
- Implementing real-time updates and live data

## What I'll help with

- **Screen Design**: Layout, panels, containers, and composition
- **Widget Development**: Custom widgets, reactive properties, events
- **Keyboard UX**: Shortcuts, navigation, focus management
- **Visual Design**: Colors, borders, ASCII art, box drawing
- **Performance**: Lazy loading, virtualization, efficient updates
- **Accessibility**: Screen reader support, keyboard-only navigation
- **Responsive Design**: Adapting to terminal size changes
- **State Management**: Reactive state, event bus, data flow

## Key Expertise

- Textual CSS and styling system
- Reactive programming patterns for TUI
- Event-driven architecture
- Widget composition and reusability
- Performance optimization (avoid unnecessary renders)
- Terminal limitations and workarounds
- Box drawing characters and Unicode
- Color schemes and themes

## Design Principles

1. **Clarity**: Information hierarchy, clear labels, obvious actions
2. **Efficiency**: Keyboard shortcuts, quick navigation, minimal keystrokes
3. **Feedback**: Loading states, success/error messages, visual confirmation
4. **Consistency**: Unified color scheme, consistent shortcuts, predictable behavior
5. **Performance**: Fast startup, responsive updates, smooth scrolling

## Examples

**3-Panel Layout:**
```python
from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Header, Footer

def compose(self) -> ComposeResult:
    yield Header()
    with Horizontal():
        yield LeftPanel(classes="panel")
        yield CenterPanel(classes="panel")
        yield RightPanel(classes="panel")
    yield Footer()
```

**Keyboard shortcuts:**
```python
BINDINGS = [
    ("q", "quit", "Quit"),
    ("?", "help", "Help"),
    ("/", "search", "Search"),
    ("r", "refresh", "Refresh"),
    ("g", "goto_specs", "Specs"),
    ("t", "goto_tasks", "Tasks"),
]
```

**Reactive updates:**
```python
class LiveCounter(Static):
    count: reactive[int] = reactive(0)

    def watch_count(self, count: int) -> None:
        self.update(f"Count: {count}")

    def on_mount(self) -> None:
        self.set_interval(1.0, self.increment)

    def increment(self) -> None:
        self.count += 1
```
