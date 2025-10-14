"""
GitStatus Widget - Display git repository status with live updates.

Shows branch name, uncommitted changes, untracked files, and sync status.
Auto-refreshes every 5 seconds using Textual's set_interval.
"""

from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Vertical

from ..services.git_service import GitService


class GitStatus(Widget):
    """
    Git status widget for displaying repository information.

    Shows branch, uncommitted changes, untracked files, ahead/behind count.
    Auto-refreshes every 5 seconds.

    Attributes:
        git_service: GitService instance for git operations
        refresh_interval: Update interval in seconds (default 5)
    """

    def __init__(self, refresh_interval: int = 5, *args, **kwargs):
        """
        Initialize GitStatus widget.

        Args:
            refresh_interval: Auto-refresh interval in seconds (default 5)
        """
        super().__init__(*args, **kwargs)
        self.git_service = GitService()
        self.refresh_interval = refresh_interval
        self._timer = None

    def compose(self) -> ComposeResult:
        """
        Compose the git status layout.

        Yields:
            Static widget with git information
        """
        with Vertical(id="git-status-container"):
            # Title
            yield Static("[bold cyan]Git Status[/bold cyan]", id="git-status-title")

            # Status content
            status_text = self._generate_status_text()
            yield Static(status_text, id="git-status-content")

    def on_mount(self) -> None:
        """
        Called when widget is mounted.

        Sets up auto-refresh timer.
        """
        # Set up auto-refresh timer
        self._timer = self.set_interval(
            self.refresh_interval,
            self.update_status
        )

    def on_unmount(self) -> None:
        """
        Called when widget is unmounted.

        Cleans up timer.
        """
        if self._timer:
            self._timer.stop()
            self._timer = None

    def _generate_status_text(self) -> str:
        """
        Generate formatted git status text.

        Returns:
            Formatted status string with rich markup
        """
        # Check if git is installed
        if not self.git_service.is_git_installed():
            return "[dim]Git not available[/dim]"

        # Check if in a git repository
        if not self.git_service.is_git_repo():
            return "[dim]Not a git repository[/dim]"

        lines = []

        # Branch name
        branch = self.git_service.get_current_branch()
        if branch:
            lines.append(f"[cyan]📦 Branch:[/cyan] {branch}")
        else:
            lines.append("[dim]📦 Branch: unknown[/dim]")

        # Uncommitted changes
        uncommitted = self.git_service.get_uncommitted_changes_count()
        if uncommitted > 0:
            lines.append(f"[yellow]● Uncommitted:[/yellow] {uncommitted}")
        else:
            lines.append("[green]● Uncommitted:[/green] 0")

        # Untracked files
        untracked = self.git_service.get_untracked_files_count()
        if untracked > 0:
            lines.append(f"[yellow]? Untracked:[/yellow] {untracked}")
        else:
            lines.append("[dim]? Untracked: 0[/dim]")

        # Ahead/behind status
        if self.git_service.has_remote():
            ahead, behind = self.git_service.get_ahead_behind_count()

            if ahead > 0:
                lines.append(f"[cyan]↑ Ahead:[/cyan] {ahead}")
            if behind > 0:
                lines.append(f"[yellow]↓ Behind:[/yellow] {behind}")
            if ahead == 0 and behind == 0:
                lines.append("[green]✓ Synced[/green]")
        else:
            lines.append("[dim]No remote[/dim]")

        return "\n".join(lines)

    def update_status(self) -> None:
        """Update git status display."""
        try:
            content = self.query_one("#git-status-content", Static)
            status_text = self._generate_status_text()
            content.update(status_text)
        except Exception:
            # Widget not mounted yet or query failed
            pass

    def refresh(self) -> None:
        """Refresh status (alias for update_status)."""
        self.update_status()
