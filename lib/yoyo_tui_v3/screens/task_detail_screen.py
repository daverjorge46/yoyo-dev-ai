"""
TaskDetailScreen for Yoyo Dev TUI v3.

Detailed task view with subtasks, progress, and execution actions.
"""

from textual.screen import Screen
from textual.containers import Container, Vertical, ScrollableContainer
from textual.widgets import Static, Label, ProgressBar
from textual.binding import Binding
from rich.text import Text
from rich.table import Table
from typing import Optional, List

from ..models import Task, TaskStatus, EventType, Event


class TaskDetailScreen(Screen):
    """
    Detailed task screen with full information.

    Layout:
    ┌─────────────────────────────────────────────────────────┐
    │ Task 1: Create authentication service   [IN_PROGRESS]    │
    │ Spec: user-authentication (2025-10-29)                   │
    ├─────────────────────────────────────────────────────────┤
    │ Progress: 60% ████████████░░░░░░░░░  (3/5 subtasks)     │
    ├─────────────────────────────────────────────────────────┤
    │ Subtasks:                                                │
    │ ✓ 1.1 Set up authentication provider                    │
    │ ✓ 1.2 Implement login/logout functions                  │
    │ ✓ 1.3 Add session management                            │
    │ ○ 1.4 Write tests for auth service                      │
    │ ○ 1.5 Add error handling                                │
    └─────────────────────────────────────────────────────────┘

    Keyboard Shortcuts:
    - esc: Back to spec detail or main dashboard
    - e: Edit task
    - r: Refresh
    - x: Execute task (if pending/in-progress)
    """

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("e", "edit", "Edit"),
        Binding("r", "refresh", "Refresh"),
        Binding("x", "execute", "Execute"),
    ]

    CSS = """
    TaskDetailScreen {
        layout: vertical;
    }

    #task-header {
        height: 3;
        background: $panel;
        border: solid $primary;
        padding: 1;
    }

    #task-progress {
        height: 3;
        background: $panel-darken-1;
        padding: 1;
    }

    #task-content {
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

    .subtask-completed {
        color: $success;
    }

    .subtask-pending {
        color: $text-muted;
    }
    """

    def __init__(
        self,
        task: Task,
        data_manager,
        event_bus,
        **kwargs
    ):
        """
        Initialize TaskDetailScreen.

        Args:
            task: Task object to display
            data_manager: DataManager instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)

        # Store dependencies (use _task to avoid property conflict)
        self._task = task
        self.data_manager = data_manager
        self.event_bus = event_bus

        # Widget references
        self._header_widget = None
        self._progress_widget = None
        self._content_widget = None

    @property
    def task(self) -> Task:
        """Get the current task."""
        return self._task

    @task.setter
    def task(self, value: Task) -> None:
        """Set the current task."""
        self._task = value

    def compose(self):
        """Compose the task detail layout."""
        # Header with task ID, title, status
        self._header_widget = Static("", id="task-header")
        yield self._header_widget

        # Progress section
        self._progress_widget = Static("", id="task-progress")
        yield self._progress_widget

        # Scrollable content with subtasks
        with ScrollableContainer(id="task-content"):
            self._content_widget = Static("")
            yield self._content_widget

    def on_mount(self) -> None:
        """Called when screen is mounted."""
        # Subscribe to events
        self.event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        # Initial display
        self._update_display()

    def on_unmount(self) -> None:
        """Called when screen is unmounted."""
        # Cleanup if needed
        pass

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
        """Go back to previous screen."""
        self.app.pop_screen()

    def action_edit(self) -> None:
        """Open task in editor."""
        # TODO: Implement editor opening
        self.notify("Edit task (coming soon)", severity="information")

    def action_refresh(self) -> None:
        """Refresh task data."""
        self.refresh_display()
        self.notify("Task refreshed", severity="information")

    def action_execute(self) -> None:
        """Execute this task."""
        # TODO: Implement task execution
        self.notify("Execute task (coming soon)", severity="information")

    def action_run(self) -> None:
        """Alias for action_execute."""
        self.action_execute()

    # ========================================================================
    # Display Methods
    # ========================================================================

    def _update_display(self) -> None:
        """Update the display with current task data."""
        # Update header
        if self._header_widget:
            header_content = self._build_header()
            self._header_widget.update(header_content)

        # Update progress
        if self._progress_widget:
            progress_content = self._build_progress()
            self._progress_widget.update(progress_content)

        # Update content
        if self._content_widget:
            content = self._build_content()
            self._content_widget.update(content)

    def _build_header(self) -> Text:
        """
        Build header content with task ID, title, status.

        Returns:
            Rich Text object with formatted header
        """
        text = Text()

        # Task ID and title
        text.append(f"Task {self.task.id}: ", style="bold")
        text.append(self.task.title, style="bold cyan")

        # Status
        status_style = self._get_status_style(self.task.status)
        text.append(f"  [{self.task.status.value}]", style=status_style)
        text.append("\n")

        # Parent spec context
        text.append("Spec: ", style="bold")
        text.append(f"{self.task.spec_name} ({self.task.spec_date})", style="dim")

        return text

    def _build_progress(self) -> Text:
        """
        Build progress section with percentage and progress bar.

        Returns:
            Rich Text object with formatted progress
        """
        text = Text()

        # Calculate progress
        total_subtasks = len(self.task.subtasks) if self.task.subtasks else 0
        completed_count = len(self.task.completed_subtasks) if hasattr(self.task, 'completed_subtasks') and self.task.completed_subtasks else 0

        if total_subtasks > 0:
            progress_pct = (completed_count / total_subtasks) * 100
        else:
            progress_pct = 0.0

        # Progress text
        text.append("Progress: ", style="bold")
        text.append(f"{progress_pct:.0f}%", style="bold green")
        text.append("  ")

        # Visual progress bar
        bar = self._build_progress_bar(progress_pct, width=30)
        text.append(bar)

        # Completion stats
        text.append(f"  ({completed_count}/{total_subtasks} subtasks)", style="dim")

        return text

    def _build_progress_bar(self, progress: float, width: int = 30) -> Text:
        """
        Build a visual progress bar.

        Args:
            progress: Progress percentage (0-100)
            width: Width of progress bar in characters

        Returns:
            Rich Text object with progress bar
        """
        progress = max(0.0, min(100.0, progress))
        filled_width = int((progress / 100.0) * width)
        empty_width = width - filled_width

        text = Text()
        text.append("█" * filled_width, style="bold green")
        text.append("░" * empty_width, style="dim")

        return text

    def _build_content(self) -> Text:
        """
        Build content with subtasks list.

        Returns:
            Rich Text object with formatted content
        """
        text = Text()

        # Subtasks section
        text.append("\n")
        text.append("Subtasks:\n", style="bold underline")
        text.append("\n")

        if not self.task.subtasks:
            text.append("  No subtasks defined\n", style="dim italic")
        else:
            completed_indices = set(self.task.completed_subtasks) if hasattr(self.task, 'completed_subtasks') and self.task.completed_subtasks else set()

            for i, subtask in enumerate(self.task.subtasks):
                subtask_line = self._format_subtask(subtask, i in completed_indices)
                text.append(subtask_line)
                text.append("\n")

        return text

    def _format_subtask(self, subtask: str, is_completed: bool) -> Text:
        """
        Format a subtask line with completion indicator.

        Args:
            subtask: Subtask text
            is_completed: Whether subtask is completed

        Returns:
            Rich Text object with formatted subtask
        """
        text = Text()

        # Status indicator
        if is_completed:
            text.append("  ✓ ", style="bold green")
            text.append(subtask, style="green")
        else:
            text.append("  ○ ", style="dim")
            text.append(subtask, style="dim")

        return text

    def _get_status_style(self, status: TaskStatus) -> str:
        """Get style for task status."""
        if status == TaskStatus.COMPLETED:
            return "bold green"
        elif status == TaskStatus.IN_PROGRESS:
            return "bold yellow"
        else:  # PENDING
            return "dim"

    def refresh_display(self) -> None:
        """Refresh display with updated task data (public API)."""
        # Reload task from data manager
        updated_task = self.data_manager.get_task_by_id(self.task.id, self.task.spec_name)
        if updated_task:
            self.task = updated_task

        # Update display
        self._update_display()

    # ========================================================================
    # Navigation Methods
    # ========================================================================

    def view_parent_spec(self) -> None:
        """Navigate to parent spec screen."""
        # TODO: Implement parent spec navigation
        pass

    def action_view_spec(self) -> None:
        """Action to view parent spec."""
        self.view_parent_spec()
