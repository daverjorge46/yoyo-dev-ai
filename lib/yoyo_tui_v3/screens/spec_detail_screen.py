"""
SpecDetailScreen for Yoyo Dev TUI v3.

Detailed spec view with full information display, task list, and actions.
"""

from textual.screen import Screen
from textual.containers import Container, Vertical, ScrollableContainer
from textual.widgets import Static, Label
from textual.binding import Binding
from rich.text import Text
from rich.table import Table
from pathlib import Path
from typing import Optional

from ..models import Spec, Task, SpecStatus, TaskStatus, EventType, Event


class SpecDetailScreen(Screen):
    """
    Detailed spec screen with full information.

    Layout:
    ┌─────────────────────────────────────────────────────────┐
    │ Spec: user-authentication                     [IN_PROGRESS] │
    │ Date: 2025-10-29                              Progress: 33%│
    ├─────────────────────────────────────────────────────────┤
    │ Tasks:                                                    │
    │ ✓ 1. Create auth service (3 subtasks)                   │
    │ ▶ 2. Add login UI (3 subtasks)                          │
    │ ○ 3. Add logout functionality (2 subtasks)               │
    ├─────────────────────────────────────────────────────────┤
    │ PR: https://github.com/org/repo/pull/123                 │
    │ Path: /specs/2025-10-29-user-authentication             │
    └─────────────────────────────────────────────────────────┘

    Keyboard Shortcuts:
    - esc: Back to main dashboard
    - e: Edit spec
    - r: Refresh
    - t: View tasks
    """

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("e", "edit", "Edit"),
        Binding("r", "refresh", "Refresh"),
        Binding("t", "view_tasks", "Tasks"),
    ]

    CSS = """
    SpecDetailScreen {
        layout: vertical;
    }

    #spec-header {
        height: 3;
        background: $panel;
        border: solid $primary;
        padding: 1;
    }

    #spec-content {
        height: 1fr;
        padding: 1;
    }

    .status-completed {
        color: $success;
    }

    .status-in-progress {
        color: $warning;
    }

    .status-pending {
        color: $text-muted;
    }
    """

    def __init__(
        self,
        spec: Spec,
        data_manager,
        event_bus,
        **kwargs
    ):
        """
        Initialize SpecDetailScreen.

        Args:
            spec: Spec object to display
            data_manager: DataManager instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)

        # Store dependencies
        self.spec = spec
        self.data_manager = data_manager
        self.event_bus = event_bus

        # Track event subscriptions for cleanup
        self._subscriptions = []

        # Widget references
        self._header_widget = None
        self._content_widget = None

    def compose(self):
        """Compose the spec detail layout."""
        # Header with spec name, status, progress
        self._header_widget = Static("", id="spec-header")
        yield self._header_widget

        # Scrollable content with tasks and metadata
        with ScrollableContainer(id="spec-content"):
            self._content_widget = Static("")
            yield self._content_widget

    def on_mount(self) -> None:
        """Called when screen is mounted."""
        # Subscribe to events (store reference for cleanup)
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        # Initial display
        self._update_display()

    def on_unmount(self) -> None:
        """Called when screen is unmounted."""
        # Unsubscribe all event handlers to prevent memory leaks
        for event_type, handler in self._subscriptions:
            self.event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    # ========================================================================
    # Event Handlers
    # ========================================================================

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self.refresh_display()

    # ========================================================================
    # Actions (Keyboard Shortcuts)
    # ========================================================================

    def action_back(self) -> None:
        """Go back to main dashboard."""
        self.app.pop_screen()

    def action_edit(self) -> None:
        """Open spec in editor."""
        # TODO: Implement editor opening
        self.notify("Edit spec (coming soon)", severity="information")

    def action_refresh(self) -> None:
        """Refresh spec data."""
        self.refresh_display()
        self.notify("Spec refreshed", severity="information")

    def action_view_tasks(self) -> None:
        """Navigate to tasks view."""
        # TODO: Implement tasks view navigation
        self.notify("Tasks view (coming soon)", severity="information")

    # ========================================================================
    # Display Methods
    # ========================================================================

    def _update_display(self) -> None:
        """Update the display with current spec data."""
        # Update header
        if self._header_widget:
            header_content = self._build_header()
            self._header_widget.update(header_content)

        # Update content
        if self._content_widget:
            content = self._build_content()
            self._content_widget.update(content)

    def _build_header(self) -> Text:
        """
        Build header content with spec name, status, progress.

        Returns:
            Rich Text object with formatted header
        """
        text = Text()

        # Spec name
        text.append("Spec: ", style="bold")
        text.append(self.spec.name, style="bold cyan")

        # Status
        status_style = self._get_status_style(self.spec.status)
        text.append(f"  [{self.spec.status.value}]", style=status_style)
        text.append("\n")

        # Date
        text.append("Date: ", style="bold")
        text.append(self.spec.date, style="dim")

        # Progress
        text.append("  Progress: ", style="bold")
        text.append(f"{self.spec.progress:.1f}%", style="bold green")

        return text

    def _build_content(self) -> Text:
        """
        Build content with tasks and metadata.

        Returns:
            Rich Text object with formatted content
        """
        text = Text()

        # Tasks section
        text.append("\n")
        text.append("Tasks:\n", style="bold underline")
        text.append("\n")

        if not self.spec.tasks:
            text.append("  No tasks defined\n", style="dim italic")
        else:
            for task in self.spec.tasks:
                task_line = self._format_task(task)
                text.append(task_line)
                text.append("\n")

        # Metadata section
        text.append("\n")
        text.append("Metadata:\n", style="bold underline")
        text.append("\n")

        # PR URL
        if self.spec.pr_url:
            text.append("  PR: ", style="bold")
            text.append(self.spec.pr_url, style="blue underline")
            text.append("\n")
        else:
            text.append("  PR: ", style="bold")
            text.append("Not created yet\n", style="dim")

        # Spec path
        text.append("  Path: ", style="bold")
        text.append(str(self.spec.path), style="dim")
        text.append("\n")

        return text

    def _format_task(self, task: Task) -> Text:
        """
        Format a task line with status indicator and subtask count.

        Args:
            task: Task object

        Returns:
            Rich Text object with formatted task
        """
        text = Text()

        # Status indicator
        if task.status == TaskStatus.COMPLETED:
            text.append("  ✓ ", style="bold green")
        elif task.status == TaskStatus.IN_PROGRESS:
            text.append("  ▶ ", style="bold yellow")
        else:  # PENDING
            text.append("  ○ ", style="dim")

        # Task title
        task_style = self._get_task_style(task.status)
        text.append(f"{task.id}. {task.title}", style=task_style)

        # Subtask count
        subtask_count = len(task.subtasks) if task.subtasks else 0
        text.append(f" ({subtask_count} subtasks)", style="dim")

        return text

    def _get_status_style(self, status: SpecStatus) -> str:
        """Get style for spec status."""
        if status == SpecStatus.COMPLETED:
            return "bold green"
        elif status == SpecStatus.IN_PROGRESS:
            return "bold yellow"
        else:  # PENDING
            return "dim"

    def _get_task_style(self, status: TaskStatus) -> str:
        """Get style for task status."""
        if status == TaskStatus.COMPLETED:
            return "green"
        elif status == TaskStatus.IN_PROGRESS:
            return "yellow"
        else:  # PENDING
            return "dim"

    def refresh_display(self) -> None:
        """Refresh display with updated spec data (public API)."""
        # Reload spec from data manager
        updated_spec = self.data_manager.get_spec_by_name(self.spec.name)
        if updated_spec:
            self.spec = updated_spec

        # Update display
        self._update_display()

    # ========================================================================
    # Navigation Methods
    # ========================================================================

    def view_task_detail(self, task: Task) -> None:
        """Navigate to task detail screen."""
        # TODO: Implement task detail navigation
        pass

    def action_view_task(self, task: Task) -> None:
        """Action to view task detail."""
        self.view_task_detail(task)
