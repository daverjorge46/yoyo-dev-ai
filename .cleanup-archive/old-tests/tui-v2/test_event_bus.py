"""
Unit tests for EventBus system.

Tests cover:
- Subscribe/unsubscribe functionality
- Event publishing and handler invocation
- Multiple handlers for same event
- Handler exception handling
- Event logging
- Thread safety
"""

import pytest
import threading
import time
from datetime import datetime
from typing import List

from lib.yoyo_tui.models import Event, EventType
from lib.yoyo_tui.services.event_bus import EventBus


class TestEventBusBasics:
    """Test basic EventBus functionality."""

    def test_subscribe_and_publish(self):
        """Test subscribing to an event and receiving it."""
        event_bus = EventBus()
        received_events: List[Event] = []

        def handler(event: Event):
            received_events.append(event)

        event_bus.subscribe(EventType.FILE_CHANGED, handler)
        event_bus.publish(
            EventType.FILE_CHANGED,
            {"file_path": "/test/file.md"},
            source="test"
        )

        assert len(received_events) == 1
        assert received_events[0].event_type == EventType.FILE_CHANGED
        assert received_events[0].data["file_path"] == "/test/file.md"
        assert received_events[0].source == "test"
        assert isinstance(received_events[0].timestamp, datetime)

    def test_multiple_handlers_same_event(self):
        """Test multiple handlers can subscribe to same event type."""
        event_bus = EventBus()
        handler1_called = []
        handler2_called = []

        def handler1(event: Event):
            handler1_called.append(event)

        def handler2(event: Event):
            handler2_called.append(event)

        event_bus.subscribe(EventType.STATE_UPDATED, handler1)
        event_bus.subscribe(EventType.STATE_UPDATED, handler2)

        event_bus.publish(EventType.STATE_UPDATED, {"scope": "all"}, source="test")

        assert len(handler1_called) == 1
        assert len(handler2_called) == 1

    def test_unsubscribe(self):
        """Test unsubscribing from events."""
        event_bus = EventBus()
        received_events: List[Event] = []

        def handler(event: Event):
            received_events.append(event)

        event_bus.subscribe(EventType.TASK_COMPLETED, handler)
        event_bus.publish(EventType.TASK_COMPLETED, {"task_id": 1}, source="test")

        assert len(received_events) == 1

        # Unsubscribe and publish again
        event_bus.unsubscribe(EventType.TASK_COMPLETED, handler)
        event_bus.publish(EventType.TASK_COMPLETED, {"task_id": 2}, source="test")

        # Should still be 1 (not 2)
        assert len(received_events) == 1

    def test_publish_without_subscribers(self):
        """Test publishing event with no subscribers doesn't crash."""
        event_bus = EventBus()
        # Should not raise exception
        event_bus.publish(EventType.EXECUTION_STARTED, {}, source="test")

    def test_different_event_types_isolated(self):
        """Test different event types don't interfere."""
        event_bus = EventBus()
        file_events: List[Event] = []
        state_events: List[Event] = []

        def file_handler(event: Event):
            file_events.append(event)

        def state_handler(event: Event):
            state_events.append(event)

        event_bus.subscribe(EventType.FILE_CHANGED, file_handler)
        event_bus.subscribe(EventType.STATE_UPDATED, state_handler)

        event_bus.publish(EventType.FILE_CHANGED, {"file": "test.md"}, source="test")
        event_bus.publish(EventType.STATE_UPDATED, {"scope": "all"}, source="test")

        assert len(file_events) == 1
        assert len(state_events) == 1


class TestEventBusErrorHandling:
    """Test error handling in EventBus."""

    def test_handler_exception_doesnt_stop_others(self):
        """Test that exception in one handler doesn't prevent others from running."""
        event_bus = EventBus()
        handler1_called = []
        handler2_called = []

        def failing_handler(event: Event):
            handler1_called.append(True)
            raise ValueError("Handler error")

        def normal_handler(event: Event):
            handler2_called.append(True)

        event_bus.subscribe(EventType.FILE_CREATED, failing_handler)
        event_bus.subscribe(EventType.FILE_CREATED, normal_handler)

        # Should not raise exception
        event_bus.publish(EventType.FILE_CREATED, {"file": "test.md"}, source="test")

        # Both handlers should have been called
        assert len(handler1_called) == 1
        assert len(handler2_called) == 1

    def test_multiple_handler_exceptions(self):
        """Test multiple handlers failing doesn't crash event bus."""
        event_bus = EventBus()

        def failing_handler1(event: Event):
            raise ValueError("Handler 1 error")

        def failing_handler2(event: Event):
            raise RuntimeError("Handler 2 error")

        event_bus.subscribe(EventType.SPEC_CREATED, failing_handler1)
        event_bus.subscribe(EventType.SPEC_CREATED, failing_handler2)

        # Should not raise exception
        event_bus.publish(EventType.SPEC_CREATED, {"spec": "test"}, source="test")


class TestEventBusLogging:
    """Test event logging functionality."""

    def test_event_logging_disabled_by_default(self):
        """Test event logging is disabled by default."""
        event_bus = EventBus()
        event_bus.publish(EventType.FILE_CHANGED, {"file": "test.md"}, source="test")

        log = event_bus.get_event_log()
        assert len(log) == 0

    def test_event_logging_when_enabled(self):
        """Test event logging when enabled."""
        event_bus = EventBus(enable_logging=True)

        event_bus.publish(EventType.FILE_CHANGED, {"file": "test1.md"}, source="test")
        event_bus.publish(EventType.STATE_UPDATED, {"scope": "all"}, source="test")

        log = event_bus.get_event_log()
        assert len(log) == 2
        assert log[0].event_type == EventType.FILE_CHANGED
        assert log[1].event_type == EventType.STATE_UPDATED

    def test_clear_event_log(self):
        """Test clearing event log."""
        event_bus = EventBus(enable_logging=True)

        event_bus.publish(EventType.FILE_CHANGED, {"file": "test.md"}, source="test")
        assert len(event_bus.get_event_log()) == 1

        event_bus.clear_event_log()
        assert len(event_bus.get_event_log()) == 0

    def test_event_log_contains_all_details(self):
        """Test event log contains complete event data."""
        event_bus = EventBus(enable_logging=True)

        event_bus.publish(
            EventType.EXECUTION_PROGRESS,
            {"task": 1, "subtask": 2},
            source="ExecutionManager"
        )

        log = event_bus.get_event_log()
        event = log[0]

        assert event.event_type == EventType.EXECUTION_PROGRESS
        assert event.data["task"] == 1
        assert event.data["subtask"] == 2
        assert event.source == "ExecutionManager"
        assert isinstance(event.timestamp, datetime)


class TestEventBusThreadSafety:
    """Test thread safety of EventBus."""

    def test_concurrent_subscriptions(self):
        """Test concurrent subscriptions are thread-safe."""
        event_bus = EventBus()
        handlers_called = []

        def handler(event: Event):
            handlers_called.append(event)

        def subscribe_thread():
            event_bus.subscribe(EventType.FILE_CHANGED, handler)

        # Create multiple threads subscribing simultaneously
        threads = [threading.Thread(target=subscribe_thread) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Publish event - all handlers should be called
        event_bus.publish(EventType.FILE_CHANGED, {"file": "test.md"}, source="test")
        assert len(handlers_called) == 10

    def test_concurrent_publishes(self):
        """Test concurrent publishes are thread-safe."""
        event_bus = EventBus()
        received_events = []
        lock = threading.Lock()

        def handler(event: Event):
            with lock:
                received_events.append(event)

        event_bus.subscribe(EventType.STATE_UPDATED, handler)

        def publish_thread(thread_id: int):
            event_bus.publish(
                EventType.STATE_UPDATED,
                {"thread_id": thread_id},
                source=f"thread-{thread_id}"
            )

        # Create multiple threads publishing simultaneously
        threads = [
            threading.Thread(target=publish_thread, args=(i,))
            for i in range(20)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(received_events) == 20

    def test_concurrent_subscribe_and_publish(self):
        """Test concurrent subscribe and publish operations."""
        event_bus = EventBus()
        received_events = []
        lock = threading.Lock()

        def handler(event: Event):
            with lock:
                received_events.append(event)

        def subscribe_thread():
            event_bus.subscribe(EventType.CACHE_INVALIDATED, handler)
            time.sleep(0.001)

        def publish_thread():
            time.sleep(0.001)
            event_bus.publish(
                EventType.CACHE_INVALIDATED,
                {"key": "test"},
                source="test"
            )

        # Mix subscribe and publish threads
        threads = []
        for i in range(5):
            threads.append(threading.Thread(target=subscribe_thread))
            threads.append(threading.Thread(target=publish_thread))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All publish threads should have triggered handlers
        # At least some events should have been received
        assert len(received_events) >= 5

    def test_event_logging_thread_safe(self):
        """Test event logging is thread-safe."""
        event_bus = EventBus(enable_logging=True)

        def publish_thread(thread_id: int):
            event_bus.publish(
                EventType.FILE_CHANGED,
                {"thread": thread_id},
                source=f"thread-{thread_id}"
            )

        threads = [
            threading.Thread(target=publish_thread, args=(i,))
            for i in range(50)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        log = event_bus.get_event_log()
        assert len(log) == 50


class TestAllEventTypes:
    """Test all defined event types are usable."""

    def test_all_event_types(self):
        """Test all EventType enum values can be used."""
        event_bus = EventBus()
        received_events: List[Event] = []

        def handler(event: Event):
            received_events.append(event)

        # Test all event types
        event_types = [
            EventType.FILE_CHANGED,
            EventType.FILE_CREATED,
            EventType.FILE_DELETED,
            EventType.STATE_UPDATED,
            EventType.SPEC_CREATED,
            EventType.FIX_CREATED,
            EventType.TASK_COMPLETED,
            EventType.EXECUTION_STARTED,
            EventType.EXECUTION_PROGRESS,
            EventType.EXECUTION_COMPLETED,
            EventType.CACHE_INVALIDATED,
            EventType.CACHE_CLEARED,
        ]

        for event_type in event_types:
            event_bus.subscribe(event_type, handler)
            event_bus.publish(event_type, {"test": "data"}, source="test")

        assert len(received_events) == len(event_types)
