"""
ExecutionMonitor Widget

Real-time execution progress display showing:
- Current command being executed
- Active task and subtask
- Progress bar with percentage
- Subtask completion count
- Elapsed time and ETA
"""

from datetime import datetime
from typing import Optional

from textual.widget import Widget
from textual.containers import Container
from textual.widgets import Static, ProgressBar
from rich.text import Text

from ..models import ExecutionState, EventType, Event


class ExecutionMonitor(Widget):
    """
    Real-time execution monitor widget.

    Displays current task execution progress with:
    - Command name
    - Task and subtask names
    - Visual progress bar
    - Completion stats (X/Y subtasks)
    - Time elapsed and ETA

    Auto-hides when no execution is active.
    """

    DEFAULT_CSS = """
    ExecutionMonitor {
        dock: bottom;
        height: 5;
        background: $panel;
        border: solid $warning;
        padding: 1;
        display: none;  /* Hidden by default */
    }

    ExecutionMonitor.active {
        display: block;
    }

    ExecutionMonitor .progress-bar {
        background: $success;
        color: $text;
    }

    ExecutionMonitor .task-name {
        text-style: bold;
        color: $primary;
    }

    ExecutionMonitor .subtask-name {
        color: $text-muted;
    }

    ExecutionMonitor .stats {
        color: $accent;
    }
    """

    def __init__(self, event_bus, **kwargs):
        """
        Initialize ExecutionMonitor.

        Args:
            event_bus: EventBus instance for subscribing to execution events
        """
        super().__init__(**kwargs)
        self.event_bus = event_bus
        self.execution_state: Optional[ExecutionState] = None
        self._subscriptions = []  # Track handler references

    def on_mount(self) -> None:
        """Called when widget is mounted. Subscribe to execution events."""
        # Subscribe to execution events and track subscriptions
        self._subscriptions.append((EventType.EXECUTION_STARTED, self._on_execution_started))
        self.event_bus.subscribe(EventType.EXECUTION_STARTED, self._on_execution_started)

        self._subscriptions.append((EventType.EXECUTION_PROGRESS, self._on_execution_progress))
        self.event_bus.subscribe(EventType.EXECUTION_PROGRESS, self._on_execution_progress)

        self._subscriptions.append((EventType.EXECUTION_COMPLETED, self._on_execution_completed))
        self.event_bus.subscribe(EventType.EXECUTION_COMPLETED, self._on_execution_completed)

        # Initial state (hidden)
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted. Clean up subscriptions."""
        # Unsubscribe all handlers
        for event_type, handler in self._subscriptions:
            self.event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    def compose(self):
        """Compose the execution monitor layout."""
        yield Static("", id="execution-content")

    # ========================================================================
    # Event Handlers
    # ========================================================================

    def _on_execution_started(self, event: Event) -> None:
        """
        Handle EXECUTION_STARTED event.

        Args:
            event: Event with execution start data
        """
        data = event.data

        # Parse started_at timestamp
        started_at_str = data.get("started_at")
        if started_at_str:
            try:
                started_at = datetime.fromisoformat(started_at_str)
            except (ValueError, TypeError):
                started_at = datetime.now()
        else:
            started_at = datetime.now()

        # Create new execution state
        self.execution_state = ExecutionState(
            active=True,
            command=data.get("command", ""),
            task_name=data.get("task_name", ""),
            subtask_current=data.get("subtask_current", ""),
            subtasks_completed=0,
            subtasks_total=data.get("subtasks_total", 0),
            progress=0.0,
            started_at=started_at,
            eta_minutes=data.get("eta_minutes", 0)
        )

        self._update_display()

    def _on_execution_progress(self, event: Event) -> None:
        """
        Handle EXECUTION_PROGRESS event.

        Args:
            event: Event with progress update data
        """
        if not self.execution_state:
            return

        data = event.data

        # Update execution state
        self.execution_state.subtask_current = data.get("subtask_current", self.execution_state.subtask_current)
        self.execution_state.subtasks_completed = data.get("subtasks_completed", self.execution_state.subtasks_completed)
        self.execution_state.progress = data.get("progress", self.execution_state.progress)
        self.execution_state.eta_minutes = data.get("eta_minutes", self.execution_state.eta_minutes)

        self._update_display()

    def _on_execution_completed(self, event: Event) -> None:
        """
        Handle EXECUTION_COMPLETED event.

        Args:
            event: Event with completion data
        """
        # Clear execution state
        self.execution_state = None

        self._update_display()

    # ========================================================================
    # Display Methods
    # ========================================================================

    def _update_display(self) -> None:
        """Update the execution monitor display."""
        if not self.execution_state or not self.execution_state.active:
            # Hide monitor
            self.remove_class("active")
            self.styles.display = "none"
            return

        # Show monitor
        self.add_class("active")
        self.styles.display = "block"

        # Build content
        content = self._build_content()

        # Update content widget
        content_widget = self.query_one("#execution-content", Static)
        content_widget.update(content)

    def _build_content(self) -> Text:
        """
        Build the execution monitor content.

        Returns:
            Rich Text object with formatted content
        """
        if not self.execution_state:
            return Text("")

        state = self.execution_state
        text = Text()

        # Line 1: Command and elapsed time
        text.append("⚡ ", style="bold yellow")
        text.append(state.command, style="bold cyan")
        text.append(" • ", style="dim")
        elapsed = self._format_elapsed_time(state.started_at)
        text.append(f"Elapsed: {elapsed}", style="dim")
        text.append("\n")

        # Line 2: Task name
        text.append("📋 ", style="bold")
        text.append(state.task_name, style="bold")
        text.append("\n")

        # Line 3: Current subtask
        text.append("   ▸ ", style="dim")
        text.append(state.subtask_current, style="italic")
        text.append("\n")

        # Line 4: Progress bar
        bar = self._build_progress_bar(state.progress, width=60)
        text.append(bar)
        text.append(f" {state.progress:.0f}%", style="bold green")
        text.append("\n")

        # Line 5: Stats
        text.append(f"   Subtasks: {state.subtasks_completed}/{state.subtasks_total}", style="cyan")
        text.append(" • ", style="dim")
        eta_str = self._format_eta(state.eta_minutes)
        text.append(f"ETA: {eta_str}", style="yellow")

        return text

    def _build_progress_bar(self, progress: float, width: int = 50) -> Text:
        """
        Build a visual progress bar.

        Args:
            progress: Progress percentage (0-100)
            width: Total width of progress bar in characters

        Returns:
            Rich Text object with progress bar
        """
        # Clamp progress to 0-100
        progress = max(0.0, min(100.0, progress))

        # Calculate filled width
        filled_width = int((progress / 100.0) * width)
        empty_width = width - filled_width

        # Build bar
        text = Text()
        text.append("[", style="dim")
        text.append("█" * filled_width, style="bold green")
        text.append("░" * empty_width, style="dim")
        text.append("]", style="dim")

        return text

    def _calculate_progress_bar_width(self, total_width: int) -> int:
        """
        Calculate the filled width of progress bar.

        Args:
            total_width: Total width available for progress bar

        Returns:
            Number of characters to fill
        """
        if not self.execution_state:
            return 0

        # Clamp progress
        progress = max(0.0, min(100.0, self.execution_state.progress))

        # Calculate width
        return int((progress / 100.0) * total_width)

    def _format_elapsed_time(self, started_at: datetime) -> str:
        """
        Format elapsed time since execution started.

        Args:
            started_at: Execution start time

        Returns:
            Formatted elapsed time string (e.g., "2m 30s")
        """
        elapsed = datetime.now() - started_at
        total_seconds = int(elapsed.total_seconds())

        minutes = total_seconds // 60
        seconds = total_seconds % 60

        if minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"

    def _format_eta(self, eta_minutes: int) -> str:
        """
        Format ETA (estimated time remaining).

        Args:
            eta_minutes: Estimated minutes remaining

        Returns:
            Formatted ETA string (e.g., "~5 min")
        """
        if eta_minutes == 0:
            return "< 1 min"
        elif eta_minutes == 1:
            return "~1 min"
        else:
            return f"~{eta_minutes} min"

    def refresh_display(self) -> None:
        """Refresh the execution monitor display (public API)."""
        self._update_display()
