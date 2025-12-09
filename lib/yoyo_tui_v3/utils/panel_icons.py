"""
Shared icon constants for Yoyo Dev TUI panels.

Provides consistent icons and styling across all dashboard panels.
"""


class PanelIcons:
    """
    Consistent icon set for all panels.

    Usage:
        from lib.yoyo_tui_v3.utils.panel_icons import PanelIcons

        icon = PanelIcons.COMPLETED
        style = PanelIcons.get_status_style(PanelIcons.COMPLETED)
    """

    # Status icons
    COMPLETED = "✓"
    IN_PROGRESS = "◐"
    PENDING = "○"
    ERROR = "✗"
    WARNING = "⚠"
    INFO = "ℹ"

    # Action icons
    TASK = "📋"
    SPEC = "⚡"
    FIX = "🐛"
    GIT = "🔀"
    COMMAND = "▶"
    COPY = "📋"

    # Section icons
    MISSION = "📋"
    TECH = "🔧"
    STATS = "📊"
    MCP = "🔌"

    # Severity icons
    CRITICAL = "🔴"
    HIGH = "⚠️"
    MEDIUM = "⚡"
    LOW = "ℹ️"

    # Navigation icons
    EXPAND = "▼"
    COLLAPSE = "▶"
    LINK = "→"
    BACK = "←"

    # Connection status
    CONNECTED = "✓"
    DISCONNECTED = "✗"

    @classmethod
    def get_status_style(cls, icon: str) -> str:
        """
        Get Rich style for a status icon.

        Args:
            icon: Icon character

        Returns:
            Rich style string for the icon
        """
        styles = {
            cls.COMPLETED: "green",
            cls.IN_PROGRESS: "yellow",
            cls.PENDING: "dim",
            cls.ERROR: "red bold",
            cls.WARNING: "yellow",
            cls.INFO: "cyan",
            cls.CONNECTED: "green",
            cls.DISCONNECTED: "red",
        }
        return styles.get(icon, "")

    @classmethod
    def get_severity_style(cls, severity: str) -> str:
        """
        Get Rich style for a severity level.

        Args:
            severity: Severity level (critical, high, medium, low)

        Returns:
            Rich style string
        """
        styles = {
            "critical": "red bold",
            "high": "red",
            "medium": "yellow",
            "low": "cyan",
        }
        return styles.get(severity.lower(), "dim")

    @classmethod
    def get_severity_icon(cls, severity: str) -> str:
        """
        Get icon for a severity level.

        Args:
            severity: Severity level (critical, high, medium, low)

        Returns:
            Icon character
        """
        icons = {
            "critical": cls.CRITICAL,
            "high": cls.HIGH,
            "medium": cls.MEDIUM,
            "low": cls.LOW,
        }
        return icons.get(severity.lower(), cls.INFO)

    @classmethod
    def get_action_icon(cls, action_type: str) -> str:
        """
        Get icon for an action type.

        Args:
            action_type: Type of action (task, spec, fix, git, command)

        Returns:
            Icon character
        """
        icons = {
            "task": cls.TASK,
            "spec": cls.SPEC,
            "fix": cls.FIX,
            "git": cls.GIT,
            "command": cls.COMMAND,
        }
        return icons.get(action_type.lower(), "•")
