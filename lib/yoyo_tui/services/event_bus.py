"""
Event Bus system for pub/sub communication.

Provides thread-safe event handling with synchronous delivery.
All handlers are called in the same thread as publish().
"""

import threading
from typing import Dict, List, Callable
from datetime import datetime

from ..models import Event, EventType


class EventBus:
    """
    Centralized event bus for pub/sub communication.

    Thread-safe event handling with synchronous delivery.
    All handlers are called in the same thread as publish().
    """

    def __init__(self, enable_logging: bool = False):
        """
        Initialize the event bus.

        Args:
            enable_logging: Enable event logging for debugging
        """
        self._handlers: Dict[EventType, List[Callable[[Event], None]]] = {}
        self._lock = threading.Lock()
        self._enable_logging = enable_logging
        self._event_log: List[Event] = []

    def subscribe(self, event_type: EventType, handler: Callable[[Event], None]) -> None:
        """
        Subscribe to an event type.

        Args:
            event_type: The type of event to subscribe to
            handler: Callback function to handle the event
                    Signature: handler(event: Event) -> None
        """
        with self._lock:
            if event_type not in self._handlers:
                self._handlers[event_type] = []
            self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: EventType, handler: Callable[[Event], None]) -> None:
        """
        Unsubscribe from an event type.

        Args:
            event_type: The type of event to unsubscribe from
            handler: The handler to remove
        """
        with self._lock:
            if event_type in self._handlers:
                try:
                    self._handlers[event_type].remove(handler)
                except ValueError:
                    # Handler not in list, ignore
                    pass

    def publish(self, event_type: EventType, data: Dict[str, any], source: str = "unknown") -> None:
        """
        Publish an event to all subscribers.

        Args:
            event_type: The type of event
            data: Event payload data
            source: Component that emitted the event
        """
        event = Event(
            event_type=event_type,
            data=data,
            timestamp=datetime.now(),
            source=source
        )

        if self._enable_logging:
            with self._lock:
                self._event_log.append(event)

        # Call all handlers synchronously
        handlers = []
        with self._lock:
            if event_type in self._handlers:
                handlers = self._handlers[event_type].copy()

        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                # Log error but don't stop other handlers
                print(f"Error in event handler for {event_type}: {e}")

    def get_event_log(self) -> List[Event]:
        """Get event log (if logging enabled)."""
        with self._lock:
            return self._event_log.copy()

    def clear_event_log(self) -> None:
        """Clear event log."""
        with self._lock:
            self._event_log.clear()
