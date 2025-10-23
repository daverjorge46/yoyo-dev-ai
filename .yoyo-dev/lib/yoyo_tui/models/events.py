"""
Event system data models.

Defines event types and event data structure for the pub/sub system.
"""

from enum import Enum
from typing import Any, Dict
from dataclasses import dataclass
from datetime import datetime


class EventType(Enum):
    """All event types in the TUI dashboard."""

    # File system events
    FILE_CHANGED = "file_changed"
    FILE_CREATED = "file_created"
    FILE_DELETED = "file_deleted"

    # State change events
    STATE_UPDATED = "state_updated"
    SPEC_CREATED = "spec_created"
    FIX_CREATED = "fix_created"
    TASK_COMPLETED = "task_completed"

    # Execution events
    EXECUTION_STARTED = "execution_started"
    EXECUTION_PROGRESS = "execution_progress"
    EXECUTION_COMPLETED = "execution_completed"

    # Cache events
    CACHE_INVALIDATED = "cache_invalidated"
    CACHE_CLEARED = "cache_cleared"


@dataclass
class Event:
    """
    Event data structure.

    Represents a single event in the system with metadata.
    """

    event_type: EventType
    data: Dict[str, Any]
    timestamp: datetime
    source: str  # Component that emitted the event
