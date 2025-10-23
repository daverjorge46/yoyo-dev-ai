"""
Models package for Yoyo Dev TUI.

Provides data models for events and application state.
"""

# Import from events module (new models in models/ package)
from .events import Event, EventType

# Re-export models from data_models for backward compatibility
from .data_models import (
    Subtask,
    ParentTask,
    TaskData,
    SpecData,
    GitStatus,
    CommandEntry,
    FilePath,
    TaskList,
    SpecList,
)

__all__ = [
    "Event",
    "EventType",
    "Subtask",
    "ParentTask",
    "TaskData",
    "SpecData",
    "GitStatus",
    "CommandEntry",
    "FilePath",
    "TaskList",
    "SpecList",
]
