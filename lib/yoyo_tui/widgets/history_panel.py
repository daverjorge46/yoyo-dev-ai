"""
HistoryPanel widget for displaying unified project history.

Shows recent actions from multiple sources:
- Git commits
- Spec creations
- Fix implementations
- Recap completions

Displays last 10 important actions in chronological order (scrollable).
"""

from pathlib import Path
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Static
from textual.reactive import reactive

from ..services.history_tracker import HistoryTracker, HistoryType


class HistoryPanel(Static):
    """
    Widget displaying unified project history.

    Shows last 10 important actions from all sources:
    - Commits (📝)
    - Specs (📄)
    - Fixes (🔧)
    - Recaps (✅)

    Automatically refreshes when project files change.
    Widget is scrollable to accommodate all 10 entries.
    """

    # Reactive property for history updates
    history_content = reactive("")

    def __init__(self, project_root: Path = None, *args, **kwargs):
        """
        Initialize history panel.

        Args:
            project_root: Root directory of the project (defaults to cwd)
        """
        super().__init__(*args, **kwargs)
        self.project_root = project_root or Path.cwd()
        self.tracker = HistoryTracker(self.project_root)

    def on_mount(self) -> None:
        """Called when widget is mounted. Loads initial history."""
        self.refresh_history()

    def refresh_history(self) -> None:
        """Reload history from all sources and update display."""
        try:
            # Get last 10 recent actions (expanded from 3 for better visibility)
            recent_actions = self.tracker.get_recent_actions(count=10)

            # Format history content
            lines = ["[bold cyan]Recent Activity[/bold cyan]", ""]

            if not recent_actions:
                lines.append("[dim]No recent activity[/dim]")
            else:
                for entry in recent_actions:
                    # Get icon based on type
                    icon = self._get_icon(entry.type)

                    # Format timestamp as [HH:MM]
                    time_str = entry.timestamp.strftime("%H:%M")
                    timestamp = f"[dim]\\[{time_str}][/dim]"

                    # Format title (truncate if too long to fit with timestamp)
                    title = entry.title
                    if len(title) > 35:
                        title = title[:32] + "..."

                    # Add entry with timestamp
                    lines.append(f"{timestamp} {icon} {title}")

                    # Add description (PR URL) if available
                    if entry.description:
                        # Extract PR number from URL
                        if "pull/" in entry.description:
                            pr_num = entry.description.split("/pull/")[-1].split("?")[0]
                            lines.append(f"   [dim]PR #{pr_num}[/dim]")
                        else:
                            lines.append(f"   [dim]{entry.description[:50]}[/dim]")

                    lines.append("")  # Spacing

            self.history_content = "\n".join(lines)

        except Exception:
            # Handle errors gracefully
            self.history_content = "[bold cyan]Recent Activity[/bold cyan]\n\n[dim]Unable to load history[/dim]"

    def render(self) -> str:
        """
        Render history content.

        Returns:
            Formatted history content with Rich markup
        """
        return self.history_content

    def _get_icon(self, history_type: HistoryType) -> str:
        """
        Get emoji icon for history entry type.

        Args:
            history_type: Type of history entry

        Returns:
            Emoji icon string
        """
        icons = {
            HistoryType.COMMIT: "📝",
            HistoryType.SPEC: "📄",
            HistoryType.FIX: "🔧",
            HistoryType.RECAP: "✅",
        }
        return icons.get(history_type, "•")

    def watch_history_content(self, new_content: str) -> None:
        """
        Called when history_content reactive property changes.

        Args:
            new_content: New history content
        """
        self.update(new_content)
