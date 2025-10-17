"""
NextTasksPanel - Display next uncompleted task with preview of subtasks.

Provides quick visibility into what to work on next without scrolling
through the full task tree.
"""

from typing import Optional
from textual.app import ComposeResult
from textual.widgets import Static
from textual.containers import Vertical

from ..models import TaskData, Task


class NextTasksPanel(Static):
    """
    Widget displaying the next uncompleted parent task with subtask preview.

    Features:
    - Shows next uncompleted parent task title
    - Displays first 2-3 subtasks with completion status
    - Progress indicator (X of Y complete)
    - Empty state when all tasks complete
    - Auto-updates when task data changes
    """

    DEFAULT_ID = "next-tasks-panel"

    def __init__(self, task_data: Optional[TaskData] = None, *args, **kwargs):
        """
        Initialize NextTasksPanel.

        Args:
            task_data: Task data to display (optional, can update later)
        """
        super().__init__(*args, **kwargs)
        self.task_data = task_data or TaskData.empty()

    def compose(self) -> ComposeResult:
        """Compose the next tasks panel layout."""
        with Vertical(id="next-tasks-content"):
            yield Static(self._render_content(), id="next-tasks-display")

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self.update_content()

    def update_data(self, task_data: TaskData) -> None:
        """
        Update the widget with new task data.

        Args:
            task_data: New task data to display
        """
        self.task_data = task_data
        self.update_content()

    def update_content(self) -> None:
        """Refresh the displayed content with current task data."""
        try:
            display = self.query_one("#next-tasks-display", Static)
            display.update(self._render_content())
        except Exception:
            # Widget not mounted yet
            pass

    def _render_content(self) -> str:
        """
        Render the panel content as rich text.

        Returns:
            Rich-formatted string with next task and subtasks
        """
        # Find next uncompleted parent task
        next_task = self._find_next_task()

        if not next_task:
            return self._render_empty_state()

        # Build content
        lines = []

        # Panel header
        lines.append("[bold cyan]📋 Next Task[/bold cyan]")
        lines.append("")

        # Parent task title
        status_icon = "✓" if next_task.completed else "○"
        lines.append(f"[bold]{status_icon} {next_task.title}[/bold]")

        # Progress indicator
        completed_count = sum(1 for sub in next_task.subtasks if sub.completed)
        total_count = len(next_task.subtasks)
        progress_pct = (completed_count / total_count * 100) if total_count > 0 else 0

        lines.append(f"[dim]Progress: {completed_count}/{total_count} ({progress_pct:.0f}%)[/dim]")
        lines.append("")

        # First 2-3 subtasks preview
        if next_task.subtasks:
            lines.append("[dim]Next steps:[/dim]")
            preview_count = min(3, len(next_task.subtasks))

            for i, subtask in enumerate(next_task.subtasks[:preview_count]):
                checkbox = "[green]✓[/green]" if subtask.completed else "[ ]"
                text_style = "dim strike" if subtask.completed else "white"
                lines.append(f"{checkbox} [{text_style}]{subtask.title}[/{text_style}]")

            # Show "... and X more" if there are more subtasks
            remaining = len(next_task.subtasks) - preview_count
            if remaining > 0:
                lines.append(f"[dim]... and {remaining} more subtask{'s' if remaining != 1 else ''}[/dim]")

        return "\n".join(lines)

    def _render_empty_state(self) -> str:
        """
        Render empty state when no tasks are available.

        Returns:
            Rich-formatted string for empty state
        """
        return """[bold cyan]📋 Next Task[/bold cyan]

[dim]No tasks found[/dim]

All tasks complete! 🎉
or no tasks.md file detected."""

    def _find_next_task(self) -> Optional[Task]:
        """
        Find the next uncompleted parent task.

        Returns:
            Next uncompleted Task or None if all complete
        """
        if not self.task_data or not self.task_data.tasks:
            return None

        # Find first parent task that's not 100% complete
        for task in self.task_data.tasks:
            if not task.completed:
                return task

            # Check if any subtasks are incomplete
            if task.subtasks and any(not sub.completed for sub in task.subtasks):
                return task

        return None
