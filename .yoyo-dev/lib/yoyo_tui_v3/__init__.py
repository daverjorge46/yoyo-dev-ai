"""
Yoyo Dev TUI v3.0 - Production-Ready Intelligent Dashboard

A modern, intelligent terminal user interface for AI-assisted development.
"""

__version__ = "3.0.0-beta"
__author__ = "Yoyo Dev Team"

from .models import (
    # Enums
    ErrorType,
    ActionType,
    SpecStatus,
    TaskStatus,
    EventType,

    # Core models
    Task,
    Spec,
    Fix,
    ActiveWork,
    CommandSuggestion,
    DetectedError,
    HistoryEntry,
    ExecutionState,
    MCPServerStatus,
    ProjectStats,
    GitStatus,
    Event,
    TUIConfig,

    # Helper functions
    calculate_progress,
    calculate_eta,
    format_timestamp,
)

__all__ = [
    # Version info
    "__version__",
    "__author__",

    # Enums
    "ErrorType",
    "ActionType",
    "SpecStatus",
    "TaskStatus",
    "EventType",

    # Models
    "Task",
    "Spec",
    "Fix",
    "ActiveWork",
    "CommandSuggestion",
    "DetectedError",
    "HistoryEntry",
    "ExecutionState",
    "MCPServerStatus",
    "ProjectStats",
    "GitStatus",
    "Event",
    "TUIConfig",

    # Helpers
    "calculate_progress",
    "calculate_eta",
    "format_timestamp",
]


def create_app():
    """
    Create and configure the Yoyo Dev TUI application.

    Returns:
        YoyoDevTUIApp: Configured application instance ready to run
    """
    from .app import YoyoDevTUIApp
    return YoyoDevTUIApp()
