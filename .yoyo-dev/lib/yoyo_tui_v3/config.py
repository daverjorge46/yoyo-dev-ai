"""
Configuration management for Yoyo Dev TUI v3.0
"""

import os
from pathlib import Path
from .models import TUIConfig


class ConfigManager:
    """Manage TUI configuration."""

    @staticmethod
    def load() -> TUIConfig:
        """
        Load TUI configuration from environment and defaults.

        Returns:
            TUIConfig: Loaded configuration
        """
        # Get terminal width from environment or default
        terminal_width = int(os.environ.get("COLUMNS", "120"))

        # Get refresh interval from environment or default (10 seconds)
        refresh_interval = int(os.environ.get("YOYO_REFRESH_INTERVAL", "10"))

        # Get cache TTL from environment or default (10 seconds)
        cache_ttl = int(os.environ.get("YOYO_CACHE_TTL", "10"))

        # Get .yoyo-dev path (current directory by default)
        yoyo_dev_path = Path(os.environ.get("YOYO_DEV_PATH", Path.cwd() / ".yoyo-dev"))

        # Feature flags
        file_watching = os.environ.get("YOYO_FILE_WATCHING", "false").lower() == "true"
        mcp_monitoring = os.environ.get("YOYO_MCP_MONITORING", "true").lower() == "true"
        error_detection = os.environ.get("YOYO_ERROR_DETECTION", "true").lower() == "true"

        return TUIConfig(
            terminal_width=terminal_width,
            color_scheme=os.environ.get("YOYO_COLOR_SCHEME", "default"),
            show_timestamps=True,
            refresh_interval_seconds=refresh_interval,
            cache_ttl_seconds=cache_ttl,
            file_watching=file_watching,
            mcp_monitoring=mcp_monitoring,
            error_detection=error_detection,
            yoyo_dev_path=yoyo_dev_path,
            lazy_loading=True,
            max_history_entries=10,
        )

    @staticmethod
    def save(config: TUIConfig) -> None:
        """
        Save TUI configuration (not implemented in Phase 1).

        Args:
            config: Configuration to save
        """
        # TODO: Implement config persistence if needed
        pass
