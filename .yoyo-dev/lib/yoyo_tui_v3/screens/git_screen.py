"""
Git Screen for Yoyo Dev TUI.

Displays git status, branches, and recent commits.
"""

from textual.screen import Screen
from textual.widgets import Static
from textual.containers import Container, ScrollableContainer
from textual.binding import Binding
from rich.text import Text
import subprocess
from pathlib import Path


class GitScreen(Screen):
    """
    Git screen showing status, branches, and recent commits.

    Press ESC or q to close.
    """

    BINDINGS = [
        Binding("escape", "close", "Close"),
        Binding("q", "close", "Close"),
        Binding("r", "refresh", "Refresh"),
    ]

    CSS = """
    GitScreen {
        align: center middle;
    }

    #git-container {
        width: 100;
        height: 90%;
        background: $panel;
        border: heavy $primary;
        padding: 2;
    }

    #git-content {
        height: auto;
    }
    """

    def __init__(self, **kwargs):
        """Initialize GitScreen."""
        super().__init__(**kwargs)
        self._git_status = None
        self._branches = None
        self._commits = None

    def compose(self):
        """Compose the git screen layout."""
        with Container(id="git-container"):
            with ScrollableContainer(id="git-scroll"):
                yield Static(self._build_git_content(), id="git-content")

    def on_mount(self) -> None:
        """Called when screen is mounted."""
        self._load_git_data()

    def _load_git_data(self) -> None:
        """Load git data."""
        try:
            # Get git status
            result = subprocess.run(
                ["git", "status", "--short"],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._git_status = result.stdout.strip() if result.returncode == 0 else "Error getting status"

            # Get branches
            result = subprocess.run(
                ["git", "branch", "-vv"],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._branches = result.stdout.strip() if result.returncode == 0 else "Error getting branches"

            # Get recent commits
            result = subprocess.run(
                ["git", "log", "--oneline", "-10"],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._commits = result.stdout.strip() if result.returncode == 0 else "Error getting commits"

        except subprocess.TimeoutExpired:
            self._git_status = "Timeout"
            self._branches = "Timeout"
            self._commits = "Timeout"
        except Exception as e:
            self._git_status = f"Error: {e}"
            self._branches = f"Error: {e}"
            self._commits = f"Error: {e}"

    def _build_git_content(self) -> Text:
        """
        Build the git content.

        Returns:
            Rich Text object with git content
        """
        content = Text()

        # Header
        content.append("╔════════════════════════════════════════════════════════════════════════════════╗\n", style="bold cyan")
        content.append("║                            ", style="bold cyan")
        content.append("GIT STATUS", style="bold white")
        content.append("                                    ║\n", style="bold cyan")
        content.append("╚════════════════════════════════════════════════════════════════════════════════╝\n\n", style="bold cyan")

        # Current Status
        content.append("📊 WORKING DIRECTORY STATUS\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        if self._git_status:
            if self._git_status.strip():
                for line in self._git_status.split('\n'):
                    if line.startswith('M '):
                        content.append(f"  {line}\n", style="yellow")
                    elif line.startswith('A '):
                        content.append(f"  {line}\n", style="green")
                    elif line.startswith('D '):
                        content.append(f"  {line}\n", style="red")
                    elif line.startswith('?? '):
                        content.append(f"  {line}\n", style="dim")
                    else:
                        content.append(f"  {line}\n")
            else:
                content.append("  ✓ Working directory clean\n", style="green")
        else:
            content.append("  Loading...\n", style="dim")

        content.append("\n")

        # Branches
        content.append("🌿 BRANCHES\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        if self._branches:
            for line in self._branches.split('\n'):
                if line.startswith('* '):
                    # Current branch (highlighted)
                    content.append(f"  {line}\n", style="bold green")
                else:
                    content.append(f"  {line}\n", style="dim")
        else:
            content.append("  Loading...\n", style="dim")

        content.append("\n")

        # Recent Commits
        content.append("📝 RECENT COMMITS\n", style="bold yellow")
        content.append("─" * 80 + "\n\n", style="dim")

        if self._commits:
            for line in self._commits.split('\n'):
                # Parse commit hash and message
                parts = line.split(' ', 1)
                if len(parts) == 2:
                    commit_hash, message = parts
                    content.append(f"  {commit_hash}", style="bold cyan")
                    content.append(f" {message}\n", style="dim")
                else:
                    content.append(f"  {line}\n", style="dim")
        else:
            content.append("  Loading...\n", style="dim")

        content.append("\n")

        # Footer
        content.append("─" * 80 + "\n", style="dim")
        content.append("Press ", style="dim")
        content.append("r", style="bold cyan")
        content.append(" to refresh • ", style="dim")
        content.append("ESC", style="bold cyan")
        content.append(" or ", style="dim")
        content.append("q", style="bold cyan")
        content.append(" to close\n", style="dim")

        return content

    def action_close(self) -> None:
        """Close the git screen."""
        self.app.pop_screen()

    def action_refresh(self) -> None:
        """Refresh git data."""
        self._load_git_data()
        # Update the content widget
        content_widget = self.query_one("#git-content", Static)
        content_widget.update(self._build_git_content())
        self.notify("Git data refreshed", severity="information")
