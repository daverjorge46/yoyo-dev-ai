"""
ProgressPanel Widget - Task progress visualization with gradient progress bars.

Displays task completion statistics and progress bars with visual indicators.
Uses Textual's ProgressBar widget for animated progress display.
"""

from textual.app import ComposeResult
from textual.widgets import Static, ProgressBar
from textual.widget import Widget
from textual.containers import Vertical

from ..models import TaskData


class ProgressPanel(Widget):
    """
    Progress panel widget for displaying task completion progress.

    Shows progress bars with gradient styling and task summary statistics.

    Attributes:
        task_data: TaskData instance with completion information
    """

    def __init__(self, task_data: TaskData | None = None, *args, **kwargs):
        """
        Initialize ProgressPanel widget.

        Args:
            task_data: Optional TaskData to display (defaults to empty)
        """
        super().__init__(*args, **kwargs)
        self.task_data = task_data or TaskData.empty()

    def compose(self) -> ComposeResult:
        """
        Compose the progress panel layout.

        Yields:
            Progress bars and summary text
        """
        with Vertical(id="progress-container"):
            # Title
            yield Static("[bold cyan]Progress Overview[/bold cyan]", id="progress-title")

            # Task progress bar
            task_progress = self._calculate_task_progress()
            task_bar = ProgressBar(
                total=100,
                show_eta=False,
                show_percentage=True,
                id="task-progress-bar"
            )
            task_bar.update(progress=task_progress)
            task_bar.add_class("-gradient")  # Apply gradient styling
            yield task_bar

            # Task summary
            task_summary = self._generate_task_summary()
            yield Static(task_summary, id="task-summary")

            # Subtask progress bar
            subtask_progress = self._calculate_subtask_progress()
            subtask_bar = ProgressBar(
                total=100,
                show_eta=False,
                show_percentage=True,
                id="subtask-progress-bar"
            )
            subtask_bar.update(progress=subtask_progress)
            yield subtask_bar

            # Subtask summary
            subtask_summary = self._generate_subtask_summary()
            yield Static(subtask_summary, id="subtask-summary")

    def _calculate_task_progress(self) -> float:
        """
        Calculate parent task completion percentage.

        Returns:
            Progress as percentage (0-100)
        """
        if not self.task_data:
            return 0.0

        total_tasks = self.task_data.total_parent_tasks
        completed_tasks = self.task_data.completed_parent_tasks

        if total_tasks == 0:
            return 0.0

        return (completed_tasks / total_tasks) * 100

    def _calculate_subtask_progress(self) -> float:
        """
        Calculate subtask completion percentage.

        Returns:
            Progress as percentage (0-100)
        """
        if not self.task_data:
            return 0.0

        total_subtasks = self.task_data.total_subtasks
        completed_subtasks = self.task_data.completed_subtasks

        if total_subtasks == 0:
            return 0.0

        return (completed_subtasks / total_subtasks) * 100

    def _generate_task_summary(self) -> str:
        """
        Generate task summary text.

        Returns:
            Formatted summary string
        """
        if not self.task_data:
            return "[dim]No task data[/dim]"

        completed = self.task_data.completed_parent_tasks
        total = self.task_data.total_parent_tasks

        if total == 0:
            return "[dim]No parent tasks[/dim]"

        progress_pct = self._calculate_task_progress()

        return (
            f"[cyan]Parent Tasks:[/cyan] "
            f"[green]{completed}[/green]/{total} "
            f"[dim]•[/dim] "
            f"[cyan]{progress_pct:.0f}%[/cyan] complete"
        )

    def _generate_subtask_summary(self) -> str:
        """
        Generate subtask summary text.

        Returns:
            Formatted summary string
        """
        if not self.task_data:
            return "[dim]No task data[/dim]"

        completed = self.task_data.completed_subtasks
        total = self.task_data.total_subtasks

        if total == 0:
            return "[dim]No subtasks[/dim]"

        progress_pct = self._calculate_subtask_progress()

        return (
            f"[cyan]Subtasks:[/cyan] "
            f"[green]{completed}[/green]/{total} "
            f"[dim]•[/dim] "
            f"[cyan]{progress_pct:.0f}%[/cyan] complete"
        )

    def update_data(self, task_data: TaskData) -> None:
        """
        Update task data and refresh the display.

        Args:
            task_data: TaskData to display
        """
        self.task_data = task_data

        # Update progress bars
        try:
            task_bar = self.query_one("#task-progress-bar", ProgressBar)
            task_progress = self._calculate_task_progress()
            task_bar.update(progress=task_progress)

            subtask_bar = self.query_one("#subtask-progress-bar", ProgressBar)
            subtask_progress = self._calculate_subtask_progress()
            subtask_bar.update(progress=subtask_progress)

            # Update summaries
            task_summary = self.query_one("#task-summary", Static)
            task_summary.update(self._generate_task_summary())

            subtask_summary = self.query_one("#subtask-summary", Static)
            subtask_summary.update(self._generate_subtask_summary())

        except Exception:
            # Widgets not mounted yet, will populate on mount
            pass

    def update_progress(self, task_data: TaskData) -> None:
        """
        Update progress data (alias for update_data).

        Args:
            task_data: TaskData to display
        """
        self.update_data(task_data)
