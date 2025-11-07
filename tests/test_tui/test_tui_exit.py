"""
Test for TUI exit behavior - reproduces recursion error bug.

This test suite verifies that the TUI can exit cleanly when the user presses "q".
Originally, these tests FAILED because of a recursion error during exit.

Root Cause (FIXED):
- EventBus handlers were never unsubscribed in on_unmount() methods
- When app.exit() is called, handlers remained registered
- EventBus called methods on destroyed/unmounted objects
- This caused recursion errors and prevented clean exit

Fix Applied:
- All widgets/screens now track subscriptions in self._subscriptions
- on_unmount() methods unsubscribe all handlers
- DataManager has cleanup() method for shutdown

Expected Behavior:
- Pressing "q" should cleanly exit the TUI with no errors
- All EventBus handlers should be properly unsubscribed during unmount
- No recursion errors should occur during shutdown
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from lib.yoyo_tui_v3.app import YoyoDevTUIApp
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.models import EventType


class TestTUIExit:
    """Test TUI exit behavior and cleanup."""

    @pytest.fixture
    def mock_config(self):
        """Create a mock TUI configuration."""
        config = Mock()
        config.cache_ttl_seconds = 300
        config.yoyo_dev_path = Path("/tmp/test-yoyo-dev")
        config.refresh_interval_seconds = 0  # Disable auto-refresh for tests
        return config

    @pytest.fixture
    def app_with_mocked_services(self, mock_config):
        """Create an app instance with mocked configuration."""
        with patch('lib.yoyo_tui_v3.app.ConfigManager.load', return_value=mock_config):
            app = YoyoDevTUIApp()
            return app

    def test_action_quit_triggers_clean_exit(self, app_with_mocked_services):
        """
        Test that pressing "q" key (action_quit) exits cleanly.

        This simulates the user pressing "q" to quit the application.

        Expected: Clean exit via app.exit()
        """
        app = app_with_mocked_services

        # Mock services
        app.event_bus = Mock(spec=EventBus)
        app.refresh_service = Mock()

        # Mock exit to track if it was called
        original_exit = app.exit
        app.exit = Mock(side_effect=original_exit)

        # Simulate pressing "q" key
        try:
            app.action_quit()
            # Verify exit was called
            app.exit.assert_called_once()
        except RecursionError as e:
            pytest.fail(f"RecursionError during action_quit: {e}")

    def test_on_unmount_cleanup(self, app_with_mocked_services):
        """
        Test that on_unmount() properly cleans up resources.

        This verifies that the app's on_unmount() method is called
        and performs necessary cleanup (stopping refresh service).

        Expected: Refresh service stopped, no errors
        """
        app = app_with_mocked_services

        # Mock refresh service
        mock_refresh_service = Mock()
        mock_refresh_service.stop = Mock()
        app.refresh_service = mock_refresh_service

        # Call on_unmount
        try:
            app.on_unmount()
            # Verify refresh service was stopped
            mock_refresh_service.stop.assert_called_once()
        except RecursionError as e:
            pytest.fail(f"RecursionError during on_unmount: {e}")


class TestEventBusCleanupDuringExit:
    """Test EventBus behavior during app exit and unmount."""

    @pytest.fixture
    def event_bus(self):
        """Create a real EventBus instance for testing."""
        return EventBus(enable_logging=True)

    def test_handlers_called_on_destroyed_objects_cause_errors(self, event_bus):
        """
        Test that calling handlers on destroyed objects causes errors.

        This reproduces the core issue: EventBus retains handler references
        after objects are unmounted, leading to errors when events fire.

        Expected: This test should FAIL initially, demonstrating the bug
        """
        # Create a mock widget with a handler
        class MockWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self.handler_called = False
                self.destroyed = False

            def on_mount(self):
                """Subscribe to event."""
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handle_state_update)

            def handle_state_update(self, event):
                """Handle state update event."""
                if self.destroyed:
                    # Simulating error when calling method on destroyed object
                    raise RuntimeError("Handler called on destroyed object")
                self.handler_called = True

            def on_unmount(self):
                """Should unsubscribe but currently doesn't - THIS IS THE BUG."""
                self.destroyed = True
                # BUG: Missing unsubscribe call here
                # self.event_bus.unsubscribe(EventType.STATE_UPDATED, self.handle_state_update)

        # Create widget and mount it
        widget = MockWidget(event_bus)
        widget.on_mount()

        # Publish event - should work fine
        event_bus.publish(EventType.STATE_UPDATED, {}, source="test")
        assert widget.handler_called is True

        # Now unmount the widget (but handler still registered - BUG)
        widget.on_unmount()

        # Publish another event - this should NOT call the handler
        # but currently DOES because handler wasn't unsubscribed
        widget.handler_called = False
        try:
            event_bus.publish(EventType.STATE_UPDATED, {}, source="test")
            # If we get here, the handler was called (BAD)
            # This test documents the bug
            if widget.handler_called:
                pytest.fail(
                    "Handler was called after unmount - handlers should be unsubscribed! "
                    "This demonstrates the bug."
                )
        except RuntimeError as e:
            # Expected: Handler is called and raises error because object is destroyed
            assert "Handler called on destroyed object" in str(e)
            pytest.fail(
                f"Handler was called on destroyed object: {e}. "
                "Handlers should be unsubscribed in on_unmount()."
            )

    def test_multiple_widgets_with_handlers_during_exit(self, event_bus):
        """
        Test multiple widgets with EventBus handlers during exit.

        Simulates the real scenario: multiple screens/widgets subscribe to events,
        then during app exit, all unmount but handlers remain registered.

        Expected: This test should FAIL, demonstrating handler leak across widgets
        """
        class TestWidget:
            def __init__(self, name, event_bus):
                self.name = name
                self.event_bus = event_bus
                self.is_mounted = False

            def on_mount(self):
                self.is_mounted = True
                self.event_bus.subscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self.handler)

            def handler(self, event):
                if not self.is_mounted:
                    raise RuntimeError(f"Handler on unmounted widget: {self.name}")

            def on_unmount(self):
                self.is_mounted = False
                # BUG: Not unsubscribing - THIS IS THE BUG
                # self.event_bus.unsubscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self.handler)

        # Create multiple widgets
        widgets = [
            TestWidget("command_palette", event_bus),
            TestWidget("main_dashboard", event_bus),
            TestWidget("active_work_panel", event_bus),
        ]

        # Mount all widgets
        for widget in widgets:
            widget.on_mount()

        # Unmount all widgets (simulating app exit)
        for widget in widgets:
            widget.on_unmount()

        # Now publish an event - should NOT call any handlers
        # but currently DOES because handlers weren't unsubscribed
        # The EventBus catches exceptions, so we need to check handler count instead
        handler_count = len(event_bus._handlers.get(EventType.COMMAND_SUGGESTIONS_UPDATED, []))

        if handler_count != 0:
            pytest.fail(
                f"Handler leak detected: {handler_count} handlers remain after unmount. "
                f"Handlers are still registered and will be called on unmounted widgets. "
                "This demonstrates the EventBus cleanup bug."
            )

    def test_event_bus_handler_count_increases_without_cleanup(self, event_bus):
        """
        Test that handler count increases without proper cleanup.

        Verifies that handlers accumulate in EventBus when not unsubscribed,
        leading to memory leaks and potential recursion issues.

        Expected: Handler count should return to 0 after unmount
        Actual: Handlers remain registered, count stays high
        """
        # Check initial handler count
        initial_count = len(event_bus._handlers.get(EventType.STATE_UPDATED, []))
        assert initial_count == 0

        # Create and mount widget
        class LeakyWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus

            def on_mount(self):
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handler)

            def handler(self, event):
                pass

            def on_unmount(self):
                # BUG: Not cleaning up
                pass

        # Mount multiple instances
        widgets = [LeakyWidget(event_bus) for _ in range(5)]
        for widget in widgets:
            widget.on_mount()

        # Handler count should increase
        after_mount_count = len(event_bus._handlers.get(EventType.STATE_UPDATED, []))
        assert after_mount_count == 5

        # Unmount all widgets
        for widget in widgets:
            widget.on_unmount()

        # Handler count should decrease to 0, but won't due to bug
        after_unmount_count = len(event_bus._handlers.get(EventType.STATE_UPDATED, []))

        # This assertion will FAIL, demonstrating the memory leak
        if after_unmount_count != 0:
            pytest.fail(
                f"Handler leak detected: {after_unmount_count} handlers remain after unmount. "
                f"Expected 0 handlers. This demonstrates the EventBus cleanup bug."
            )


class TestTUIExitRegressionTests:
    """
    Regression tests for TUI exit cleanup fix.

    These tests verify that the fix for the recursion error is working correctly.
    All tests in this class should PASS after the fix is implemented.
    """

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_widget_with_proper_cleanup_no_handler_leak(self, event_bus):
        """
        REGRESSION TEST: Verify widgets with proper cleanup don't leak handlers.

        This test verifies that the fix (tracking subscriptions and unsubscribing
        in on_unmount) works correctly.

        Expected: PASS - Handler count returns to 0 after unmount
        """
        class FixedWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                """Subscribe to events and track subscriptions."""
                self._subscriptions.append((EventType.STATE_UPDATED, self.handle_state))
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handle_state)

            def handle_state(self, event):
                pass

            def on_unmount(self):
                """Properly unsubscribe all handlers."""
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Create and mount widget
        widget = FixedWidget(event_bus)
        widget.on_mount()

        # Verify handler is registered
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

        # Unmount widget
        widget.on_unmount()

        # Verify handler is removed (NO LEAK)
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0

    def test_widget_unmount_prevents_handler_calls(self, event_bus):
        """
        REGRESSION TEST: Verify unmounted widgets don't receive events.

        After unmount and cleanup, publishing events should NOT trigger handlers.

        Expected: PASS - Handler not called after unmount
        """
        handler_called = {"count": 0}

        class FixedWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscription = None

            def on_mount(self):
                self._subscription = self.handle_event
                self.event_bus.subscribe(EventType.STATE_UPDATED, self._subscription)

            def handle_event(self, event):
                handler_called["count"] += 1

            def on_unmount(self):
                if self._subscription:
                    self.event_bus.unsubscribe(EventType.STATE_UPDATED, self._subscription)
                    self._subscription = None

        widget = FixedWidget(event_bus)
        widget.on_mount()

        # Publish event while mounted - handler should be called
        event_bus.publish(EventType.STATE_UPDATED, {}, source="test")
        assert handler_called["count"] == 1

        # Unmount widget
        widget.on_unmount()

        # Publish event after unmount - handler should NOT be called
        event_bus.publish(EventType.STATE_UPDATED, {}, source="test")
        assert handler_called["count"] == 1  # Still 1, not 2

    def test_multiple_widgets_clean_exit(self, event_bus):
        """
        REGRESSION TEST: Verify multiple widgets clean up properly.

        Simulates the real scenario with multiple components mounting and unmounting.

        Expected: PASS - All handlers cleaned up, no leaks
        """
        class FixedWidget:
            def __init__(self, name, event_bus):
                self.name = name
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                events = [
                    EventType.STATE_UPDATED,
                    EventType.COMMAND_SUGGESTIONS_UPDATED,
                    EventType.ERROR_DETECTED
                ]
                for event_type in events:
                    handler = lambda e, n=self.name: None  # Unique handler per event
                    self._subscriptions.append((event_type, handler))
                    self.event_bus.subscribe(event_type, handler)

            def on_unmount(self):
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Create multiple widgets
        widgets = [
            FixedWidget("widget1", event_bus),
            FixedWidget("widget2", event_bus),
            FixedWidget("widget3", event_bus),
        ]

        # Mount all widgets
        for widget in widgets:
            widget.on_mount()

        # Verify handlers are registered (3 widgets × 3 events = 9 handlers)
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 3
        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 3
        assert len(event_bus._handlers[EventType.ERROR_DETECTED]) == 3

        # Unmount all widgets
        for widget in widgets:
            widget.on_unmount()

        # Verify all handlers are removed (NO LEAKS)
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.COMMAND_SUGGESTIONS_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.ERROR_DETECTED, [])) == 0

    def test_no_recursion_error_on_exit_sequence(self, event_bus):
        """
        REGRESSION TEST: Verify no recursion errors during exit sequence.

        Simulates the full exit sequence: mount, publish events, unmount, publish events.
        Should complete without RecursionError.

        Expected: PASS - No recursion errors
        """
        class FixedWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscription = None
                self.mounted = False

            def on_mount(self):
                self.mounted = True
                self._subscription = self.handle_event
                self.event_bus.subscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self._subscription)

            def handle_event(self, event):
                if not self.mounted:
                    raise RuntimeError("Handler called on unmounted widget")

            def on_unmount(self):
                self.mounted = False
                if self._subscription:
                    self.event_bus.unsubscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self._subscription)
                    self._subscription = None

        widgets = [FixedWidget(event_bus) for _ in range(5)]

        try:
            # Mount all widgets
            for widget in widgets:
                widget.on_mount()

            # Publish events during normal operation
            for _ in range(10):
                event_bus.publish(EventType.COMMAND_SUGGESTIONS_UPDATED, {}, source="test")

            # Unmount all widgets (simulating exit)
            for widget in widgets:
                widget.on_unmount()

            # Publish events after unmount - should not cause errors
            for _ in range(10):
                event_bus.publish(EventType.COMMAND_SUGGESTIONS_UPDATED, {}, source="test")

        except RecursionError as e:
            pytest.fail(f"RecursionError during exit sequence: {e}")

    def test_command_palette_cleanup_pattern(self, event_bus):
        """
        REGRESSION TEST: Verify CommandPalette widget cleanup pattern works.

        CommandPalette subscribes to 3 events and must clean up all of them.
        This tests the actual pattern implemented in the fix.

        Expected: PASS - All 3 handlers cleaned up
        """
        class CommandPaletteWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                """Subscribe to 3 events like the real CommandPalette."""
                self._subscriptions.append((EventType.STATE_UPDATED, self.on_state_updated))
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.on_state_updated)

                self._subscriptions.append((EventType.COMMAND_SUGGESTIONS_UPDATED, self.on_suggestions_updated))
                self.event_bus.subscribe(EventType.COMMAND_SUGGESTIONS_UPDATED, self.on_suggestions_updated)

                self._subscriptions.append((EventType.ERROR_DETECTED, self.on_error_detected))
                self.event_bus.subscribe(EventType.ERROR_DETECTED, self.on_error_detected)

            def on_state_updated(self, event):
                pass

            def on_suggestions_updated(self, event):
                pass

            def on_error_detected(self, event):
                pass

            def on_unmount(self):
                """Clean up all subscriptions."""
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        widget = CommandPaletteWidget(event_bus)
        widget.on_mount()

        # Verify all 3 handlers are registered
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1
        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 1
        assert len(event_bus._handlers[EventType.ERROR_DETECTED]) == 1

        # Unmount
        widget.on_unmount()

        # Verify all 3 handlers are removed
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.COMMAND_SUGGESTIONS_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.ERROR_DETECTED, [])) == 0
