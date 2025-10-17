"""
GitStatus Widget - Display git repository status with live updates.

Shows branch name, uncommitted changes, untracked files, and sync status.
Auto-refreshes every 5 seconds using Textual's set_interval.

Uses async git operations to prevent blocking the UI thread.
"""

from pathlib import Path
from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget
from textual.containers import Vertical

from ..services.git_service import GitService, CachedGitService


class GitStatus(Widget):
    """
    Git status widget for displaying repository information.

    Shows branch, uncommitted changes, untracked files, ahead/behind count.
    Auto-refreshes every 5 seconds.

    Attributes:
        git_service: GitService instance for git operations
        refresh_interval: Update interval in seconds (default 5)
    """

    def __init__(self, refresh_interval: int = 5, git_cache_ttl: float = 30.0, *args, **kwargs):
        """
        Initialize GitStatus widget.

        Args:
            refresh_interval: Auto-refresh interval in seconds (default 5)
            git_cache_ttl: Cache time-to-live for git operations in seconds (default 30.0, Task 8)
        """
        super().__init__(*args, **kwargs)
        self.git_service = CachedGitService(ttl_seconds=git_cache_ttl)
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

            # Status content (will be populated async)
            yield Static("[dim]Loading...[/dim]", id="git-status-content")

    def on_mount(self) -> None:
        """
        Called when widget is mounted.

        Sets up auto-refresh timer and loads initial status.
        """
        # Load initial status immediately
        self.update_status()

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

    async def _generate_status_text(self) -> str:
        """
        Generate formatted git status text (async version).

        Runs git operations in background thread to prevent UI blocking.

        Returns:
            Formatted status string with rich markup
        """
        # Check if git is installed (cached, fast)
        if not GitService.is_git_installed():
            return "[dim]Git not available[/dim]"

        # Get current directory
        cwd = Path.cwd()

        # Check if in a git repository (runs in background thread)
        is_repo = await GitService.is_git_repo_async(cwd)
        if not is_repo:
            return "[dim]Not a git repository[/dim]"

        # Get complete git status in one call (runs in background thread, cached)
        status = await self.git_service.get_status_async(cwd)

        lines = []

        # Branch name
        if status.branch:
            lines.append(f"[cyan]📦 Branch:[/cyan] {status.branch}")
        else:
            lines.append("[dim]📦 Branch: unknown[/dim]")

        # Uncommitted changes
        if status.uncommitted > 0:
            lines.append(f"[yellow]● Uncommitted:[/yellow] {status.uncommitted}")
        else:
            lines.append("[green]● Uncommitted:[/green] 0")

        # Untracked files
        if status.untracked > 0:
            lines.append(f"[yellow]? Untracked:[/yellow] {status.untracked}")
        else:
            lines.append("[dim]? Untracked: 0[/dim]")

        # Ahead/behind status
        has_remote = await GitService.has_remote_async(cwd)
        if has_remote:
            if status.ahead > 0:
                lines.append(f"[cyan]↑ Ahead:[/cyan] {status.ahead}")
            if status.behind > 0:
                lines.append(f"[yellow]↓ Behind:[/yellow] {status.behind}")
            if status.ahead == 0 and status.behind == 0:
                lines.append("[green]✓ Synced[/green]")
        else:
            lines.append("[dim]No remote[/dim]")

        return "\n".join(lines)

    def update_status(self) -> None:
        """
        Update git status display.

        Schedules async status generation without blocking the UI.
        This method is called by set_interval timer.
        """
        # Schedule the async work
        self.run_worker(self._update_status_async(), exclusive=True)

    async def _update_status_async(self) -> None:
        """
        Update git status display (async implementation).

        Runs git operations in background thread, then updates UI on main thread.
        Handles errors gracefully and shows user-friendly error messages.
        """
        try:
            # Generate status text (runs in background thread)
            status_text = await self._generate_status_text()

            # Update UI (runs on main thread)
            content = self.query_one("#git-status-content", Static)
            content.update(status_text)
        except Exception as e:
            # Git operation failed - show error with retry hint
            try:
                content = self.query_one("#git-status-content", Static)
                content.update(
                    f"[red]Git error:[/red]\n[dim]{str(e)[:40]}...[/dim]\n\n"
                    f"[dim italic]Press 'r' to retry[/dim italic]"
                )

                # Notify user of error
                if hasattr(self, 'app'):
                    self.app.notify(
                        f"Git operation failed: {str(e)[:50]}",
                        severity="error",
                        timeout=5
                    )
            except Exception:
                # Widget not mounted yet or query failed - fail silently
                pass

    def refresh(self, **kwargs) -> None:
        """
        Refresh status (alias for update_status).

        Accepts any kwargs for compatibility with parent Widget.refresh().
        """
        self.update_status()
