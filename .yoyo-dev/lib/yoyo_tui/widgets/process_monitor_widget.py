"""
ProcessMonitorWidget - Display running processes with progress bars.

Shows currently running /execute-tasks processes with real-time progress updates.
"""

import logging
from textual.app import ComposeResult
from textual.widgets import Static
from textual.containers import Vertical

from ..models import ProcessStatus
from ..services.process_monitor import ProcessMonitor

logger = logging.getLogger(__name__)


class ProcessMonitorWidget(Static):
    """
    Widget displaying running processes.

    Shows active processes with:
    - Process name (command: spec-name)
    - Progress bar (visual indicator)
    - Current task description
    - Status (running/completed)

    Updates in real-time as ProcessMonitor emits events.
    """

    def __init__(self, process_monitor: ProcessMonitor | None = None, *args, **kwargs):
        """
        Initialize ProcessMonitorWidget.

        Args:
            process_monitor: ProcessMonitor instance (optional)
        """
        super().__init__(*args, **kwargs)
        self.process_monitor = process_monitor
        self._is_loading = True

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self._is_loading = False
        self.refresh_processes()

    def refresh_processes(self) -> None:
        """Refresh process display."""
        if not self.process_monitor:
            self.update("[dim]No process monitor available[/dim]")
            return

        # Get active processes
        active_processes = self.process_monitor.get_active_processes()

        # Build display content
        lines = ["[bold cyan]Running Processes[/bold cyan]", ""]

        if not active_processes:
            lines.append("[dim]No active processes[/dim]")
        else:
            for process in active_processes:
                self._add_process_display(lines, process)

        self.update("\n".join(lines))

    def _add_process_display(self, lines: list[str], process: ProcessStatus) -> None:
        """
        Add process display to lines.

        Args:
            lines: List of lines to append to
            process: ProcessStatus to display
        """
        # Process name
        lines.append(f"[cyan]▶[/cyan] {process.display_name}")

        # Progress bar
        progress_bar = self._format_progress_bar(process.progress)
        lines.append(f"  {progress_bar} {process.progress}%")

        # Current task
        if process.current_task:
            task_text = process.current_task
            if len(task_text) > 50:
                task_text = task_text[:47] + "..."
            lines.append(f"  [dim]{task_text}[/dim]")

        lines.append("")  # Spacing

    def _format_progress_bar(self, progress: int) -> str:
        """
        Format progress as visual bar.

        Args:
            progress: Progress percentage (0-100)

        Returns:
            Formatted progress bar string
        """
        bar_length = 20
        filled = int((progress / 100) * bar_length)
        empty = bar_length - filled

        # Color based on progress
        if progress < 33:
            color = "yellow"
        elif progress < 66:
            color = "cyan"
        else:
            color = "green"

        bar = f"[{color}]{'█' * filled}[/{color}][dim]{'░' * empty}[/dim]"
        return bar

    def update_from_event(self, event_data: dict) -> None:
        """
        Update display based on process event.

        Args:
            event_data: Event data with process information
        """
        # Refresh entire display when process event occurs
        self.refresh_processes()
