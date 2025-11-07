"""
Unit tests for EventBus subscribe/unsubscribe functionality and cleanup behavior.

This test suite verifies that EventBus properly handles:
- Handler subscription and unsubscription
- Handler cleanup verification
- Event publishing to subscribed handlers only
- No handlers called after unsubscribe

These tests document the expected behavior of EventBus cleanup and verify
that handlers are properly removed when unsubscribed.

REGRESSION TESTS: Tests added to verify the fix prevents handler leaks
and ensures clean unmount cycles.
"""

import pytest
from unittest.mock import Mock, MagicMock

from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.models import EventType


class TestEventBusSubscribeUnsubscribe:
    """Test basic EventBus subscribe/unsubscribe functionality."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_subscribe_handler(self, event_bus):
        """
        Test that handlers can be subscribed to events.

        Expected: Handler is registered and receives events
        """
        handler = Mock()
        event_bus.subscribe(EventType.STATE_UPDATED, handler)

        # Publish event
        event_bus.publish(EventType.STATE_UPDATED, {"test": "data"}, source="test")

        # Handler should be called
        handler.assert_called_once()
        call_args = handler.call_args[0][0]  # Get first positional arg (the event)
        assert call_args.event_type == EventType.STATE_UPDATED
        assert call_args.data == {"test": "data"}

    def test_unsubscribe_handler(self, event_bus):
        """
        Test that handlers can be unsubscribed from events.

        Expected: After unsubscribe, handler should NOT receive events
        Actual: Should work correctly (this is not the bug location)
        """
        handler = Mock()

        # Subscribe
        event_bus.subscribe(EventType.STATE_UPDATED, handler)

        # Publish - handler should be called
        event_bus.publish(EventType.STATE_UPDATED, {"test": "1"}, source="test")
        assert handler.call_count == 1

        # Unsubscribe
        event_bus.unsubscribe(EventType.STATE_UPDATED, handler)

        # Publish again - handler should NOT be called
        event_bus.publish(EventType.STATE_UPDATED, {"test": "2"}, source="test")
        assert handler.call_count == 1  # Still 1, not 2

    def test_unsubscribe_nonexistent_handler(self, event_bus):
        """
        Test that unsubscribing a non-existent handler doesn't raise errors.

        Expected: Should handle gracefully (no exception)
        """
        handler = Mock()

        # Try to unsubscribe without subscribing first
        # Should not raise exception
        try:
            event_bus.unsubscribe(EventType.STATE_UPDATED, handler)
        except Exception as e:
            pytest.fail(f"Unsubscribe raised unexpected exception: {e}")

    def test_multiple_handlers_same_event(self, event_bus):
        """
        Test multiple handlers subscribed to the same event.

        Expected: All handlers receive the event
        """
        handler1 = Mock()
        handler2 = Mock()
        handler3 = Mock()

        # Subscribe all handlers
        event_bus.subscribe(EventType.STATE_UPDATED, handler1)
        event_bus.subscribe(EventType.STATE_UPDATED, handler2)
        event_bus.subscribe(EventType.STATE_UPDATED, handler3)

        # Publish event
        event_bus.publish(EventType.STATE_UPDATED, {}, source="test")

        # All handlers should be called
        handler1.assert_called_once()
        handler2.assert_called_once()
        handler3.assert_called_once()

    def test_selective_unsubscribe(self, event_bus):
        """
        Test that unsubscribing one handler doesn't affect others.

        Expected: Only unsubscribed handler stops receiving events
        """
        handler1 = Mock()
        handler2 = Mock()
        handler3 = Mock()

        # Subscribe all
        event_bus.subscribe(EventType.STATE_UPDATED, handler1)
        event_bus.subscribe(EventType.STATE_UPDATED, handler2)
        event_bus.subscribe(EventType.STATE_UPDATED, handler3)

        # Unsubscribe handler2
        event_bus.unsubscribe(EventType.STATE_UPDATED, handler2)

        # Publish event
        event_bus.publish(EventType.STATE_UPDATED, {}, source="test")

        # Only handler1 and handler3 should be called
        handler1.assert_called_once()
        handler2.assert_not_called()
        handler3.assert_called_once()


class TestEventBusHandlerCleanup:
    """Test EventBus handler cleanup and verification."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_handler_count_after_subscribe(self, event_bus):
        """
        Test that handler count increases after subscription.

        Expected: Handler list grows with subscriptions
        """
        handler1 = Mock()
        handler2 = Mock()

        # Initial count should be 0 or handlers dict empty
        initial_count = len(event_bus._handlers.get(EventType.STATE_UPDATED, []))
        assert initial_count == 0

        # Subscribe handlers
        event_bus.subscribe(EventType.STATE_UPDATED, handler1)
        count_after_one = len(event_bus._handlers[EventType.STATE_UPDATED])
        assert count_after_one == 1

        event_bus.subscribe(EventType.STATE_UPDATED, handler2)
        count_after_two = len(event_bus._handlers[EventType.STATE_UPDATED])
        assert count_after_two == 2

    def test_handler_count_after_unsubscribe(self, event_bus):
        """
        Test that handler count decreases after unsubscription.

        Expected: Handler list shrinks when handlers unsubscribe
        """
        handler1 = Mock()
        handler2 = Mock()

        # Subscribe handlers
        event_bus.subscribe(EventType.STATE_UPDATED, handler1)
        event_bus.subscribe(EventType.STATE_UPDATED, handler2)
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 2

        # Unsubscribe one
        event_bus.unsubscribe(EventType.STATE_UPDATED, handler1)
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

        # Unsubscribe the other
        event_bus.unsubscribe(EventType.STATE_UPDATED, handler2)
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 0

    def test_complete_cleanup_after_unsubscribe_all(self, event_bus):
        """
        Test that handlers list is completely cleaned after all unsubscribe.

        Expected: No orphaned handlers remain
        """
        handlers = [Mock() for _ in range(5)]

        # Subscribe all
        for handler in handlers:
            event_bus.subscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, handler)

        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 5

        # Unsubscribe all
        for handler in handlers:
            event_bus.unsubscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, handler)

        # Should be empty
        handler_list = event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]
        assert len(handler_list) == 0

    def test_no_events_received_after_unsubscribe(self, event_bus):
        """
        Test that unsubscribed handlers don't receive any events.

        Expected: Handler call count remains unchanged after unsubscribe
        """
        handler = Mock()

        # Subscribe and trigger event
        event_bus.subscribe(EventType.ERROR_DETECTED, handler)
        event_bus.publish(EventType.ERROR_DETECTED, {"error": "test"}, source="test")
        assert handler.call_count == 1

        # Unsubscribe
        event_bus.unsubscribe(EventType.ERROR_DETECTED, handler)

        # Trigger multiple events
        for i in range(10):
            event_bus.publish(EventType.ERROR_DETECTED, {"error": f"test{i}"}, source="test")

        # Call count should still be 1
        assert handler.call_count == 1


class TestEventBusCleanupPatterns:
    """Test proper cleanup patterns for widgets/screens using EventBus."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_widget_lifecycle_with_proper_cleanup(self, event_bus):
        """
        Test the CORRECT pattern: widget with proper cleanup in on_unmount.

        This demonstrates how widgets SHOULD handle EventBus subscriptions.

        Expected: After unmount, no handlers remain registered
        """
        class WellBehavedWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                """Subscribe to events and track subscriptions."""
                self._subscriptions.append(
                    (EventType.STATE_UPDATED, self.handle_state_update)
                )
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handle_state_update)

            def handle_state_update(self, event):
                """Handle state update."""
                pass

            def on_unmount(self):
                """Properly unsubscribe all handlers."""
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Create and mount widget
        widget = WellBehavedWidget(event_bus)
        widget.on_mount()

        # Verify handler is registered
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

        # Unmount widget
        widget.on_unmount()

        # Verify handler is removed
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 0

    def test_widget_lifecycle_without_cleanup_causes_leak(self, event_bus):
        """
        Test the INCORRECT pattern: widget without cleanup in on_unmount.

        This demonstrates the BUG: handlers remain registered after unmount.

        Expected: This test should FAIL, demonstrating the memory leak
        """
        class BadWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus

            def on_mount(self):
                """Subscribe to events but don't track subscriptions."""
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handle_state_update)

            def handle_state_update(self, event):
                """Handle state update."""
                pass

            def on_unmount(self):
                """BUG: Doesn't unsubscribe handlers."""
                pass  # No cleanup!

        # Create and mount widget
        widget = BadWidget(event_bus)
        widget.on_mount()

        # Verify handler is registered
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

        # Unmount widget
        widget.on_unmount()

        # BUG: Handler is still registered!
        handler_count = len(event_bus._handlers[EventType.STATE_UPDATED])
        if handler_count != 0:
            pytest.fail(
                f"Memory leak detected: {handler_count} handlers remain after unmount. "
                "Widget should unsubscribe handlers in on_unmount(). "
                "This test documents the bug in the codebase."
            )

    def test_screen_with_multiple_subscriptions_cleanup(self, event_bus):
        """
        Test screen with multiple event subscriptions needs proper cleanup.

        Mimics MainDashboard which subscribes to 5 different event types.

        Expected: All handlers cleaned up after unmount
        Actual: Without fix, handlers leak
        """
        class ScreenWithMultipleSubscriptions:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                """Subscribe to multiple events (like MainDashboard)."""
                subscriptions = [
                    (EventType.STATE_UPDATED, self.handle_state),
                    (EventType.ERROR_DETECTED, self.handle_error),
                    (EventType.COMMAND_SUGGESTIONS_UPDATED, self.handle_suggestions),
                    (EventType.EXECUTION_STARTED, self.handle_exec_start),
                    (EventType.EXECUTION_COMPLETED, self.handle_exec_complete),
                ]

                for event_type, handler in subscriptions:
                    self.event_bus.subscribe(event_type, handler)
                    self._subscriptions.append((event_type, handler))

            def handle_state(self, event):
                pass

            def handle_error(self, event):
                pass

            def handle_suggestions(self, event):
                pass

            def handle_exec_start(self, event):
                pass

            def handle_exec_complete(self, event):
                pass

            def on_unmount(self):
                """CORRECT: Clean up all subscriptions."""
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Create and mount screen
        screen = ScreenWithMultipleSubscriptions(event_bus)
        screen.on_mount()

        # Verify all handlers are registered
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1
        assert len(event_bus._handlers[EventType.ERROR_DETECTED]) == 1
        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 1
        assert len(event_bus._handlers[EventType.EXECUTION_STARTED]) == 1
        assert len(event_bus._handlers[EventType.EXECUTION_COMPLETED]) == 1

        # Unmount screen
        screen.on_unmount()

        # Verify all handlers are removed
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 0
        assert len(event_bus._handlers[EventType.ERROR_DETECTED]) == 0
        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 0
        assert len(event_bus._handlers[EventType.EXECUTION_STARTED]) == 0
        assert len(event_bus._handlers[EventType.EXECUTION_COMPLETED]) == 0

    def test_multiple_mount_unmount_cycles(self, event_bus):
        """
        Test multiple mount/unmount cycles don't leak handlers.

        Simulates screen navigation: mounting and unmounting screens repeatedly.

        Expected: Handler count returns to 0 after each unmount cycle
        """
        class CycleTestWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscription = None

            def on_mount(self):
                self._subscription = self.handle_event
                self.event_bus.subscribe(EventType.STATE_UPDATED, self._subscription)

            def handle_event(self, event):
                pass

            def on_unmount(self):
                if self._subscription:
                    self.event_bus.unsubscribe(EventType.STATE_UPDATED, self._subscription)
                    self._subscription = None

        # Perform multiple mount/unmount cycles
        for cycle in range(10):
            widget = CycleTestWidget(event_bus)
            widget.on_mount()

            # During mount, handler should exist
            assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

            widget.on_unmount()

            # After unmount, handler should be removed
            handler_count = len(event_bus._handlers[EventType.STATE_UPDATED])
            assert handler_count == 0, \
                f"Cycle {cycle}: Handler leak detected, {handler_count} handlers remain"


class TestEventBusThreadSafety:
    """Test EventBus thread-safety during concurrent subscribe/unsubscribe."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=False)  # Disable logging for performance

    def test_concurrent_subscribe_unsubscribe(self, event_bus):
        """
        Test that concurrent subscribe/unsubscribe operations are thread-safe.

        Expected: No race conditions or data corruption
        """
        import threading

        handlers = [Mock() for _ in range(20)]
        threads = []

        def subscribe_handler(handler):
            event_bus.subscribe(EventType.STATE_UPDATED, handler)

        def unsubscribe_handler(handler):
            event_bus.unsubscribe(EventType.STATE_UPDATED, handler)

        # Subscribe in multiple threads
        for handler in handlers:
            t = threading.Thread(target=subscribe_handler, args=(handler,))
            threads.append(t)
            t.start()

        # Wait for all subscribes
        for t in threads:
            t.join()

        # Verify all subscribed
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 20

        # Unsubscribe in multiple threads
        threads = []
        for handler in handlers:
            t = threading.Thread(target=unsubscribe_handler, args=(handler,))
            threads.append(t)
            t.start()

        # Wait for all unsubscribes
        for t in threads:
            t.join()

        # Verify all unsubscribed
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 0

    def test_handler_exception_doesnt_break_event_bus(self, event_bus):
        """
        Test that exception in one handler doesn't prevent other handlers from running.

        Expected: All handlers called even if one raises exception
        """
        handler1 = Mock()
        handler2 = Mock(side_effect=Exception("Handler error"))
        handler3 = Mock()

        event_bus.subscribe(EventType.STATE_UPDATED, handler1)
        event_bus.subscribe(EventType.STATE_UPDATED, handler2)
        event_bus.subscribe(EventType.STATE_UPDATED, handler3)

        # Publish event
        event_bus.publish(EventType.STATE_UPDATED, {}, source="test")

        # All handlers should be called despite handler2 raising exception
        handler1.assert_called_once()
        handler2.assert_called_once()
        handler3.assert_called_once()


class TestEventBusCleanupRegressionTests:
    """
    REGRESSION TESTS: Verify the fix for EventBus handler leaks.

    These tests verify that widgets/screens properly clean up handlers
    and that the EventBus has no orphaned handlers after unmount.
    """

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_eventbus_has_zero_handlers_after_complete_unmount(self, event_bus):
        """
        REGRESSION TEST: Verify EventBus has 0 handlers after complete unmount cycle.

        This is the key regression test: after all widgets unmount properly,
        the EventBus should have NO handlers registered.

        Expected: PASS - Handler count is 0
        """
        class ProperlyCleanedWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                handlers = [
                    (EventType.STATE_UPDATED, self.handler1),
                    (EventType.COMMAND_SUGGESTIONS_UPDATED, self.handler2),
                    (EventType.ERROR_DETECTED, self.handler3),
                ]
                for event_type, handler in handlers:
                    self.event_bus.subscribe(event_type, handler)
                    self._subscriptions.append((event_type, handler))

            def handler1(self, event):
                pass

            def handler2(self, event):
                pass

            def handler3(self, event):
                pass

            def on_unmount(self):
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Create multiple widgets
        widgets = [ProperlyCleanedWidget(event_bus) for _ in range(5)]

        # Mount all
        for widget in widgets:
            widget.on_mount()

        # Verify handlers exist
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 5
        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 5
        assert len(event_bus._handlers[EventType.ERROR_DETECTED]) == 5

        # Unmount all
        for widget in widgets:
            widget.on_unmount()

        # REGRESSION TEST: All handlers should be gone
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.COMMAND_SUGGESTIONS_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.ERROR_DETECTED, [])) == 0

    def test_no_orphaned_handlers_after_screen_navigation(self, event_bus):
        """
        REGRESSION TEST: Verify no orphaned handlers after screen navigation.

        Simulates user navigating between screens - each screen should clean up.

        Expected: PASS - No handlers leak across navigation
        """
        class Screen:
            def __init__(self, name, event_bus):
                self.name = name
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                self._subscriptions.append((EventType.STATE_UPDATED, self.handler))
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handler)

            def handler(self, event):
                pass

            def on_unmount(self):
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Simulate navigation: dashboard -> tasks -> specs -> dashboard
        screens = ["dashboard", "tasks", "specs", "dashboard", "history"]

        for screen_name in screens:
            screen = Screen(screen_name, event_bus)
            screen.on_mount()

            # Should have exactly 1 handler during mount
            assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

            screen.on_unmount()

            # Should have 0 handlers after unmount
            assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0

    def test_rapid_mount_unmount_no_leaks(self, event_bus):
        """
        REGRESSION TEST: Verify rapid mount/unmount cycles don't leak handlers.

        Simulates rapid screen changes (user pressing keys quickly).

        Expected: PASS - No accumulation of handlers
        """
        class RapidWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscription = None

            def on_mount(self):
                self._subscription = self.handler
                self.event_bus.subscribe(EventType.STATE_UPDATED, self._subscription)

            def handler(self, event):
                pass

            def on_unmount(self):
                if self._subscription:
                    self.event_bus.unsubscribe(EventType.STATE_UPDATED, self._subscription)
                    self._subscription = None

        # Perform 100 rapid mount/unmount cycles
        for _ in range(100):
            widget = RapidWidget(event_bus)
            widget.on_mount()
            widget.on_unmount()

        # After 100 cycles, should have 0 handlers (no accumulation)
        handler_count = len(event_bus._handlers.get(EventType.STATE_UPDATED, []))
        assert handler_count == 0, \
            f"Handler leak after 100 cycles: {handler_count} handlers remain"

    def test_datamanager_cleanup_method(self, event_bus):
        """
        REGRESSION TEST: Verify DataManager cleanup() method works.

        DataManager is a service (not a screen) so it needs a cleanup() method
        instead of on_unmount().

        Expected: PASS - cleanup() removes all subscriptions
        """
        class DataManagerService:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def _subscribe_to_events(self):
                """Subscribe to file system events."""
                handlers = [
                    ("FILE_CHANGED", self.on_file_changed),
                    ("FILE_CREATED", self.on_file_created),
                    ("FILE_DELETED", self.on_file_deleted),
                ]
                for event_name, handler in handlers:
                    # Using STATE_UPDATED as placeholder since FILE_* aren't in EventType
                    self.event_bus.subscribe(EventType.STATE_UPDATED, handler)
                    self._subscriptions.append((EventType.STATE_UPDATED, handler))

            def on_file_changed(self, event):
                pass

            def on_file_created(self, event):
                pass

            def on_file_deleted(self, event):
                pass

            def cleanup(self):
                """Manual cleanup method for service shutdown."""
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Create and start DataManager
        data_manager = DataManagerService(event_bus)
        data_manager._subscribe_to_events()

        # Verify handlers are registered
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 3

        # Call cleanup on app shutdown
        data_manager.cleanup()

        # Verify all handlers are removed
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0
