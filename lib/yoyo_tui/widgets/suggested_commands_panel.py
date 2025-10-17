"""
SuggestedCommandsPanel - Display context-aware Yoyo Dev command suggestions.

Analyzes project state and suggests relevant commands to run next.
"""

from pathlib import Path
from typing import List, Tuple
from textual.app import ComposeResult
from textual.widgets import Static
from textual.containers import Vertical

from ..models import TaskData


class SuggestedCommandsPanel(Static):
    """
    Widget displaying context-aware command suggestions.

    Suggests commands based on:
    - Presence of incomplete tasks
    - Presence of specs/fixes
    - Git status (uncommitted changes)
    - Project state

    Features:
    - Shows 3-5 most relevant commands
    - Updates dynamically based on context
    - Click to execute (future enhancement)
    - Keyboard shortcuts shown
    """

    DEFAULT_ID = "suggested-commands-panel"

    def __init__(self, task_data: TaskData = None, *args, **kwargs):
        """
        Initialize SuggestedCommandsPanel.

        Args:
            task_data: Task data for context analysis (optional)
        """
        super().__init__(*args, **kwargs)
        self.task_data = task_data or TaskData.empty()

    def compose(self) -> ComposeResult:
        """Compose the suggested commands panel layout."""
        with Vertical(id="suggested-commands-content"):
            yield Static(self._render_content(), id="suggested-commands-display")

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self.update_content()

    def update_data(self, task_data: TaskData) -> None:
        """
        Update the widget with new task data.

        Args:
            task_data: New task data for context analysis
        """
        self.task_data = task_data
        self.update_content()

    def update_content(self) -> None:
        """Refresh the displayed content with current suggestions."""
        try:
            display = self.query_one("#suggested-commands-display", Static)
            display.update(self._render_content())
        except Exception:
            # Widget not mounted yet
            pass

    def _render_content(self) -> str:
        """
        Render the panel content with context-aware suggestions.

        Returns:
            Rich-formatted string with suggested commands
        """
        suggestions = self._get_suggestions()

        lines = []

        # Panel header
        lines.append("[bold cyan]💡 Suggested Commands[/bold cyan]")
        lines.append("")

        if not suggestions:
            lines.append("[dim]No suggestions available[/dim]")
            return "\n".join(lines)

        # Display top 5 suggestions
        for i, (cmd, desc, shortcut) in enumerate(suggestions[:5], 1):
            # Command with shortcut
            if shortcut:
                lines.append(f"[bold cyan]{cmd}[/bold cyan] [dim]({shortcut})[/dim]")
            else:
                lines.append(f"[bold cyan]{cmd}[/bold cyan]")

            # Description
            lines.append(f"[dim]{desc}[/dim]")

            # Add spacing between items (except last)
            if i < min(5, len(suggestions)):
                lines.append("")

        return "\n".join(lines)

    def _get_suggestions(self) -> List[Tuple[str, str, str]]:
        """
        Get context-aware command suggestions.

        Returns:
            List of (command, description, shortcut) tuples
        """
        suggestions = []

        # Analyze context
        has_tasks = self._has_incomplete_tasks()
        has_specs = self._has_recent_specs()
        has_uncommitted_changes = self._has_uncommitted_changes()
        has_product_docs = self._has_product_docs()

        # Priority 1: Execute tasks if available
        if has_tasks:
            suggestions.append((
                "/execute-tasks",
                "Continue building your feature",
                None
            ))

        # Priority 2: Create new feature if no tasks
        if not has_tasks and has_product_docs:
            suggestions.append((
                "/create-new",
                "Start a new feature",
                None
            ))

        # Priority 3: Plan product if no product docs
        if not has_product_docs:
            suggestions.append((
                "/plan-product",
                "Set up mission & roadmap",
                None
            ))

        # Priority 4: Create fix if needed
        if has_product_docs:
            suggestions.append((
                "/create-fix",
                "Fix a bug or issue",
                None
            ))

        # Priority 5: Review code
        if has_uncommitted_changes:
            suggestions.append((
                "/review",
                "Critical code review",
                None
            ))

        # Priority 6: Help and refresh
        suggestions.extend([
            ("Press ?", "View keyboard shortcuts", "?"),
            ("Press r", "Refresh dashboard", "r"),
            ("Press Ctrl+P", "Open command palette", "Ctrl+P"),
        ])

        return suggestions

    def _has_incomplete_tasks(self) -> bool:
        """
        Check if there are incomplete tasks.

        Returns:
            True if incomplete tasks exist
        """
        if not self.task_data or not self.task_data.tasks:
            return False

        # Check if any parent task or subtask is incomplete
        for task in self.task_data.tasks:
            if not task.completed:
                return True
            if task.subtasks and any(not sub.completed for sub in task.subtasks):
                return True

        return False

    def _has_recent_specs(self) -> bool:
        """
        Check if recent specs or fixes exist.

        Returns:
            True if specs/fixes directories exist with content
        """
        specs_dir = Path.cwd() / ".yoyo-dev" / "specs"
        fixes_dir = Path.cwd() / ".yoyo-dev" / "fixes"

        has_specs = specs_dir.exists() and any(specs_dir.iterdir())
        has_fixes = fixes_dir.exists() and any(fixes_dir.iterdir())

        return has_specs or has_fixes

    def _has_uncommitted_changes(self) -> bool:
        """
        Check if there are uncommitted git changes.

        Returns:
            True if uncommitted changes exist
        """
        # This is a simplified check
        # In a full implementation, would use GitService
        git_dir = Path.cwd() / ".git"
        return git_dir.exists()

    def _has_product_docs(self) -> bool:
        """
        Check if product documentation exists.

        Returns:
            True if mission.md or roadmap.md exist
        """
        product_dir = Path.cwd() / ".yoyo-dev" / "product"

        if not product_dir.exists():
            return False

        mission_file = product_dir / "mission.md"
        roadmap_file = product_dir / "roadmap.md"

        return mission_file.exists() or roadmap_file.exists()
