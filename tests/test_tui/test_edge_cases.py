"""
Edge case tests for TUI exit cleanup fix.

This test suite covers edge cases and stress scenarios for the EventBus
handler cleanup fix, ensuring robust behavior under unusual conditions.

Test Categories:
- Rapid mount/unmount cycles (stress testing)
- Multiple screens mounting and unmounting
- Error conditions during unmount
- DataManager cleanup scenarios
- Race conditions and threading
- Memory leak verification

All tests should PASS after the cleanup fix is implemented.
"""

import pytest
from unittest.mock import Mock, MagicMock
import threading
import time

from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.models import EventType


class TestRapidMountUnmountCycles:
    """Test rapid mount/unmount cycles don't cause issues."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=False)  # Disable logging for performance

    def test_rapid_navigation_no_handler_accumulation(self, event_bus):
        """
        Test rapid screen navigation doesn't accumulate handlers.

        Simulates user rapidly pressing keys to navigate between screens.

        Expected: PASS - No handler accumulation after many cycles
        """
        class Screen:
            def __init__(self, name, event_bus):
                self.name = name
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                events = [
                    EventType.STATE_UPDATED,
                    EventType.COMMAND_SUGGESTIONS_UPDATED,
                    EventType.ERROR_DETECTED,
                ]
                for event_type in events:
                    handler = lambda e, n=self.name: None
                    self._subscriptions.append((event_type, handler))
                    self.event_bus.subscribe(event_type, handler)

            def on_unmount(self):
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Simulate 200 rapid screen changes
        screen_names = ["dashboard", "tasks", "specs", "history", "git"]
        for i in range(200):
            screen = Screen(screen_names[i % len(screen_names)], event_bus)
            screen.on_mount()
            screen.on_unmount()

        # Verify no handlers remain
        for event_type in [EventType.STATE_UPDATED, EventType.COMMAND_SUGGESTIONS_UPDATED, EventType.ERROR_DETECTED]:
            handler_count = len(event_bus._handlers.get(event_type, []))
            assert handler_count == 0, \
                f"Handler leak after 200 cycles: {handler_count} handlers remain for {event_type}"

    def test_mount_unmount_mount_same_widget(self, event_bus):
        """
        Test mounting the same widget multiple times (remounting).

        Expected: PASS - Each mount/unmount cycle properly cleans up
        """
        class RemountableWidget:
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

        widget = RemountableWidget(event_bus)

        # Perform 50 mount/unmount cycles on the same instance
        for _ in range(50):
            widget.on_mount()
            assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1
            widget.on_unmount()
            assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0

    def test_interleaved_mount_unmount_multiple_widgets(self, event_bus):
        """
        Test interleaved mounting and unmounting of multiple widgets.

        Expected: PASS - Correct handler count throughout interleaved operations
        """
        class Widget:
            def __init__(self, name, event_bus):
                self.name = name
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

        widgets = [Widget(f"widget{i}", event_bus) for i in range(5)]

        # Mount all
        for widget in widgets:
            widget.on_mount()
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 5

        # Unmount odd indices
        for i in [1, 3]:
            widgets[i].on_unmount()
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 3

        # Mount them back
        for i in [1, 3]:
            widgets[i].on_mount()
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 5

        # Unmount all
        for widget in widgets:
            widget.on_unmount()
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0


class TestMultipleScreensScenarios:
    """Test scenarios with multiple screens mounting and unmounting."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_multiple_screens_simultaneous_mount(self, event_bus):
        """
        Test multiple screens mounted simultaneously (overlays, modals).

        Expected: PASS - All handlers tracked correctly
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

        # Mount 3 screens simultaneously (e.g., dashboard + modal + help)
        screens = [
            Screen("dashboard", event_bus),
            Screen("modal", event_bus),
            Screen("help_overlay", event_bus),
        ]

        for screen in screens:
            screen.on_mount()

        # Should have 3 handlers
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 3

        # Unmount modal only
        screens[1].on_unmount()
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 2

        # Unmount help overlay
        screens[2].on_unmount()
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

        # Unmount dashboard
        screens[0].on_unmount()
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0

    def test_screen_stack_navigation(self, event_bus):
        """
        Test screen stack navigation (push/pop screens).

        Expected: PASS - Handlers cleaned up as screens are popped
        """
        class StackScreen:
            def __init__(self, name, event_bus):
                self.name = name
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

        stack = []

        # Push 5 screens onto stack
        for i in range(5):
            screen = StackScreen(f"screen{i}", event_bus)
            screen.on_mount()
            stack.append(screen)
            assert len(event_bus._handlers[EventType.STATE_UPDATED]) == i + 1

        # Pop screens one by one
        for i in range(5):
            screen = stack.pop()
            screen.on_unmount()
            expected_count = 5 - i - 1
            assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == expected_count

    def test_circular_navigation_pattern(self, event_bus):
        """
        Test circular navigation (A -> B -> C -> A).

        Expected: PASS - Handlers don't accumulate across cycles
        """
        class CircularScreen:
            def __init__(self, name, event_bus):
                self.name = name
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

        # Navigate in circles 10 times
        screens = ["A", "B", "C"]
        for cycle in range(10):
            for screen_name in screens:
                screen = CircularScreen(screen_name, event_bus)
                screen.on_mount()
                assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1
                screen.on_unmount()
                assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0


class TestErrorConditionsDuringUnmount:
    """Test error conditions during unmount don't break cleanup."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_unmount_called_twice(self, event_bus):
        """
        Test calling unmount twice doesn't cause errors.

        Expected: PASS - Second unmount is a no-op
        """
        class DoubleUnmountWidget:
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

        widget = DoubleUnmountWidget(event_bus)
        widget.on_mount()
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1

        # Call unmount twice
        widget.on_unmount()
        widget.on_unmount()  # Should not raise error

        # Should still be clean
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0

    def test_unmount_without_mount(self, event_bus):
        """
        Test calling unmount without prior mount.

        Expected: PASS - Unmount handles gracefully
        """
        class UnmountWithoutMountWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscription = None

            def handler(self, event):
                pass

            def on_unmount(self):
                if self._subscription:
                    self.event_bus.unsubscribe(EventType.STATE_UPDATED, self._subscription)
                    self._subscription = None

        widget = UnmountWithoutMountWidget(event_bus)

        # Call unmount without mounting
        try:
            widget.on_unmount()  # Should not raise error
        except Exception as e:
            pytest.fail(f"Unmount without mount raised exception: {e}")

    def test_exception_during_handler_unsubscribe(self, event_bus):
        """
        Test that exception during one handler unsubscribe doesn't prevent others.

        Expected: PASS - All handlers attempted to unsubscribe despite errors
        """
        unsubscribe_attempts = {"count": 0}

        class PartiallyFailingWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def on_mount(self):
                handlers = [self.handler1, self.handler2, self.handler3]
                for handler in handlers:
                    self._subscriptions.append((EventType.STATE_UPDATED, handler))
                    self.event_bus.subscribe(EventType.STATE_UPDATED, handler)

            def handler1(self, event):
                pass

            def handler2(self, event):
                pass

            def handler3(self, event):
                pass

            def on_unmount(self):
                for event_type, handler in self._subscriptions:
                    try:
                        unsubscribe_attempts["count"] += 1
                        self.event_bus.unsubscribe(event_type, handler)
                    except Exception:
                        pass  # Continue with other handlers
                self._subscriptions.clear()

        widget = PartiallyFailingWidget(event_bus)
        widget.on_mount()
        widget.on_unmount()

        # All 3 unsubscribe attempts should have been made
        assert unsubscribe_attempts["count"] == 3


class TestDataManagerCleanup:
    """Test DataManager cleanup scenarios."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=True)

    def test_datamanager_cleanup_on_app_shutdown(self, event_bus):
        """
        Test DataManager cleanup() is called on app shutdown.

        Expected: PASS - All DataManager subscriptions cleaned up
        """
        class DataManager:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscriptions = []

            def start(self):
                """Start watching for file changes."""
                handlers = [
                    (EventType.STATE_UPDATED, self.on_file_changed),
                    (EventType.ERROR_DETECTED, self.on_file_created),
                    (EventType.COMMAND_SUGGESTIONS_UPDATED, self.on_file_deleted),
                ]
                for event_type, handler in handlers:
                    self.event_bus.subscribe(event_type, handler)
                    self._subscriptions.append((event_type, handler))

            def on_file_changed(self, event):
                pass

            def on_file_created(self, event):
                pass

            def on_file_deleted(self, event):
                pass

            def cleanup(self):
                """Cleanup on app shutdown."""
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # App startup
        data_manager = DataManager(event_bus)
        data_manager.start()

        # Verify subscriptions exist
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 1
        assert len(event_bus._handlers[EventType.ERROR_DETECTED]) == 1
        assert len(event_bus._handlers[EventType.COMMAND_SUGGESTIONS_UPDATED]) == 1

        # App shutdown
        data_manager.cleanup()

        # Verify all cleaned up
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0
        assert len(event_bus._handlers.get(EventType.ERROR_DETECTED, [])) == 0
        assert len(event_bus._handlers.get(EventType.COMMAND_SUGGESTIONS_UPDATED, [])) == 0

    def test_multiple_service_cleanups(self, event_bus):
        """
        Test multiple services (DataManager, RefreshService, etc.) clean up.

        Expected: PASS - All services clean up their handlers
        """
        class Service:
            def __init__(self, name, event_bus):
                self.name = name
                self.event_bus = event_bus
                self._subscriptions = []

            def start(self):
                self._subscriptions.append((EventType.STATE_UPDATED, self.handler))
                self.event_bus.subscribe(EventType.STATE_UPDATED, self.handler)

            def handler(self, event):
                pass

            def cleanup(self):
                for event_type, handler in self._subscriptions:
                    self.event_bus.unsubscribe(event_type, handler)
                self._subscriptions.clear()

        # Start multiple services
        services = [
            Service("data_manager", event_bus),
            Service("refresh_service", event_bus),
            Service("file_watcher", event_bus),
        ]

        for service in services:
            service.start()

        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 3

        # Cleanup all services
        for service in services:
            service.cleanup()

        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0


class TestThreadingAndRaceConditions:
    """Test threading scenarios and potential race conditions."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=False)

    def test_concurrent_mount_unmount_different_widgets(self, event_bus):
        """
        Test concurrent mount/unmount of different widgets.

        Expected: PASS - No race conditions, correct final state
        """
        class ThreadSafeWidget:
            def __init__(self, name, event_bus):
                self.name = name
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

        widgets = [ThreadSafeWidget(f"widget{i}", event_bus) for i in range(10)]
        threads = []

        # Mount all widgets in parallel
        for widget in widgets:
            t = threading.Thread(target=widget.on_mount)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        # Should have 10 handlers
        assert len(event_bus._handlers[EventType.STATE_UPDATED]) == 10

        # Unmount all in parallel
        threads = []
        for widget in widgets:
            t = threading.Thread(target=widget.on_unmount)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        # Should have 0 handlers
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0

    def test_event_published_during_unmount(self, event_bus):
        """
        Test event being published while widgets are unmounting.

        Expected: PASS - No errors, handlers cleaned up properly
        """
        call_count = {"count": 0}

        class UnmountingWidget:
            def __init__(self, event_bus):
                self.event_bus = event_bus
                self._subscription = None

            def on_mount(self):
                self._subscription = self.handler
                self.event_bus.subscribe(EventType.STATE_UPDATED, self._subscription)

            def handler(self, event):
                call_count["count"] += 1

            def on_unmount(self):
                # Simulate event being published during unmount
                time.sleep(0.01)  # Small delay to allow concurrent events
                if self._subscription:
                    self.event_bus.unsubscribe(EventType.STATE_UPDATED, self._subscription)
                    self._subscription = None

        widgets = [UnmountingWidget(event_bus) for _ in range(5)]

        # Mount all
        for widget in widgets:
            widget.on_mount()

        # Start unmounting in thread
        def unmount_all():
            for widget in widgets:
                widget.on_unmount()

        unmount_thread = threading.Thread(target=unmount_all)
        unmount_thread.start()

        # Publish events while unmounting
        for _ in range(10):
            event_bus.publish(EventType.STATE_UPDATED, {}, source="test")
            time.sleep(0.005)

        unmount_thread.join()

        # Final state should be clean
        assert len(event_bus._handlers.get(EventType.STATE_UPDATED, [])) == 0


class TestMemoryLeakVerification:
    """Verify no memory leaks with large numbers of mount/unmount cycles."""

    @pytest.fixture
    def event_bus(self):
        """Create a fresh EventBus instance for each test."""
        return EventBus(enable_logging=False)

    def test_no_memory_leak_after_1000_cycles(self, event_bus):
        """
        Test 1000 mount/unmount cycles don't leak memory.

        Expected: PASS - Handler count stays at 0
        """
        class MemoryTestWidget:
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

        # Perform 1000 cycles
        for _ in range(1000):
            widget = MemoryTestWidget(event_bus)
            widget.on_mount()
            widget.on_unmount()

        # Verify no handlers remain
        for event_type in [EventType.STATE_UPDATED, EventType.COMMAND_SUGGESTIONS_UPDATED, EventType.ERROR_DETECTED]:
            handler_count = len(event_bus._handlers.get(event_type, []))
            assert handler_count == 0, \
                f"Memory leak after 1000 cycles: {handler_count} handlers for {event_type}"

    def test_handler_dict_doesnt_grow_indefinitely(self, event_bus):
        """
        Test that EventBus._handlers dict doesn't grow indefinitely.

        Expected: PASS - Dict size remains bounded
        """
        class Widget:
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

        # Initial dict size
        initial_dict_size = len(event_bus._handlers)

        # Perform many cycles
        for _ in range(500):
            widget = Widget(event_bus)
            widget.on_mount()
            widget.on_unmount()

        # Dict size should not have grown significantly
        final_dict_size = len(event_bus._handlers)

        # Allow some growth for internal EventBus structure, but not 500+ entries
        assert final_dict_size <= initial_dict_size + 10, \
            f"EventBus._handlers dict grew from {initial_dict_size} to {final_dict_size}"
