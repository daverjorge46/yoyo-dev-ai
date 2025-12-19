"""
SkillsPanel widget for Yoyo Dev TUI.

Displays skill system status including:
- Connection status
- Total skill count and usage
- Average success rate
- Top performing skills
- Recently used skills
"""

from textual.widget import Widget
from textual.reactive import reactive
from rich.text import Text
from rich.panel import Panel
from datetime import datetime
from typing import Optional

from ..models import EventType, Event
from ..utils.panel_icons import PanelIcons
from ..services.skills_bridge import SkillsBridge, SkillsStatus


# =============================================================================
# Helper Functions
# =============================================================================

def format_skill_timestamp(timestamp: Optional[datetime]) -> str:
    """
    Format skill timestamp for display.

    Args:
        timestamp: Datetime to format, or None

    Returns:
        Human-readable timestamp string
    """
    if timestamp is None:
        return "Never"

    now = datetime.now()

    # Handle timezone-aware timestamps
    if timestamp.tzinfo is not None:
        timestamp = timestamp.replace(tzinfo=None)

    diff = now - timestamp
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} min ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hr ago"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days > 1 else ''} ago"


def format_success_rate(rate: float) -> str:
    """
    Format success rate as percentage.

    Args:
        rate: Success rate (0.0 - 1.0)

    Returns:
        Formatted percentage string
    """
    return f"{round(rate * 100)}%"


def get_success_style(rate: float) -> str:
    """
    Get style based on success rate.

    Args:
        rate: Success rate (0.0 - 1.0)

    Returns:
        Rich style string
    """
    if rate >= 0.8:
        return "bold green"
    elif rate >= 0.6:
        return "bold yellow"
    elif rate >= 0.4:
        return "bold orange1"
    else:
        return "bold red"


# =============================================================================
# SkillsPanel Widget
# =============================================================================

class SkillsPanel(Widget):
    """
    Skills status panel for TUI dashboard.

    Displays:
    - Connection status (connected/disconnected)
    - Total skill count and usage
    - Average success rate
    - Top performing skills
    - Recently used skills

    Can be embedded in ProjectOverview or used standalone.
    """

    # Reactive properties
    is_expanded: reactive[bool] = reactive(False)

    # CSS styling
    DEFAULT_CSS = """
    SkillsPanel {
        height: auto;
        padding: 1;
    }
    """

    def __init__(
        self,
        skills_bridge: SkillsBridge,
        event_bus,
        **kwargs
    ):
        """
        Initialize SkillsPanel.

        Args:
            skills_bridge: SkillsBridge instance for database access
            event_bus: EventBus instance for event subscription
        """
        super().__init__(**kwargs)
        self._skills_bridge = skills_bridge
        self._event_bus = event_bus

        # Current status (cached)
        self._status: SkillsStatus = SkillsStatus.disconnected()

        # Track subscriptions for cleanup
        self._subscriptions = []

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        # Subscribe to state updates
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self._event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)

        # Initial update
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted. Clean up subscriptions."""
        for event_type, handler in self._subscriptions:
            self._event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest skills status."""
        try:
            self._status = self._skills_bridge.get_status()
        except Exception as e:
            self._status = SkillsStatus.disconnected(str(e))

        # Trigger re-render
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def render(self) -> Text:
        """
        Render the skills status panel.

        Returns:
            Rich Text object with skills status content
        """
        content = Text()

        # Header with skill icon
        content.append("  Skills", style="bold magenta")

        if not self._status.connected:
            # Disconnected state
            content.append("\n")
            content.append("  ", style="dim")
            content.append(" Not initialized", style="dim red")

            if self._status.error_message:
                content.append(f"\n  {self._status.error_message[:40]}", style="dim")
        else:
            # Connected state
            content.append("\n")

            # Total skills with icon
            content.append("  ", style="dim")
            content.append(" ", style="bold magenta")
            content.append(f" {self._status.total_skills} skills", style="magenta")

            # Scope indicator
            scope_icon = "" if self._status.scope == "project" else ""
            content.append(f" ({scope_icon} {self._status.scope})", style="dim")

            # Usage and success rate
            content.append("\n")
            content.append("  ", style="dim")
            content.append(f" {self._status.total_usage}x used", style="dim cyan")

            if self._status.total_skills > 0:
                rate_style = get_success_style(self._status.average_success_rate)
                content.append(" | ", style="dim")
                content.append(
                    f"{format_success_rate(self._status.average_success_rate)} avg",
                    style=rate_style
                )

            # Top skills (if expanded or has skills)
            if self.is_expanded and self._status.top_skills:
                content.append("\n\n")
                content.append("   Top Skills:\n", style="bold dim")
                for skill in self._status.top_skills[:3]:
                    rate_style = get_success_style(skill.success_rate)
                    content.append(f"    {skill.name[:20]}", style="dim")
                    content.append(f" ({skill.total_usage}x, ", style="dim")
                    content.append(format_success_rate(skill.success_rate), style=rate_style)
                    content.append(")\n", style="dim")

            # Recent activity
            if self._status.recent_skills and len(self._status.recent_skills) > 0:
                most_recent = self._status.recent_skills[0]
                if most_recent.last_used:
                    content.append("\n")
                    content.append("  Last used: ", style="dim")
                    content.append(format_skill_timestamp(most_recent.last_used), style="dim")

        return content

    def get_summary_line(self) -> Text:
        """
        Get a single-line summary for compact display.

        Returns:
            Rich Text with compact summary
        """
        text = Text()

        if not self._status.connected:
            text.append(" Skills: ", style="dim")
            text.append("Not initialized", style="dim red")
        else:
            text.append(" Skills: ", style="dim")
            text.append(f"{self._status.total_skills}", style="bold magenta")
            text.append(f" skills", style="dim")

            if self._status.total_skills > 0:
                rate_style = get_success_style(self._status.average_success_rate)
                text.append(f" ({format_success_rate(self._status.average_success_rate)} avg)", style=rate_style)

        return text


# =============================================================================
# Compact Skills Status Widget
# =============================================================================

class SkillsStatusLine(Widget):
    """
    Compact single-line skills status for embedding in other widgets.

    Shows: " Skills: 5 skills (85% avg)"
    """

    def __init__(
        self,
        skills_bridge: SkillsBridge,
        event_bus,
        **kwargs
    ):
        """
        Initialize SkillsStatusLine.

        Args:
            skills_bridge: SkillsBridge instance
            event_bus: EventBus instance
        """
        super().__init__(**kwargs)
        self._skills_bridge = skills_bridge
        self._event_bus = event_bus
        self._status: SkillsStatus = SkillsStatus.disconnected()
        self._subscriptions = []

    def on_mount(self) -> None:
        """Called when widget is mounted."""
        self._subscriptions.append((EventType.STATE_UPDATED, self._on_state_updated))
        self._event_bus.subscribe(EventType.STATE_UPDATED, self._on_state_updated)
        self._update_display()

    def on_unmount(self) -> None:
        """Called when widget is unmounted."""
        for event_type, handler in self._subscriptions:
            self._event_bus.unsubscribe(event_type, handler)
        self._subscriptions.clear()

    def _on_state_updated(self, event: Event) -> None:
        """Handle STATE_UPDATED events."""
        self._update_display()

    def _update_display(self) -> None:
        """Update display with latest status."""
        try:
            self._status = self._skills_bridge.get_status()
        except Exception:
            self._status = SkillsStatus.disconnected()
        self.refresh()

    def refresh_display(self) -> None:
        """Manually refresh the display."""
        self._update_display()

    def render(self) -> Text:
        """Render compact skills status."""
        text = Text()

        if not self._status.connected:
            text.append(" Skills: ", style="bold magenta")
            text.append("Not initialized", style="dim")
        else:
            text.append(" Skills: ", style="bold magenta")
            text.append(f"{self._status.total_skills}", style="bold magenta")
            text.append(" skills", style="dim")

            # Show success rate if skills exist
            if self._status.total_skills > 0:
                rate_style = get_success_style(self._status.average_success_rate)
                text.append(f" ({format_success_rate(self._status.average_success_rate)} avg)", style=rate_style)

            # Show scope indicator
            scope_icon = "" if self._status.scope == "project" else ""
            text.append(f" [{scope_icon} {self._status.scope}]", style="dim")

        return text
