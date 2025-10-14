"""
Yoyo Dev Textual TUI Package

A modern, interactive terminal user interface for Yoyo Dev built with Textual.

This package provides:
- Interactive task management and navigation
- Command palette for quick access to Yoyo Dev workflows
- Real-time git integration and status monitoring
- Beautiful, responsive terminal UI with keyboard shortcuts
- Live file watching for automatic updates

Version: 1.0.0
"""

__version__ = "1.0.0"
__author__ = "Yoyo Dev"

# Export main models for convenient imports
from .models import (
    Subtask,
    ParentTask,
    TaskData,
    SpecData,
    GitStatus,
)

from .config import TUIConfig, ConfigManager
from .app import YoyoDevApp, create_app

__all__ = [
    "Subtask",
    "ParentTask",
    "TaskData",
    "SpecData",
    "GitStatus",
    "TUIConfig",
    "ConfigManager",
    "YoyoDevApp",
    "create_app",
    "__version__",
]
