"""
TaskDetailScreen - Display detailed view of a task breakdown.

Shows task details including:
- Parent task name and number
- All subtasks with completion status
- Recent important actions (last 3)
- Progress visualization
"""

from pathlib import Path
from typing import List, Optional
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, Markdown
from textual.containers import Vertical, Container
from textual.binding import Binding

from ..models import TaskData, ParentTask


class TaskDetailScreen(Screen):
    """
    Task detail screen displaying task breakdown and recent actions.

    Shows comprehensive task information including subtasks, progress,
    and recent activity. Supports quick navigation back to main screen.
    """

    BINDINGS = [
        Binding("escape", "dismiss", "Back to Main"),
        Binding("q", "dismiss", "Back to Main"),
    ]

    def __init__(
        self,
        task_data: TaskData,
        parent_task: Optional[ParentTask] = None,
        *args,
        **kwargs
    ):
        """
        Initialize TaskDetailScreen.

        Args:
            task_data: Complete task data from tasks.md
            parent_task: Specific parent task to display (if None, shows all)
        """
        super().__init__(*args, **kwargs)
        self.task_data = task_data
        self.parent_task = parent_task

    def compose(self) -> ComposeResult:
        """
        Compose the task detail screen layout.

        Yields:
            Header, task content area, and Footer
        """
        yield Header()

        # Main content container
        with Vertical(id="task-detail-container", classes="panel"):
            # Title section
            yield Static(
                self._get_title(),
                id="task-detail-title"
            )

            # Task source information
            yield Static(
                self._get_source_info(),
                id="task-source-info",
                classes="dim"
            )

            # Progress overview
            yield Static(
                self._get_progress_overview(),
                id="task-progress-overview"
            )

            # Task breakdown
            yield Markdown(
                self._get_task_breakdown(),
                id="task-breakdown"
            )

            # Recent actions section
            yield Static(
                "[bold cyan]Recent Important Actions[/bold cyan]",
                id="recent-actions-title"
            )
            yield Markdown(
                self._get_recent_actions(),
                id="recent-actions-content"
            )

        yield Footer()

    def _get_title(self) -> str:
        """
        Get formatted title for the detail screen.

        Returns:
            Formatted title string with rich markup
        """
        if self.parent_task:
            # Showing single parent task
            status_icon = "✓" if self.parent_task.completed else "○"
            return f"[bold cyan]{status_icon} Task {self.parent_task.number}: {self.parent_task.name}[/bold cyan]"
        else:
            # Showing all tasks
            return "[bold cyan]Task Breakdown - All Tasks[/bold cyan]"

    def _get_source_info(self) -> str:
        """
        Get formatted source information.

        Returns:
            Source type and name (spec/fix/master)
        """
        if self.task_data.source_type == "spec":
            return f"📄 Spec: {self.task_data.spec_name}"
        elif self.task_data.source_type == "fix":
            return f"🔧 Fix: {self.task_data.fix_name}"
        elif self.task_data.source_type == "master":
            return "📋 Master Tasks"
        else:
            return f"📁 {self.task_data.file_path.name}"

    def _get_progress_overview(self) -> str:
        """
        Get formatted progress overview.

        Returns:
            Progress summary with completion stats
        """
        # Calculate progress bar
        progress_pct = self.task_data.progress
        bar_width = 30
        filled = int((progress_pct / 100) * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)

        # Color based on progress
        if progress_pct == 100:
            color = "green"
        elif progress_pct >= 50:
            color = "cyan"
        elif progress_pct > 0:
            color = "yellow"
        else:
            color = "dim"

        return (
            f"[{color}]{bar} {progress_pct}%[/{color}]\n"
            f"Completed: {self.task_data.completed_subtasks}/{self.task_data.total_subtasks} subtasks "
            f"({self.task_data.completed_tasks}/{self.task_data.total_tasks} parent tasks)"
        )

    def _get_task_breakdown(self) -> str:
        """
        Get formatted task breakdown showing all tasks and subtasks.

        Returns:
            Markdown formatted task breakdown
        """
        if not self.task_data.parent_tasks:
            return "_No tasks found_"

        # Determine which tasks to show
        tasks_to_show = [self.parent_task] if self.parent_task else self.task_data.parent_tasks

        lines = []
        lines.append("## Task Breakdown\n")

        for parent in tasks_to_show:
            # Parent task header
            status_icon = "✅" if parent.completed else "⭕"
            lines.append(f"### {status_icon} Task {parent.number}: {parent.name}\n")

            # Show parent task progress
            parent_progress = parent.progress
            if parent_progress == 100:
                progress_str = "[green]100% Complete ✓[/green]"
            elif parent_progress > 0:
                progress_str = f"[cyan]{parent_progress}% Complete[/cyan]"
            else:
                progress_str = "[dim]Not Started[/dim]"

            lines.append(f"**Progress:** {progress_str}\n")

            # List subtasks
            if parent.subtasks:
                lines.append("**Subtasks:**\n")
                for idx, subtask in enumerate(parent.subtasks, 1):
                    checkbox = "☑" if subtask.completed else "☐"
                    text_style = "dim" if subtask.completed else ""

                    if text_style:
                        lines.append(f"- {checkbox} [{text_style}]{subtask.text}[/{text_style}]")
                    else:
                        lines.append(f"- {checkbox} {subtask.text}")

                lines.append("")  # Blank line between tasks
            else:
                lines.append("_No subtasks defined_\n")

        return "\n".join(lines)

    def _get_recent_actions(self) -> str:
        """
        Get recent important actions from git history.

        Returns:
            Markdown formatted list of last 3 important actions
        """
        # This would ideally read from git history or a history log
        # For now, we'll show a placeholder that can be enhanced later
        # Task 6 will implement actual history tracking

        # Try to get git history for the task folder
        try:
            import subprocess
            from datetime import datetime

            # Get last 3 commits related to this task
            if self.task_data.file_path and self.task_data.file_path.parent.exists():
                task_dir = self.task_data.file_path.parent

                # Run git log command
                result = subprocess.run(
                    [
                        "git", "log", "-3",
                        "--pretty=format:%h|%s|%ar",
                        "--", str(task_dir)
                    ],
                    cwd=task_dir.parent,
                    capture_output=True,
                    text=True,
                    timeout=2
                )

                if result.returncode == 0 and result.stdout.strip():
                    lines = []
                    for line in result.stdout.strip().split('\n'):
                        parts = line.split('|', 2)
                        if len(parts) == 3:
                            commit_hash, message, time_ago = parts
                            lines.append(f"- **{time_ago}:** {message} `({commit_hash})`")

                    if lines:
                        return "\n".join(lines)

        except Exception:
            # Git not available or error - fall through to default
            pass

        # Default fallback - show task file modification info
        try:
            if self.task_data.file_path and self.task_data.file_path.exists():
                from datetime import datetime
                mtime = self.task_data.file_path.stat().st_mtime
                mod_time = datetime.fromtimestamp(mtime)
                time_ago = self._format_time_ago(mod_time)

                return f"- **{time_ago}:** Tasks file updated"
        except Exception:
            pass

        return "_No recent actions recorded_"

    def _format_time_ago(self, dt) -> str:
        """
        Format datetime as 'time ago' string.

        Args:
            dt: datetime object

        Returns:
            Human-readable time ago string (e.g., "2 hours ago")
        """
        from datetime import datetime

        now = datetime.now()
        diff = now - dt

        seconds = diff.total_seconds()
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"

    def action_dismiss(self) -> None:
        """Close the detail screen and return to main dashboard."""
        self.app.pop_screen()
